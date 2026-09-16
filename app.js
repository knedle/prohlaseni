let pledges = [];
const filters = { category: 'all', priority: 'all', status: 'all' };

async function init() {
  const res = await fetch('data/pledges.json');
  pledges = await res.json();
  populateCategoryFilter();
  attachFilterHandlers();
  render();
}

function populateCategoryFilter() {
  const select = document.getElementById('filter-category');
  const categories = [...new Set(pledges.map(p => p.category))].sort((a, b) => a.localeCompare(b, 'cs'));
  for (const cat of categories) {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  }
}

function attachFilterHandlers() {
  document.getElementById('filter-category').addEventListener('change', e => {
    filters.category = e.target.value;
    render();
  });
  document.getElementById('filter-priority').addEventListener('change', e => {
    filters.priority = e.target.value;
    render();
  });
  document.getElementById('filter-status').addEventListener('change', e => {
    filters.status = e.target.value;
    render();
  });
}

function matchesFilters(pledge) {
  if (filters.category !== 'all' && pledge.category !== filters.category) return false;
  if (filters.priority !== 'all' && pledge.priority !== filters.priority) return false;
  if (filters.status !== 'all' && pledge.status !== filters.status) return false;
  return true;
}

function render() {
  const list = document.getElementById('pledge-list');
  const visible = pledges.filter(matchesFilters);
  list.innerHTML = visible.map(renderCard).join('');

  const done = pledges.filter(p => p.status === 'splněno').length;
  const failed = pledges.filter(p => p.status === 'nesplněno').length;
  const waiting = pledges.filter(p => p.status === 'čekající').length;
  const total = pledges.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  document.getElementById('counter-text').textContent = `${done} / ${total} splněno`;
  document.getElementById('counter-pct').textContent = `${pct} %`;
  document.getElementById('counter-cekajici').textContent = waiting;
  document.getElementById('counter-nesplneno').textContent = failed;
  document.getElementById('counter-splneno').textContent = done;
}

function renderCard(p) {
  const extra = p.draftExtra
    ? `<p class="pledge-extra">Z návrhu, nedostalo se do finální verze: „${escapeHtml(p.draftExtra)}“</p>`
    : '';
  const statusNote = p.statusNote
    ? `<p class="pledge-status-note">${escapeHtml(p.statusNote)}</p>`
    : '';
  const statusLabel = { 'čekající': 'Čekající', 'nesplněno': 'Nesplněno', 'splněno': 'Splněno' }[p.status];
  const statusIcon = { 'čekající': '?', 'nesplněno': '✕', 'splněno': '✓' }[p.status];
  return `
    <div class="pledge-card">
      <div class="pledge-row">
        <span class="pledge-status-icon pledge-status-icon-${p.status}" role="img" aria-label="${statusLabel}">${statusIcon}</span>
        <span class="pledge-text">${escapeHtml(p.text)}</span>
      </div>
      <div class="pledge-badges">
        <span class="badge badge-category">${escapeHtml(p.category)}</span>
        <span class="badge badge-priority badge-priority-${p.priority}">${p.priority === 'vysoká' ? 'Vysoká priorita' : 'Nízká priorita'}</span>
        <span class="badge badge-status badge-status-${p.status}">${statusLabel}</span>
      </div>
      ${extra}
      ${statusNote}
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

init();
