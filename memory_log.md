# 📜 Memory Log - SflTrade

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
