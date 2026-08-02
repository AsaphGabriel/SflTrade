// Dicionário de Idiomas (EN / PT)
const translations = {
  en: {
    // Header
    subTitle: "SFL & P2P Quotes via sfl.world",
    btnBuy: "🟢 Buy",
    btnSell: "🔴 Sell",
    btnRefresh: "🔄 Refresh",
    updatedNow: "• Updated just now",
    updatedMinAgo: "• Updated {min}m ago",
    updatedAt: "• Updated at {time}",

    // Island & Tax Selectors
    islandLabel: "Island:",
    islandPetal: "Petal (50%)",
    islandDesert: "Desert (20%)",
    islandVolcano: "Volcano (15%)",
    islandBasic: "Basic (No Market)",
    islandAscension: "Ascension (Soon)",
    labelVip: "VIP (-50%)",
    labelShrine: "Shrine (-2.5%)",

    // Cards Top
    sflQuoteTitle: "$FLOWER PRICE",
    activeTaxLabel: "Effective Tax:",

    // Portfolio
    portfolioTitle: "📦 My Positions (Portfolio)",
    emptyPortfolio: "No items in stock. Register a buy transaction above.",
    thResource: "Resource",
    thQty: "Qty",
    thTotalCost: "Total Cost",
    thAvgPrice: "Avg Price",
    thP2pPrice: "P2P Price",
    thNetValue: "Net Value",
    thEstPl: "Est. P/L",
    thAction: "Action",
    perUnit: "/ unit",

    // Market
    marketTitle: "🛒 Market P2P Prices",
    searchPlaceholder: "Search resource...",
    cardBuy: "+ Buy",
    cardSell: "- Sell",

    // Modal
    modalTitleBuy: "🟢 Register Purchase",
    modalTitleSell: "🔴 Register Sale",
    labelResource: "Resource",
    placeholderResource: "Select or type to search...",
    labelQty: "Quantity",
    labelUnitPrice: "Unit Price in SFL",
    labelTotalPrice: "Gross Total Price in SFL",
    hintApiPrice: "API Price",
    hintStockMax: "Available: {qty} (Use Max)",
    noStockSell: "No stock available to sell",
    noItemFound: "No resource found",
    grossTotal: "Gross Total:",
    taxFee: "Tax Fee ({tax}):",
    netAmount: "Net Amount:",
    btnCancel: "Cancel",
    btnConfirm: "Confirm",
    alertSelectResource: "Please select a resource.",

    // Categorias do Mercado
    cat_crops: "Crops",
    cat_fruits: "Fruits",
    cat_animals: "Animal Production",
    cat_minerals: "Minerals & Resources",
    cat_misc: "Misc & Badges",
    marketTabAll: "All"
  },

  pt: {
    // Header
    subTitle: "Cotação e P2P via sfl.world",
    btnBuy: "🟢 Compra",
    btnSell: "🔴 Venda",
    btnRefresh: "🔄 Atualizar",
    updatedNow: "• Atualizado agora",
    updatedMinAgo: "• Atualizado há {min} min",
    updatedAt: "• Atualizado às {time}",

    // Island & Tax Selectors
    islandLabel: "Ilha:",
    islandPetal: "Petal (50%)",
    islandDesert: "Desert (20%)",
    islandVolcano: "Volcano (15%)",
    islandBasic: "Basic (Sem Mercado)",
    islandAscension: "Ascension (Em breve)",
    labelVip: "VIP (-50%)",
    labelShrine: "Shrine (-2.5%)",

    // Cards Top
    sflQuoteTitle: "COTAÇÃO SFL",
    activeTaxLabel: "Taxa Efetiva:",

    // Portfolio
    portfolioTitle: "📦 Minhas Posições (Portfólio)",
    emptyPortfolio: "Nenhum recurso em estoque. Registre uma compra acima.",
    thResource: "Recurso",
    thQty: "Qtde",
    thTotalCost: "Custo Total",
    thAvgPrice: "Preço Médio",
    thP2pPrice: "Preço P2P",
    thNetValue: "Valor Líquido",
    thEstPl: "Lucro/Prej. Est.",
    thAction: "Ação",
    perUnit: "/ un",

    // Market
    marketTitle: "🛒 Preços P2P do Mercado",
    searchPlaceholder: "Buscar recurso...",
    cardBuy: "+ Compra",
    cardSell: "- Venda",

    // Modal
    modalTitleBuy: "🟢 Registrar Compra",
    modalTitleSell: "🔴 Registrar Venda",
    labelResource: "Recurso",
    placeholderResource: "Selecione ou digite para buscar...",
    labelQty: "Quantidade",
    labelUnitPrice: "Preço Unitário em SFL",
    labelTotalPrice: "Preço Total Bruto em SFL",
    hintApiPrice: "Puxado da API",
    hintStockMax: "Disponível: {qty} (Usar Máx)",
    noStockSell: "Nenhum recurso em estoque para venda",
    noItemFound: "Nenhum recurso encontrado",
    grossTotal: "Sem Taxa (Bruto):",
    taxFee: "Desconto Taxa ({tax}):",
    netAmount: "Líquido a Receber:",
    btnCancel: "Cancelar",
    btnConfirm: "Confirmar",
    alertSelectResource: "Por favor, selecione um recurso.",

    // Categorias do Mercado
    cat_crops: "Plantações",
    cat_fruits: "Frutas",
    cat_animals: "Produção Animal",
    cat_minerals: "Minérios e Recursos",
    cat_misc: "Diversos e Emblemas",
    marketTabAll: "Todos"
  }
};

