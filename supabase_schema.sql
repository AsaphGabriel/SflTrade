-- ====================================================================
-- SUPABASE SCHEMA - SFL TRADE TRACKER (Séries Temporais de Preços 90 Dias)
-- ====================================================================

-- 1. TABELA DE HISTÓRICO DE COTAÇÃO DO TOKEN ($FLOWER / SFL)
CREATE TABLE IF NOT EXISTS public.token_price_history (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    price_usd NUMERIC(18, 8) NOT NULL,
    source TEXT NOT NULL DEFAULT 'sfl.world'
);

-- 2. TABELA DE HISTÓRICO DE PREÇOS P2P DOS RECURSOS
CREATE TABLE IF NOT EXISTS public.resource_price_history (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resource_id TEXT NOT NULL,
    price_sfl NUMERIC(18, 8) NOT NULL,
    price_usd NUMERIC(18, 8) NOT NULL
);

-- 3. ÍNDICES OTIMIZADOS PARA BUSCA POR INTERVALO E RECURSO (ÚLTIMOS 90 DIAS)
CREATE INDEX IF NOT EXISTS idx_token_price_timestamp 
    ON public.token_price_history (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_resource_price_timestamp 
    ON public.resource_price_history (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_resource_price_lookup 
    ON public.resource_price_history (resource_id, timestamp DESC);

-- 4. POLÍTICAS DE SEGURANÇA ROW LEVEL SECURITY (RLS)
-- Permite leitura pública (SELECT) e gravação de snapshots de preços (INSERT) para 'anon' e 'authenticated'.

ALTER TABLE public.token_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_price_history ENABLE ROW LEVEL SECURITY;

-- Remover políticas legadas se existirem
DROP POLICY IF EXISTS "Allow public read access on token_price_history" ON public.token_price_history;
DROP POLICY IF EXISTS "Allow public read access on resource_price_history" ON public.resource_price_history;
DROP POLICY IF EXISTS "Allow public insert on token_price_history" ON public.token_price_history;
DROP POLICY IF EXISTS "Allow public insert on resource_price_history" ON public.resource_price_history;

-- Políticas de leitura pública
CREATE POLICY "Allow public read access on token_price_history"
    ON public.token_price_history FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Allow public read access on resource_price_history"
    ON public.resource_price_history FOR SELECT
    TO anon, authenticated
    USING (true);

-- Políticas de inserção global de preços coletados pelas instâncias do app
CREATE POLICY "Allow public insert on token_price_history"
    ON public.token_price_history FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Allow public insert on resource_price_history"
    ON public.resource_price_history FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- 5. FUNÇÃO DE LIMPEZA E EXPURGO AUTOMÁTICO (> 90 DIAS)
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

-- 6. VIEW AGREGADA DIÁRIA COM MÉDIAS MÓVEIS (SMA 7d / SMA 30d), MÍNIMAS E MÁXIMAS
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
