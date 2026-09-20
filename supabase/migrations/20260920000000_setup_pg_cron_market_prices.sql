-- =========================================================================
-- SETUP DE CRON JOB NO SUPABASE PARA SINCRONIZAR PREÇOS DE MERCADO 24/7
-- =========================================================================
-- IMPORTANTE: A extensão pg_net precisa estar ativada no Supabase Dashboard
-- (Database -> Extensions -> pg_net) e a Edge Function deve estar em deploy.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Agendamento diário/por hora usando pg_cron
-- Remove agendamento antigo caso exista para evitar duplicatas
SELECT cron.unschedule('sync-market-prices-cron');

-- Cria a rotina (ex: a cada 1 hora no minuto zero)
SELECT cron.schedule(
    'sync-market-prices-cron',
    '0 * * * *',
    $$
    SELECT net.http_post(
        url:='https://atiumxglieipioqmnrbd.supabase.co/functions/v1/sync-market-prices',
        headers:=jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer [YOUR_ANON_KEY]'
        )
    );
    $$
);

-- NOTA: Como a Edge Function já usa a Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
-- a chamada POST apenas precisa do token 'anon' padrão (Bearer) para 
-- invocar a função, mas a função em si operará com bypass de RLS no backend.
