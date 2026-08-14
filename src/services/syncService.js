import { supabase } from './supabase';

/**
 * Busca todas as informações do usuário no Supabase (settings, portfolios, transactions)
 */
export async function fetchRemoteUserData(userId) {
  if (!userId) return null;

  try {
    // 1. Configurações
    const { data: settingsData, error: settingsErr } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (settingsErr && settingsErr.code !== 'PGRST116') {
      console.warn('[SyncService] Erro ao buscar user_settings:', settingsErr);
    }

    // 2. Portfólios
    const { data: portfoliosData, error: portErr } = await supabase
      .from('user_portfolios')
      .select('*')
      .eq('user_id', userId);

    if (portErr) {
      console.warn('[SyncService] Erro ao buscar user_portfolios:', portErr);
    }

    // 3. Transações
    const { data: transactionsData, error: txErr } = await supabase
      .from('user_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (txErr) {
      console.warn('[SyncService] Erro ao buscar user_transactions:', txErr);
    }

    return {
      settings: settingsData || null,
      portfolios: portfoliosData || [],
      transactions: transactionsData || []
    };
  } catch (err) {
    console.error('[SyncService] Erro em fetchRemoteUserData:', err);
    return null;
  }
}

/**
 * Sincroniza dados locais (LocalStorage) para o Supabase (Push local -> remote)
 */
