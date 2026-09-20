import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req) => {
  try {
    if (req.method !== "POST" && req.method !== "GET") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error("Variáveis de ambiente do Supabase (URL/KEY) não configuradas.");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false }
    });

    // 1. Fetch Dólar/SFL
    const resExchange = await fetch('https://sfl.world/api/v1.1/exchange');
    if (!resExchange.ok) throw new Error(`Falha ao buscar exchange: HTTP ${resExchange.status}`);
    const exchangeData = await resExchange.json();
    const flowerPriceUsd = Number(exchangeData?.sfl?.usd || 0);

    // 2. Fetch Prices (Recursos)
    const resPrices = await fetch('https://sfl.world/api/v1/prices');
    if (!resPrices.ok) throw new Error(`Falha ao buscar prices: HTTP ${resPrices.status}`);
    const pricesData = await resPrices.json();

    // 3. Fetch NFTs
    const resNfts = await fetch('https://sfl.world/api/v1/nfts');
    if (!resNfts.ok) throw new Error(`Falha ao buscar nfts: HTTP ${resNfts.status}`);
    const nftsData = await resNfts.json();

    // --- A. Inserir Preço do Token ---
    let tokenInserted = false;
    if (flowerPriceUsd > 0) {
      const { error } = await supabase.from('token_price_history').insert({
        price_usd: flowerPriceUsd,
        source: 'sfl.world'
      });
      if (error) throw new Error(`Erro ao inserir token_price_history: ${error.message}`);
      tokenInserted = true;
    }

    // --- B. Inserir Preços de Recursos ---
    const resourcesToInsert = [];
    if (pricesData?.data?.p2p) {
      for (const [key, value] of Object.entries(pricesData.data.p2p)) {
        if (value && typeof value === 'number') {
          resourcesToInsert.push({
            resource_id: key,
            price_sfl: value,
            price_usd: value * flowerPriceUsd
          });
        }
      }
    }
    
    if (resourcesToInsert.length > 0) {
      const { error } = await supabase.from('resource_price_history').insert(resourcesToInsert);
      if (error) throw new Error(`Erro ao inserir resource_price_history: ${error.message}`);
    }

    // --- C. Inserir Preços de NFTs com Boost ---
    const nftsToInsert = [];
    const processNftList = (list: any[], collection: string) => {
      if (Array.isArray(list)) {
        list.filter(item => item.have_boost === 1 && item.name).forEach(item => {
           nftsToInsert.push({
             nft_id: Number(item.id) || 0,
             name: item.name,
             collection: collection,
             floor_sfl: Number(item.floor) || 0,
             floor_usd: (Number(item.floor) || 0) * flowerPriceUsd,
             last_sale_sfl: item.lastSalePrice ? Number(item.lastSalePrice) : null,
             supply: item.supply ? Number(item.supply) : null,
             have_boost: 1
           });
        });
      }
    };

    processNftList(nftsData?.collectibles, 'collectibles');
    processNftList(nftsData?.wearables, 'wearables');

    if (nftsToInsert.length > 0) {
      const { error } = await supabase.from('nft_price_history').insert(nftsToInsert);
      if (error) throw new Error(`Erro ao inserir nft_price_history: ${error.message}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Sincronização concluída com sucesso.", 
        records: {
          token: tokenInserted,
          resources: resourcesToInsert.length,
          nfts: nftsToInsert.length
        },
        flowerPriceUsd
      }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );

  } catch (err: any) {
    console.error("Erro crítico na Edge Function sync-market-prices:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
});
