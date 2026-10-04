import { User } from '@supabase/supabase-js';
import { useState, useEffect, useCallback, useRef } from 'react';
import { onAuthStateChange } from '../services/authService';
import { fetchRemoteUserData, syncLocalToSupabase } from '../services/syncService';

export default function useAuthSync(onSettingsSynced?: (settings: Record<string, unknown>) => void) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [transactions, setTransactions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sfl_transactions') || '[]') || [];
    } catch (e: unknown) {
      return [];
    }
  });

  const initialSyncDone = useRef(false);
  const isSyncingRef = useRef(false);
  const lastBackgroundSyncRef = useRef(0);

  const syncCloud = useCallback(async (targetUser: User | null = user, isManual: boolean = false) => {
    if (!targetUser) return;
    if (isSyncingRef.current) {
      console.log('[MarketData] Sincronização já em andamento, ignorando nova chamada.');
      return;
    }

    const now = Date.now();
    if (!isManual && now - lastBackgroundSyncRef.current < 60000) {
      console.log('[MarketData] Sincronização em segundo plano ignorada (cooldown de 60s ativo).');
      return;
    }

    lastBackgroundSyncRef.current = now;
    isSyncingRef.current = true;
    setIsSyncing(true);

    try {
      const currentLocalTxs = JSON.parse(localStorage.getItem('sfl_transactions') || '[]') || [];
      await syncLocalToSupabase(targetUser.id, {
        localTransactions: currentLocalTxs,
        localSettings: {
          selectedIsland: localStorage.getItem('sfl_island') || 'volcano',
          isVip: localStorage.getItem('sfl_vip') === 'true',
          isShrine: localStorage.getItem('sfl_shrine') === 'true',
          selectedCurrency: localStorage.getItem('sfl_currency') || 'usd'
        }
      });

      const remote = await fetchRemoteUserData(targetUser.id);

      if (remote && remote.transactions && remote.transactions.length > 0) {
        const formattedRemoteTxs = remote.transactions.map((rt: { id: string; type: string; quantity: number; total_sfl: number; total_usd: number; resource_id: string; created_at: string; price_sfl: number; token_price_usd_at_purchase: number; [key: string]: unknown }) => ({
          id: rt.id,
          recurso: rt.resource_id,
          tipo: rt.type ? rt.type.toLowerCase() : 'buy',
          qty: Number(rt.quantity),
          unitPrice: Number(rt.price_sfl),
          cotacao_entrada_usd: Number(rt.token_price_usd_at_purchase),
          totalPrice: Number(rt.total_sfl),
          total_price_usd: Number(rt.total_usd),
          timestamp: rt.created_at,
          isNft: Boolean(rt.nft_id),
          nft_id: rt.nft_id || null,
          boost_text: rt.boost_text || ''
        }));

        setTransactions(formattedRemoteTxs);
        localStorage.setItem('sfl_transactions', JSON.stringify(formattedRemoteTxs));
      }

      if (remote && remote.settings && onSettingsSynced) {
        onSettingsSynced(remote.settings);
      }
      console.log('[MarketData] Sincronização cloud concluída com sucesso!');
    } catch (err: unknown) {
      console.warn('[MarketData] Erro ao realizar syncCloud:', (err as Error)?.message || err);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [user, onSettingsSynced]);

  const syncCloudRef = useRef(syncCloud);
  useEffect(() => {
    syncCloudRef.current = syncCloud;
  }, [syncCloud]);

  useEffect(() => {
    let subscription = null;

    const initAuth = async () => {
      try {
        const { getSession } = await import('../services/authService');
        const session = await getSession();
        const currentUser = session?.user || null;
        setUser(currentUser as User | null);
        if (currentUser && !initialSyncDone.current) {
          initialSyncDone.current = true;
          if (syncCloudRef.current) await syncCloudRef.current(currentUser, false);
        }
      } catch (err: unknown) {
        console.warn('[MarketData] Erro ao recuperar sessão inicial:', err);
      }
    };
    initAuth();
    subscription = onAuthStateChange(async (_event: string, session: any) => {
      const currentUser = session?.user || null;
      setUser(currentUser as any);

      if (currentUser && !initialSyncDone.current) {
        initialSyncDone.current = true;
        if (syncCloudRef.current) {
          await syncCloudRef.current(currentUser, false);
        }
      } else if (!currentUser) {
        initialSyncDone.current = false;
      }
    });

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        initAuth();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (subscription && subscription.unsubscribe) subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return {
    user,
    setUser,
    isAuthModalOpen,
    setIsAuthModalOpen,
    isSyncing,
    transactions,
    setTransactions,
    syncCloud
  };
}
