// Base de preços de contingência
let dadosPrecos = {
  "Sunflower":0.0003666, "Potato":0.0004439, "Pumpkin":0.0010799, "Carrot":0.002097, 
  "Cabbage":0.00195, "Beetroot":0.0059949, "Cauliflower":0.00848357, "Parsnip":0.013094, 
  "Radish":0.00952, "Wheat":0.015444, "Kale":0.01795937, "Apple":0.0226, 
  "Blueberry":0.018295, "Orange":0.01775, "Eggplant":0.01, "Corn":0.015394, 
  "Banana":0.02304286, "Soybean":0.002496, "Grape":0.24942, "Rice":0.3114, 
  "Olive":0.392, "Tomato":0.00499, "Lemon":0.009264, "Barley":0.027574, 
  "Rhubarb":0.00091667, "Zucchini":0.000704, "Yam":0.003516, "Broccoli":0.004376, 
  "Pepper":0.00618, "Onion":0.01431164, "Turnip":0.014473, "Artichoke":0.0119989, 
  "Duskberry":0.999, "Lunara":0.48742, "Celestine":0.18872, "Wood":0.01228153, 
  "Stone":0.0264, "Iron":0.104495, "Gold":0.3647, "Egg":0.02153077, 
  "Honey":0.11294, "Crimstone":0.7899, "Leather":0.09798, "Wool":0.04218, 
  "Merino Wool":0.013588, "Feather":0.00857083, "Milk":0.1122, "Obsidian":21.5898, 
  "Salt":0.00423867, "Goblin Emblem":0.08, "Bumpkin Emblem":0.0898, 
  "Sunflorian Emblem":0.0869, "Nightshade Emblem":0.067399, "Ruffroot":0.4173, 
  "Chewed Bone":0.4069, "Heart Leaf":0.4048, "Moonfur":3.799, "Ribbon":0.4094, 
  "Dewberry":0.445, "Wild Grass":0.4248, "Frost Pebble":0.4151, "Capsule Bait":0.01675, 
  "Umbrella Bait":0.0254, "Crimson Baitfish":0.0404, "Saltwort":0.03836
};

// Contorna bloqueios de CORS
async function fetchJsonSmart(url) {
  try {
    const res = await fetch(url);
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn(`[CORS Direct Failed] Proxying: ${url}`);
  }

  try {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    const resProxy = await fetch(proxyUrl);
    if (resProxy.ok) return await resProxy.json();
  } catch (e) {}

  try {
    const proxyUrl2 = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const resProxy2 = await fetch(proxyUrl2);
    if (resProxy2.ok) return await resProxy2.json();
  } catch (e) {}

  return null;
}

// Formatação inteligente mantendo 3 algarismos significativos
function formatarPreco(valor) {
  if (valor === undefined || valor === null || isNaN(valor)) return '0';
  const num = Number(valor);
  if (num === 0) return '0';
  if (num >= 10) return num.toFixed(2);
  if (num >= 1) return num.toFixed(3);
  return parseFloat(num.toPrecision(3)).toString();
}

let sflUsd = 0.0679;
let taxaVenda = parseFloat(localStorage.getItem('sfl_tax_rate')) || 0.075;
let transacoes = JSON.parse(localStorage.getItem('sfl_transactions')) || [];
let valorQtdMaxAtual = 0;

function obterEstoqueAtual() {
  const estoque = {};
  transacoes.forEach(t => {
    const item = t.recurso;
    const key = item.toLowerCase();
    if (!estoque[key]) {
      estoque[key] = { nome: item, qty: 0, custoTotal: 0 };
    }
    if (t.tipo === 'buy') {
      estoque[key].qty += t.qty;
      estoque[key].custoTotal += t.totalPrice;
    } else if (t.tipo === 'sell') {
      const precoMedioAntes = estoque[key].qty > 0 ? (estoque[key].custoTotal / estoque[key].qty) : 0;
      estoque[key].qty -= t.qty;
      estoque[key].custoTotal -= (t.qty * precoMedioAntes);
    }
  });
  return estoque;
}

// Inicializa select de taxa e de idioma
const elTaxSelect = document.getElementById('tax-select');
if (elTaxSelect) elTaxSelect.value = taxaVenda.toString();

const elLangSelect = document.getElementById('lang-select');
if (elLangSelect) elLangSelect.value = currentLang;

atualizarDisplayTaxa();

