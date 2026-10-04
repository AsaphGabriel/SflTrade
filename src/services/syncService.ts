import { supabase } from './supabase';

/**
 * Utilitário para verificar se o erro é de permissão/RLS (ex: 42501 Forbidden)
 */
function isPermissionOrForbiddenError(error: { message?: string; status?: number; [key: string]: unknown } | unknown) {
  if (!error) return false;
  const code = String((error as { code?: string }).code || '');
  const msg = String((error as { message?: string }).message || '');
  return (
    code === '42501' ||
    (error as { status?: number }).status === 403 ||
    msg.toLowerCase().includes('row-level security') ||
    msg.toLowerCase().includes('permission denied') ||
    msg.toLowerCase().includes('42501')
  );
}

/**
 * Busca todas as informações do usuário no Supabase (settings, portfolios, transactions)
 */
export async function fetchRemoteUserData(userId: string) {
  if (!userId) return null;

  try {
    // 1. Configurações
    const { data: settingsData, error: settingsErr } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (settingsErr) {
      if (isPermissionOrForbiddenError(settingsErr)) {
        console.warn('[SyncService] Permissão negada ao buscar user_settings (42501). Abortando busca remota.');
        return null;
      }
      if (settingsErr.code !== 'PGRST116') {
        console.warn('[SyncService] Erro ao buscar user_settings:', settingsErr.message || settingsErr);
      }
    }

    // 2. Portfólios
    const { data: portfoliosData, error: portErr } = await supabase
      .from('user_portfolios')
      .select('*')
      .eq('user_id', userId);

    if (portErr) {
      if (isPermissionOrForbiddenError(portErr)) {
        console.warn('[SyncService] Permissão negada ao buscar user_portfolios (42501).');
      } else {
        console.warn('[SyncService] Erro ao buscar user_portfolios:', portErr.message || portErr);
      }
    }

    // 3. Transações
    const { data: transactionsData, error: txErr } = await supabase
      .from('user_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (txErr) {
      if (isPermissionOrForbiddenError(txErr)) {
        console.warn('[SyncService] Permissão negada ao buscar user_transactions (42501).');
      } else {
        console.warn('[SyncService] Erro ao buscar user_transactions:', txErr.message || txErr);
      }
    }

    return {
      settings: settingsData || null,
      portfolios: portfoliosData || [],
      transactions: transactionsData || []
    };
  } catch (err: unknown) {
    console.warn('[SyncService] Exceção em fetchRemoteUserData:', (err as Error)?.message || err);
    return null;
  }
}

/**
 * Sincroniza dados locais (LocalStorage) para o Supabase (Push local -> remote)
 */
