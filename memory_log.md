# 📜 Memory Log - SflTrade

## [2026-08-14] Hotfix: Eliminação de Loop Infinito de Sincronização e Tratamento de Erro 42501 (Supabase RLS)

### 1. 🛑 Eliminação do Loop Infinito no React
- **Remoção de `useEffect` Instável (`useMarketData.js`)**: Removida a sincronização contínua de portfólios disparada pela dependência `portfolioData` (que era recriada a cada render do componente).
- **Trava de Concorrência & Rate Limiting (`useMarketData.js`)**:
  - Implementado bloqueio por referência (`isSyncingRef`) impedindo execuções simultâneas de `syncCloud`.
  - Adicionado controle de cooldown (`lastBackgroundSyncRef` com janela mínima de 60 segundos) para sincronizações automáticas em segundo plano.
  - Sincronização manual diferenciada (`isManual = true`), permitindo disparo imediato sob demanda do usuário.

### 2. 🛡️ Tratamento Resiliente do Erro 42501 (Forbidden / RLS)
- **Interrupção Graciosa (`syncService.js`)**:
  - Implementada função auxiliar `isPermissionOrForbiddenError` para detectar código `42501`, status `403` ou mensagens de restrição de RLS (Row-Level Security).
  - Em caso de restrição de acesso ou erro de permissão em `fetchRemoteUserData`, `syncLocalToSupabase`, `saveTransactionRemote`, `savePortfoliosRemote` ou `saveSettingsRemote`, a operação é imediatamente cancelada com aviso no console, **sem disparar re-tentativas em loop**.
- **`historyService.js`**: Tratamento seguro no retorno das chamadas de histórico global no Supabase (`token_price_history` e `resource_price_history`).

### 3. 🚀 Build & Deploy
- Compilação executada com sucesso via `npm run build`.
- Publicação efetuada na branch `gh-pages` (`npx gh-pages -d dist`).

---

## [2026-08-14] Refino da Sincronização Cloud, Gráficos Globais e Ajuste de Altura dos Modais

### 1. Sincronização Completa de Transações (Mobile <-> Nuvem)
- **Correção da Sequência de Sync (2-Step Sync)**:
  - Garantido que ao logar em qualquer dispositivo (celular ou desktop), o app **primeiro envia** todas as transações locais salvas no `localStorage` para a tabela `user_transactions` do Supabase.
  - Em seguida, **busca e consolida** o histórico completo remoto do Supabase para atualizar a aplicação.
- **Identificação Única de Transações**: Chave de duplicação refinada (`recurso_tipo_qty_preco`) evitando perdas ou duplicações em sincronizações cruzadas.
- **Botão "🔄 Sincronizar Agora"**: Adicionado no modal de Autenticação e no card do Perfil para permitir que o usuário force a sincronização manual a qualquer momento.

### 2. Histórico e Gráficos Globais de Recursos
- **Transmissão Automática para o Supabase**: Ajustado `recordDailySnapshot` em `historyService.js` para gravar cotações locais e transmitir snapshots globais para `token_price_history` e `resource_price_history` no Supabase (com throttle inteligente a cada 15 min).
- **Consistência Multi-Dispositivo**: Dispositivos que acessarem o aplicativo pela primeira vez agora consultam os dados de preços globais salvos no Supabase, garantindo que os gráficos não fiquem zerados.

### 3. Otimização de Layout e Altura dos Modais
- **`PositionDetailsModal.jsx`**:
  - Ajustada a altura máxima para `max-h-[85vh]` com rolagem interna fluida.
  - Mantida a largura ideal (`w-full max-w-lg`) e reduzido o espaçamento vertical (`p-3.5 md:p-4`, `space-y-3`, cards compactos `p-2.5`).
  - Lista de transações do recurso reduzida para `max-h-36`.
- **`TransactionModal.jsx`**:
  - Ajustado para `max-h-[85vh] overflow-y-auto` com padding e margens mais enxutas.
- **`AuthModal.jsx`**:
  - Ajustado para `max-h-[85vh]` integrando o botão de sincronização direta.

### 4. Build & Deploy
- Executado `npm run build` (0 erros).
- Deploy atualizado na branch `gh-pages` (`npx gh-pages -d dist`).