async function carregarDados() {
  const dataExchange = await fetchJsonSmart('https://sfl.world/api/v1.1/exchange');
  if (dataExchange && dataExchange.sfl && dataExchange.sfl.usd) {
    sflUsd = dataExchange.sfl.usd;
  }
  const elPrice = document.getElementById('sfl-price');
  if (elPrice) elPrice.innerText = `$ ${sflUsd.toFixed(4)} USD`;

  const dataPrices = await fetchJsonSmart('https://sfl.world/api/v1/prices');
  let textoHoraAtualizacao = '';

  if (dataPrices) {
    const p2pData = dataPrices.data?.p2p || dataPrices.p2p;
    if (p2pData) {
      dadosPrecos = { ...dadosPrecos, ...p2pData };
    }

    const updatedText = dataPrices.updated_text || dataPrices.data?.updated_text;
    if (updatedText) {
      textoHoraAtualizacao = `• ${updatedText}`;
    } else if (dataPrices.updatedAt) {
      const diffMin = Math.floor((Date.now() - dataPrices.updatedAt) / 60000);
      textoHoraAtualizacao = diffMin > 0 ? t('updatedMinAgo', { min: diffMin }) : t('updatedNow');
    }
  }

  if (!textoHoraAtualizacao) {
    const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    textoHoraAtualizacao = t('updatedAt', { time: horaAtual });
  }

  const elUpdated = document.getElementById('updated-time');
  if (elUpdated) elUpdated.innerText = textoHoraAtualizacao;

  renderizarCardsMercado();
  renderizarPortfolio();
}

function obterTodosRecursos() {
  return Object.keys(dadosPrecos).sort();
}

function mostrarDropdownRecursos() {
  filtrarDropdownRecursos();
  document.getElementById('resource-dropdown-list').classList.remove('hidden');
}

function filtrarDropdownRecursos() {
  const termo = document.getElementById('trade-resource-search').value.toLowerCase();
  const listDiv = document.getElementById('resource-dropdown-list');
  const tipo = document.getElementById('trade-type').value;
  listDiv.innerHTML = '';

  let recursos = [];

  if (tipo === 'sell') {
    const estoque = obterEstoqueAtual();
    recursos = Object.keys(estoque)
      .filter(k => estoque[k].qty > 0.0001)
      .map(k => estoque[k].nome)
      .sort();
  } else {
    recursos = obterTodosRecursos();
  }

  const filtrados = recursos.filter(r => r.toLowerCase().includes(termo));

  if (filtrados.length === 0) {
    const msg = tipo === 'sell' ? t('noStockSell') : t('noItemFound');
    listDiv.innerHTML = `<div class="p-3 text-xs text-slate-500 text-center">${msg}</div>`;
  } else {
    filtrados.forEach(rec => {
      const preco = dadosPrecos[rec] !== undefined ? `${formatarPreco(dadosPrecos[rec])} SFL` : '';
      const itemDiv = document.createElement('div');
      itemDiv.className = "px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 cursor-pointer flex justify-between items-center transition border-b border-slate-800/50 last:border-0";
      itemDiv.innerHTML = `
        <span class="font-bold">${rec}</span>
        <span class="text-amber-400 font-mono text-[11px]">${preco}</span>
      `;
      itemDiv.onmousedown = (e) => {
        e.preventDefault();
        selecionarRecurso(rec);
      };
      listDiv.appendChild(itemDiv);
    });
  }
  listDiv.classList.remove('hidden');
}

function aoDigitarRecurso() {
  filtrarDropdownRecursos();
  const termo = document.getElementById('trade-resource-search').value.trim();
  const chaveCorrespondente = Object.keys(dadosPrecos).find(k => k.toLowerCase() === termo.toLowerCase());

  if (chaveCorrespondente) {
    selecionarRecurso(chaveCorrespondente);
  } else {
    document.getElementById('trade-resource').value = termo;
  }
}

function selecionarRecurso(nomeRecurso) {
  document.getElementById('trade-resource').value = nomeRecurso;
  document.getElementById('trade-resource-search').value = nomeRecurso;
  document.getElementById('resource-dropdown-list').classList.add('hidden');

  const unitInput = document.getElementById('trade-unit-price');
  const hint = document.getElementById('api-price-hint');
  const tipo = document.getElementById('trade-type').value;

  if (dadosPrecos[nomeRecurso] !== undefined) {
    unitInput.value = dadosPrecos[nomeRecurso];
    hint.classList.remove('hidden');
  } else {
    hint.classList.add('hidden');
  }

  const stockHint = document.getElementById('qty-stock-hint');
  if (tipo === 'sell') {
    const estoque = obterEstoqueAtual();
    const itemEstoque = estoque[nomeRecurso.toLowerCase()];
    if (itemEstoque && itemEstoque.qty > 0) {
      valorQtdMaxAtual = itemEstoque.qty;
      stockHint.innerText = t('hintStockMax', { qty: formatarPreco(itemEstoque.qty) });
      stockHint.classList.remove('hidden');
      document.getElementById('trade-qty').value = itemEstoque.qty;
    } else {
      stockHint.classList.add('hidden');
    }
  } else {
    stockHint.classList.add('hidden');
  }

  calcTotal();
}

