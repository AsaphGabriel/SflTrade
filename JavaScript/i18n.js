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
    sflQuoteTitle: "SFL PRICE",
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
    cat_crops: "🌾 Crops",
    cat_fruits: "🍎 Fruits",
    cat_animals: "🐔 Animal Production",
    cat_minerals: "⛏️ Minerals & Resources",
    cat_misc: "📦 Misc & Badges"
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
    cat_crops: "🌾 Plantações",
    cat_fruits: "🍎 Frutas",
    cat_animals: "🐔 Produção Animal",
    cat_minerals: "⛏️ Minérios e Recursos",
    cat_misc: "📦 Diversos e Emblemas"
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

  if (typeof carregarDados === 'function') carregarDados();
}