# Supabase - SflTrade Database Setup & Migrations

Este diretório contém a estrutura de banco de dados relacional e migrações SQL do Supabase vinculadas ao projeto **SflTrade** (ID do projeto: `atiumxglieipioqmnrbd`).

## ðŸ“ Estrutura de Migrações SQL

As migrações do banco de dados estão armazenadas no diretório `supabase/migrations/`:

- **`schema_inicial.sql`**: Contém o schema relacional completo do projeto, incluindo:
  - **Tabelas de Cotação de Preços (Market Data)**: `token_price_history` e `resource_price_history`
  - **Tabelas de Usuário & Portfólio**: `user_portfolios`, `user_transactions` e `user_settings`
  - **Políticas de Segurança RLS (Row Level Security)**: controle fino de leitura e escrita para perfis `anon` e `authenticated`
  - **Função de Limpeza de Dados**: `clean_old_price_history()` para purga automática de dados mais antigos que 90 dias
  - **View Analítica**: `v_resource_daily_metrics` para agregação diária com Médias Móveis (SMA 7d / SMA 30d), mínimas e máximas

### Como aplicar as migrações em um novo ambiente

1. **Via Dashboard do Supabase**:
   - Acesse o [Supabase Dashboard](https://supabase.com/dashboard) do seu projeto.
   - Navegue até a seção **SQL Editor**.
   - Abra e execute o arquivo `supabase/migrations/schema_inicial.sql`.

2. **Via Supabase CLI**:
   ```bash
   supabase db push
   ```

---

## ⚙️ Configuração das Variáveis de Ambiente (`.env.example`)

Para rodar a aplicação client-side com acesso ao Supabase, configure o arquivo `.env` na raiz do projeto utilizando como modelo o `.env.example`:

```env
# URL base da API do projeto Supabase
VITE_SUPABASE_URL=https://atiumxglieipioqmnrbd.supabase.co

# Chave Anônima Pública (Safe para exposição em client/browser)
VITE_SUPABASE_ANON_KEY=sb_publishable_NJ2yaoVO_uGHY41_GiavdQ_66XVbaVD
```

---

## 🚨 ALERTA EXPLÍCITO DE SEGURANÇA

> **ATENÇÃO DE SEGURANÇA CRÍTICA**:
> 
> 1. **NUNCA** comite senhas do banco de dados, chaves privadas ou a chave **`service_role`** (`Secret Key`) no repositório público ou privado.
> 2. A chave `service_role` ignora todas as políticas de Row Level Security (RLS) e possui acesso ilimitado de leitura e gravação no banco de dados.
> 3. Utilize **exclusivamente** a chave pública anônima (`VITE_SUPABASE_ANON_KEY`) nas aplicações client-side.
> 4. Certifique-se de que o arquivo `.env` contendo segredos locais esteja sempre listado no arquivo `.gitignore`.