function preencherQtdMax() {
  if (valorQtdMaxAtual > 0) {
    document.getElementById('trade-qty').value = valorQtdMaxAtual;
    calcTotal();
  }
}

document.addEventListener('click', (e) => {
  const container = document.getElementById('trade-resource-search')?.parentElement;
  if (container && !container.contains(e.target)) {
    document.getElementById('resource-dropdown-list').classList.add('hidden');
  }
});

function alterarTaxa(novaTaxa) {
  taxaVenda = parseFloat(novaTaxa);
  localStorage.setItem('sfl_tax_rate', taxaVenda);
  const elTaxSelect = document.getElementById('tax-select');
  if (elTaxSelect) elTaxSelect.value = taxaVenda.toString();
  atualizarDisplayTaxa();
  atualizarPreviewVenda();
  renderizarPortfolio();
}

function atualizarDisplayTaxa() {
  const elTaxDisplay = document.getElementById('tax-display');
  if (elTaxDisplay) elTaxDisplay.innerText = `${(taxaVenda * 100).toFixed(1)}%`;

  const elPreviewPercent = document.getElementById('preview-taxa-percent');
  if (elPreviewPercent) elPreviewPercent.innerText = `${(taxaVenda * 100).toFixed(1)}%`;
}

function abrirModal(tipo, recurso = '') {
  document.getElementById('trade-type').value = tipo;
  document.getElementById('trade-qty').value = '';
  document.getElementById('trade-unit-price').value = '';
  document.getElementById('trade-total-price').value = '';
  document.getElementById('qty-stock-hint').classList.add('hidden');

  const title = document.getElementById('modal-title');
  const btn = document.getElementById('modal-submit-btn');
  const sellPreview = document.getElementById('sell-tax-preview');

  if (tipo === 'buy') {
    title.innerText = t('modalTitleBuy');
    title.className = 'text-xl font-bold mb-4 text-emerald-400';
    btn.className = 'px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-white';
    sellPreview.classList.add('hidden');
  } else {
    title.innerText = t('modalTitleSell');
    title.className = 'text-xl font-bold mb-4 text-rose-400';
    btn.className = 'px-4 py-2 bg-rose-600 hover:bg-rose-500 rounded-xl text-xs font-bold text-white';
    sellPreview.classList.remove('hidden');
  }

  if (recurso) {
    selecionarRecurso(recurso);
    setTimeout(() => document.getElementById('trade-qty').focus(), 100);
  } else {
    document.getElementById('trade-resource').value = '';
    document.getElementById('trade-resource-search').value = '';
    document.getElementById('api-price-hint').classList.add('hidden');
  }

  document.getElementById('trade-modal').classList.remove('hidden');
  document.getElementById('trade-modal').classList.add('flex');

  atualizarPreviewVenda();
}

function fecharModal() {
  document.getElementById('trade-modal').classList.add('hidden');
  document.getElementById('trade-modal').classList.remove('flex');
}

function calcTotal() {
  const qty = parseFloat(document.getElementById('trade-qty').value) || 0;
  const unit = parseFloat(document.getElementById('trade-unit-price').value) || 0;
  if (qty > 0 && unit > 0) {
    document.getElementById('trade-total-price').value = (qty * unit).toFixed(4);
  }
  atualizarPreviewVenda();
}

function calcUnit() {
  const qty = parseFloat(document.getElementById('trade-qty').value) || 0;
  const total = parseFloat(document.getElementById('trade-total-price').value) || 0;
  if (qty > 0 && total > 0) {
    document.getElementById('trade-unit-price').value = (total / qty).toFixed(4);
  }
  atualizarPreviewVenda();
}

