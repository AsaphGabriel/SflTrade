-- Habilita as extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove agendamento antigo caso exista para evitar duplicatas
-- Se der erro nessa linha na primeira vez, não tem problema!
SELECT cron.unschedule('sync-market-prices-cron');

-- Cria uma função wrapper para buscar o token no vault e chamar a Edge Function
CREATE OR REPLACE FUNCTION public.invoke_sync_market_prices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_token TEXT;
BEGIN
    SELECT secret INTO v_token FROM vault.decrypted_secrets WHERE name = 'cron_service_token';
    IF v_token IS NOT NULL THEN
        PERFORM net.http_post(
            url:='https://atiumxglieipioqmnrbd.supabase.co/functions/v1/sync-market-prices',
            headers:=jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || v_token
            )
        );
    END IF;
END;
$$;

-- Cria a rotina (a cada 1 hora)
SELECT cron.schedule(
    'sync-market-prices-cron',
    '0 * * * *',
    'SELECT public.invoke_sync_market_prices();'
);