let currentLang = localStorage.getItem('sfl_lang') || 'en';

function t(key, params = {}) {
  let text = translations[currentLang]?.[key] || translations['en']?.[key] || key;
  Object.keys(params).forEach(p => {
    text = text.replace(`{${p}}`, params[p]);
  });
  return text;
}

function alterarIdioma(novoIdioma) {
  currentLang = novoIdioma;
  localStorage.setItem('sfl_lang', currentLang);
  
  const elSelect = document.getElementById('lang-select');
  if (elSelect) elSelect.value = currentLang;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.getAttribute('data-i18n');
    if (k) el.innerText = t(k);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const k = el.getAttribute('data-i18n-placeholder');
    if (k) el.placeholder = t(k);
  });

  renderizarCardsMercado();
  renderCategoryTabs();
  renderizarPortfolio();
}

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

const TRANSPARENT_FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3C/svg%3E";

function getItemIcon(itemName) {
  if (!itemName) return TRANSPARENT_FALLBACK;
  return `https://sfl.world/img/source/${encodeURIComponent(itemName)}.png`;
}

function getSystemIcon(iconName) {
  return `https://raw.githubusercontent.com/sunflower-land/sunflower-land/main/src/assets/icons/${iconName}.webp`;
}

function getIconImgTag(itemName, classeExtra = "") {
  const url = getItemIcon(itemName);
  return `<img src="${url}" alt="${itemName}" class="inline-block w-5 h-5 rounded-sm object-cover align-middle ${classeExtra}" onerror="this.onerror=null;this.src='${TRANSPARENT_FALLBACK}';">`;
}

async function fetchJsonSmart(url) {
  const workerUrl = 'https://sfltrade.asaphgabrielsousa.workers.dev/?url=' + encodeURIComponent(url);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(workerUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const text = await response.text();
    // The worker may return HTML with a <pre> containing JSON
    const match = text.match(/<pre>([\s\S]*?)<\/pre>/);
    if (match) {
      return JSON.parse(match[1]);
    }
    // Fallback: try to parse the whole response as JSON
    try {
      return JSON.parse(text);
    } catch {
      console.error(`[SmartFetch] Resposta inesperada para: ${url}`);
      return null;
    }
  } catch (error) {
    console.error(`[SmartFetch] Falha ao buscar: ${url}`, error);
    return null;
  }
}

function formatarPreco(valor) {
  if (valor === undefined || valor === null || isNaN(valor)) return '0';
  const num = Number(valor);
  if (num === 0) return '0';
  if (num >= 10) return num.toFixed(2);
  if (num >= 1) return num.toFixed(3);
  return parseFloat(num.toPrecision(3)).toString();
}

let sflUsd = 0.0679;
let cotacoesSfl = {};
let currencyRates = { usd: 0.0679, brl: 0.4419, eur: 0.0754, sgd: 0.1117, pol: 1.194 };
let selectedCurrency = localStorage.getItem('sfl_currency') || 'usd';
let ilhaSelecionada = localStorage.getItem('sfl_island') || 'volcano';
let isVip = localStorage.getItem('sfl_vip') === 'true';
let hasShrine = localStorage.getItem('sfl_shrine') === 'true';

