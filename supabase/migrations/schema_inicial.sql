-- ====================================================================
-- DUMP DE SCHEMA INICIAL - SUPABASE (PROJETO: atiumxglieipioqmnrbd)
-- ====================================================================

-- 1. TABELAS DE COTAÇÃO E PREÇOS
CREATE TABLE IF NOT EXISTS public.token_price_history (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    price_usd NUMERIC(18, 8) NOT NULL,
    source TEXT NOT NULL DEFAULT 'sfl.world'
);

CREATE TABLE IF NOT EXISTS public.resource_price_history (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resource_id TEXT NOT NULL,
    price_sfl NUMERIC(18, 8) NOT NULL,
    price_usd NUMERIC(18, 8) NOT NULL
);

-- ÍNDICES OTIMIZADOS PARA BUSCA POR INTERVALO E RECURSO
CREATE INDEX IF NOT EXISTS idx_token_price_timestamp 
    ON public.token_price_history (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_resource_price_timestamp 
    ON public.resource_price_history (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_resource_price_lookup 
    ON public.resource_price_history (resource_id, timestamp DESC);

-- POLÍTICAS DE SEGURANÇA ROW LEVEL SECURITY (RLS)
ALTER TABLE public.token_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on token_price_history" ON public.token_price_history;
DROP POLICY IF EXISTS "Allow public read access on resource_price_history" ON public.resource_price_history;
DROP POLICY IF EXISTS "Allow public insert on token_price_history" ON public.token_price_history;
DROP POLICY IF EXISTS "Allow public insert on resource_price_history" ON public.resource_price_history;

CREATE POLICY "Allow public read access on token_price_history"
    ON public.token_price_history FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Allow public read access on resource_price_history"
    ON public.resource_price_history FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Allow public insert on token_price_history"
    ON public.token_price_history FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Allow public insert on resource_price_history"
    ON public.resource_price_history FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- FUNÇÃO DE LIMPEZA E EXPURGO AUTOMÁTICO (> 90 DIAS)
CREATE OR REPLACE FUNCTION public.clean_old_price_history()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.token_price_history 
    WHERE timestamp < NOW() - INTERVAL '90 days';

    DELETE FROM public.resource_price_history 
    WHERE timestamp < NOW() - INTERVAL '90 days';
END;
$$;

-- VIEW AGREGADA DIÁRIA COM MÉDIAS MÓVEIS (SMA 7d / SMA 30d)
CREATE OR REPLACE VIEW public.v_resource_daily_metrics AS
WITH daily_base AS (
    SELECT
        resource_id,
        DATE_TRUNC('day', timestamp)::date AS day,
        AVG(price_sfl) AS avg_price_sfl,
        MIN(price_sfl) AS min_price_sfl,
        MAX(price_sfl) AS max_price_sfl,
        AVG(price_usd) AS avg_price_usd,
        COUNT(*) AS records_count
    FROM public.resource_price_history
    WHERE timestamp >= NOW() - INTERVAL '90 days'
    GROUP BY resource_id, DATE_TRUNC('day', timestamp)::date
)
SELECT
    resource_id,
    day,
    ROUND(avg_price_sfl, 6) AS avg_price_sfl,
    ROUND(min_price_sfl, 6) AS min_price_sfl,
    ROUND(max_price_sfl, 6) AS max_price_sfl,
    ROUND(avg_price_usd, 6) AS avg_price_usd,
    records_count,
    ROUND(AVG(avg_price_sfl) OVER (
        PARTITION BY resource_id
        ORDER BY day
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ), 6) AS sma_7d_sfl,
    ROUND(AVG(avg_price_sfl) OVER (
        PARTITION BY resource_id
        ORDER BY day
        ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
    ), 6) AS sma_30d_sfl
FROM daily_base
ORDER BY resource_id, day DESC;

ALTER VIEW public.v_resource_daily_metrics SET (security_invoker = true);
GRANT SELECT ON public.v_resource_daily_metrics TO anon, authenticated;

-- 2. TABELAS DE USUÁRIO E SINCRONIZAÇÃO
CREATE TABLE IF NOT EXISTS public.user_portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    resource_id TEXT NOT NULL,
    quantity NUMERIC(18, 6) NOT NULL DEFAULT 0,
    avg_price_sfl NUMERIC(18, 8) NOT NULL DEFAULT 0,
    avg_token_price_usd NUMERIC(18, 8) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT user_portfolios_user_resource_unique UNIQUE (user_id, resource_id)
);

CREATE TABLE IF NOT EXISTS public.user_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    resource_id TEXT NOT NULL,
    type TEXT CHECK (type IN ('BUY', 'SELL')),
    quantity NUMERIC(18, 6) NOT NULL,
    price_sfl NUMERIC(18, 8) NOT NULL,
    token_price_usd_at_purchase NUMERIC(18, 8) NOT NULL,
    total_sfl NUMERIC(18, 8) NOT NULL,
    total_usd NUMERIC(18, 8) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    island_tax NUMERIC(6, 2) DEFAULT 15.0,
    vip_active BOOLEAN DEFAULT TRUE,
    shrine_active BOOLEAN DEFAULT FALSE,
    preferred_currency TEXT DEFAULT 'USD',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ROW LEVEL SECURITY (RLS) & POLÍTICAS DE USUÁRIO
ALTER TABLE public.user_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_portfolios_select" ON public.user_portfolios;
DROP POLICY IF EXISTS "user_portfolios_insert" ON public.user_portfolios;
DROP POLICY IF EXISTS "user_portfolios_update" ON public.user_portfolios;
DROP POLICY IF EXISTS "user_portfolios_delete" ON public.user_portfolios;

DROP POLICY IF EXISTS "user_transactions_select" ON public.user_transactions;
DROP POLICY IF EXISTS "user_transactions_insert" ON public.user_transactions;
DROP POLICY IF EXISTS "user_transactions_update" ON public.user_transactions;
DROP POLICY IF EXISTS "user_transactions_delete" ON public.user_transactions;

DROP POLICY IF EXISTS "user_settings_select" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_insert" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_update" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_delete" ON public.user_settings;

CREATE POLICY "user_portfolios_select" ON public.user_portfolios
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "user_portfolios_insert" ON public.user_portfolios
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_portfolios_update" ON public.user_portfolios
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_portfolios_delete" ON public.user_portfolios
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "user_transactions_select" ON public.user_transactions
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "user_transactions_insert" ON public.user_transactions
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_transactions_update" ON public.user_transactions
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_transactions_delete" ON public.user_transactions
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "user_settings_select" ON public.user_settings
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "user_settings_insert" ON public.user_settings
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_settings_update" ON public.user_settings
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_settings_delete" ON public.user_settings
    FOR DELETE TO authenticated USING (auth.uid() = user_id);
