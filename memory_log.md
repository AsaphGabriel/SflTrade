# 📜 Memory Log - SflTrade

## [2026-08-14] Hotfix Definitivo: Eliminação de Travamento no Celular, Correção de Imagens no Service Worker e Disponibilização Global de Preços no Supabase

### 1. 🛑 Causa Raiz do Travamento no Celular & Correções de Render Loop
- **Eliminação de Loop em `searchFarm` (`useMarketData.js`)**:
  - `updateIsland`, `updateVip`, `updateShrine` e `updateCurrency` não estavam com `useCallback`, fazendo com que `searchFarm` fosse recriada a cada render.
  - O `useEffect` que executava `searchFarm(savedFarm)` disparava em loop infinito a 60fps, sobrecarregando a CPU móvel com centenas de requisições por segundo.
  - **Correção**: Estabilizadas todas as funções com `useCallback` e adicionada trava `farmInitializedRef` para garantir execução única controlada.
- **Memoização de Alta Performance (`portfolioData`)**:
  - O cálculo de posições, DCA e PnL foi envolvido em `useMemo`, eliminando alocações contínuas de memória no thread principal.
- **Isolamento de Efeitos em `refreshData`**:
  - `recordDailySnapshot` foi retirado de dentro do setter de estado do React (`setMarketData(prev => ...)`), sendo executado de forma assíncrona desacoplada via `setTimeout`.

### 2. 🖼️ Correção de Carregamento de Imagens e Service Worker (`sw.js` & `public/sw.js`)
- **Falso Fallback de Imagens**: O Service Worker estava interceptando requisições de imagem e retornando `index.html` em caso de instabilidade, quebrando a decodificação dos PNGs e travando a renderização gráfica no navegador mobile.
- **Bypass de APIs & Supabase**: Configurado o Service Worker (`v1.3.0`) para ignorar explicitamente requisições do Supabase, workers e APIs externas, atuando exclusivamente em assets estáticos e com fallback de imagens resiliente (sem injeção de HTML).
- **Purga de Cache Automática**: Ao ativar a versão `v1.3.0`, o Service Worker purga todos os caches legados (`v1.2.7` etc.) que possuíam assets corrompidos.

### 3. 🌐 Disponibilização Global de Preços no Supabase (`supabase_schema.sql` & `historyService.js`)
- **Políticas RLS de Inserção Pública**: Adicionadas políticas `INSERT` para `anon` e `authenticated` em `token_price_history` e `resource_price_history` no [supabase_schema.sql](file:///C:/Users/asaph/Yggdrasil/02%20-%20Projetos/SflTrade/supabase_schema.sql), permitindo que os snapshots capturados pelas instâncias ativas do app alimentem a base de dados global na nuvem sem erro 42501.
- **Gráficos e Indicadores Globais**: Usuários novos ou acessando de qualquer dispositivo agora recebem imediatamente os dados históricos consolidados e médias móveis globais do Supabase.

### 4. 🚀 Build & Deploy
- Compilação realizada com sucesso (`npm run build`).
- Publicação efetuada na branch `gh-pages` (`npx gh-pages -d dist`).

---

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