export async function syncLocalToSupabase(userId, { localTransactions = [], localSettings = {}, localPortfolios = [] }) {
  if (!userId) return;

  try {
    // 1. Sincronizar Settings
    if (localSettings && Object.keys(localSettings).length > 0) {
      const islandTaxMap = { basic: 0, desert: 20, volcano: 15, petal: 50 };
      const islandTax = islandTaxMap[localSettings.selectedIsland] ?? 15.0;

      await supabase.from('user_settings').upsert({
        user_id: userId,
        island_tax: islandTax,
        vip_active: Boolean(localSettings.isVip),
        shrine_active: Boolean(localSettings.isShrine),
        preferred_currency: (localSettings.selectedCurrency || 'USD').toUpperCase(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    }

    // 2. Sincronizar Transações (subir transações locais que ainda não estão no Supabase)
    if (localTransactions && localTransactions.length > 0) {
      // Buscar transações existentes para evitar duplicatas simples
      const { data: existingTx } = await supabase
        .from('user_transactions')
        .select('created_at, resource_id, quantity')
        .eq('user_id', userId);

      const existingSet = new Set(
        (existingTx || []).map(t => `${t.created_at}_${t.resource_id}_${t.quantity}`)
      );

      const newTxsToInsert = localTransactions
        .filter(t => {
          const key = `${t.timestamp || t.created_at}_${t.recurso || t.resource_id}_${t.qty || t.quantity}`;
          return !existingSet.has(key);
        })
        .map(t => ({
          user_id: userId,
          resource_id: t.recurso || t.resource_id,
          type: (t.tipo || t.type || 'BUY').toUpperCase(),
          quantity: Number(t.qty || t.quantity || 0),
          price_sfl: Number(t.unitPrice || t.price_sfl || 0),
          token_price_usd_at_purchase: Number(t.cotacao_entrada_usd || t.token_price_usd_at_purchase || 0),
          total_sfl: Number(t.totalPrice || t.total_sfl || 0),
          total_usd: Number(t.total_price_usd || t.total_usd || (t.totalPrice * (t.cotacao_entrada_usd || 0.087))),
          created_at: t.timestamp || t.created_at || new Date().toISOString()
        }));

      if (newTxsToInsert.length > 0) {
        const { error: insertTxErr } = await supabase
          .from('user_transactions')
          .insert(newTxsToInsert);
        
        if (insertTxErr) {
          console.warn('[SyncService] Erro ao enviar transações locais:', insertTxErr);
        }
      }
    }

    // 3. Sincronizar Portfólios / Posições
    if (localPortfolios && localPortfolios.length > 0) {
      const portfolioRows = localPortfolios.map(p => ({
        user_id: userId,
        resource_id: p.nome || p.resource_id,
        quantity: Number(p.qty || p.quantity || 0),
        avg_price_sfl: Number(p.precoMedio || p.avg_price_sfl || 0),
        avg_token_price_usd: Number(p.cotacaoMediaFlowerUsd || p.avg_token_price_usd || 0.087),
        updated_at: new Date().toISOString()
      }));

      const { error: portErr } = await supabase
        .from('user_portfolios')
        .upsert(portfolioRows, { onConflict: 'user_id, resource_id' });

      if (portErr) {
        console.warn('[SyncService] Erro ao sincronizar user_portfolios:', portErr);
      }
    }

    console.log('[SyncService] Sincronização Local -> Supabase concluída com sucesso!');
  } catch (err) {
    console.error('[SyncService] Erro na sincronização Local -> Supabase:', err);
  }
}

/**
 * Persiste uma nova transação individual diretamente no Supabase quando logado
 */
export async function saveTransactionRemote(userId, transaction) {
  if (!userId || !transaction) return;

  try {
    const row = {
      user_id: userId,
      resource_id: transaction.recurso || transaction.resource_id,
      type: (transaction.tipo || transaction.type || 'BUY').toUpperCase(),
      quantity: Number(transaction.qty || transaction.quantity || 0),
      price_sfl: Number(transaction.unitPrice || transaction.price_sfl || 0),
      token_price_usd_at_purchase: Number(transaction.cotacao_entrada_usd || transaction.token_price_usd_at_purchase || 0),
      total_sfl: Number(transaction.totalPrice || transaction.total_sfl || 0),
      total_usd: Number(transaction.total_price_usd || transaction.total_usd || (transaction.totalPrice * (transaction.cotacao_entrada_usd || 0.087))),
      created_at: transaction.timestamp || transaction.created_at || new Date().toISOString()
    };

    const { error } = await supabase
      .from('user_transactions')
      .insert([row]);

    if (error) {
      console.error('[SyncService] Erro ao salvar transação no Supabase:', error);
    }
  } catch (err) {
    console.error('[SyncService] Exceção ao salvar transação no Supabase:', err);
  }
}

/**
 * Persiste portfólios atualizados diretamente no Supabase
 */
export async function savePortfoliosRemote(userId, portfolioList) {
  if (!userId || !portfolioList) return;

  try {
    const rows = portfolioList.map(p => ({
      user_id: userId,
      resource_id: p.nome || p.resource_id,
      quantity: Number(p.qty || p.quantity || 0),
      avg_price_sfl: Number(p.precoMedio || p.avg_price_sfl || 0),
      avg_token_price_usd: Number(p.cotacaoMediaFlowerUsd || p.avg_token_price_usd || 0.087),
      updated_at: new Date().toISOString()
    }));

    if (rows.length > 0) {
      const { error } = await supabase
        .from('user_portfolios')
        .upsert(rows, { onConflict: 'user_id, resource_id' });

      if (error) {
        console.error('[SyncService] Erro ao salvar portfólio no Supabase:', error);
      }
    }
  } catch (err) {
    console.error('[SyncService] Exceção ao salvar portfólio no Supabase:', err);
  }
}

/**
 * Persiste configurações alteradas no Supabase
 */
export async function saveSettingsRemote(userId, settings) {
  if (!userId || !settings) return;

  try {
    const islandTaxMap = { basic: 0, desert: 20, volcano: 15, petal: 50 };
    const islandTax = islandTaxMap[settings.selectedIsland] ?? 15.0;

    const row = {
      user_id: userId,
      island_tax: islandTax,
      vip_active: Boolean(settings.isVip),
      shrine_active: Boolean(settings.isShrine),
      preferred_currency: (settings.selectedCurrency || 'USD').toUpperCase(),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('user_settings')
      .upsert(row, { onConflict: 'user_id' });

    if (error) {
      console.error('[SyncService] Erro ao salvar configurações no Supabase:', error);
    }
  } catch (err) {
    console.error('[SyncService] Exceção ao salvar configurações no Supabase:', err);
  }
}