function atualizarPreviewVenda() {
  const tipo = document.getElementById('trade-type').value;
  if (tipo !== 'sell') return;

  const qty = parseFloat(document.getElementById('trade-qty').value) || 0;
  const unit = parseFloat(document.getElementById('trade-unit-price').value) || 0;

  const bruto = qty * unit;
  const valorTaxa = bruto * taxaVenda;
  const liquido = bruto - valorTaxa;

  document.getElementById('preview-bruto').innerText = `${formatarPreco(bruto)} SFL`;
  document.getElementById('preview-taxa-valor').innerText = `-${formatarPreco(valorTaxa)} SFL`;
  document.getElementById('preview-liquido').innerText = `${formatarPreco(liquido)} SFL`;

  const taxBtns = document.querySelectorAll('#modal-tax-buttons .tax-btn');
  const taxasValores = [0.20, 0.15, 0.10, 0.075];
  taxBtns.forEach((btn, index) => {
    if (taxasValores[index] === taxaVenda) {
      btn.className = "tax-btn px-2 py-1 rounded-lg bg-amber-500 text-slate-900 font-extrabold shadow transition";
    } else {
      btn.className = "tax-btn px-2 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold transition";
    }
  });
}

function salvarTransacao(e) {
  e.preventDefault();
  const tipo = document.getElementById('trade-type').value;
  const recurso = document.getElementById('trade-resource').value.trim() || document.getElementById('trade-resource-search').value.trim();
  const qty = parseFloat(document.getElementById('trade-qty').value);
  const unitPrice = parseFloat(document.getElementById('trade-unit-price').value);
  const totalPrice = parseFloat(document.getElementById('trade-total-price').value);

  if (!recurso) {
    alert(t('alertSelectResource'));
    return;
  }

  transacoes.push({
    id: Date.now(),
    tipo,
    recurso,
    qty,
    unitPrice,
    totalPrice,
    timestamp: new Date().toISOString()
  });

  localStorage.setItem('sfl_transactions', JSON.stringify(transacoes));
  fecharModal();
  renderizarPortfolio();
}

// Renderização Híbrida: Cards no Mobile e Tabela na Desktop
function renderizarPortfolio() {
  const tbody = document.getElementById('table-portfolio');
  const mobileContainer = document.getElementById('portfolio-mobile-cards');

  tbody.innerHTML = '';
  mobileContainer.innerHTML = '';

  const estoque = obterEstoqueAtual();
  const itensComEstoque = Object.keys(estoque).filter(key => estoque[key].qty > 0.0001);

  if (itensComEstoque.length === 0) {
    const emptyHtml = `<div class="p-4 text-center text-slate-500 text-xs">${t('emptyPortfolio')}</div>`;
    tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-slate-500">${t('emptyPortfolio')}</td></tr>`;
    mobileContainer.innerHTML = emptyHtml;
    return;
  }

  itensComEstoque.forEach(key => {
    const item = estoque[key];
    const precoMedio = item.custoTotal / item.qty;
    const precoAtualP2P = dadosPrecos[item.nome] || dadosPrecos[Object.keys(dadosPrecos).find(k => k.toLowerCase() === key)] || 0;

    const precoVendaLiquidoUnitario = precoAtualP2P * (1 - taxaVenda);
    const valorVendaLiquidoTotal = item.qty * precoVendaLiquidoUnitario;

    const lucroAbsoluto = valorVendaLiquidoTotal - item.custoTotal;
    const lucroPercentual = item.custoTotal > 0 ? (lucroAbsoluto / item.custoTotal) * 100 : 0;
    const corLucro = lucroAbsoluto >= 0 ? 'text-emerald-400' : 'text-rose-400';

    // 1. Renderiza Linha da Tabela Desktop
    const tr = document.createElement('tr');
    tr.className = "border-b border-slate-800 hover:bg-slate-800/30 transition";
    tr.innerHTML = `
      <td class="p-3 font-bold text-slate-200">${item.nome}</td>
      <td class="p-3 font-mono">${formatarPreco(item.qty)}</td>
      <td class="p-3 font-semibold font-mono">${formatarPreco(item.custoTotal)} SFL</td>
      <td class="p-3 text-slate-400 font-mono">${formatarPreco(precoMedio)} SFL</td>
      <td class="p-3 text-amber-400 font-semibold font-mono">${precoAtualP2P > 0 ? formatarPreco(precoAtualP2P) + ' SFL' : 'N/A'}</td>
      <td class="p-3 font-bold text-slate-100 font-mono">
        ${formatarPreco(valorVendaLiquidoTotal)} SFL
        <div class="text-[10px] text-slate-400 font-normal">(${formatarPreco(precoVendaLiquidoUnitario)} ${t('perUnit')})</div>
      </td>
      <td class="p-3 text-right font-bold font-mono ${corLucro}">
        ${lucroAbsoluto >= 0 ? '+' : ''}${formatarPreco(lucroAbsoluto)} SFL (${lucroPercentual.toFixed(1)}%)
      </td>
      <td class="p-3 text-center">
        <button onclick="abrirModal('sell', '${item.nome}')" class="bg-rose-950/60 hover:bg-rose-600/30 text-rose-400 text-xs px-2.5 py-1 rounded-lg border border-rose-800/50 transition">
          🔴 ${t('cardSell')}
        </button>
      </td>
    `;
    tbody.appendChild(tr);

    // 2. Renderiza Card Otimizado para Mobile
    const card = document.createElement('div');
    card.className = "bg-cardbg rounded-xl p-3.5 border border-slate-800 shadow-md flex flex-col gap-2.5";
    card.innerHTML = `
      <div class="flex justify-between items-center pb-2 border-b border-slate-800">
        <div>
          <span class="text-sm font-bold text-slate-100">${item.nome}</span>
          <span class="text-xs text-slate-400 font-mono block">x${formatarPreco(item.qty)}</span>
        </div>
        <button onclick="abrirModal('sell', '${item.nome}')" class="bg-rose-950/80 hover:bg-rose-600/30 text-rose-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-rose-800/60 transition">
          🔴 ${t('cardSell')}
        </button>
      </div>

      <div class="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span class="text-[10px] text-slate-400 uppercase font-semibold block">${t('thTotalCost')}</span>
          <span class="font-mono text-slate-200">${formatarPreco(item.custoTotal)} SFL</span>
        </div>
        <div>
          <span class="text-[10px] text-slate-400 uppercase font-semibold block">${t('thAvgPrice')}</span>
          <span class="font-mono text-slate-300">${formatarPreco(precoMedio)} SFL</span>
        </div>
        <div>
          <span class="text-[10px] text-slate-400 uppercase font-semibold block">${t('thP2pPrice')}</span>
          <span class="font-mono text-amber-400 font-semibold">${precoAtualP2P > 0 ? formatarPreco(precoAtualP2P) + ' SFL' : 'N/A'}</span>
        </div>
        <div>
          <span class="text-[10px] text-slate-400 uppercase font-semibold block">${t('thNetValue')}</span>
          <span class="font-mono text-slate-100 font-semibold">${formatarPreco(valorVendaLiquidoTotal)} SFL</span>
        </div>
      </div>

      <div class="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
        <span class="text-slate-400 font-semibold">${t('thEstPl')}:</span>
        <span class="font-mono font-bold ${corLucro}">
          ${lucroAbsoluto >= 0 ? '+' : ''}${formatarPreco(lucroAbsoluto)} SFL (${lucroPercentual.toFixed(1)}%)
        </span>
      </div>
    `;
    mobileContainer.appendChild(card);
  });
}

