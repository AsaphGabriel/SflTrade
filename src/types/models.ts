export interface Transaction {
  id?: number | string;
  timestamp?: string;
  tipo: 'buy' | 'sell';
  nome: string;
  recurso?: string;
  qty: number;
  unitPrice: number;
  totalPrice: number;
  cotacao_entrada_usd?: number;
  token_price_usd_at_purchase?: number;
  total_price_usd?: number;
  total_usd?: number;
  isNft?: boolean;
  nft_id?: string | number | null;
  boost_text?: string;
}

export interface PortfolioItem {
  nome: string;
  qty: number;
  custoTotal: number;
  custoTotalUsd: number;
  isNft?: boolean;
  boost_text?: string;
  nft_id?: string | number | null;
  collection?: string;
  image?: string;
  precoMedio?: number;
  precoMedioUsd?: number;
  cotacaoMediaFlowerUsd?: number;
  valorVendaLiquidoTotalUsd?: number;
  lucroAbsolutoUsd?: number;
  lucroPercentualUsd?: number;
  precoP2P?: number;
  precoVendaLiquidoUnitario?: number;
  valorVendaLiquidoTotal?: number;
  lucroAbsoluto?: number;
  lucroPercentual?: number;
  custoTotalMoeda?: number;
  valorVendaLiquidoTotalMoeda?: number;
  lucroAbsolutoMoeda?: number;
  lucroPercentualMoeda?: number;
}
