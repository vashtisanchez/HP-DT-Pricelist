/* Iontech x HP Consumer Desktop pricelist. Data comes from data.js (window.PRICELIST). */
(function () {
  'use strict';
  const ADMIN = !!window.ADMIN;
  const BASE = window.ASSET_BASE || ''; /* admin site reads images, spec sheets and promos from the dealer site */
  const PUBLISHED = window.PRICELIST || { products: [], promos: [], sites: [] };
  const STORE = 'iontechHpDtAdminDraft_v3';
  const TYPE = { 'Mini PC': 'Mini Desktop', 'AIO': 'All-in-One', 'Tower': 'Tower Desktop', 'Gaming Tower': 'Gaming Desktop' };
  const CATS = ['Mini PC', 'Tower', 'AIO', 'Gaming Tower'];
  const clone = o => JSON.parse(JSON.stringify(o));
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];

  let products = clone(PUBLISHED.products), promos = clone(PUBLISHED.promos || []);
  const sites = PUBLISHED.sites || [];
  let dirty = false;
  if (ADMIN) {
    try {
      const d = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (d && d.products) { products = d.products; promos = d.promos || promos; dirty = true; }
    } catch (e) { /* no saved draft */ }
  }
  const state = { q: '', cat: '', cpu: '', sort: 'list', view: 'grid' };
  const specOK = {};

  /* ---------- helpers ---------- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const peso = n => '₱' + Number(n || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 });
  const fixed = n => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const typeOf = p => TYPE[p.category] || p.category || 'Desktop';
  const has = v => v && String(v).trim() && String(v).trim().toLowerCase() !== 'none';
  const specUrl = sku => BASE + 'specs/' + encodeURIComponent(sku + ' Spec Sheet.pdf');
  const bySku = sku => products.find(p => p.sku === sku);
  const promoFor = sku => promos.find(x => x.sku === sku);
  /* Same output as the COPY PASTE column (R) of the HP-DT PL workbook. */
  const copyText = p => `${p.name}\n${p.shortDescription || ''}\n\nSRP ${fixed(p.srp)}\nDP ${fixed(p.dp)}\n\nBundle Monitor: ${p.bundleMonitor || 'None'}\nInclusion: ${p.inclusion || 'None'}`;

  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2200);
  }
  async function copy(text, label) {
    try { await navigator.clipboard.writeText(text); }
    catch (e) {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (e2) { /* ignore */ }
      ta.remove(); if (!ok) { toast('Could not copy. Select the text manually.'); return; }
    }
    toast(label || 'Copied to clipboard');
  }
  const NOIMG = '<div class="noimg"><svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/></svg>Image coming soon</div>';
  const img = p => `<img src="${BASE}images/${encodeURIComponent(p.sku)}.webp" data-sku="${esc(p.sku)}" data-try="0" alt="${esc(p.name)}" loading="lazy">`;
  /* Image file is looked up by part number: images/<SKU>.webp, then .png, .jpg, .jpeg, .avif */
  document.addEventListener('error', e => {
    const el = e.target; if (!el.matches || !el.matches('img[data-sku]')) return;
    const exts = ['png', 'jpg', 'jpeg', 'avif'], i = +el.dataset.try;
    if (i < exts.length) { el.dataset.try = i + 1; el.src = `${BASE}images/${encodeURIComponent(el.dataset.sku)}.${exts[i]}`; }
    else el.outerHTML = NOIMG;
  }, true);

  /* Spec sheet is looked up by part number: specs/<SKU> Spec Sheet.pdf */
  function checkSpecs() {
    products.forEach(p => {
      if (p.sku in specOK) return;
      specOK[p.sku] = null;
      fetch(specUrl(p.sku), { method: 'HEAD' }).then(r => { specOK[p.sku] = r.ok; }).catch(() => { specOK[p.sku] = false; }).then(applySpecs);
    });
  }
  function applySpecs() {
    $$('[data-spec]').forEach(a => {
      const ok = specOK[a.dataset.spec];
      a.classList.toggle('hidden', !ok);
      const none = a.parentElement.querySelector('[data-nospec]'); if (none) none.classList.toggle('hidden', ok !== false);
    });
  }
  const specBtn = (p, cls) => `<a class="btn ${cls || ''} hidden" data-spec="${esc(p.sku)}" href="${specUrl(p.sku)}" download="${esc(p.sku)} Spec Sheet.pdf">↓ Spec sheet</a><button class="btn ${cls || ''} hidden" data-nospec disabled style="opacity:.55;cursor:default">No spec sheet yet</button>`;

  /* ---------- shell ---------- */
  function shell() {
    $('#app').innerHTML = `
<div class="topbar"><div class="wrap">
  <a class="brand" href="#home">Iontech <span>×</span> HP <span>· Desktop Pricelist</span></a>
  ${ADMIN ? '<span class="adminflag">ADMIN</span>' : ''}
  <nav class="tabs" aria-label="Sections">
    <a href="#home" data-tab="home">Home</a>
    <a href="#products" data-tab="products">Products <span class="n" id="nProducts"></span></a>
    <a href="#promos" data-tab="promos">Promos <span class="n" id="nPromos"></span></a>
    <a href="#sites" data-tab="sites">HP Sites</a>
  </nav></div></div>
<main id="view"></main>
<footer>Prices are in Philippine Peso (₱). SRP = Suggested Retail Price; DP = Dealer Price. For internal sales and dealer reference only. Prices and specifications are subject to change without prior notice. Please confirm pricing and stock availability with your account manager before placing an order.<br>Pricelist as of ${esc(PUBLISHED.updated || '')}</footer>
<dialog id="dlg"><div class="dlg"><button class="x" data-act="close" aria-label="Close">×</button><div id="dlgBody"></div></div></dialog>
<dialog id="light" class="light"><img alt=""></dialog>
<div id="toast" class="toast" role="status"></div>`;
  }

  /* ---------- views ---------- */
  function home() {
    const min = Math.min(...products.map(p => p.srp)), cats = CATS.filter(c => products.some(p => p.category === c));
    return `
<section class="hero"><div class="wrap">
  <div class="eyebrow">HP Consumer Desktops · Philippines</div>
  <h1>Welcome, partner.</h1>
  <p>Find the right HP desktop for your customer. Current SRP and dealer pricing, spec sheets and ready-to-send product details for HP OmniDesk, OmniStudio All-in-One and OMEN gaming desktops.</p>
  <form class="herosearch" id="heroSearch"><input name="q" placeholder="Search model, part number or processor" aria-label="Search products"><button class="btn primary" style="height:50px;padding:0 22px;font-size:15px">Search</button></form>
  <div class="herostats"><div><b>${products.length}</b><span>Models</span></div><div><b>${cats.length}</b><span>Categories</span></div><div><b>${promos.length}</b><span>Active promos</span></div><div><b>${products.length ? peso(min) : '—'}</b><span>SRP starts at</span></div></div>
</div></section>
<div class="wrap page">
  <section class="sec" style="margin-top:6px"><div class="eyebrow">Browse</div><h3>Shop by desktop type</h3>
    <div class="cats">${cats.map(c => { const ps = products.filter(p => p.category === c), lead = ps[0]; return `<a class="cat" href="#products" data-cat="${esc(c)}"><div class="ph">${img(lead)}</div><b>${esc(TYPE[c] || c)}</b><small>${ps.length} model${ps.length > 1 ? 's' : ''} · from ${peso(Math.min(...ps.map(p => p.srp)))}</small></a>`; }).join('')}</div>
  </section>
  ${promos.length ? `<section class="sec"><div class="sechead"><div><div class="eyebrow">Dealer promos</div><h3 style="margin:2px 0 14px">Current promotions</h3></div><a class="btn sm" href="#promos" style="margin-bottom:14px">All promos →</a></div><div class="promos">${promos.slice(0, 3).map(promoCard).join('')}</div></section>` : ''}
  <section class="sec"><div class="eyebrow">Resources</div><h3>Quick links</h3>
    <div class="sites">
      <div class="site"><h3>Full pricelist</h3><p>Search, filter and compare every model. Copy product details or download the spec sheet per model.</p><a class="btn primary" href="#products">Browse products</a></div>
      <div class="site"><h3>Export</h3><p>Download the current pricelist as an Excel or CSV file, or print it as a PDF.</p><div class="actions"><button class="btn" data-act="xlsx">↓ Excel</button><button class="btn" data-act="csv">↓ CSV</button></div></div>
      <div class="site"><h3>HP related sites</h3><p>Official HP tools for product content, service centers and warranty checks.</p><a class="btn" href="#sites">Open HP Sites</a></div>
    </div>
  </section>
</div>`;
  }

  function filtered() {
    const q = state.q.toLowerCase().trim();
    const a = products.filter(p => (!q || [p.sku, p.name, p.processor, p.memory, p.storage, p.graphics, p.category].join(' ').toLowerCase().includes(q)) && (!state.cat || p.category === state.cat) && (!state.cpu || String(p.processor).toLowerCase().includes(state.cpu)));
    const s = state.sort;
    if (s !== 'list') a.sort((x, y) => s === 'srp-asc' ? x.srp - y.srp : s === 'srp-desc' ? y.srp - x.srp : s === 'dp-asc' ? x.dp - y.dp : x.name.localeCompare(y.name));
    return a;
  }
  const row = (k, v) => has(v) ? `<div class="specrow"><b>${k}</b><span>${esc(v)}</span></div>` : '';
  function card(p) {
    const pr = promoFor(p.sku);
    return `<article class="card" data-sku="${esc(p.sku)}">
  <div class="ph" data-act="detail"><span class="badge">${esc(typeOf(p))}</span>${pr ? '<span class="badge promo">Promo</span>' : ''}${img(p)}</div>
  <div class="body">
    <div class="head"><div class="sku">${esc(p.sku)}</div><h3 data-act="detail">${esc(p.name)}</h3><div class="cpu">${esc(p.processor)}</div></div>
    <div class="specs">${row('Memory', p.memory)}${row('Storage', p.storage)}${row('Graphics', p.graphics)}${row('Display', p.display)}${row('OS', p.os)}${row('Monitor', p.bundleMonitor)}</div>
    <div class="side" style="margin-top:auto">
      <div class="prices"><div class="pricebox"><small>SRP</small><strong>${peso(p.srp)}</strong></div><div class="pricebox dp"><small>Dealer price</small><strong>${peso(p.dp)}</strong></div></div>
      ${String(p.orderBasis).toLowerCase() === 'yes' ? '<div class="note">Order basis. Please confirm before ordering.</div>' : ''}
      <div class="opts"><button class="btn sm primary" data-act="copy">⧉ Copy details</button>${specBtn(p, 'sm')}<button class="btn sm full" data-act="detail">View full details</button></div>
      ${ADMIN ? '<div class="adminrow"><button class="btn sm" data-act="edit">Edit</button><button class="btn sm danger" data-act="del">Delete</button></div>' : ''}
    </div>
  </div></article>`;
  }
  function productsView() {
    return `<div class="wrap page">
${ADMIN ? adminBar() : ''}
<div class="pagehead"><div><div class="eyebrow">HP Consumer Desktops</div><h2>All products</h2><p>Search, filter and compare specifications and prices. Each model has a copy button and a downloadable spec sheet.</p></div>
  <div class="actions"><button class="btn" data-act="xlsx">↓ Export Excel</button><button class="btn" data-act="csv">↓ CSV</button><button class="btn dark" data-act="print">Print / Save PDF</button></div></div>
<section class="panel"><div class="filters">
  <div class="field"><label for="q">Search model, part number or processor</label><input id="q" value="${esc(state.q)}" placeholder="e.g. OmniDesk, B9HZ3PA, Core i5"></div>
  <div class="field"><label for="cat">Desktop type</label><select id="cat"><option value="">All types</option>${CATS.map(c => `<option value="${c}" ${state.cat === c ? 'selected' : ''}>${TYPE[c]}</option>`).join('')}</select></div>
  <div class="field"><label for="cpu">Processor brand</label><select id="cpu"><option value="">All processors</option><option value="intel" ${state.cpu === 'intel' ? 'selected' : ''}>Intel</option><option value="amd" ${state.cpu === 'amd' ? 'selected' : ''}>AMD</option></select></div>
  <div class="field"><label for="sort">Sort by</label><select id="sort">${[['list', 'Pricelist order'], ['srp-asc', 'SRP: low to high'], ['srp-desc', 'SRP: high to low'], ['dp-asc', 'DP: low to high'], ['name', 'Model A–Z']].map(o => `<option value="${o[0]}" ${state.sort === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select></div>
  <button class="btn" data-act="clear" style="height:42px">Clear</button></div></section>
<div class="bar"><span class="count" id="count"></span><div class="seg"><button data-view="grid" class="${state.view === 'grid' ? 'on' : ''}">Grid</button><button data-view="list" class="${state.view === 'list' ? 'on' : ''}">List</button></div></div>
<div id="products" class="${state.view}"></div><div id="empty" class="empty hidden">No matching products. Try another search or clear your filters.</div></div>`;
  }
  function drawProducts() {
    const a = filtered(), box = $('#products'); if (!box) return;
    box.className = state.view; box.innerHTML = a.map(card).join('');
    $('#count').textContent = `Showing ${a.length} of ${products.length} products`;
    $('#empty').classList.toggle('hidden', a.length > 0); applySpecs();
  }
  function promoCard(x, i) {
    const p = bySku(x.sku), src = BASE + 'promos/' + encodeURIComponent(x.file);
    return `<article class="promo"><button data-act="zoom" data-src="${esc(src)}" aria-label="Enlarge promo"><img src="${esc(src)}" alt="${esc(x.title)} promo" loading="lazy"></button>
<div class="body"><small>${esc(x.subtitle || 'Dealer promo')}</small><h3>${esc(x.title)}</h3>
<div class="actions">${p ? `<button class="btn sm primary" data-act="detail" data-sku="${esc(p.sku)}">View model</button>` : ''}<a class="btn sm" href="${esc(src)}" download>↓ Download</a>${ADMIN ? `<button class="btn sm danger" data-act="delpromo" data-i="${i}">Remove</button>` : ''}</div></div></article>`;
  }
  function promosView() {
    return `<div class="wrap page">
<div class="pagehead"><div><div class="eyebrow">Dealer promos</div><h2>Promos</h2><p>Current HP desktop dealer promotions. Click a promo to enlarge it, or download the image to share.</p></div></div>
${ADMIN ? `<form class="panel" id="promoForm" style="margin-bottom:16px"><div class="filters" style="grid-template-columns:1.4fr 1.4fr 1.4fr 1fr auto">
<div class="field"><label>Promo title *</label><input name="title" required placeholder="HP OmniDesk Desktop M02-0013d"></div>
<div class="field"><label>Subtitle</label><input name="subtitle" placeholder='Dealer Promo · 24" Monitor Bundle'></div>
<div class="field"><label>Image file in /promos *</label><input name="file" required placeholder="HP-DT 13d PROMO.png"></div>
<div class="field"><label>Linked part no.</label><input name="sku" placeholder="B9HZ3PA"></div>
<button class="btn primary" style="height:42px">Add promo</button></div></form>` : ''}
${promos.length ? `<div class="promos">${promos.map(promoCard).join('')}</div>` : '<div class="empty">No active promos right now.</div>'}</div>`;
  }
  function sitesView() {
    return `<div class="wrap page">
<div class="pagehead"><div><div class="eyebrow">Resources</div><h2>HP Related Sites</h2><p>Quick links to official HP tools for product content, service and warranty. Each site opens in a new tab.</p></div></div>
<div class="sites">${sites.map(s => `<div class="site"><h3>${esc(s.name)}</h3><p>${esc(s.desc)}</p><div class="host">${esc(s.host)}</div><a class="btn primary" href="${esc(s.url)}" target="_blank" rel="noopener">Open site ↗</a></div>`).join('')}</div></div>`;
  }
  function detail(p) {
    const pr = promoFor(p.sku);
    $('#dlgBody').innerHTML = `<div class="detail" data-sku="${esc(p.sku)}">
<div class="ph">${img(p)}</div>
<div><div class="sku">${esc(p.sku)} · ${esc(typeOf(p))}</div><h2>${esc(p.name)}</h2>
<div class="prices" style="border:0;padding:6px 0 10px;margin:0"><div class="pricebox"><small>Suggested retail (SRP)</small><strong>${peso(p.srp)}</strong></div><div class="pricebox dp"><small>Dealer price (DP)</small><strong>${peso(p.dp)}</strong></div></div>
<div class="opts" style="margin:0 0 14px"><button class="btn primary" data-act="copy">⧉ Copy details</button>${specBtn(p)}${pr ? '<a class="btn full" href="#promos" data-act="close">View promo for this model</a>' : ''}</div>
<div class="specs">${row('Processor', p.processor)}${row('Memory', p.memory)}${row('Storage', p.storage)}${row('Graphics', p.graphics)}${row('Display', p.display)}${row('Color / ID', p.idMechanical)}${row('OS', p.os)}${row('Software', p.dib)}${row('Inclusion', p.inclusion)}${row('Monitor', p.bundleMonitor)}${row('Order basis', p.orderBasis)}</div>
${p.shortDescription ? `<div class="desc">${esc(p.shortDescription)}</div>` : ''}</div></div>`;
    open('#dlg'); applySpecs();
  }
  const open = s => { const d = $(s); if (!d.open) d.showModal(); };

  /* ---------- export ---------- */
  const rows = () => products.map(p => ({ 'PART NUMBER': p.sku, 'CATEGORY': p.category, 'PRODUCT NAME': p.name, 'PROCESSOR': p.processor, 'MEMORY': p.memory, 'INTERNAL STORAGE': p.storage, 'GRAPHICS & VRAM': p.graphics, 'ID MECHANICAL': p.idMechanical, 'DISPLAY': p.display, 'INCLUSION': p.inclusion, 'OS': p.os, 'DIB': p.dib, 'SHORT DESCRIPTION': p.shortDescription, 'SRP': p.srp, 'DP': p.dp, 'Bundled Monitor': p.bundleMonitor, 'ORDER BASIS': p.orderBasis, 'COPY PASTE': copyText(p) }));
  function save(name, blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1500); }
  function csv() { const r = rows(), cols = Object.keys(r[0] || {}); save('Iontech-HP-Desktop-Pricelist.csv', new Blob(['﻿' + [cols, ...r.map(x => cols.map(k => x[k] == null ? '' : x[k]))].map(x => x.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' })); }
  function xlsx() { if (!window.XLSX) return csv(); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows()), 'HP Desktop Pricelist'); XLSX.writeFile(wb, 'Iontech-HP-Desktop-Pricelist.xlsx'); }

  /* ---------- admin ---------- */
  function persist() { dirty = true; try { localStorage.setItem(STORE, JSON.stringify({ products, promos })); } catch (e) { toast('Could not save in this browser'); } checkSpecs(); route(); }
  function adminBar() {
    return `<div class="adminbar"><div><strong>Admin mode</strong> <span class="status ${dirty ? 'dirty' : ''}">${dirty ? '● Unpublished edits saved in this browser' : '✓ Matches the published pricelist'}</span>
<p>Edits save in this browser only. To update the dealer link, download <b>data.js</b> and upload it to the <b>HP-DT-Pricelist</b> repository on GitHub, replacing the old file.</p></div>
<div class="actions"><button class="btn primary" data-act="add">+ Add product</button><button class="btn" data-act="import">Import Excel</button><button class="btn ok" data-act="datajs">↓ Download data.js</button><button class="btn danger" data-act="restore">Discard edits</button><input id="importFile" type="file" accept=".xlsx,.xls,.csv" class="hidden"></div></div>
<details class="howto"><summary>How to publish changes, images, spec sheets and promos</summary>
<p><b>Prices and specs:</b> edit here or import the <code>HP-DT PL.xlsx</code> workbook, click <b>Download data.js</b>, then in the <code>HP-DT-Pricelist</code> repository choose <i>Add file → Upload files</i> and upload it. The dealer link updates in about a minute.</p>
<p>All files go in the <code>HP-DT-Pricelist</code> repository (the dealer site), not this admin one.<br><b>Product image:</b> upload to the <code>images</code> folder named by part number, e.g. <code>images/EM9K6PA.png</code> (webp, png, jpg or avif).<br><b>Spec sheet:</b> upload to the <code>specs</code> folder as <code>specs/EM9K6PA Spec Sheet.pdf</code>. Both are picked up automatically by part number.<br><b>Promo:</b> upload the image to the <code>promos</code> folder, add it on the Promos tab here, then download and upload <code>data.js</code>.</p></details>`;
  }
  const FIELDS = [['sku', 'Part number *', 1], ['name', 'Product name *', 1], ['category', 'Category', 0, CATS], ['processor', 'Processor', 0, 0, 1], ['memory', 'Memory'], ['storage', 'Internal storage'], ['graphics', 'Graphics & VRAM'], ['idMechanical', 'ID mechanical'], ['display', 'Display'], ['os', 'OS'], ['inclusion', 'Inclusion', 0, 0, 1], ['dib', 'DIB / software', 0, 0, 1], ['shortDescription', 'Short description', 0, 'ta', 1], ['srp', 'SRP (PHP) *', 1, 'num'], ['dp', 'DP (PHP) *', 1, 'num'], ['orderBasis', 'Order basis', 0, ['Yes', 'No']], ['bundleMonitor', 'Bundled monitor', 0, 0, 1]];
  function editForm(sku) {
    const p = sku ? bySku(sku) : { category: 'Tower', orderBasis: 'Yes', inclusion: 'None', bundleMonitor: 'None' };
    $('#dlgBody').innerHTML = `<h2 style="margin:0 0 14px">${sku ? 'Edit ' + esc(sku) : 'Add a desktop product'}</h2><form id="pform" data-orig="${esc(sku || '')}"><div class="form">${FIELDS.map(([k, l, req, kind, wide]) => { const v = esc(p[k] == null ? '' : p[k]); return `<div class="field ${wide ? 'wide' : ''}"><label>${l}</label>${Array.isArray(kind) ? `<select name="${k}">${kind.map(o => `<option ${String(p[k]) === o ? 'selected' : ''}>${o}</option>`).join('')}</select>` : kind === 'ta' ? `<textarea name="${k}">${v}</textarea>` : `<input name="${k}" value="${v}" ${req ? 'required' : ''} ${kind === 'num' ? 'type="number" min="0" step="0.01"' : ''}>`}</div>`; }).join('')}</div>
<div class="actions" style="margin-top:16px"><button class="btn primary">Save product</button><button class="btn" type="button" data-act="close">Cancel</button></div></form>`;
    open('#dlg');
  }
  function norm(k) { return String(k || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  const MAP = { partnumber: 'sku', sku: 'sku', category: 'category', productname: 'name', name: 'name', processor: 'processor', memory: 'memory', internalstorage: 'storage', storage: 'storage', graphicsvram: 'graphics', graphics: 'graphics', idmechanical: 'idMechanical', display: 'display', inclusion: 'inclusion', os: 'os', dib: 'dib', shortdescription: 'shortDescription', srp: 'srp', dp: 'dp', bundledmonitor: 'bundleMonitor', orderbasis: 'orderBasis' };
  function importFile(file) {
    const rd = new FileReader();
    rd.onload = ev => {
      try {
        if (!window.XLSX) throw Error('Excel reader could not load. Check your internet connection.');
        const wb = XLSX.read(ev.target.result, { type: 'array' });
        const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
        const out = raw.map(r => { const o = {}; for (const [k, v] of Object.entries(r)) if (MAP[norm(k)]) o[MAP[norm(k)]] = typeof v === 'string' ? v.trim() : v; const num = v => Number(String(v || 0).replace(/[₱,\s]/g, '')) || 0; return { sku: String(o.sku || '').trim(), category: o.category || 'Tower', name: String(o.name || '').trim(), processor: o.processor || '', memory: o.memory || '', storage: o.storage || '', graphics: o.graphics || '', idMechanical: o.idMechanical || '', display: o.display || '', inclusion: o.inclusion || 'None', os: o.os || '', dib: o.dib || '', shortDescription: o.shortDescription || '', srp: num(o.srp), dp: num(o.dp), bundleMonitor: o.bundleMonitor || 'None', orderBasis: o.orderBasis || 'Yes' }; }).filter(p => p.sku && p.name);
        if (!out.length) throw Error('No products found. The sheet needs PART NUMBER and PRODUCT NAME columns.');
        if (!confirm(`Import ${out.length} products and replace the current list?`)) return;
        products = out; persist(); toast(`Imported ${out.length} products`);
      } catch (err) { alert('Import failed: ' + err.message); }
    };
    rd.readAsArrayBuffer(file);
  }
  function dataJs() {
    const d = Object.assign({}, PUBLISHED, { updated: new Date().toISOString().slice(0, 10), products, promos });
    save('data.js', new Blob(['// HP Desktop pricelist data. Replace this file to update the dealer site.\nwindow.PRICELIST = ' + JSON.stringify(d, null, 1) + ';\n'], { type: 'text/javascript' }));
    toast('data.js downloaded. Upload it to GitHub to publish.');
  }

  /* ---------- routing + events ---------- */
  function route() {
    const tab = ({ products: 1, promos: 1, sites: 1 })[location.hash.slice(1)] ? location.hash.slice(1) : 'home';
    $('#view').innerHTML = tab === 'products' ? productsView() : tab === 'promos' ? promosView() : tab === 'sites' ? sitesView() : home();
    $$('.tabs a').forEach(a => a.classList.toggle('on', a.dataset.tab === tab));
    $('#nProducts').textContent = products.length; $('#nPromos').textContent = promos.length;
    if (tab === 'products') drawProducts();
  }
  function go(tab) { if (location.hash === '#' + tab) route(); else location.hash = tab; window.scrollTo(0, 0); }

  document.addEventListener('click', e => {
    const cat = e.target.closest('[data-cat]'); if (cat) { state.cat = cat.dataset.cat; state.q = ''; state.cpu = ''; e.preventDefault(); return go('products'); }
    const v = e.target.closest('[data-view]'); if (v) { state.view = v.dataset.view; $$('[data-view]').forEach(b => b.classList.toggle('on', b === v)); return drawProducts(); }
    if (e.target.tagName === 'DIALOG') return e.target.close();
    if (e.target.closest('a.tabs,a[href^="#"]') && e.target.closest('a').hash) window.scrollTo(0, 0);
    const b = e.target.closest('[data-act]'); if (!b) return;
    const holder = b.closest('[data-sku]'), sku = b.dataset.sku || (holder && holder.dataset.sku), p = sku && bySku(sku), act = b.dataset.act;
    if (act === 'close') { $('#dlg').close(); }
    else if (act === 'detail' && p) detail(p);
    else if (act === 'copy' && p) copy(copyText(p), 'Copied ' + p.sku + ' details');
    else if (act === 'zoom') { $('#light img').src = b.dataset.src; open('#light'); }
    else if (act === 'xlsx') xlsx();
    else if (act === 'csv') csv();
    else if (act === 'print') { if (location.hash !== '#products') go('products'); setTimeout(() => window.print(), 150); }
    else if (act === 'clear') { state.q = state.cat = state.cpu = ''; state.sort = 'list'; route(); }
    else if (!ADMIN) return;
    else if (act === 'add') editForm();
    else if (act === 'edit' && p) editForm(sku);
    else if (act === 'del' && p) { if (confirm('Delete ' + sku + ' from the pricelist?')) { products = products.filter(x => x.sku !== sku); persist(); } }
    else if (act === 'import') $('#importFile').click();
    else if (act === 'datajs') dataJs();
    else if (act === 'restore') { if (confirm('Discard all edits in this browser and go back to the published pricelist?')) { products = clone(PUBLISHED.products); promos = clone(PUBLISHED.promos || []); dirty = false; try { localStorage.removeItem(STORE); } catch (e2) { /* ignore */ } route(); } }
    else if (act === 'delpromo') { if (confirm('Remove this promo?')) { promos.splice(+b.dataset.i, 1); persist(); } }
  });
  document.addEventListener('input', e => { if (e.target.id === 'q') { state.q = e.target.value; drawProducts(); } });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'cat' || t.id === 'cpu' || t.id === 'sort') { state[t.id] = t.value; drawProducts(); }
    if (t.id === 'importFile' && t.files[0]) { importFile(t.files[0]); t.value = ''; }
  });
  document.addEventListener('submit', e => {
    e.preventDefault(); const f = e.target, d = Object.fromEntries(new FormData(f).entries());
    if (f.id === 'heroSearch') { state.q = d.q; state.cat = state.cpu = ''; go('products'); }
    else if (f.id === 'pform') {
      Object.keys(d).forEach(k => d[k] = d[k].trim()); d.srp = Number(d.srp || 0); d.dp = Number(d.dp || 0);
      const orig = f.dataset.orig, i = orig ? products.findIndex(x => x.sku === orig) : -1;
      if (products.some((x, j) => x.sku === d.sku && j !== i)) return alert('That part number already exists. Edit the existing product instead.');
      if (i >= 0) products[i] = d; else products.push(d);
      $('#dlg').close(); persist(); toast('Saved ' + d.sku);
    }
    else if (f.id === 'promoForm') { promos.push({ title: d.title.trim(), subtitle: d.subtitle.trim(), file: d.file.trim(), sku: d.sku.trim() }); persist(); toast('Promo added'); }
  });
  window.addEventListener('hashchange', route);

  shell(); route(); checkSpecs();
})();
