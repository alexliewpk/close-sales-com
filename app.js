const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const STORAGE = 'ledgerly-v1';
const now = new Date();
let state = JSON.parse(localStorage.getItem(STORAGE) || '{"sales":[],"payments":[],"expenses":[]}');
const SUPABASE_URL = 'https://xukgdrnqkwuxsmaqwvta.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_i_QWouaGp43S5jsC0_3UXA_1TyXSMly';
const SUPABASE_TABLE = 'trip_itineraries';
const SUPABASE_ROW_ID = 'sales-expense-2026';
// Lightweight REST client: works in every modern browser without a framework.
const supabaseClient = {
  from(table){
    const endpoint = `${SUPABASE_URL}/rest/v1/${table}`;
    const headers = {apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`,'Content-Type':'application/json'};
    const request = async (url, options={}) => {
      try {
        const response = await fetch(url,{...options,headers:{...headers,...options.headers}});
        const body = await response.json().catch(()=>null);
        return {data:response.ok ? body : null,error:response.ok ? null : (body || {message:`Cloud request failed (${response.status})`})};
      } catch (error) { return {data:null,error}; }
    };
    return {
      upsert: row => request(endpoint,{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(row)}),
      select: columns => ({eq:(column,value)=>({maybeSingle:async()=>{
        const result = await request(`${endpoint}?select=${encodeURIComponent(columns)}&${encodeURIComponent(column)}=eq.${encodeURIComponent(value)}`);
        return {data:Array.isArray(result.data) ? (result.data[0] || null) : result.data,error:result.error};
      }})})
    };
  }
};
const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const money = n => new Intl.NumberFormat('en-MY',{style:'currency',currency:'MYR',minimumFractionDigits:0,maximumFractionDigits:2}).format(n||0).replace('MYR','RM');
const dateVal = d => new Date(d+'T12:00:00');
const niceDate = d => dateVal(d).toLocaleDateString('en-MY',{day:'numeric',month:'short',year:'numeric'});
const today = () => {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0,10);
};
const save = () => { localStorage.setItem(STORAGE, JSON.stringify(state)); queueCloudSave(); };
function normalizeSySalary(){
  let changed = false;
  state.expenses.forEach(expense => {
    if (expense.category === 'Salary' && String(expense.description || '').trim().toUpperCase() === 'SY' && expense.amount !== 2914.25) {
      expense.amount = 2914.25;
      changed = true;
    }
  });
  return changed;
}
function backfillSySalary2026(){
  let changed = false;
  for(let month=0; month<12; month++){
    const date = `2026-${String(month+1).padStart(2,'0')}-23`;
    const hasSalary = state.expenses.some(expense => expense.category === 'Salary' && String(expense.description || '').trim().toUpperCase() === 'SY' && String(expense.date || '').slice(0,7) === date.slice(0,7));
    if(!hasSalary){
      state.expenses.push({id:`sy-salary-2026-${month+1}`,date,category:'Salary',description:'SY',amount:2914.25,notes:'Monthly salary'});
      changed = true;
    }
  }
  return changed;
}
let cloudSaveTimer;
function setCloudStatus(message){ const label=$('.sidebar-foot'); if(label) label.innerHTML=`<span class="dot"></span>${message}`; }
function queueCloudSave(){
  if(!supabaseClient) return;
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer=setTimeout(async()=>{
    const {error}=await supabaseClient.from(SUPABASE_TABLE).upsert({id:SUPABASE_ROW_ID,data:state,updated_at:new Date().toISOString()});
    setCloudStatus(error?'Cloud sync needs setup':'Saved to Supabase');
  },350);
}
async function syncFromSupabase(){
  if(!supabaseClient) return;
  setCloudStatus('Connecting to Supabase…');
  const {data,error}=await supabaseClient.from(SUPABASE_TABLE).select('data').eq('id',SUPABASE_ROW_ID).maybeSingle();
  if(error){ setCloudStatus('Cloud sync needs setup'); return; }
  const remoteHasRecords = Boolean(data?.data) && ((data.data.sales?.length||0) + (data.data.payments?.length||0) + (data.data.expenses?.length||0) > 0);
  const localHasRecords = (state.sales?.length||0) + (state.payments?.length||0) + (state.expenses?.length||0) > 0;
  // On the first sync, protect a browser that already has recorded sales.
  const localHasMoreSales = (state.sales?.length||0) > (data?.data?.sales?.length||0);
  if(remoteHasRecords && !localHasMoreSales){ state=data.data; let salaryUpdated=normalizeSySalary(); if(backfillSySalary2026())salaryUpdated=true; localStorage.setItem(STORAGE,JSON.stringify(state)); if(salaryUpdated)queueCloudSave(); setCloudStatus(salaryUpdated?'Salary records updated':'Loaded from Supabase'); try { renderAll(); } catch (renderError) { console.warn('Dashboard refresh skipped.', renderError); } }
  else if(localHasRecords){ queueCloudSave(); setCloudStatus('Saving local data to Supabase…'); }
  else { setCloudStatus('Cloud sync ready'); }
}
// Seed the supplied Facebook Ads transaction totals before the interface initializes.
const fbAdsSeed = [
  ['2026-01-30',12617.00,'January'],['2026-02-08',3845.79,'February'],
  ['2026-03-24',13554.82,'March'],['2026-04-26',11832.94,'April'],
  ['2026-05-12',4472.58,'May'],['2026-06-08',2887.82,'June']
];
if (!state.expenses.some(expense => expense.importKey === 'fb-ads-2026-monthly')) {
  fbAdsSeed.forEach(([date,amount,month], index) => state.expenses.unshift({
    id:`fb-ads-2026-${index+1}`, date, amount, category:'Advertising', description:`FB Ads — ${month} 2026`,
    notes:'Monthly total imported from Facebook Ads transactions.', importKey:'fb-ads-2026-monthly'
  }));
  save();
}
const sySalaryNormalized = normalizeSySalary();
const sySalaryBackfilled = backfillSySalary2026();
if (sySalaryNormalized || sySalaryBackfilled) save();
const totalFor = sale => {
  const subtotal = sale.type === 'recurring' ? sale.monthly * sale.months : sale.total;
  return subtotal * (sale.sst ? 1.08 : 1);
};
const paymentsFor = sale => state.payments.filter(p=>p.saleId===sale.id).reduce((a,p)=>a+p.amount,0);
const saleById = id => state.sales.find(s=>s.id===id);
const sameMonth = (d,m,y) => { const x=dateVal(d); return x.getMonth()===+m && x.getFullYear()===+y; };
function toast(msg){ const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200); }
function uid(){return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2)}

function init(){
  $('#today-label').textContent = now.toLocaleDateString('en-MY',{weekday:'short',day:'numeric',month:'short'});
  $('#dashboard-month').textContent = `${months[now.getMonth()]} ${now.getFullYear()}`;
  $('#month-description').textContent = `Here’s how ${months[now.getMonth()]} is shaping up.`;
  $$('input[type=date]').forEach(i=>i.value=today());
  $$('.nav-item').forEach(b=>b.onclick=()=>showView(b.dataset.view));
  $$('[data-view-link]').forEach(b=>b.onclick=()=>showView(b.dataset.viewLink));
  $$('.open-sale').forEach(b=>b.onclick=()=>openModal('sale-modal'));
  $('#open-payment').onclick=()=>{if(!state.sales.length)return toast('Add a sale before recording a payment.');populatePaymentSales();openModal('payment-modal')};
  $('#open-expense').onclick=()=>openModal('expense-modal');
  $$('.close-modal').forEach(b=>b.onclick=()=>b.closest('dialog').close());
  $('#sale-type').onchange=toggleSaleType; $('#sale-form').oninput=updateContractPreview;
  $('#sale-form').onsubmit=addSale; $('#payment-form').onsubmit=addPayment; $('#expense-form').onsubmit=addExpense;
  ['sales-month','sales-year','sales-client','sales-type'].forEach(id=>$('#'+id).onchange=renderSales);
  ['report-month','report-year','report-client','report-type'].forEach(id=>$('#'+id).onchange=renderReports);
  renderAll();
}
function showView(view){$$('.view').forEach(v=>v.classList.toggle('active',v.id===view));$$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));$('#page-title').textContent=({dashboard:'Good morning, Alex.',sales:'Sales pipeline',collections:'Cash collection',expenses:'Expense tracker',reports:'Reports'}[view]);$('#page-kicker').textContent=({dashboard:'BUSINESS SNAPSHOT',sales:'REVENUE',collections:'CASH FLOW',expenses:'OUTGOINGS',reports:'REPORTING'}[view]);window.scrollTo({top:0,behavior:'smooth'});}
function openModal(id){const d=$('#'+id);d.showModal();}
function toggleSaleType(){const recurring=$('#sale-type').value==='recurring';$('#lump-fields').classList.toggle('hidden',recurring);$('#recurring-fields').classList.toggle('hidden',!recurring);$('#lump-fields input').required=!recurring;$$('#recurring-fields input').forEach(i=>i.required=recurring);const invoiceModeField=$('#invoice-mode-field');if(invoiceModeField)invoiceModeField.style.display=recurring?'block':'none';updateContractPreview();}
function updateContractPreview(){const f=$('#sale-form');const subtotal=(+f.monthly.value||0)*(+f.months.value||0);$('#contract-preview').textContent=money(subtotal*($('#sst-option')?.checked?1.08:1));}
function addSale(e){e.preventDefault();const f=e.currentTarget;const invoiceMode=f.type.value==='recurring'?($('#invoice-mode')?.value||'one'):'one';const s={id:uid(),invoiceNumber:nextInvoiceNumber(),client:f.client.value.trim(),product:f.product.value.trim(),date:f.date.value,type:f.type.value,total:+f.total.value||0,monthly:+f.monthly.value||0,months:+f.months.value||0,sst:$('#sst-option').checked,invoiceMode,notes:f.notes.value.trim()};if(invoiceMode==='split')createSplitInvoices(s);else{state.sales.unshift(s);state.payments.unshift({id:uid(),saleId:s.id,date:s.date,amount:totalFor(s),method:'Recorded sale',notes:'Automatically marked as collected'});}save();f.reset();f.date.value=today();toggleSaleType();e.currentTarget.closest('dialog').close();renderAll();toast(invoiceMode==='split'?`${s.months} monthly invoices created.`:'Sale saved as collected.');}
function addPayment(e){e.preventDefault();const f=e.currentTarget,sale=saleById(f.saleId.value),amount=+f.amount.value;if(amount > totalFor(sale)-paymentsFor(sale)+.001)return toast('That amount exceeds the outstanding balance.');state.payments.unshift({id:uid(),saleId:sale.id,date:f.date.value,amount,method:f.method.value,notes:f.notes.value.trim()});save();f.reset();f.date.value=today();e.currentTarget.closest('dialog').close();renderAll();toast('Payment recorded.');}
function addExpense(e){e.preventDefault();const f=e.currentTarget;const category=expenseCategoryPicker.value==='__new__'?newExpenseCategory.value.trim():f.category.value;if(!category)return toast('Please enter a category.');const recurring=$('#expense-recurring-option')?.checked;const months=recurring?Math.max(1,+$('#expense-recurring-months').value||1):1;for(let month=0;month<months;month++){state.expenses.unshift({id:uid(),date:recurring?splitInvoiceDate(f.date.value,month):f.date.value,category,description:f.description.value.trim(),amount:+f.amount.value,notes:f.notes.value.trim(),recurring,installment:recurring?month+1:undefined,installments:recurring?months:undefined});}save();f.reset();f.date.value=today();e.currentTarget.closest('dialog').close();renderAll();toast(recurring?`${months} recurring expenses added.`:'Expense added.');}
function removeItem(type,id){
  const itemLabel = type==='sales' ? 'this sale and its related records' : 'this entry';
  if (!window.confirm(`Delete ${itemLabel}?`)) return;
  if (!window.confirm('Final confirmation: this action cannot be undone. Delete now?')) return;
  state[type]=state[type].filter(x=>x.id!==id);
  if(type==='sales')state.payments=state.payments.filter(p=>p.saleId!==id);
  save();renderAll();toast('Entry removed.');
}
function renderAll(){populateFilters();renderDashboard();renderSales();renderPayments();renderExpenses();renderReports();}
function populateFilters(){const years=[...new Set([...state.sales.map(s=>dateVal(s.date).getFullYear()),...state.payments.map(p=>dateVal(p.date).getFullYear()),...state.expenses.map(e=>dateVal(e.date).getFullYear()),now.getFullYear()])].sort((a,b)=>b-a);const clients=[...new Set(state.sales.map(s=>s.client))].sort();const selectOptions=(id,items,format=x=>x)=>{const el=$('#'+id),old=el.value,first=el.options[0]?.outerHTML||'';el.innerHTML=first+items.map(x=>`<option value="${x}">${format(x)}</option>`).join('');el.value=old};selectOptions('sales-month',months.map((_,i)=>i),i=>months[i]);selectOptions('sales-year',years);selectOptions('sales-client',clients);selectOptions('report-month',months.map((_,i)=>i),i=>months[i]);selectOptions('report-year',years);selectOptions('report-client',clients);if(!$('#report-month').value)$('#report-month').value=now.getMonth();if(!$('#report-year').value)$('#report-year').value=now.getFullYear();}
function renderDashboard(){const m=now.getMonth(),y=now.getFullYear();const sales=state.sales.filter(s=>sameMonth(s.date,m,y));const pays=state.payments.filter(p=>sameMonth(p.date,m,y));const exps=state.expenses.filter(e=>sameMonth(e.date,m,y));const outstanding=state.sales.reduce((a,s)=>a+totalFor(s)-paymentsFor(s),0);const recurring=state.sales.filter(s=>s.type==='recurring');$('#metric-sales').textContent=money(sales.reduce((a,s)=>a+totalFor(s),0));$('#metric-collected').textContent=money(pays.reduce((a,p)=>a+p.amount,0));$('#metric-expenses').textContent=money(exps.reduce((a,e)=>a+e.amount,0));$('#metric-outstanding').textContent=money(outstanding);$('#metric-mrr').textContent=money(recurring.reduce((a,s)=>a+s.monthly,0));$('#metric-sales-count').textContent=`${sales.length} sale${sales.length===1?'':'s'} booked`;$('#metric-collection-count').textContent=`${pays.length} payment${pays.length===1?'':'s'} received`;$('#metric-expense-count').textContent=`${exps.length} expense${exps.length===1?'':'s'} recorded`;$('#metric-outstanding-count').textContent=`Across ${state.sales.filter(s=>totalFor(s)>paymentsFor(s)).length} open sale${state.sales.filter(s=>totalFor(s)>paymentsFor(s)).length===1?'':'s'}`;$('#mrr-list').innerHTML=recurring.length?recurring.slice(0,4).map(s=>`<div class="mini-row"><div><strong>${esc(s.client)}</strong><span>${esc(s.product)} · ${s.months} months</span></div><strong>${money(s.monthly)}<small>/mo</small></strong></div>`).join(''):'No recurring plans yet.';const activity=[...state.sales.map(s=>({...s,kind:'sale'})),...state.payments.map(p=>({...p,kind:'payment'}))].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);$('#activity-list').innerHTML=activity.length?activity.map(a=>a.kind==='sale'?`<div class="activity-row"><div class="activity-left"><span class="activity-dot">↗</span><div><strong>${esc(a.client)}</strong><small>New sale · ${niceDate(a.date)}</small></div></div><strong>${money(totalFor(a))}</strong></div>`:(()=>{const s=saleById(a.saleId);return `<div class="activity-row"><div class="activity-left"><span class="activity-dot">↓</span><div><strong>${esc(s?.client||'Deleted sale')}</strong><small>Payment received · ${niceDate(a.date)}</small></div></div><strong>${money(a.amount)}</strong></div>`})()).join(''):'Your recent sales and payments will appear here.';}
function renderSales(){const m=$('#sales-month').value,y=$('#sales-year').value,c=$('#sales-client').value,t=$('#sales-type').value;const rows=state.sales.filter(s=>(m===''||dateVal(s.date).getMonth()===+m)&&(y===''||dateVal(s.date).getFullYear()===+y)&&(!c||s.client===c)&&(!t||s.type===t));$('#sales-table').innerHTML=rows.map(s=>{const total=totalFor(s),paid=paymentsFor(s);return `<tr class="clickable-sale" onclick="editSale('${s.id}')"><td><strong>${esc(s.invoiceNumber||'—')}</strong></td><td><strong>${esc(s.client)}</strong></td><td>${esc(s.product)}</td><td>${niceDate(s.date)}</td><td><span class="badge ${s.type}">${s.type==='lump'?'Lump sum':'Recurring'}</span>${s.sst?' <span class="sst-badge">SST 8%</span>':''}</td><td><strong>${money(total)}</strong></td><td>${money(paid)}</td><td>${money(total-paid)}</td><td><button class="duplicate-sale-btn" title="Duplicate sale" onclick="event.stopPropagation();duplicateSale('${s.id}')">Duplicate</button><button class="delete-btn" title="Delete sale" onclick="event.stopPropagation();removeItem('sales','${s.id}')">×</button></td></tr>`}).join('');$('#sales-empty').style.display=rows.length?'none':'block';}
function renderPayments(){const rows=state.payments.sort((a,b)=>b.date.localeCompare(a.date));$('#payments-table').innerHTML=rows.map(p=>{const s=saleById(p.saleId);return `<tr><td>${niceDate(p.date)}</td><td><strong>${esc(s?.client||'—')}</strong></td><td>${esc(s?.product||'—')}</td><td>${esc(p.method)}</td><td><strong>${money(p.amount)}</strong></td><td>${esc(p.notes||'—')}</td><td><button class="delete-btn" onclick="removeItem('payments','${p.id}')">×</button></td></tr>`}).join('');$('#payments-empty').style.display=rows.length?'none':'block';const collected=state.payments.reduce((a,p)=>a+p.amount,0), open=state.sales.filter(s=>totalFor(s)>paymentsFor(s));$('#all-collected').textContent=money(collected);$('#open-invoices').textContent=open.length;$('#all-outstanding').textContent=money(open.reduce((a,s)=>a+totalFor(s)-paymentsFor(s),0));}
function renderExpenses(){const rows=state.expenses.sort((a,b)=>b.date.localeCompare(a.date));$('#expenses-table').innerHTML=rows.map(e=>`<tr><td>${niceDate(e.date)}</td><td><span class="badge lump">${esc(e.category)}</span></td><td><strong>${esc(e.description)}</strong></td><td><strong>${money(e.amount)}</strong></td><td>${esc(e.notes||'—')}</td><td><button class="delete-btn" onclick="removeItem('expenses','${e.id}')">×</button></td></tr>`).join('');$('#expenses-empty').style.display=rows.length?'none':'block';$('#all-expenses').textContent=money(state.expenses.reduce((a,e)=>a+e.amount,0));}
function renderReports(){const m=+$('#report-month').value,y=+$('#report-year').value,c=$('#report-client').value,t=$('#report-type').value;const sales=state.sales.filter(s=>sameMonth(s.date,m,y)&&(!c||s.client===c)&&(!t||s.type===t));const saleIds=new Set(sales.map(s=>s.id));const cash=state.payments.filter(p=>sameMonth(p.date,m,y)&&(!c||saleById(p.saleId)?.client===c)&&(!t||saleById(p.saleId)?.type===t));const exp=state.expenses.filter(e=>sameMonth(e.date,m,y));$('#report-sales').textContent=money(sales.reduce((a,s)=>a+totalFor(s),0));$('#report-cash').textContent=money(cash.reduce((a,p)=>a+p.amount,0));$('#report-expenses').textContent=money(exp.reduce((a,e)=>a+e.amount,0));$('#report-period').textContent=`${months[m]} ${y}`;$('#report-sales-list').innerHTML=sales.length?sales.map(s=>`<div class="report-row"><div><strong>${esc(s.client)}</strong><span> · ${esc(s.product)}</span><small> ${s.type==='recurring'?`(${money(s.monthly)} × ${s.months} months)`:'Lump sum'}</small></div><strong>${money(totalFor(s))}</strong></div>`).join(''):'No sales for this period.';}
function populatePaymentSales(){const el=$('#payment-sale');const old=el.value;el.innerHTML='<option value="" disabled selected>Choose a sale…</option>'+state.sales.filter(s=>totalFor(s)>paymentsFor(s)).map(s=>`<option value="${s.id}">${esc(s.client)} — ${esc(s.product)} (${money(totalFor(s)-paymentsFor(s))} due)</option>`).join('');el.value=old;}
function esc(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
window.removeItem=removeItem;
try { init(); } catch (error) { console.warn('A legacy dashboard widget was skipped.', error); }
syncFromSupabase();

// Client names are reusable: choose a saved client, or add a new one from the same field.
const clientInput = $('#sale-form [name="client"]');
const clientPicker = document.createElement('select');
clientPicker.name = 'clientPicker';
clientInput.parentElement.insertBefore(clientPicker, clientInput);
const clientHelp = document.createElement('small');
clientHelp.textContent = 'Select an existing client, or choose “+ Add new client”.';
clientHelp.style.cssText = 'font-size:10px;font-weight:500;color:#78817f;margin-top:-2px';
clientInput.parentElement.appendChild(clientHelp);
function useClientPicker(){
  const isNew = clientPicker.value === '__new__';
  clientInput.style.display = isNew ? 'block' : 'none';
  clientInput.required = isNew;
  clientPicker.required = !isNew;
  if (isNew) { clientInput.value = ''; clientInput.focus(); }
  else if (clientPicker.value) clientInput.value = clientPicker.value;
}
function refreshClientOptions(){
  const clients = [...new Set(state.sales.map(s => s.client))].sort();
  clientPicker.innerHTML = '<option value="" selected disabled>Select a client…</option>' + clients.map(client => `<option value="${esc(client)}">${esc(client)}</option>`).join('') + '<option value="__new__">+ Add new client</option>';
  clientInput.style.display = 'none';
  clientInput.required = false;
  clientPicker.required = true;
}
clientPicker.addEventListener('change', useClientPicker);
$$('.open-sale').forEach(button => button.addEventListener('click', refreshClientOptions));
refreshClientOptions();

// Optional SST is applied to the contract value and all downstream reporting.
const sstLabel = document.createElement('label');
sstLabel.style.cssText = 'display:flex;align-items:center;gap:9px;margin:5px 0 16px;font-size:12px;font-weight:700;color:#42514d;cursor:pointer';
sstLabel.innerHTML = '<input id="sst-option" type="checkbox" style="width:16px;height:16px;accent-color:#176c59"> Add SST 8% <small style="font-weight:500;color:#78817f">(included in contract value)</small>';
$('#lump-fields').after(sstLabel);
$('#sst-option').addEventListener('change', updateContractPreview);

function editClient(saleId){
  const sale = saleById(saleId);
  if (!sale) return;
  const newName = window.prompt('Edit client name. This will update all sales for this client.', sale.client);
  if (!newName || newName.trim() === sale.client) return;
  const oldName = sale.client;
  state.sales.forEach(item => { if (item.client === oldName) item.client = newName.trim(); });
  save();
  renderAll();
  toast('Client name updated.');
}
window.editClient = editClient;

const salesUiStyle = document.createElement('style');
salesUiStyle.textContent = '.edit-client-btn{display:none}.sst-badge{display:inline-block;margin-left:4px;background:#e9f0fb;color:#45658b;border-radius:20px;padding:4px 7px;font-size:10px;font-weight:700;white-space:nowrap}';
document.head.appendChild(salesUiStyle);

const baseRenderDashboard = renderDashboard;
renderDashboard = function(){
  baseRenderDashboard();
  const recurringContracts = new Set();
  const mrrWithSst = state.sales.filter(s => s.type === 'recurring').reduce((sum, sale) => {
    const contractKey = sale.contractId || sale.id;
    if (recurringContracts.has(contractKey)) return sum;
    recurringContracts.add(contractKey);
    return sum + sale.monthly * (sale.sst ? 1.08 : 1);
  }, 0);
  $('#metric-mrr').textContent = money(mrrWithSst);
};

// Services are reusable too: select a saved service or add one while creating a sale.
const productInput = $('#sale-form [name="product"]');
const productPicker = document.createElement('select');
productPicker.name = 'productPicker';
productInput.parentElement.insertBefore(productPicker, productInput);
const productHelp = document.createElement('small');
productHelp.textContent = 'Select an existing service, or choose “+ Add new service”.';
productHelp.style.cssText = 'font-size:10px;font-weight:500;color:#78817f;margin-top:-2px';
productInput.parentElement.appendChild(productHelp);
function useProductPicker(){
  const isNew = productPicker.value === '__new__';
  productInput.style.display = isNew ? 'block' : 'none';
  productInput.required = isNew;
  productPicker.required = !isNew;
  if (isNew) { productInput.value = ''; productInput.focus(); }
  else if (productPicker.value) productInput.value = productPicker.value;
}
function refreshProductOptions(){
  const products = [...new Set(state.sales.map(s => s.product))].sort();
  productPicker.innerHTML = '<option value="" selected disabled>Select a service…</option>' + products.map(product => `<option value="${esc(product)}">${esc(product)}</option>`).join('') + '<option value="__new__">+ Add new service</option>';
  productInput.style.display = 'none';
  productInput.required = false;
  productPicker.required = true;
}
productPicker.addEventListener('change', useProductPicker);
$$('.open-sale').forEach(button => button.addEventListener('click', refreshProductOptions));
refreshProductOptions();

// Full-sale editing reuses the sale form, so every calculation stays consistent.
const saleForm = $('#sale-form');
function setSaleFormMode(editing){
  $('#sale-modal .modal-head .eyebrow').textContent = editing ? 'EDIT SALE' : 'NEW SALE';
  $('#sale-modal .modal-head h2').textContent = editing ? 'Edit sale' : 'Add a sale';
  $('#sale-modal .primary-btn[type="submit"]').textContent = editing ? 'Save changes' : 'Save sale';
  $('#invoice-edit-field').style.display = editing ? 'grid' : 'none';
}
function editSale(saleId){
  const sale = saleById(saleId);
  if (!sale) return;
  refreshClientOptions(); refreshProductOptions();
  saleForm.dataset.editId = saleId;
  saleForm.onsubmit = updateSale;
  setSaleFormMode(true);
  clientPicker.value = sale.client; useClientPicker();
  productPicker.value = sale.product; useProductPicker();
  saleForm.date.value = sale.date;
  saleForm.type.value = sale.type;
  saleForm.total.value = sale.total || '';
  saleForm.monthly.value = sale.monthly || '';
  saleForm.months.value = sale.months || '';
  invoiceInput.value = sale.invoiceNumber || '';
  $('#sst-option').checked = !!sale.sst;
  saleForm.notes.value = sale.notes || '';
  toggleSaleType(); updateContractPreview();
  $('#sale-modal').showModal();
}
function updateSale(e){
  e.preventDefault();
  const f = e.currentTarget, sale = saleById(f.dataset.editId);
  if (!sale) return;
  const proposedTotal = (f.type.value === 'recurring' ? (+f.monthly.value || 0) * (+f.months.value || 0) : (+f.total.value || 0)) * ($('#sst-option').checked ? 1.08 : 1);
  if (paymentsFor(sale) > proposedTotal + 0.001) return toast('New contract value cannot be lower than the amount already collected.');
  const invoiceNumber = invoiceInput.value.trim().toUpperCase();
  if (!invoiceNumber) return toast('Please enter an invoice number.');
  if (state.sales.some(item => item.id !== sale.id && item.invoiceNumber === invoiceNumber)) return toast('That invoice number is already in use.');
  Object.assign(sale, {invoiceNumber,client:f.client.value.trim(),product:f.product.value.trim(),date:f.date.value,type:f.type.value,total:+f.total.value||0,monthly:+f.monthly.value||0,months:+f.months.value||0,sst:$('#sst-option').checked,notes:f.notes.value.trim()});
  save(); f.reset(); f.date.value=today(); f.dataset.editId=''; f.onsubmit=addSale;
  setSaleFormMode(false); toggleSaleType(); e.currentTarget.closest('dialog').close(); renderAll(); toast('Sale updated.');
}
window.editSale = editSale;
function duplicateSale(saleId){
  const sale = saleById(saleId);
  if (!sale) return;
  editSale(saleId);
  saleForm.dataset.editId = '';
  saleForm.onsubmit = addSale;
  saleForm.date.value = today();
  $('#sale-modal .modal-head .eyebrow').textContent = 'DUPLICATE SALE';
  $('#sale-modal .modal-head h2').textContent = 'Duplicate sale';
  $('#sale-modal .primary-btn[type="submit"]').textContent = 'Save duplicate';
}
window.duplicateSale = duplicateSale;
$$('.open-sale').forEach(button => button.addEventListener('click', () => { saleForm.dataset.editId=''; saleForm.onsubmit=addSale; setSaleFormMode(false); }));

const editSaleStyle = document.createElement('style');
editSaleStyle.textContent = '.duplicate-sale-btn{border:0;border-radius:6px;padding:6px 9px;font-size:11px;font-weight:700;cursor:pointer;margin-right:6px;background:#edf0ed;color:#4c5a55}.duplicate-sale-btn:hover{background:#e1e6e1}.clickable-sale{cursor:pointer}.clickable-sale:hover td{background:#f7faf6}.collection-card,.balance-card,.topbar .open-sale,.nav-item[data-view="collections"]{display:none!important}@media(min-width:681px){.metric-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}';
document.head.appendChild(editSaleStyle);

// Expense categories can be selected from history or created on the spot.
const expenseCategoryPicker = $('#expense-form [name="category"]');
const newExpenseCategory = document.createElement('input');
newExpenseCategory.type = 'text';
newExpenseCategory.placeholder = 'Enter new category';
newExpenseCategory.required = false;
newExpenseCategory.style.display = 'none';
expenseCategoryPicker.after(newExpenseCategory);
const categoryHelp = document.createElement('small');
categoryHelp.textContent = 'Select an existing category, or choose “+ Add new category”.';
categoryHelp.style.cssText = 'font-size:10px;font-weight:500;color:#78817f;margin-top:5px';
newExpenseCategory.after(categoryHelp);
function useExpenseCategoryPicker(){
  const isNew = expenseCategoryPicker.value === '__new__';
  newExpenseCategory.style.display = isNew ? 'block' : 'none';
  newExpenseCategory.required = isNew;
  if (isNew) { newExpenseCategory.value=''; newExpenseCategory.focus(); }
}
function refreshExpenseCategories(){
  const defaults = ['Marketing','Advertising','Software','Salary','Travel','Miscellaneous'];
  const categories = [...new Set([...defaults, ...state.expenses.map(expense => expense.category)])].sort();
  expenseCategoryPicker.innerHTML = '<option value="" selected disabled>Select a category…</option>' + categories.map(category => `<option value="${esc(category)}">${esc(category)}</option>`).join('') + '<option value="__new__">+ Add new category</option>';
  newExpenseCategory.style.display = 'none';
  newExpenseCategory.required = false;
}
expenseCategoryPicker.addEventListener('change', useExpenseCategoryPicker);
$('#open-expense').addEventListener('click', refreshExpenseCategories);
refreshExpenseCategories();

// Recurring expenses create one expense record for each month in the selected period.
const recurringExpenseField = document.createElement('div');
recurringExpenseField.className = 'recurring-expense-field';
recurringExpenseField.innerHTML = '<label class="recurring-expense-check"><input id="expense-recurring-option" type="checkbox"> Recurring monthly expense</label><label id="expense-recurring-months-field" style="display:none">Number of months<input id="expense-recurring-months" type="number" min="1" value="12"></label><small>Creates one expense entry for every month.</small>';
$('#expense-form [name="amount"]').closest('label').after(recurringExpenseField);
$('#expense-recurring-option').addEventListener('change', event => { $('#expense-recurring-months-field').style.display = event.target.checked ? 'grid' : 'none'; });
const recurringExpenseStyle = document.createElement('style');
recurringExpenseStyle.textContent = '.recurring-expense-field{margin:-2px 0 15px}.recurring-expense-check{display:flex;align-items:center;gap:9px;margin-bottom:10px;cursor:pointer}.recurring-expense-check input{width:16px;height:16px;accent-color:#176c59}.recurring-expense-field small{display:block;color:#78817f;font-size:10px;margin-top:5px}';
document.head.appendChild(recurringExpenseStyle);

// Invoice numbers are assigned once and continue in sequence for future sales.
function invoiceValue(invoice){
  const match = /^INV(\d+)$/.exec(invoice || '');
  return match ? Number(match[1]) : 0;
}
function nextInvoiceNumber(){
  const latest = Math.max(20669, ...state.sales.map(sale => invoiceValue(sale.invoiceNumber)));
  return `INV${latest + 1}`;
}
function ensureInvoiceNumbers(){
  let changed = false;
  state.sales.filter(sale => !sale.invoiceNumber).sort((a,b) => a.date.localeCompare(b.date)).forEach(sale => {
    sale.invoiceNumber = nextInvoiceNumber();
    changed = true;
  });
  if (changed) save();
}
const invoiceHeader = document.createElement('th');
invoiceHeader.textContent = 'Invoice no.';
$('#sales table thead tr').insertBefore(invoiceHeader, $('#sales table thead tr').firstChild);
ensureInvoiceNumbers();
renderAll();

// Invoice numbers stay automatic for new sales, but are editable from the sale editor.
const invoiceEditField = document.createElement('label');
invoiceEditField.id = 'invoice-edit-field';
invoiceEditField.style.display = 'none';
invoiceEditField.innerHTML = 'Invoice number<input id="invoice-input" type="text" placeholder="e.g. INV20670" autocomplete="off">';
$('#sale-form .form-grid').prepend(invoiceEditField);
const invoiceInput = $('#invoice-input');

// Recurring contracts may be billed in one invoice or as one invoice per month.
function splitInvoiceDate(baseDate, offset){
  const source = dateVal(baseDate);
  const target = new Date(source.getFullYear(), source.getMonth() + offset, 1, 12);
  const finalDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(source.getDate(), finalDay));
  return target.toISOString().slice(0,10);
}
function createSplitInvoices(baseSale){
  for(let month=0; month<baseSale.months; month++){
    const sale = {...baseSale,id:uid(),invoiceNumber:nextInvoiceNumber(),date:splitInvoiceDate(baseSale.date,month),months:1,invoiceMode:'split',contractId:baseSale.id,installment:month+1,installments:baseSale.months};
    sale.notes = `${baseSale.notes||''}${baseSale.notes?' · ':''}Invoice ${month+1} of ${baseSale.months}`;
    state.sales.unshift(sale);
    state.payments.unshift({id:uid(),saleId:sale.id,date:sale.date,amount:totalFor(sale),method:'Recorded sale',notes:'Automatically marked as collected'});
  }
}
const invoiceModeField = document.createElement('div');
invoiceModeField.id = 'invoice-mode-field';
invoiceModeField.style.cssText = 'display:block;margin:0 0 15px;max-width:calc(50% - 7px)';
invoiceModeField.innerHTML = '<label>Invoice creation<select id="invoice-mode"><option value="one">One invoice — full contract</option><option value="split">Multiple invoices — one per month</option></select><small style="font-size:10px;font-weight:500;color:#78817f">Choose how this recurring sale should be invoiced.</small></label>';
$('#recurring-fields').after(invoiceModeField);

// This simplified tracker treats every recorded sale as fully collected.
function ensureCollectedSales(){
  let changed = false;
  state.sales.forEach(sale => {
    const difference = totalFor(sale) - paymentsFor(sale);
    if (difference > 0.001) {
      state.payments.unshift({id:uid(),saleId:sale.id,date:sale.date,amount:difference,method:'Recorded sale',notes:'Automatically marked as collected'});
      changed = true;
    }
  });
  if (changed) save();
}
ensureCollectedSales();
const salesHeaderRow = $('#sales table thead tr');
salesHeaderRow.children[7].remove();
salesHeaderRow.children[6].remove();
const collectedColumnsStyle = document.createElement('style');
collectedColumnsStyle.textContent = '#sales-table td:nth-child(7),#sales-table td:nth-child(8){display:none}';
document.head.appendChild(collectedColumnsStyle);
renderAll();

// Dashboard monthly sales report.
const dashboardNav = $('.nav-item[data-view="dashboard"]');
dashboardNav.innerHTML = '<span>⌂</span> Dashboard';
const monthlyReportPanel = document.createElement('article');
monthlyReportPanel.className = 'panel monthly-sales-panel';
monthlyReportPanel.innerHTML = '<div class="panel-heading"><div><p class="eyebrow">SALES REPORT</p><h2>Monthly sales by year</h2></div><div style="display:flex;gap:8px"><select id="monthly-report-metric" class="report-year-select" aria-label="Report metric" onchange="renderMonthlySalesChart()"><option value="sales">Sales</option><option value="profit">Profit</option></select><select id="monthly-report-year" class="report-year-select" aria-label="Report year"></select></div></div><div id="monthly-sales-chart" class="monthly-sales-chart"></div>';
$('.metric-grid').after(monthlyReportPanel);
function monthlySalesValue(sale, month){
  const saleMonth = dateVal(sale.date);
  if (sale.type !== 'recurring') return saleMonth.getFullYear()===month.getFullYear() && saleMonth.getMonth()===month.getMonth() ? totalFor(sale) : 0;
  if (sale.contractId || (sale.invoiceMode === 'split' && sale.months === 1)) return saleMonth.getFullYear()===month.getFullYear() && saleMonth.getMonth()===month.getMonth() ? totalFor(sale) : 0;
  const startIndex = saleMonth.getFullYear()*12 + saleMonth.getMonth();
  const targetIndex = month.getFullYear()*12 + month.getMonth();
  return targetIndex >= startIndex && targetIndex < startIndex + sale.months ? sale.monthly * (sale.sst ? 1.08 : 1) : 0;
}
function renderDashboardMonthlySplit(){
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const activeSales = state.sales.filter(sale => monthlySalesValue(sale, currentMonth) > 0);
  $('#metric-sales').textContent = money(activeSales.reduce((sum,sale) => sum + monthlySalesValue(sale,currentMonth),0));
  $('#metric-sales-count').textContent = `${activeSales.length} active sale${activeSales.length===1?'':'s'} this month`;
}
function populateMonthlyReportYears(){
  const selector = $('#monthly-report-year');
  const existing = selector.value;
  const years = [...new Set([now.getFullYear(), ...state.sales.map(sale => dateVal(sale.date).getFullYear())])].sort((a,b)=>b-a);
  selector.innerHTML = years.map(year => `<option value="${year}">${year}</option>`).join('');
  selector.value = years.includes(Number(existing)) ? existing : String(now.getFullYear());
}
function renderMonthlySalesChart(){
  const points = [];
  const selectedYear = Number($('#monthly-report-year').value || now.getFullYear());
  const metric = $('#monthly-report-metric')?.value || 'sales';
  for(let monthIndex=0;monthIndex<12;monthIndex++){
    const month = new Date(selectedYear, monthIndex, 1, 12);
    const salesValue = state.sales.reduce((sum,sale)=>sum+monthlySalesValue(sale,month),0);
    const expenseValue = state.expenses.filter(expense => { const date=dateVal(expense.date); return date.getFullYear()===month.getFullYear() && date.getMonth()===month.getMonth(); }).reduce((sum,expense)=>sum+expense.amount,0);
    const value = metric==='profit' ? salesValue-expenseValue : salesValue;
    points.push({month,value});
  }
  const max = Math.max(1000, ...points.map(point=>point.value));
  const ceiling = Math.ceil(max / 1000) * 1000;
  const width=1000, height=320, left=74, right=28, top=28, baseline=218, plotHeight=180;
  const x = index => left + index * ((width-left-right)/11);
  const y = value => baseline - (value/ceiling)*plotHeight;
  const moneyLabel = value => value===0?'RM0':`RM${value>=1000?(value/1000).toFixed(value%1000?'1':'0')+'K':value}`;
  const grid=[ceiling,ceiling/2,0].map(value=>`<line x1="${left}" y1="${y(value)}" x2="${width-right}" y2="${y(value)}" stroke="#d7e0e2" stroke-width="2"/><text x="${left-12}" y="${y(value)+6}" text-anchor="end" fill="#65757b" font-size="15">${moneyLabel(value)}</text>`).join('');
  const bars=points.map((point,index)=>point.value?`<rect class="monthly-data-point" x="${x(index)-15}" y="${y(point.value)}" width="30" height="${baseline-y(point.value)}" rx="5" fill="#078443" onclick="showMonthlySalesDetails(${selectedYear},${index})"/>`:'').join('');
  const line=points.map((point,index)=>`${index?'L':'M'} ${x(index)} ${y(point.value)}`).join(' ');
  const dots=points.map((point,index)=>`<circle class="monthly-data-point" cx="${x(index)}" cy="${y(point.value)}" r="5.5" fill="#f6b934" stroke="#27363a" stroke-width="2" onclick="showMonthlySalesDetails(${selectedYear},${index})"/>`).join('');
  const labels=points.map((point,index)=>`<text x="${x(index)}" y="${baseline+32}" text-anchor="middle" fill="#3f4d50" font-size="14">${months[point.month.getMonth()].slice(0,3)}</text>`).join('');
  const valueLabels=points.map((point,index)=>point.value?`<text x="${x(index)}" y="${Math.max(18,y(point.value)-12)}" text-anchor="middle" fill="#176c59" font-size="12" font-weight="700">${moneyLabel(point.value)}</text>`:'').join('');
  $('#monthly-sales-chart').innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Monthly sales for ${selectedYear}">${grid}<path d="${line}" fill="none" stroke="#27363a" stroke-width="2"/>${bars}${dots}${valueLabels}${labels}</svg>`;
}
const dashboardWithMonthlyReport = renderDashboard;
renderDashboard = function(){ dashboardWithMonthlyReport(); renderDashboardMonthlySplit(); populateMonthlyReportYears(); renderMonthlySalesChart(); };
renderAll();
const monthlyReportStyle = document.createElement('style');
monthlyReportStyle.textContent = '.monthly-sales-panel{margin:18px 0}.monthly-sales-chart{margin-top:12px;width:100%;overflow-x:auto}.monthly-sales-chart svg{display:block;min-width:660px;width:100%;height:auto}.report-year-select{border:1px solid #dce2dc;background:#e5eee6;border-radius:99px;padding:8px 28px 8px 12px;color:#176c59;font:600 12px "DM Sans",sans-serif}@media(max-width:680px){.monthly-sales-panel{padding:16px}.monthly-sales-chart svg{min-width:620px}}';
document.head.appendChild(monthlyReportStyle);
$('#monthly-report-year').addEventListener('change', renderMonthlySalesChart);

// Clicking a month in the chart opens the sales that make up that monthly total.
const monthlyDetailModal = document.createElement('dialog');
monthlyDetailModal.className = 'modal monthly-detail-modal';
monthlyDetailModal.innerHTML = '<div class="monthly-detail-content"><div class="modal-head"><div><p class="eyebrow">MONTHLY SALES DETAILS</p><h2 id="monthly-detail-title">Monthly sales</h2></div><button type="button" class="close-monthly-detail" aria-label="Close">×</button></div><div id="monthly-detail-total" class="monthly-detail-total"></div><div id="monthly-detail-list" class="monthly-detail-list"></div></div>';
document.body.appendChild(monthlyDetailModal);
function showMonthlySalesDetails(year, monthIndex){
  const month = new Date(year, monthIndex, 1, 12);
  const details = state.sales.map(sale => ({sale,amount:monthlySalesValue(sale,month)})).filter(item => item.amount > 0.001);
  const total = details.reduce((sum,item)=>sum+item.amount,0);
  $('#monthly-detail-title').textContent = `${months[monthIndex]} ${year}`;
  $('#monthly-detail-total').innerHTML = `<span>Total sales</span><strong>${money(total)}</strong>`;
  $('#monthly-detail-list').innerHTML = details.length ? details.map(({sale,amount}) => `<div class="monthly-detail-row"><div><strong>${esc(sale.invoiceNumber||'—')} · ${esc(sale.client)}</strong><small>${esc(sale.product)}${sale.type==='recurring'?' · Recurring':''}</small></div><strong>${money(amount)}</strong></div>`).join('') : '<div class="empty-state">No sales recorded for this month.</div>';
  monthlyDetailModal.showModal();
}
window.showMonthlySalesDetails = showMonthlySalesDetails;
monthlyDetailModal.querySelector('.close-monthly-detail').onclick = () => monthlyDetailModal.close();
const monthlyDetailStyle = document.createElement('style');
monthlyDetailStyle.textContent = '.monthly-data-point{cursor:pointer}.monthly-data-point:hover{filter:brightness(.88)}.monthly-detail-content{padding:27px}.monthly-detail-modal{max-width:620px}.monthly-detail-total{display:flex;align-items:center;justify-content:space-between;background:#e5f2e5;border-radius:10px;padding:16px 18px;margin:8px 0 17px;color:#52715d}.monthly-detail-total strong{font:27px "DM Serif Display",serif;color:#176c59}.monthly-detail-list{max-height:360px;overflow:auto}.monthly-detail-row{display:flex;justify-content:space-between;gap:16px;padding:14px 0;border-top:1px solid #e8ebe7}.monthly-detail-row small{display:block;color:#78817f;margin-top:4px}.monthly-detail-row>strong{white-space:nowrap}';
document.head.appendChild(monthlyDetailStyle);

// Year-level dashboard metrics use the same monthly allocation as the chart.
const yearlyMetricCard = $('#metric-collected').closest('.metric-card');
yearlyMetricCard.className = 'metric-card yearly-card';
yearlyMetricCard.innerHTML = '<span class="metric-icon">↗</span><p>Total yearly sales</p><strong id="metric-yearly-sales">RM0</strong><small id="metric-yearly-note">For the selected year</small>';
const averageMetricCard = $('#metric-outstanding').closest('.metric-card');
averageMetricCard.className = 'metric-card average-card';
averageMetricCard.innerHTML = '<span class="metric-icon">≈</span><p>Average monthly sales</p><strong id="metric-average-sales">RM0</strong><small>Yearly total ÷ 12 months</small>';
function renderYearlyMetrics(){
  const selectedYear = now.getFullYear();
  let yearlyTotal = 0;
  for(let monthIndex=0;monthIndex<12;monthIndex++){
    const month = new Date(selectedYear,monthIndex,1,12);
    yearlyTotal += state.sales.reduce((sum,sale) => sum + monthlySalesValue(sale,month),0);
  }
  $('#metric-yearly-sales').textContent = money(yearlyTotal);
  $('#metric-average-sales').textContent = money(yearlyTotal/12);
  $('#metric-yearly-note').textContent = `Total for ${selectedYear}`;
}
const dashboardWithYearlyMetrics = renderDashboard;
renderDashboard = function(){ dashboardWithYearlyMetrics(); renderYearlyMetrics(); };
$('#monthly-report-year').addEventListener('change', renderYearlyMetrics);
const yearlyMetricStyle = document.createElement('style');
yearlyMetricStyle.textContent = '.sales-card,.expense-card{display:none!important}.yearly-card{background:#dff3df}.average-card{background:#dce9f5}@media(min-width:681px){.metric-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}';
document.head.appendChild(yearlyMetricStyle);
setTimeout(renderYearlyMetrics, 0);
renderAll();

// Keep the dashboard focused on metrics, without the greeting header.
function syncDashboardHeader(view){ document.body.classList.toggle('dashboard-mode', view === 'dashboard'); }
syncDashboardHeader($('.view.active')?.id || 'dashboard');
$$('.nav-item').forEach(button => button.addEventListener('click', () => syncDashboardHeader(button.dataset.view)));
const dashboardHeaderStyle = document.createElement('style');
dashboardHeaderStyle.textContent = '.dashboard-mode .topbar{display:none}.dashboard-mode #dashboard{padding-top:34px}';
document.head.appendChild(dashboardHeaderStyle);

// Import the supplied Facebook Ads transactions as one monthly Advertising expense per month.
const fbAdsMonthlyExpenses = [
  {date:'2026-01-30', amount:12617.00, month:'January'},
  {date:'2026-02-08', amount:3845.79, month:'February'},
  {date:'2026-03-24', amount:13554.82, month:'March'},
  {date:'2026-04-26', amount:11832.94, month:'April'},
  {date:'2026-05-12', amount:4472.58, month:'May'},
  {date:'2026-06-08', amount:2887.82, month:'June'}
];
if (!state.expenses.some(expense => expense.importKey === 'fb-ads-2026-monthly')) {
  fbAdsMonthlyExpenses.forEach(item => state.expenses.unshift({
    id:uid(), date:item.date, category:'Advertising', description:`FB Ads — ${item.month} 2026`, amount:item.amount,
    notes:'Monthly total imported from Facebook Ads transactions.', importKey:'fb-ads-2026-monthly'
  }));
  save();
  renderAll();
  toast('FB Ads monthly expenses added.');
}

// Let the dashboard chart switch between gross sales and monthly profit.
const reportMetricSelect = $('#monthly-report-metric');
function monthlyExpenseValue(month){
  return state.expenses.filter(expense => { const date=dateVal(expense.date); return date.getFullYear()===month.getFullYear() && date.getMonth()===month.getMonth(); }).reduce((sum,expense)=>sum+expense.amount,0);
}
renderMonthlySalesChart = function(){
  const selectedYear = Number($('#monthly-report-year').value || now.getFullYear());
  const metric = reportMetricSelect.value;
  const points = Array.from({length:12},(_,monthIndex) => {
    const month = new Date(selectedYear,monthIndex,1,12);
    const sales = state.sales.reduce((sum,sale)=>sum+monthlySalesValue(sale,month),0);
    const expenses = monthlyExpenseValue(month);
    return {month,sales,expenses,value:metric==='profit'?sales-expenses:sales};
  });
  $('#monthly-sales-chart').previousElementSibling.querySelector('h2').textContent = metric==='profit' ? 'Monthly profit by year' : 'Monthly sales by year';
  const maxPositive=Math.max(0,...points.map(point=>point.value)), minNegative=Math.min(0,...points.map(point=>point.value));
  const topValue=Math.max(1000,Math.ceil(maxPositive/1000)*1000), bottomValue=Math.floor(minNegative/1000)*1000;
  const range=topValue-bottomValue, width=1000,height=320,left=74,right=28,top=28,plotHeight=190,baseline=top+(topValue/range)*plotHeight;
  const x=index=>left+index*((width-left-right)/11), y=value=>top+((topValue-value)/range)*plotHeight;
  const label=value=>value===0?'RM0':`${value<0?'-':''}RM${(Math.abs(value)>=1000?(Math.abs(value)/1000).toFixed(Math.abs(value)%1000?'1':'0')+'K':Math.abs(value))}`;
  const gridValues=[topValue,Math.round((topValue+bottomValue)/2/1000)*1000,bottomValue].filter((value,index,array)=>array.indexOf(value)===index);
  const grid=gridValues.map(value=>`<line x1="${left}" y1="${y(value)}" x2="${width-right}" y2="${y(value)}" stroke="#d7e0e2" stroke-width="2"/><text x="${left-12}" y="${y(value)+6}" text-anchor="end" fill="#65757b" font-size="15">${label(value)}</text>`).join('');
  const bars=points.map((point,index)=>point.value?`<rect class="monthly-data-point" x="${x(index)-15}" y="${Math.min(y(point.value),baseline)}" width="30" height="${Math.abs(baseline-y(point.value))}" rx="5" fill="${point.value>=0?'#078443':'#d86550'}" onclick="showMonthlySalesDetails(${selectedYear},${index})"/>`:'').join('');
  const line=points.map((point,index)=>`${index?'L':'M'} ${x(index)} ${y(point.value)}`).join(' ');
  const dots=points.map((point,index)=>`<circle class="monthly-data-point" cx="${x(index)}" cy="${y(point.value)}" r="5.5" fill="#f6b934" stroke="#27363a" stroke-width="2" onclick="showMonthlySalesDetails(${selectedYear},${index})"/>`).join('');
  const values=points.map((point,index)=>point.value?`<text x="${x(index)}" y="${point.value>=0?Math.max(18,y(point.value)-12):Math.min(height-48,y(point.value)+20)}" text-anchor="middle" fill="${point.value>=0?'#176c59':'#b84f3d'}" font-size="12" font-weight="700">${label(point.value)}</text>`:'').join('');
  const monthsLabel=points.map((point,index)=>`<text x="${x(index)}" y="${top+plotHeight+32}" text-anchor="middle" fill="#3f4d50" font-size="14">${months[point.month.getMonth()].slice(0,3)}</text>`).join('');
  $('#monthly-sales-chart').innerHTML=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Monthly ${metric} for ${selectedYear}">${grid}<line x1="${left}" y1="${baseline}" x2="${width-right}" y2="${baseline}" stroke="#27363a" stroke-width="2"/><path d="${line}" fill="none" stroke="#27363a" stroke-width="2"/>${bars}${dots}${values}${monthsLabel}</svg>`;
};
reportMetricSelect.addEventListener('change', renderMonthlySalesChart);
renderMonthlySalesChart();

// Apple-style dashboard: keep five essential figures visible at a glance.
const appleCashCard = $('#metric-collected').closest('.metric-card');
appleCashCard.className = 'metric-card collection-card';
appleCashCard.innerHTML = '<span class="metric-icon">↓</span><p>Cash collected</p><strong id="metric-collected">RM0</strong><small id="metric-collection-count">This month</small>';
const appleBalanceCard = $('#metric-outstanding').closest('.metric-card');
appleBalanceCard.className = 'metric-card balance-card';
appleBalanceCard.innerHTML = '<span class="metric-icon">◌</span><p>Outstanding balance</p><strong id="metric-outstanding">RM0</strong><small id="metric-outstanding-count">Across all clients</small>';
const appleMrrCard = document.createElement('article');
appleMrrCard.className = 'metric-card mrr-card';
appleMrrCard.innerHTML = '<span class="metric-icon">↻</span><p>Monthly recurring revenue</p><strong id="metric-mrr-apple">RM0</strong><small id="metric-mrr-count">Active recurring plans</small>';
$('.metric-grid').appendChild(appleMrrCard);
renderYearlyMetrics = function(){};
function renderAppleMrr(){
  const recurring = state.sales.filter(sale => sale.type === 'recurring');
  const unique = new Set();
  const total = recurring.reduce((sum,sale) => { const key=sale.contractId||sale.id; if(unique.has(key)) return sum; unique.add(key); return sum+sale.monthly*(sale.sst?1.08:1); },0);
  $('#metric-mrr-apple').textContent = money(total);
  $('#metric-mrr-count').textContent = `${unique.size} active plan${unique.size===1?'':'s'}`;
}
const appleDashboardRender = renderDashboard;
renderDashboard = function(){ appleDashboardRender(); renderAppleMrr(); };
renderAll();
const appleOverrideStyle = document.createElement('style');
appleOverrideStyle.textContent = '.collection-card,.balance-card,.mrr-card{display:flex!important}.yearly-card,.average-card{display:none!important}.sales-card,.expense-card{display:flex!important}.monthly-sales-panel,.dashboard-bottom{display:none!important}.nav-item[data-view="collections"]{display:flex!important}';
document.head.appendChild(appleOverrideStyle);
