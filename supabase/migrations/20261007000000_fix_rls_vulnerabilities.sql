-- 1. Revogar inserções públicas inseguras
DROP POLICY IF EXISTS "Allow public insert on token_price_history" ON public.token_price_history;
DROP POLICY IF EXISTS "Allow public insert on resource_price_history" ON public.resource_price_history;
DROP POLICY IF EXISTS "Allow public insert on nft_price_history" ON public.nft_price_history;

REVOKE INSERT, UPDATE, DELETE ON public.token_price_history FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.resource_price_history FROM anon, authenticated;
-- REVOKE INSERT, UPDATE, DELETE ON public.nft_price_history FROM anon, authenticated; -- nft_price_history missing in schema

-- 2. Garantir escrita exclusiva para service_role (Edge Functions / Cron)
CREATE POLICY "Allow service_role insert on token_price_history"
    ON public.token_price_history FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Allow service_role insert on resource_price_history"
    ON public.resource_price_history FOR INSERT TO service_role WITH CHECK (true);

-- CREATE POLICY "Allow service_role insert on nft_price_history"
--    ON public.nft_price_history FOR INSERT TO service_role WITH CHECK (true);

-- 3. Ativar FORCE ROW LEVEL SECURITY compulsório (Art. 33º)
ALTER TABLE public.token_price_history FORCE ROW LEVEL SECURITY;
ALTER TABLE public.resource_price_history FORCE ROW LEVEL SECURITY;
-- ALTER TABLE public.nft_price_history FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_portfolios FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings FORCE ROW LEVEL SECURITY;
