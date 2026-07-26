// Dicionário de Idiomas
const translations = {
  en: {
    // Header
    subTitle: "SFL & P2P Quotes via sfl.world",
    sellTaxLabel: "Sell Tax:",
    btnBuy: "🟢 Buy",
    btnSell: "🔴 Sell",
    btnRefresh: "🔄 Refresh",
    updatedNow: "• Updated just now",
    updatedMinAgo: "• Updated {min}m ago",
    updatedAt: "• Updated at {time}",

    // Cards Top
    sflQuoteTitle: "SFL PRICE",
    activeTaxLabel: "Active Tax:",

    // Portfolio
    portfolioTitle: "📦 My Positions (Portfolio)",
    emptyPortfolio: "No items in stock. Register a buy transaction above.",
    thResource: "Resource",
    thQty: "Qty",
    thTotalCost: "Total Cost",
    thAvgPrice: "Avg Price",
    thP2pPrice: "P2P Price",
    thNetValue: "Net Value (w/ tax)",
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
    modalChangeTax: "Change Sell Tax:",
    grossTotal: "Gross Total:",
    taxFee: "Tax Fee ({tax}):",
    netAmount: "Net Amount:",
    btnCancel: "Cancel",
    btnConfirm: "Confirm",
    alertSelectResource: "Please select a resource."
  },

  pt: {
    // Header
    subTitle: "Cotação e P2P via sfl.world",
    sellTaxLabel: "Taxa de Venda:",
    btnBuy: "🟢 Compra",
    btnSell: "🔴 Venda",
    btnRefresh: "🔄 Atualizar",
    updatedNow: "• Atualizado agora",
    updatedMinAgo: "• Atualizado há {min} min",
    updatedAt: "• Atualizado às {time}",

    // Cards Top
    sflQuoteTitle: "COTAÇÃO SFL",
    activeTaxLabel: "Taxa Ativa:",

    // Portfolio
    portfolioTitle: "📦 Minhas Posições (Portfólio)",
    emptyPortfolio: "Nenhum recurso em estoque. Registre uma compra acima.",
    thResource: "Recurso",
    thQty: "Qtde",
    thTotalCost: "Custo Total",
    thAvgPrice: "Preço Médio",
    thP2pPrice: "Preço P2P",
    thNetValue: "Valor Líq. (c/ taxa)",
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
    modalChangeTax: "Alterar Taxa de Venda:",
    grossTotal: "Sem Taxa (Bruto):",
    taxFee: "Desconto Taxa ({tax}):",
    netAmount: "Líquido a Receber:",
    btnCancel: "Cancelar",
    btnConfirm: "Confirmar",
    alertSelectResource: "Por favor, selecione um recurso."
  }
};

let currentLang = localStorage.getItem('sfl_lang') || 'en';

// Retorna o texto traduzido
function t(key, params = {}) {
  let text = translations[currentLang]?.[key] || translations['en']?.[key] || key;
  Object.keys(params).forEach(p => {
    text = text.replace(`{${p}}`, params[p]);
  });
  return text;
}

// Altera o idioma globalmente
function alterarIdioma(novoIdioma) {
  currentLang = novoIdioma;
  localStorage.setItem('sfl_lang', currentLang);
  
  const elSelect = document.getElementById('lang-select');
  if (elSelect) elSelect.value = currentLang;

  // Atualiza elementos estáticos que possuem data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.getAttribute('data-i18n');
    if (k) el.innerText = t(k);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const k = el.getAttribute('data-i18n-placeholder');
    if (k) el.placeholder = t(k);
  });

  // Recarrega renderizações dinâmicas
  if (typeof carregarDados === 'function') carregarDados();
}