export async function syncLocalToSupabase(userId: string, { localTransactions = [], localSettings = {}, localPortfolios = [] }: { localTransactions?: { resource_id?: string; recurso?: string; type?: string; quantity?: number; qty?: number; price_sfl?: number; unitPrice?: number; timestamp?: number; [key: string]: unknown }[]; localSettings?: Record<string, unknown>; localPortfolios?: { nome?: string; resource_id?: string; customAvgPrice?: number; qty?: number; quantity?: number; precoMedio?: number; avg_price_sfl?: number; cotacaoMediaFlowerUsd?: number; avg_token_price_usd?: number; }[] }) {
  if (!userId) return;

  try {
    // 1. Sincronizar Settings
    if (localSettings && Object.keys(localSettings).length > 0) {
      const islandTaxMap = { basic: 0, desert: 20, volcano: 15, petal: 50 };
      // @ts-ignore
      const islandTax = islandTaxMap[localSettings.selectedIsland] ?? 15.0;

      const { error: setErr } = await supabase.from('user_settings').upsert({
        user_id: userId,
        island_tax: islandTax,
        vip_active: Boolean(localSettings.isVip),
        shrine_active: Boolean(localSettings.isShrine),
        preferred_currency: String((localSettings as { selectedCurrency?: string }).selectedCurrency || 'USD').toUpperCase(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

      if (setErr) {
        if (isPermissionOrForbiddenError(setErr)) {
          console.warn('[SyncService] Permissão negada ao sincronizar user_settings (42501). Interrompendo push.');
          return;
        }
        console.warn('[SyncService] Erro ao sincronizar user_settings:', setErr.message || setErr);
      }
    }

    // 2. Sincronizar Transações (subir transações locais que ainda não estão no Supabase)
    if (localTransactions && localTransactions.length > 0) {
      const { data: existingTx, error: fetchTxErr } = await supabase
        .from('user_transactions')
        .select('resource_id, type, quantity, price_sfl, created_at')
        .eq('user_id', userId);

      if (fetchTxErr) {
        if (isPermissionOrForbiddenError(fetchTxErr)) {
          console.warn('[SyncService] Permissão negada ao consultar user_transactions (42501).');
          return;
        }
        console.warn('[SyncService] Erro ao consultar transações existentes:', fetchTxErr.message || fetchTxErr);
      }

      // Chave robusta de identificação de transação
      const makeKey = (res: string, type: string, qty: number, price: number) => {
        return `${String(res).toLowerCase()}_${String(type).toUpperCase()}_${Number(qty).toFixed(4)}_${Number(price).toFixed(6)}`;
      };

      const existingSet = new Set(
        (existingTx || []).map((t: { resource_id?: string; recurso?: string; type?: string; quantity?: number; qty?: number; price_sfl?: number; unitPrice?: number; total_price_usd?: number; totalPrice?: number; timestamp?: number; created_at?: string; id?: string; [key: string]: unknown }) => makeKey(String((t as { resource_id?: string }).resource_id), String((t as { type?: string }).type), Number((t as { quantity?: number }).quantity), Number((t as { price_sfl?: number }).price_sfl)))
      );

      const newTxsToInsert = localTransactions
        .filter((t: { resource_id?: string; recurso?: string; type?: string; quantity?: number; qty?: number; price_sfl?: number; unitPrice?: number; total_price_usd?: number; totalPrice?: number; timestamp?: number; created_at?: string; id?: string; [key: string]: unknown }) => {
          const key = makeKey(String((t as { recurso?: string }).recurso || (t as { resource_id?: string }).resource_id), String((t as { tipo?: string }).tipo || (t as { type?: string }).type), Number((t as { qty?: number }).qty || (t as { quantity?: number }).quantity), Number((t as { unitPrice?: number }).unitPrice || (t as { price_sfl?: number }).price_sfl));
          return !existingSet.has(key);
        })
        .map((t: { resource_id?: string; recurso?: string; type?: string; quantity?: number; qty?: number; price_sfl?: number; unitPrice?: number; total_price_usd?: number; totalPrice?: number; timestamp?: number; created_at?: string; id?: string; [key: string]: unknown }) => ({
          user_id: userId,
          resource_id: String(t.recurso || t.resource_id),
          type: String((t as { tipo?: string }).tipo || (t as { type?: string }).type || 'BUY').toUpperCase(),
          quantity: Number(t.qty || t.quantity || 0),
          price_sfl: Number(t.unitPrice || t.price_sfl || 0),
          token_price_usd_at_purchase: Number(t.cotacao_entrada_usd || t.token_price_usd_at_purchase || 0.087),
          total_sfl: Number(t.totalPrice || t.total_sfl || 0),
          total_usd: Number(t.total_price_usd || t.total_usd || ((t.totalPrice || 0) * (Number((t as { cotacao_entrada_usd?: number }).cotacao_entrada_usd) || 0.087))),
          created_at: String(t.timestamp || t.created_at || new Date().toISOString())
        }));

      if (newTxsToInsert.length > 0) {
        const { error: insertTxErr } = await supabase
          .from('user_transactions')
          .insert(newTxsToInsert);
        
        if (insertTxErr) {
          if (isPermissionOrForbiddenError(insertTxErr)) {
            console.warn('[SyncService] Permissão negada ao inserir transações (42501). Abortando.');
            return;
          }
          console.warn('[SyncService] Erro ao enviar transações locais:', insertTxErr.message || insertTxErr);
        } else {
          console.log(`[SyncService] ${newTxsToInsert.length} transações locais enviadas para a nuvem!`);
        }
      }
    }

    // 3. Sincronizar Portfólios / Posições
    if (localPortfolios && localPortfolios.length > 0) {
      const portfolioRows = localPortfolios.map((p: { nome?: string; resource_id?: string; customAvgPrice?: number; qty?: number; quantity?: number; precoMedio?: number; avg_price_sfl?: number; cotacaoMediaFlowerUsd?: number; avg_token_price_usd?: number; }) => ({
        user_id: userId,
        resource_id: String((p as { nome?: string }).nome || (p as { resource_id?: string }).resource_id),
        quantity: Number((p as { qty?: number }).qty || (p as { quantity?: number }).quantity || 0),
        avg_price_sfl: Number((p as { precoMedio?: number }).precoMedio || (p as { avg_price_sfl?: number }).avg_price_sfl || 0),
        avg_token_price_usd: Number((p as { cotacaoMediaFlowerUsd?: number }).cotacaoMediaFlowerUsd || (p as { avg_token_price_usd?: number }).avg_token_price_usd || 0.087),
        updated_at: new Date().toISOString()
      }));

      const { error: portErr } = await supabase
        .from('user_portfolios')
        .upsert(portfolioRows, { onConflict: 'user_id, resource_id' });

      if (portErr) {
        if (isPermissionOrForbiddenError(portErr)) {
          console.warn('[SyncService] Permissão negada ao sincronizar user_portfolios (42501).');
          return;
        }
        console.warn('[SyncService] Erro ao sincronizar user_portfolios:', portErr.message || portErr);
      }
    }

    console.log('[SyncService] Sincronização Local -> Supabase finalizada!');
  } catch (err: unknown) {
    console.warn('[SyncService] Erro na sincronização Local -> Supabase:', (err as Error)?.message || err);
  }
}

/**
 * Persiste uma nova transação individual diretamente no Supabase quando logado
 */
export async function saveTransactionRemote(userId: string, transaction: Record<string, unknown>) {
  if (!userId || !transaction) return;

  try {
    const row = {
      user_id: userId,
      resource_id: String((transaction as { recurso?: string }).recurso || (transaction as { resource_id?: string }).resource_id),
      type: ((transaction as { tipo?: string }).tipo || (transaction as { type?: string }).type || 'BUY').toUpperCase(),
      quantity: Number((transaction as { qty?: number }).qty || (transaction as { quantity?: number }).quantity || 0),
      price_sfl: Number((transaction as { unitPrice?: number }).unitPrice || (transaction as { price_sfl?: number }).price_sfl || 0),
      token_price_usd_at_purchase: Number((transaction as { cotacao_entrada_usd?: number }).cotacao_entrada_usd || (transaction as { token_price_usd_at_purchase?: number }).token_price_usd_at_purchase || 0),
      total_sfl: Number((transaction as { totalPrice?: number }).totalPrice || (transaction as { total_sfl?: number }).total_sfl || 0),
      total_usd: Number((transaction as { total_price_usd?: number }).total_price_usd || (transaction as { total_usd?: number }).total_usd || (((transaction as { totalPrice?: number }).totalPrice || 0) * ((transaction as { cotacao_entrada_usd?: number }).cotacao_entrada_usd || 0.087))),
      created_at: String((transaction as { timestamp?: string | number }).timestamp || (transaction as { created_at?: string }).created_at || new Date().toISOString())
    };

    const { error } = await supabase
      .from('user_transactions')
      .insert([row]);

    if (error) {
      if (isPermissionOrForbiddenError(error)) {
        console.warn('[SyncService] Permissão negada ao salvar transação remota (42501).');
        return;
      }
      console.warn('[SyncService] Erro ao salvar transação no Supabase:', (error as { message?: string }).message || error);
    }
  } catch (err: unknown) {
    console.warn('[SyncService] Exceção ao salvar transação no Supabase:', (err as Error)?.message || err);
  }
}

/**
 * Persiste portfólios atualizados diretamente no Supabase
 */
export async function savePortfoliosRemote(userId: string, portfolioList: { nome?: string; resource_id?: string; customAvgPrice?: number; qty?: number; quantity?: number; precoMedio?: number; avg_price_sfl?: number; cotacaoMediaFlowerUsd?: number; avg_token_price_usd?: number; }[]) {
  if (!userId || !portfolioList || portfolioList.length === 0) return;

  try {
    const rows = portfolioList.map((p: { nome?: string; resource_id?: string; customAvgPrice?: number; qty?: number; quantity?: number; precoMedio?: number; avg_price_sfl?: number; cotacaoMediaFlowerUsd?: number; avg_token_price_usd?: number; }) => ({
      user_id: userId,
      resource_id: String((p as { nome?: string }).nome || (p as { resource_id?: string }).resource_id),
      quantity: Number((p as { qty?: number }).qty || (p as { quantity?: number }).quantity || 0),
      avg_price_sfl: Number((p as { precoMedio?: number }).precoMedio || (p as { avg_price_sfl?: number }).avg_price_sfl || 0),
      avg_token_price_usd: Number((p as { cotacaoMediaFlowerUsd?: number }).cotacaoMediaFlowerUsd || (p as { avg_token_price_usd?: number }).avg_token_price_usd || 0.087),
      updated_at: new Date().toISOString()
    }));

    if (rows.length > 0) {
      const { error } = await supabase
        .from('user_portfolios')
        .upsert(rows, { onConflict: 'user_id, resource_id' });

      if (error) {
        if (isPermissionOrForbiddenError(error)) {
          console.warn('[SyncService] Permissão negada ao salvar portfólio remoto (42501).');
          return;
        }
        console.warn('[SyncService] Erro ao salvar portfólio no Supabase:', (error as { message?: string }).message || error);
      }
    }
  } catch (err: unknown) {
    console.warn('[SyncService] Exceção ao salvar portfólio no Supabase:', (err as Error)?.message || err);
  }
}

/**
 * Persiste configurações alteradas no Supabase
 */
export async function saveSettingsRemote(userId: string, settings: Record<string, unknown>) {
  if (!userId || !settings) return;

  try {
    const islandTaxMap = { basic: 0, desert: 20, volcano: 15, petal: 50 };
    // @ts-ignore
    const islandTax = islandTaxMap[settings.selectedIsland] ?? 15.0;

    const row = {
      user_id: userId,
      island_tax: islandTax,
      vip_active: Boolean(settings.isVip),
      shrine_active: Boolean(settings.isShrine),
      preferred_currency: ((settings as { selectedCurrency?: string }).selectedCurrency || 'USD').toUpperCase(),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('user_settings')
      .upsert(row, { onConflict: 'user_id' });

    if (error) {
      if (isPermissionOrForbiddenError(error)) {
        console.warn('[SyncService] Permissão negada ao salvar configurações remotas (42501).');
        return;
      }
      console.warn('[SyncService] Erro ao salvar configurações no Supabase:', (error as { message?: string }).message || error);
    }
  } catch (err: unknown) {
    console.warn('[SyncService] Exceção ao salvar configurações no Supabase:', (err as Error)?.message || err);
  }
}

/**
 * Atualiza o preço da transação no Supabase
 */
export async function updateTransactionInCloud(userId: string, txId: string, newCotacaoUsd: number, newTotalUsd: number) {
  if (!userId || !txId) return false;
  try {
    const { error } = await supabase
      .from('user_transactions')
      .update({
        token_price_usd_at_purchase: newCotacaoUsd,
        total_usd: newTotalUsd
      })
      .eq('user_id', userId)
      .eq('id', txId);

    if (error) throw error;
    return true;
  } catch (err: unknown) {
    console.error('[SyncService] Erro ao atualizar transação:', err);
    return false;
  }
}