let transacoes = JSON.parse(localStorage.getItem('sfl_transactions')) || [];
let valorQtdMaxAtual = 0;

// Category Tabs State
let currentCategoryFilter = 'all'; // 'all' or category id

function calcularTaxaEfetiva() {
  if (ilhaSelecionada === 'basic') return 0;

  const taxasBase = { petal: 0.50, desert: 0.20, volcano: 0.15 };
  let taxa = taxasBase[ilhaSelecionada] || 0.15;

  if (isVip) taxa = taxa / 2;
  if (hasShrine) taxa = Math.max(0, taxa - 0.025);

  return taxa;
}

function atualizarIlha(novaIlha) {
  ilhaSelecionada = novaIlha;
  localStorage.setItem('sfl_island', ilhaSelecionada);
  atualizarEstadosTaxa();
}

function atualizarVip(vipAtivo) {
  isVip = vipAtivo;
  localStorage.setItem('sfl_vip', isVip);
  atualizarEstadosTaxa();
}

function atualizarShrine(shrineAtivo) {
  hasShrine = shrineAtivo;
  localStorage.setItem('sfl_shrine', hasShrine);
  atualizarEstadosTaxa();
}

function atualizarEstadosTaxa() {
  atualizarDisplayTaxa();
  atualizarPreviewVenda();
  renderizarPortfolio();
}

function atualizarDisplayTaxa() {
  const taxaEfetiva = calcularTaxaEfetiva();
  const elTaxDisplay = document.getElementById('tax-display');
  
  if (elTaxDisplay) {
    if (ilhaSelecionada === 'basic') {
      elTaxDisplay.innerText = "N/A (No Market)";
      elTaxDisplay.className = "text-slate-400 font-bold text-xs";
    } else {
      elTaxDisplay.innerText = `${(taxaEfetiva * 100).toFixed(1)}%`;
      elTaxDisplay.className = "text-amber-400 font-bold text-sm block md:inline font-mono";
    }
  }

  const elPreviewPercent = document.getElementById('preview-taxa-percent');
  if (elPreviewPercent) elPreviewPercent.innerText = `${(taxaEfetiva * 100).toFixed(1)}%`;
}

function sincronizarControlesHeader() {
  const elIsland = document.getElementById('island-select');
  if (elIsland) elIsland.value = ilhaSelecionada;

  const elVip = document.getElementById('vip-checkbox');
  if (elVip) elVip.checked = isVip;

  const elShrine = document.getElementById('shrine-checkbox');
  if (elShrine) elShrine.checked = hasShrine;

  const elLang = document.getElementById('lang-select');
  if (elLang) elLang.value = currentLang;

  const elCurrency = document.getElementById('currency-select');
  if (elCurrency) elCurrency.value = selectedCurrency;

  atualizarDisplayTaxa();
  atualizarPrecoSFL();
}

function alterarMoeda(novaMoeda) {
  selectedCurrency = novaMoeda;
  localStorage.setItem('sfl_currency', selectedCurrency);
  atualizarPrecoSFL();
  atualizarExibicaoCotacao();
  converterQuantidade();
}

function atualizarExibicaoCotacao() {
  const elPrice = document.getElementById('sfl-price');
  if (!elPrice) return;

  const moeda = selectedCurrency;
  const valor = cotacoesSfl[moeda] || 0.0928;
  
  const symbolMap = { usd: '$', brl: 'R$', eur: '€', sgd: 'S$', pol: 'POL' };
  const sym = symbolMap[moeda] || '$';
  
  elPrice.innerText = `${sym} ${valor.toFixed(4)} ${moeda.toUpperCase()}`;
  
  // Disparar recálculo da calculadora
  converterQuantidade();
}

function atualizarPrecoSFL() {
  const elPrice = document.getElementById('sfl-price');
  if (!elPrice) return;
  const rate = currencyRates[selectedCurrency] || currencyRates.usd;
  const symbolMap = { usd: '$', brl: 'R$', eur: '€', sgd: 'S$', pol: 'POL' };
  const sym = symbolMap[selectedCurrency] || '$';
  elPrice.innerText = `${sym} ${rate.toFixed(4)} ${selectedCurrency.toUpperCase()}`;
}