function renderizarCardsMercado() {
  const grid = document.getElementById('grid-recursos');
  grid.innerHTML = '';

  Object.keys(dadosPrecos).sort().forEach(item => {
    const precoAtual = dadosPrecos[item];

    const card = document.createElement('div');
    card.className = "bg-cardbg rounded-xl p-3 border border-slate-800 flex justify-between items-center item-card";
    card.setAttribute('data-name', item.toLowerCase());

    card.innerHTML = `
      <div>
        <div class="text-sm font-bold text-slate-200">${item}</div>
        <div class="text-xs text-slate-400">P2P: <span class="text-amber-400 font-semibold">${formatarPreco(precoAtual)} SFL</span></div>
      </div>
      <div class="flex gap-1">
        <button onclick="abrirModal('buy', '${item}')" class="bg-slate-800 hover:bg-emerald-600/20 hover:text-emerald-400 text-slate-300 text-[11px] px-2 py-1 rounded-lg border border-slate-700 transition">
          ${t('cardBuy')}
        </button>
        <button onclick="abrirModal('sell', '${item}')" class="bg-slate-800 hover:bg-rose-600/20 hover:text-rose-400 text-slate-300 text-[11px] px-2 py-1 rounded-lg border border-slate-700 transition">
          ${t('cardSell')}
        </button>
      </div>
    `;
        grid.appendChild(card);
      });
    }

    function filtrarRecursos() {
      const termo = document.getElementById('search').value.toLowerCase();
      document.querySelectorAll('.item-card').forEach(card => {
        const nome = card.getAttribute('data-name');
        card.style.display = nome.includes(termo) ? 'flex' : 'none';
      });
    }

    // Inicialização da aplicação com suporte a i18n
    alterarIdioma(currentLang);
