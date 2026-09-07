-- ====================================================================
-- MIGRAÇÃO DE SEGURANÇA & PERMISSÕES: v_resource_daily_metrics
-- ====================================================================

-- 1. Garante a criação/re-criação da view com permissões adequadas
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

-- 2. Configura a view com security_invoker = true (respeita RLS da tabela base)
ALTER VIEW public.v_resource_daily_metrics SET (security_invoker = true);

-- 3. Concede permissão explícita de SELECT para os papéis anon e authenticated
GRANT SELECT ON public.v_resource_daily_metrics TO anon, authenticated;