function converterQuantidade() {
  const qty = parseFloat(document.getElementById('converter-qty').value) || 0;
  const rate = currencyRates[selectedCurrency] || currencyRates.usd;
  const result = qty * rate;
  const symbolMap = { usd: '$', brl: 'R$', eur: '€', sgd: 'S$', pol: 'POL' };
  const sym = symbolMap[selectedCurrency] || '$';
  document.getElementById('converter-result').innerText = `${sym} ${result.toFixed(4)}`;
}

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

async function carregarDados() {
  const dataExchange = await fetchJsonSmart('https://sfl.world/api/v1.1/exchange');
  if (dataExchange && dataExchange.sfl) {
    cotacoesSfl = dataExchange.sfl;
    const sfl = dataExchange.sfl;
    if (sfl.usd) sflUsd = sfl.usd;
    currencyRates = {
      usd: sfl.usd || 0.087,
      brl: sfl.brl || 0.4419,
      eur: sfl.eur || 0.0754,
      sgd: sfl.sgd || 0.1117,
      pol: sfl.pol || 1.194
    };
    atualizarExibicaoCotacao();
  }
  atualizarPrecoSFL();

  const dataPrices = await fetchJsonSmart('https://sfl.world/api/v1/prices');
  let textoHoraAtualizacao = '';

  if (dataPrices) {
    const p2pData = dataPrices.data?.p2p || dataPrices.p2p;
    if (p2pData) {
      dadosPrecos = { ...dadosPrecos, ...p2pData };
    }

    const updatedText = dataPrices.updated_text || dataPrices.data?.updated_text;
    if (updatedText) {
      let textoFormatado = updatedText;
      if (currentLang === 'pt') {
        textoFormatado = textoFormatado
          .replace('minutes ago', 'min atrás')
          .replace('minute ago', 'min atrás')
          .replace('mins ago', 'min atrás');
        textoHoraAtualizacao = `• Atualizado ${textoFormatado}`;
      } else {
        textoHoraAtualizacao = `• Updated ${textoFormatado}`;
      }
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
  renderCategoryTabs();
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
        <span class="font-bold flex items-center gap-1.5">${getIconImgTag(rec, "w-4 h-4")} ${rec}</span>
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

  const taxaEfetiva = calcularTaxaEfetiva();
  const bruto = qty * unit;
  const valorTaxa = bruto * taxaEfetiva;
  const liquido = bruto - valorTaxa;

  document.getElementById('preview-bruto').innerText = `${formatarPreco(bruto)} SFL`;
  document.getElementById('preview-taxa-valor').innerText = `-${formatarPreco(valorTaxa)} SFL`;
  document.getElementById('preview-liquido').innerText = `${formatarPreco(liquido)} SFL`;
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

  const taxaEfetiva = calcularTaxaEfetiva();

  itensComEstoque.forEach(key => {
    const item = estoque[key];
    const precoMedio = item.custoTotal / item.qty;
    const precoAtualP2P = dadosPrecos[item.nome] || dadosPrecos[Object.keys(dadosPrecos).find(k => k.toLowerCase() === key)] || 0;

    const precoVendaLiquidoUnitario = precoAtualP2P * (1 - taxaEfetiva);
    const valorVendaLiquidoTotal = item.qty * precoVendaLiquidoUnitario;

    const lucroAbsoluto = valorVendaLiquidoTotal - item.custoTotal;
    const lucroPercentual = item.custoTotal > 0 ? (lucroAbsoluto / item.custoTotal) * 100 : 0;
    const corLucro = lucroAbsoluto >= 0 ? 'text-emerald-400' : 'text-rose-400';

    const tr = document.createElement('tr');
    tr.className = "border-b border-slate-800 hover:bg-slate-800/30 transition";
    tr.innerHTML = `
      <td class="p-3 font-bold text-slate-200 flex items-center gap-2">${getIconImgTag(item.nome)} ${item.nome}</td>
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

    const card = document.createElement('div');
    card.className = "bg-cardbg rounded-xl p-3.5 border border-slate-800 shadow-md flex flex-col gap-2.5";
    card.innerHTML = `
      <div class="flex justify-between items-center pb-2 border-b border-slate-800">
        <div class="flex items-center gap-2">
          ${getIconImgTag(item.nome, "w-6 h-6")}
          <div>
            <span class="text-sm font-bold text-slate-100">${item.nome}</span>
            <span class="text-xs text-slate-400 font-mono block">x${formatarPreco(item.qty)}</span>
          </div>
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
          <span class="text-[10px] text-slate-400 uppercase font-semibold block">${t('thNetValue')}</span>
          <span class="font-mono text-slate-100 font-semibold">${formatarPreco(valorVendaLiquidoTotal)} SFL</span>
        </div>
        <div>
          <span class="text-[10px] text-slate-400 uppercase font-semibold block">${t('thP2pPrice')}</span>
          <span class="font-mono text-amber-400 font-semibold">${precoAtualP2P > 0 ? formatarPreco(precoAtualP2P) + ' SFL' : 'N/A'}</span>
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

// ===== Classificação de Itens por Categoria (Com i18n e novas posições) =====
const CATEGORIAS_MERCADO = [
  {
    id: 'crops',
    titleKey: 'cat_crops',
    itens: [
      "Sunflower", "Potato", "Pumpkin", "Carrot", "Cabbage", "Beetroot",
      "Cauliflower", "Parsnip", "Eggplant", "Corn", "Radish", "Wheat",
      "Kale", "Barley", "Soybean", "Rice", "Tomato", "Zucchini", "Yam",
      "Rhubarb", "Artichoke", "Onion", "Pepper", "Broccoli", "Turnip"
    ]
  },
  {
    id: 'fruits',
    titleKey: 'cat_fruits',
    itens: [
      "Apple", "Orange", "Blueberry", "Banana", "Lemon", "Olive",
      "Grape", "Duskberry", "Celestine", "Lunara"
    ]
  },
  {
    id: 'animals',
    titleKey: 'cat_animals',
    itens: [
      "Egg", "Milk", "Wool", "Merino Wool", "Leather", "Feather", "Honey"
    ]
  },
  {
    id: 'minerals',
    titleKey: 'cat_minerals',
    itens: [
      "Wood", "Stone", "Iron", "Gold", "Crimstone", "Obsidian", "Salt"
    ]
  },
  {
    id: 'misc',
    titleKey: 'cat_misc',
    itens: [
      "Capsule Bait", "Chewed Bone", "Crimson Baitfish", "Umbrella Bait",
      "Bumpkin Emblem", "Goblin Emblem", "Nightshade Emblem",
      "Sunflorian Emblem", "Ruffroot", "Heart Leaf", "Moonfur",
      "Ribbon", "Dewberry", "Frost Pebble", "Wild Grass", "Saltwort"
    ]
  }
];

function obterCategoriaItem(nomeItem) {
  for (const cat of CATEGORIAS_MERCADO) {
    if (cat.itens.some(i => i.toLowerCase() === nomeItem.toLowerCase())) {
      return cat.id;
    }
  }
  return 'misc';
}

function renderCategoryTabs() {
  const tabsContainer = document.getElementById('category-tabs');
  if (!tabsContainer) return;

  // Build tabs: "All" + each category (no icon property needed)
  const tabs = [
    { id: 'all', key: 'marketTabAll' },
    ...CATEGORIAS_MERCADO.map(cat => ({ id: cat.id, key: cat.titleKey }))
  ];

  tabsContainer.innerHTML = tabs.map(tab => {
    const count = tab.id === 'all' 
      ? Object.keys(dadosPrecos).length 
      : (CATEGORIAS_MERCADO.find(c => c.id === tab.id)?.itens.filter(i => dadosPrecos[i]).length || 0);
    
    const isActive = currentCategoryFilter === tab.id;
    // Build icon HTML: for 'all' no icon, otherwise use an <img> tag
    let iconHtml = '';
    if (tab.id !== 'all') {
      const iconUrl = getCategoryIcon(tab.id);
      if (iconUrl) {
        iconHtml = `<img src="${iconUrl}" alt="${tab.id}" class="category-tab-icon" onerror="this.onerror=null;this.src='${TRANSPARENT_FALLBACK}';">`;
      }
    }
    return `
      <button 
        class="category-tab ${isActive ? 'active' : ''}" 
        role="tab" 
        aria-selected="${isActive}"
        data-category="${tab.id}"
        onclick="selectCategoryTab('${tab.id}')"
      >
        ${iconHtml}
        <span data-i18n="${tab.key}">${t(tab.key)}</span>
        <span class="tab-count">${count}</span>
      </button>
    `;
  }).join('');
}

function getCategoryIcon(catId) {
  // Official game asset images for each category
  const assetMap = {
    crops: 'Sunflower',
    fruits: 'Apple',
    animals: 'Egg',
    minerals: 'Wood',
    misc: 'Sunflorian Emblem'
  };
  const itemName = assetMap[catId];
  if (!itemName) return ''; // 'all' returns empty
  return getItemIcon(itemName);
}

function selectCategoryTab(categoryId) {
  currentCategoryFilter = categoryId;
  
  // Update active tab visual
  document.querySelectorAll('.category-tab').forEach(tab => {
    const isActive = tab.dataset.category === categoryId;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', isActive);
  });
  
  // Re-render cards with filter
  renderizarCardsMercado();
  
  // Re-apply search filter if any
  filtrarRecursos();
}

function renderizarCardsMercado() {
  const container = document.getElementById('grid-recursos');
  if (!container) return;
  container.innerHTML = '';

  const grupos = {};
  CATEGORIAS_MERCADO.forEach(cat => { grupos[cat.id] = []; });

  Object.keys(dadosPrecos).forEach(item => {
    const catId = obterCategoriaItem(item);
    if (!grupos[catId]) grupos[catId] = [];
    grupos[catId].push(item);
  });

  // Determine which categories to show
  const categoriesToRender = currentCategoryFilter === 'all' 
    ? CATEGORIAS_MERCADO 
    : CATEGORIAS_MERCADO.filter(cat => cat.id === currentCategoryFilter);

  categoriesToRender.forEach(cat => {
    const itens = grupos[cat.id] || [];
    if (itens.length === 0) return;

    // Ordenação interna: menor preço P2P -> maior preço P2P
    itens.sort((a, b) => (dadosPrecos[a] || 0) - (dadosPrecos[b] || 0));

    const section = document.createElement('div');
    section.className = 'category-block';

    const titulo = document.createElement('h3');
    titulo.className = 'market-category-title';
    titulo.textContent = t(cat.titleKey);
    section.appendChild(titulo);

    const grid = document.createElement('div');
    grid.className = 'category-grid';

    itens.forEach(item => {
      const precoAtual = dadosPrecos[item];
      const iconUrl = getItemIcon(item);

      const card = document.createElement('div');
      card.className = "market-card item-card";
      card.setAttribute('data-name', item.toLowerCase());
      card.setAttribute('data-category', cat.id);

      card.innerHTML = `
        <div class="market-card-img-wrap">
          <img src="${iconUrl}" alt="${item}" onerror="this.onerror=null;this.src='${TRANSPARENT_FALLBACK}';">
        </div>
        <div class="market-card-info">
          <div class="market-card-name">${item}</div>
          <div class="market-card-price">${formatarPreco(precoAtual)} SFL</div>
        </div>
        <div class="market-card-actions">
          <button onclick="abrirModal('buy', '${item}')" class="btn-buy-card">${t('cardBuy')}</button>
          <button onclick="abrirModal('sell', '${item}')" class="btn-sell-card">${t('cardSell')}</button>
        </div>
      `;
      grid.appendChild(card);
    });

    section.appendChild(grid);
    container.appendChild(section);
  });
  
  // Update tab counts after render (in case prices loaded)
  updateTabCounts();
}

function updateTabCounts() {
  document.querySelectorAll('.category-tab').forEach(tab => {
    const catId = tab.dataset.category;
    const countEl = tab.querySelector('.tab-count');
    if (!countEl) return;
    
    let count = 0;
    if (catId === 'all') {
      count = Object.keys(dadosPrecos).length;
    } else {
      const cat = CATEGORIAS_MERCADO.find(c => c.id === catId);
      if (cat) {
        count = cat.itens.filter(i => dadosPrecos[i]).length;
      }
    }
    countEl.textContent = count;
  });
}

function filtrarRecursos() {
  const termo = document.getElementById('search').value.toLowerCase();
  document.querySelectorAll('.category-block').forEach(section => {
    let visiveis = 0;
    section.querySelectorAll('.market-card').forEach(card => {
      const nome = card.getAttribute('data-name');
      const mostrar = nome.includes(termo);
      card.style.display = mostrar ? 'flex' : 'none';
      if (mostrar) visiveis++;
    });
    section.style.display = visiveis > 0 ? '' : 'none';
  });
}

// Re-render tabs when language changes (to update labels)
const originalAlterarIdioma = alterarIdioma;
alterarIdioma = function(novoIdioma) {
  originalAlterarIdioma(novoIdioma);
  renderCategoryTabs();
};

// ===== Navegação por abas (SPA) =====
function showTab(tabName) {
  // Esconde todas as seções
  document.getElementById('home-section').classList.add('hidden');
  document.getElementById('profile-section').classList.add('hidden');
  document.getElementById('info-section').classList.add('hidden');

  // Mostra a seção selecionada
  const sectionMap = {
    home: 'home-section',
    profile: 'profile-section',
    info: 'info-section'
  };
  const sectionId = sectionMap[tabName];
  if (sectionId) {
    document.getElementById(sectionId).classList.remove('hidden');
  }

  // Atualiza estilo dos botões da nav
  document.querySelectorAll('#bottom-nav button').forEach(btn => {
    btn.classList.remove('text-amber-400');
    btn.classList.add('text-slate-400');
  });
  const activeBtn = document.getElementById(`nav-${tabName}`);
  if (activeBtn) {
    activeBtn.classList.remove('text-slate-400');
    activeBtn.classList.add('text-amber-400');
  }
}

// ===== Perfil (Farm ID e API Key) =====
function salvarPerfil() {
  const farmId = document.getElementById('farm-id-input').value.trim();
  const apiKey = document.getElementById('api-key-input').value.trim();
  localStorage.setItem('sfl_farm_id', farmId);
  localStorage.setItem('sfl_api_key', apiKey);
  const msg = document.getElementById('profile-saved-msg');
  msg.classList.remove('hidden');
  setTimeout(() => msg.classList.add('hidden'), 2000);
}

function carregarPerfil() {
  const farmId = localStorage.getItem('sfl_farm_id') || '';
  const apiKey = localStorage.getItem('sfl_api_key') || '';
  document.getElementById('farm-id-input').value = farmId;
  document.getElementById('api-key-input').value = apiKey;
}

// ===== Busca de Farm ID =====
async function buscarFarmId(e) {
  if (e) {
    e.preventDefault();
  }
  const farmId = document.getElementById('farm-id-search').value.trim();
  if (!farmId) return;

  const url = `https://sfl.world/api/v1.1/land/${farmId}`;
  const workerUrl = 'https://sfltrade.asaphgabrielsousa.workers.dev/?url=' + encodeURIComponent(url);

  try {
    const response = await fetch(workerUrl);
    const text = await response.text();
    const match = text.match(/<pre>([\s\S]*?)<\/pre>/);
    let data;
    if (match) {
      data = JSON.parse(match[1]);
    } else {
      data = JSON.parse(text);
    }

    if (data && data.land) {
      const land = data.land;
      // Atualiza ilha
      if (land.type) {
        const islandMap = {
          'petal': 'petal',
          'desert': 'desert',
          'volcano': 'volcano',
          'basic': 'basic',
          'ascension': 'ascension'
        };
        const islandKey = islandMap[land.type.toLowerCase()] || 'volcano';
        document.getElementById('island-select').value = islandKey;
        atualizarIlha(islandKey);
      }
      // Atualiza VIP
      if (land.vip !== undefined) {
        const vipCheck = document.getElementById('vip-checkbox');
        vipCheck.checked = land.vip;
        atualizarVip(land.vip);
      }
      // Atualiza Shrine (se existir)
      if (land.shrine !== undefined) {
        const shrineCheck = document.getElementById('shrine-checkbox');
        shrineCheck.checked = land.shrine;
        atualizarShrine(land.shrine);
      }
      localStorage.setItem('sfl_farm_id', farmId);
      atualizarDisplayTaxa();
    }
  } catch (error) {
    console.error('Erro ao buscar Farm ID:', error);
  }
}

// Inicialização
sincronizarControlesHeader();
alterarIdioma(currentLang);
carregarDados(); // <-- ADICIONADO: carrega dados da API automaticamente
carregarPerfil();

// Initialize category tabs after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  renderCategoryTabs();
  // Mostra home por padrão
  showTab('home');
});
