let pledges = [];
const filters = { category: 'all', priority: 'all', status: 'all', statusquo: 'all' };

async function init() {
  const res = await fetch('data/pledges.json');
  pledges = await res.json();
  populateCategoryFilter();
  attachFilterHandlers();
  attachBadgeFilterHandler();
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
  document.getElementById('filter-statusquo').addEventListener('change', e => {
    filters.statusquo = e.target.value;
    render();
  });
}

function attachBadgeFilterHandler() {
  document.getElementById('pledge-list').addEventListener('click', e => {
    const badge = e.target.closest('[data-filter-type]');
    if (!badge) return;
    const type = badge.dataset.filterType;
    const value = badge.dataset.filterValue;
    filters[type] = value;
    document.getElementById(`filter-${type}`).value = value;
    render();
  });
}

function matchesFilters(pledge) {
  if (filters.category !== 'all' && pledge.category !== filters.category) return false;
  if (filters.priority !== 'all' && pledge.priority !== filters.priority) return false;
  if (filters.status !== 'all' && pledge.status !== filters.status) return false;
  if (filters.statusquo !== 'all' && String(pledge.statusQuo) !== filters.statusquo) return false;
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
  const statusQuoBadge = p.statusQuo
    ? `<span class="badge badge-statusquo" data-filter-type="statusquo" data-filter-value="true">Status quo</span>`
    : '';
  return `
    <div class="pledge-card">
      <div class="pledge-row">
        <span class="pledge-status-icon pledge-status-icon-${p.status}" role="img" aria-label="${statusLabel}">${statusIcon}</span>
        <span class="pledge-text">${escapeHtml(p.text)}</span>
      </div>
      <div class="pledge-badges">
        <span class="badge badge-category" data-filter-type="category" data-filter-value="${escapeHtml(p.category)}">${escapeHtml(p.category)}</span>
        <span class="badge badge-priority badge-priority-${p.priority}" data-filter-type="priority" data-filter-value="${p.priority}">${p.priority === 'vysoká' ? 'Vysoká priorita' : 'Nízká priorita'}</span>
        <span class="badge badge-status badge-status-${p.status}" data-filter-type="status" data-filter-value="${p.status}">${statusLabel}</span>
        ${statusQuoBadge}
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
