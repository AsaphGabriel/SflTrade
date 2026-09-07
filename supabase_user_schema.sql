-- ====================================================================
-- SUPABASE SCHEMA - TABELAS DE USUÁRIO E SINCRONIZAÇÃO (SFL TRADE)
-- ====================================================================

-- 1. TABELA DE POSIÇÕES / PORTFÓLIO DO USUÁRIO
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

-- 2. TABELA DE TRANSAÇÕES DO USUÁRIO
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

-- 3. TABELA DE CONFIGURAÇÕES DO USUÁRIO
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    island_tax NUMERIC(6, 2) DEFAULT 15.0,
    vip_active BOOLEAN DEFAULT TRUE,
    shrine_active BOOLEAN DEFAULT FALSE,
    preferred_currency TEXT DEFAULT 'USD',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ROW LEVEL SECURITY (RLS) & POLÍTICAS DE ACESSO EXCLUSIVO

ALTER TABLE public.user_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Drop de políticas existentes para permitir re-execução limpa do script
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

-- Políticas para user_portfolios
CREATE POLICY "user_portfolios_select" ON public.user_portfolios
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "user_portfolios_insert" ON public.user_portfolios
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_portfolios_update" ON public.user_portfolios
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_portfolios_delete" ON public.user_portfolios
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Políticas para user_transactions
CREATE POLICY "user_transactions_select" ON public.user_transactions
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "user_transactions_insert" ON public.user_transactions
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_transactions_update" ON public.user_transactions
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_transactions_delete" ON public.user_transactions
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Políticas para user_settings
CREATE POLICY "user_settings_select" ON public.user_settings
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "user_settings_insert" ON public.user_settings
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_settings_update" ON public.user_settings
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_settings_delete" ON public.user_settings
    FOR DELETE TO authenticated USING (auth.uid() = user_id);
