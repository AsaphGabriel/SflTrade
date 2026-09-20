-- Habilita as extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove agendamento antigo caso exista para evitar duplicatas
-- Se der erro nessa linha na primeira vez, não tem problema!
SELECT cron.unschedule('sync-market-prices-cron');

-- Cria a rotina (a cada 1 hora)
SELECT cron.schedule(
    'sync-market-prices-cron',
    '0 * * * *',
    $$
    SELECT net.http_post(
        url:='https://atiumxglieipioqmnrbd.supabase.co/functions/v1/sync-market-prices',
        headers:=jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer SEU_TOKEN_AQUI'
        )
    );
    $$
);
