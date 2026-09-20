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

-- 3. TABELA DE HISTÓRICO DE FLOOR PRICE DE NFTS (POWER UPS)
CREATE TABLE IF NOT EXISTS public.nft_price_history (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    nft_id INT NOT NULL,
    name TEXT NOT NULL,
    collection TEXT NOT NULL DEFAULT 'collectibles', -- 'collectibles' | 'wearables'
    floor_sfl NUMERIC(18, 8) NOT NULL,
    floor_usd NUMERIC(18, 8) NOT NULL,
    last_sale_sfl NUMERIC(18, 8),
    supply INT,
    boost_text TEXT
);

-- 4. ÍNDICES OTIMIZADOS PARA BUSCA POR INTERVALO, RECURSO E NFT (ÚLTIMOS 90 DIAS)
CREATE INDEX IF NOT EXISTS idx_token_price_timestamp 
    ON public.token_price_history (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_resource_price_timestamp 
    ON public.resource_price_history (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_resource_price_lookup 
    ON public.resource_price_history (resource_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_nft_price_timestamp 
    ON public.nft_price_history (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_nft_price_lookup 
    ON public.nft_price_history (nft_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_nft_name_lookup 
    ON public.nft_price_history (name, timestamp DESC);

-- 5. POLÍTICAS DE SEGURANÇA ROW LEVEL SECURITY (RLS)
-- Permite leitura pública (SELECT) e gravação de snapshots de preços (INSERT) para 'anon' e 'authenticated'.

ALTER TABLE public.token_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nft_price_history ENABLE ROW LEVEL SECURITY;

-- Remover políticas legadas se existirem
DROP POLICY IF EXISTS "Allow public read access on token_price_history" ON public.token_price_history;
DROP POLICY IF EXISTS "Allow public read access on resource_price_history" ON public.resource_price_history;
DROP POLICY IF EXISTS "Allow public insert on token_price_history" ON public.token_price_history;
DROP POLICY IF EXISTS "Allow public insert on resource_price_history" ON public.resource_price_history;
DROP POLICY IF EXISTS "Allow public read access on nft_price_history" ON public.nft_price_history;
DROP POLICY IF EXISTS "Allow public insert on nft_price_history" ON public.nft_price_history;

-- Políticas de leitura pública
CREATE POLICY "Allow public read access on token_price_history"
    ON public.token_price_history FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Allow public read access on resource_price_history"
    ON public.resource_price_history FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Allow public read access on nft_price_history"
    ON public.nft_price_history FOR SELECT
    TO anon, authenticated
    USING (true);

-- 1. Revogar políticas inseguras de inserção pública
DROP POLICY IF EXISTS "Allow public insert on token_price_history" ON public.token_price_history;
DROP POLICY IF EXISTS "Allow public insert on resource_price_history" ON public.resource_price_history;
DROP POLICY IF EXISTS "Allow public insert on nft_price_history" ON public.nft_price_history;

-- 2. Revogar privilégio explícito de INSERT da role anon
REVOKE INSERT ON public.token_price_history FROM anon;
REVOKE INSERT ON public.resource_price_history FROM anon;
REVOKE INSERT ON public.nft_price_history FROM anon;

-- 3. Inserção permitida ÚNICA E EXCLUSIVAMENTE para a service_role (Scripts/Crons)
CREATE POLICY "Allow service_role insert on token_price_history"
    ON public.token_price_history FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Allow service_role insert on resource_price_history"
    ON public.resource_price_history FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Allow service_role insert on nft_price_history"
    ON public.nft_price_history FOR INSERT TO service_role WITH CHECK (true);

-- 4. Leitura pública (SELECT) permanece aberta para anon e authenticated
GRANT SELECT ON public.token_price_history TO anon, authenticated;
GRANT SELECT ON public.resource_price_history TO anon, authenticated;
GRANT SELECT ON public.nft_price_history TO anon, authenticated;

-- 6. FUNÇÃO DE LIMPEZA E EXPURGO AUTOMÁTICO (> 90 DIAS)
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

    DELETE FROM public.nft_price_history 
    WHERE timestamp < NOW() - INTERVAL '90 days';
END;
$$;

-- 7. VIEW AGREGADA DIÁRIA DE RECURSOS COM MÉDIAS MÓVEIS (SMA 7d / SMA 30d), MÍNIMAS E MÁXIMAS
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

-- 8. VIEW AGREGADA DIÁRIA DE NFTS (MÉDIAS, MÍNIMAS, MÁXIMAS E SMA 7D / 30D)
CREATE OR REPLACE VIEW public.v_nft_daily_metrics AS
WITH daily_base AS (
    SELECT
        nft_id,
        name,
        collection,
        DATE_TRUNC('day', timestamp)::date AS day,
        AVG(floor_sfl) AS avg_floor_sfl,
        MIN(floor_sfl) AS min_floor_sfl,
        MAX(floor_sfl) AS max_floor_sfl,
        AVG(floor_usd) AS avg_floor_usd,
        COUNT(*) AS records_count
    FROM public.nft_price_history
    WHERE timestamp >= NOW() - INTERVAL '90 days'
    GROUP BY nft_id, name, collection, DATE_TRUNC('day', timestamp)::date
)
SELECT
    nft_id,
    name,
    collection,
    day,
    ROUND(avg_floor_sfl, 6) AS avg_floor_sfl,
    ROUND(min_floor_sfl, 6) AS min_floor_sfl,
    ROUND(max_floor_sfl, 6) AS max_floor_sfl,
    ROUND(avg_floor_usd, 6) AS avg_floor_usd,
    records_count,
    ROUND(AVG(avg_floor_sfl) OVER (
        PARTITION BY nft_id
        ORDER BY day
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ), 6) AS sma_7d_sfl,
    ROUND(AVG(avg_floor_sfl) OVER (
        PARTITION BY nft_id
        ORDER BY day
        ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
    ), 6) AS sma_30d_sfl
FROM daily_base
ORDER BY name, day DESC;

ALTER VIEW public.v_nft_daily_metrics SET (security_invoker = true);
GRANT SELECT ON public.v_nft_daily_metrics TO anon, authenticated;
