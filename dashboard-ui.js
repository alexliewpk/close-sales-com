// Last visual pass: keep the complete report and its controls visible.
function restoreDashboardReport() {
  const style = document.createElement('style');
  style.textContent = `
    .yearly-card,.average-card{display:flex!important}
    .sales-card,.expense-card,.collection-card,.balance-card,.mrr-card{display:none!important}
    .monthly-sales-panel{display:block!important;visibility:visible!important;opacity:1!important}
    .monthly-sales-panel .report-header,.monthly-sales-panel .report-controls{display:flex!important}
    .monthly-sales-panel select,.monthly-sales-panel button{display:inline-flex!important;visibility:visible!important}
    .monthly-sales-chart{display:block!important;min-height:0!important;visibility:visible!important}
    .monthly-sales-chart svg{display:block!important;width:100%!important;height:auto!important;overflow:visible!important}
  `;
  document.head.appendChild(style);
}

/* Keep the dashboard summary on the same accounting basis as the chart:
   recurring sales contribute their monthly amount in every active month. */
function installYearlySummary() {
  const grid = document.querySelector('.metric-grid');
  if (!grid || typeof state === 'undefined' || typeof monthlySalesValue !== 'function') return;

  let totalCard = grid.querySelector('.yearly-card, .dashboard-yearly-total');
  let averageCard = grid.querySelector('.average-card, .dashboard-yearly-average');
  if (!totalCard || !averageCard) {
    const reusable = Array.from(grid.querySelectorAll('.metric-card'));
    totalCard = reusable.find(card => card.classList.contains('sales-card')) || reusable[0];
    averageCard = reusable.find(card => card.classList.contains('expense-card')) || reusable[1];
    if (!totalCard || !averageCard) return;
    totalCard.className = 'metric-card dashboard-yearly-total';
    averageCard.className = 'metric-card dashboard-yearly-average';
    totalCard.innerHTML = '<span class="metric-icon">↗</span><p>Total yearly sales</p><strong id="dashboard-yearly-total-value">RM 0</strong><small id="dashboard-yearly-total-note">Total for this year</small>';
    averageCard.innerHTML = '<span class="metric-icon">≈</span><p>Average monthly sales</p><strong id="dashboard-yearly-average-value">RM 0</strong><small>Yearly total ÷ 12 months</small>';
  }

  Array.from(grid.querySelectorAll('.metric-card')).forEach(card => {
    if (card !== totalCard && card !== averageCard) card.style.display = 'none';
  });

  const update = () => {
    const selected = document.querySelector('#monthly-report-year');
    const year = Number(selected?.value) || new Date().getFullYear();
    const monthlyTotal = Array.from({ length: 12 }, (_, monthIndex) => {
      const month = new Date(year, monthIndex, 1, 12);
      return state.sales.reduce((sum, sale) => sum + monthlySalesValue(sale, month), 0);
    });
    const total = monthlyTotal.reduce((sum, amount) => sum + amount, 0);
    const format = typeof money === 'function'
      ? money
      : amount => `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    const totalValue = document.querySelector('#metric-yearly-sales, #dashboard-yearly-total-value');
    const averageValue = document.querySelector('#metric-average-sales, #dashboard-yearly-average-value');
    const totalNote = document.querySelector('#metric-yearly-note, #dashboard-yearly-total-note');
    if (totalValue) totalValue.textContent = format(total);
    if (averageValue) averageValue.textContent = format(total / 12);
    if (totalNote) totalNote.textContent = `Total for ${year}`;
  };

  update();
  const yearSelect = document.querySelector('#monthly-report-year');
  if (yearSelect && !yearSelect.dataset.summaryBound) {
    yearSelect.dataset.summaryBound = 'true';
    yearSelect.addEventListener('change', update);
  }
}

function applyYearlySummaryStyle() {
  const style = document.createElement('style');
  style.textContent = `
    .metric-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
    .month-row{display:none!important}
    .yearly-card,.average-card,.dashboard-yearly-total,.dashboard-yearly-average{display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:flex-start!important;gap:0!important;min-height:210px!important;padding:26px!important;border:1px solid rgba(255,255,255,.9)!important;border-radius:28px!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.86),0 22px 48px rgba(28,78,138,.16)!important}
    .yearly-card,.dashboard-yearly-total{background:radial-gradient(circle at 83% 80%,rgba(82,140,255,.34),transparent 31%),linear-gradient(135deg,rgba(207,239,255,.88),rgba(148,193,255,.67))!important}
    .average-card,.dashboard-yearly-average{background:radial-gradient(circle at 80% 82%,rgba(255,255,255,.3),transparent 32%),linear-gradient(135deg,rgba(224,238,255,.9),rgba(177,204,255,.67))!important}
    .yearly-card:before,.average-card:before,.dashboard-yearly-total:before,.dashboard-yearly-average:before{content:"";position:absolute;inset:1px;border-radius:27px;background:linear-gradient(120deg,rgba(255,255,255,.32),transparent 46%);pointer-events:none}
    .yearly-card p,.average-card p,.dashboard-yearly-total p,.dashboard-yearly-average p{margin:20px 0 0!important;color:#202a39!important;font-size:16px!important;line-height:1.2!important;position:relative}
    .yearly-card strong,.average-card strong,.dashboard-yearly-total strong,.dashboard-yearly-average strong{display:block!important;margin:8px 0 0!important;font-size:42px!important;line-height:1.05!important;color:#18202d!important;position:relative;letter-spacing:-1.8px!important}
    .yearly-card small,.average-card small,.dashboard-yearly-total small,.dashboard-yearly-average small{margin-top:auto!important;color:#526478!important;position:relative;font-size:13px!important}
    .yearly-card .metric-icon,.average-card .metric-icon,.dashboard-yearly-total .metric-icon,.dashboard-yearly-average .metric-icon{color:#087ee8!important;position:relative;font-size:24px!important;line-height:1!important}
    .monthly-sales-panel{padding:24px!important;background:radial-gradient(circle at 7% 14%,rgba(255,255,255,.67),transparent 28%),radial-gradient(circle at 88% 75%,rgba(90,139,255,.26),transparent 44%),linear-gradient(132deg,rgba(216,239,255,.78) 0%,rgba(241,248,255,.56) 41%,rgba(196,212,255,.60) 100%)!important}
    .monthly-sales-panel .panel-heading{align-items:center!important;margin-bottom:0!important}
    .monthly-sales-panel .panel-heading>div:last-child{flex-wrap:nowrap!important;gap:10px!important}
    .monthly-sales-panel .report-year-select{min-width:132px!important}
    .monthly-sales-chart{margin-top:8px!important}
    @media(min-width:760px){.topbar{min-height:70px!important;margin-top:10px!important;padding:6px 18px!important}.topbar h1{font-size:29px!important}.view{padding-top:12px!important}.metric-grid{margin:14px 0!important;gap:14px!important}.yearly-card,.average-card,.dashboard-yearly-total,.dashboard-yearly-average{min-height:150px!important;padding:18px 20px!important;border-radius:23px!important}.yearly-card p,.average-card p,.dashboard-yearly-total p,.dashboard-yearly-average p{margin-top:12px!important;font-size:14px!important}.yearly-card strong,.average-card strong,.dashboard-yearly-total strong,.dashboard-yearly-average strong{font-size:34px!important}.yearly-card small,.average-card small,.dashboard-yearly-total small,.dashboard-yearly-average small{font-size:12px!important}.monthly-sales-panel{margin:14px 0!important;padding:18px!important;border-radius:23px!important}.monthly-sales-panel h2{font-size:24px!important}.monthly-sales-chart svg{height:clamp(210px,25vh,260px)!important;width:100%!important}.chart-guide{margin-left:48px!important;font-size:11px!important}}
    @media(max-width:759px){.metric-grid{display:flex!important;grid-template-columns:none!important}.yearly-card,.average-card,.dashboard-yearly-total,.dashboard-yearly-average{flex:0 0 82%!important;min-height:182px!important;padding:22px!important}.yearly-card strong,.average-card strong,.dashboard-yearly-total strong,.dashboard-yearly-average strong{font-size:34px!important}.monthly-sales-panel .panel-heading{align-items:flex-start!important}.monthly-sales-panel .panel-heading>div:last-child{flex-wrap:wrap!important}}
  `;
  document.head.appendChild(style);
}

function installAppleChart() {
  if (typeof state === 'undefined' || typeof monthlySalesValue !== 'function') return;
  renderMonthlySalesChart = function () {
    const yearField = document.querySelector('#monthly-report-year');
    const metricField = document.querySelector('#monthly-report-metric');
    const chart = document.querySelector('#monthly-sales-chart');
    if (!yearField || !metricField || !chart) return;
    const selectedYear = Number(yearField.value) || new Date().getFullYear();
    const metric = metricField.value || 'sales';
    const points = Array.from({ length: 12 }, (_, monthIndex) => {
      const month = new Date(selectedYear, monthIndex, 1, 12);
      const sales = state.sales.reduce((sum, sale) => sum + monthlySalesValue(sale, month), 0);
      const expenses = state.expenses.filter(expense => { const date = new Date(`${expense.date}T12:00:00`); return date.getFullYear() === selectedYear && date.getMonth() === monthIndex; }).reduce((sum, expense) => sum + expense.amount, 0);
      return { month, value: metric === 'profit' ? sales - expenses : sales };
    });
    const title = document.querySelector('.monthly-sales-panel h2');
    if (title) title.textContent = metric === 'profit' ? 'Monthly profit by year' : 'Monthly sales by year';
    const ceiling = Math.max(1000, Math.ceil(Math.max(...points.map(point => Math.abs(point.value))) / 1000) * 1000);
    const width = 1000, height = 260, left = 62, right = 24, top = 28, bottom = 48, plotHeight = height - top - bottom;
    const step = (width - left - right) / 12;
    const compactMoney = value => value === 0 ? 'RM0' : `RM${value < 0 ? '-' : ''}${(Math.abs(value) / 1000).toFixed(Math.abs(value) >= 10000 ? 0 : 1)}K`;
    const valueY = value => top + plotHeight - (Math.max(0, value) / ceiling) * plotHeight;
    const grid = [ceiling, Math.round(ceiling / 2 / 1000) * 1000, 0].map(value => { const y = valueY(value); return `<line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" stroke="rgba(43,91,135,.18)" stroke-width="1"/><text x="${left - 13}" y="${y + 5}" text-anchor="end" fill="#667789" font-size="13">${compactMoney(value)}</text>`; }).join('');
    const bars = points.map((point, index) => {
      const x = left + step * index + (step - 34) / 2, y = valueY(point.value), heightValue = Math.max(point.value > 0 ? 7 : 3, top + plotHeight - y);
      const monthName = months[point.month.getMonth()].slice(0, 3), isCurrent = selectedYear === new Date().getFullYear() && index === new Date().getMonth();
      const fill = point.value < 0 ? 'url(#negativeBar)' : isCurrent ? 'url(#currentBar)' : 'url(#salesBar)';
      return `<g class="apple-chart-month${isCurrent ? ' is-current' : ''}" onclick="showMonthlySalesDetails(${selectedYear},${index})" role="button" aria-label="${monthName} ${compactMoney(point.value)}"><rect x="${x}" y="${y}" width="34" height="${heightValue}" rx="10" fill="${fill}"/><text x="${x + 17}" y="${Math.max(19, y - 11)}" text-anchor="middle" fill="${point.value < 0 ? '#bd5a55' : '#15755f'}" font-size="12" font-weight="700">${compactMoney(point.value)}</text><text x="${x + 17}" y="${height - 27}" text-anchor="middle" fill="#435261" font-size="13" font-weight="600">${monthName}</text></g>`;
    }).join('');
    chart.innerHTML = `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Monthly ${metric} for ${selectedYear}"><defs><linearGradient id="salesBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#20b878"/><stop offset="1" stop-color="#078d61"/></linearGradient><linearGradient id="currentBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d8fff"/><stop offset="1" stop-color="#0877df"/></linearGradient><linearGradient id="negativeBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f08b82"/><stop offset="1" stop-color="#d75a53"/></linearGradient></defs>${grid}${bars}</svg><div class="chart-guide"><span></span>Select a month to view its sales details</div>`;
  };
  const yearField = document.querySelector('#monthly-report-year'), metricField = document.querySelector('#monthly-report-metric');
  if (yearField && !yearField.dataset.appleChartBound) { yearField.dataset.appleChartBound = 'true'; yearField.addEventListener('change', renderMonthlySalesChart); }
  if (metricField && !metricField.dataset.appleChartBound) { metricField.dataset.appleChartBound = 'true'; metricField.addEventListener('change', renderMonthlySalesChart); }
  renderMonthlySalesChart();
  const style = document.createElement('style');
  style.textContent = '.monthly-sales-chart{margin-top:8px!important}.monthly-sales-chart svg{filter:none!important}.apple-chart-month{cursor:pointer;transition:opacity .18s ease}.apple-chart-month:hover{opacity:.72}.apple-chart-month.is-current rect{filter:drop-shadow(0 8px 12px rgba(9,119,223,.25))}.chart-guide{display:flex;align-items:center;gap:7px;margin:0 0 2px 62px;color:#627386;font-size:12px;font-weight:600}.chart-guide span{width:7px;height:7px;border-radius:50%;background:#0a84ff;box-shadow:0 0 0 4px rgba(10,132,255,.12)}';
  document.head.appendChild(style);
}

function installMonthlyBreakdown() {
  if (typeof state === 'undefined' || typeof monthlySalesValue !== 'function' || typeof monthlyDetailModal === 'undefined') return;
  showMonthlySalesDetails = function (year, monthIndex) {
    const month = new Date(year, monthIndex, 1, 12);
    const sales = state.sales.map(sale => ({ sale, amount: monthlySalesValue(sale, month) })).filter(item => item.amount > 0.001);
    const expenses = state.expenses.filter(expense => { const date = new Date(`${expense.date}T12:00:00`); return date.getFullYear() === year && date.getMonth() === monthIndex; });
    const salesTotal = sales.reduce((sum, item) => sum + item.amount, 0);
    const expenseTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const profit = salesTotal - expenseTotal;
    $('#monthly-detail-title').textContent = `${months[monthIndex]} ${year}`;
    $('#monthly-detail-total').innerHTML = `<div class="monthly-stat"><span>Sales</span><strong>${money(salesTotal)}</strong></div><div class="monthly-stat expense"><span>Expenses</span><strong>${money(expenseTotal)}</strong></div><div class="monthly-stat profit"><span>Profit</span><strong>${money(profit)}</strong></div>`;
    const salesRows = sales.length ? sales.map(({ sale, amount }) => `<div class="monthly-detail-row"><div><strong>${esc(sale.invoiceNumber || '—')} · ${esc(sale.client)}</strong><small>${esc(sale.product)}${sale.type === 'recurring' ? ' · Recurring' : ''}</small></div><strong>${money(amount)}</strong></div>`).join('') : '<div class="empty-state">No sales recorded for this month.</div>';
    const expenseRows = expenses.length ? expenses.map(expense => `<div class="monthly-detail-row expense-row"><div><strong>${esc(expense.category)}</strong><small>${esc(expense.description || 'Expense')}</small></div><strong>−${money(expense.amount)}</strong></div>`).join('') : '<div class="empty-state">No expenses recorded for this month.</div>';
    $('#monthly-detail-list').innerHTML = `<section class="monthly-detail-section"><h3>Sales</h3>${salesRows}</section><section class="monthly-detail-section"><h3>Expenses</h3>${expenseRows}</section>`;
    monthlyDetailModal.showModal();
  };
  window.showMonthlySalesDetails = showMonthlySalesDetails;
  const style = document.createElement('style');
  style.textContent = '.monthly-detail-modal{max-width:700px!important;background:rgba(249,253,255,.88)!important}.monthly-detail-total{display:grid!important;grid-template-columns:repeat(3,1fr);gap:10px!important;background:transparent!important;padding:0!important}.monthly-stat{padding:14px;border-radius:16px;background:linear-gradient(145deg,#e3f7ec,#d4f1e7)}.monthly-stat.expense{background:linear-gradient(145deg,#fff0e9,#ffe0d5)}.monthly-stat.profit{background:linear-gradient(145deg,#e1efff,#cce2ff)}.monthly-stat span{display:block;color:#657385;font-size:12px;font-weight:700}.monthly-stat strong{display:block;margin-top:5px;color:#192430;font-size:20px!important;font-family:inherit!important}.monthly-detail-section{margin-top:24px}.monthly-detail-section h3{margin:0 0 6px;font-size:14px;color:#324356}.expense-row>strong{color:#bd5a55}@media(max-width:600px){.monthly-detail-total{grid-template-columns:1fr!important}}';
  document.head.appendChild(style);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    restoreDashboardReport();
    applyYearlySummaryStyle();
    setTimeout(installYearlySummary, 0);
    setTimeout(installYearlySummary, 120);
    setTimeout(installAppleChart, 180);
    setTimeout(installMonthlyBreakdown, 200);
  }, { once: true });
} else {
  restoreDashboardReport();
  applyYearlySummaryStyle();
  setTimeout(installYearlySummary, 0);
  setTimeout(installYearlySummary, 120);
  setTimeout(installAppleChart, 180);
  setTimeout(installMonthlyBreakdown, 200);
}
