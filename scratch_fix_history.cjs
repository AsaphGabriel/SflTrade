const { Project, SyntaxKind } = require("ts-morph");

const project = new Project({ tsConfigFilePath: "tsconfig.json" });
const sourceFile = project.getSourceFileOrThrow("src/services/historyService.ts");

// Add some types to avoid implicit any
const typesToInject = `
import type { Database } from '../types/database.types';

export type TokenPriceHistory = Database['public']['Tables']['token_price_history']['Row'];
export type ResourcePriceHistory = Database['public']['Tables']['resource_price_history']['Row'];
export type NftPriceHistory = Database['public']['Tables']['nft_price_history']['Row'];

export interface MarketDataRecord {
  [key: string]: number;
}

export interface NftItem {
  id: number;
  name: string;
  collection?: string;
  floor: number;
  lastSalePrice?: number;
  supply?: number;
  boost_text?: string;
  displayName?: string;
  image?: string;
}

export interface HistoryPoint {
  id?: string;
  resource_id?: string;
  timestamp?: string;
  day?: string;
  price_sfl?: number;
  price_usd?: number;
  avg_price_sfl?: number;
  avg_price_usd?: number;
  min_price_sfl?: number;
  max_price_sfl?: number;
  records_count?: number;
  floor_sfl?: number;
  floor_usd?: number;
  avg_floor_sfl?: number;
  avg_floor_usd?: number;
  min_floor_sfl?: number;
  max_floor_sfl?: number;
  last_sale_sfl?: number | null;
  sma_7d_sfl?: number | null;
  sma_30d_sfl?: number | null;
  isInitialData?: boolean;
  t?: number;
  p?: number;
  price?: number;
  sma_7d?: number;
  sma_30d?: number;
  resources?: Record<string, number>;
  hourKey?: string;
  token_price_usd?: number;
}
`;

// Insert imports and types at the top
sourceFile.insertText(0, typesToInject);

sourceFile.getFunctions().forEach(func => {
    func.getParameters().forEach(param => {
        if (!param.getTypeNode()) {
            const name = param.getName();
            let newType = "any";
            
            if (name === "key") newType = "string";
            else if (name === "data") newType = "any";
            else if (name === "currentPrice" || name === "tokenPriceUsd" || name === "fallbackPrice" || name === "currentPriceSfl" || name === "currentFloorSfl") newType = "number";
            else if (name === "timeframe" || name === "resourceId" || name === "nftName" || name === "nftId") newType = "string | number";
            else if (name === "marketData" || name === "currentMarketData") newType = "Record<string, any>";
            else if (name === "rawData" || name === "nftList" || name === "nftMarketList") newType = "any[]";
            else if (name === "windowSize") newType = "number";
            else if (name === "valueKey") newType = "string";
            else if (name === "promise") newType = "Promise<any>";
            else if (name === "timeoutMs") newType = "number";
            
            param.setType(newType);
        }
    });
});

sourceFile.getVariableDeclarations().forEach(decl => {
   if (decl.getName() === "baselineCache" || decl.getName() === "nftBaselineCache") {
       decl.setType("Record<string, any>");
   }
});

sourceFile.saveSync();
console.log("Fixed historyService.ts!");
