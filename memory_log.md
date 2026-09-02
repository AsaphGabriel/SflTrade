# 📜 Memory Log - SflTrade

## [2026-09-02] Adição dos Cards de Destaques do Mercado (Maiores Altas e Maiores Baixas)

### 1. 📈 Novos Cards de Métricas de Variação de Preço (`MarketMoversCards.jsx`)
- **Top 3 Recursos que Mais Valorizaram (🚀 Maiores Altas)**:
  - Exibe os 3 recursos com maior valorização percentual calculada em relação ao ponto de referência temporal.
  - Badges de ranking (#1 ouro, #2 prata, #3 bronze), imagem do recurso via `sfl.world` com fallback em SVG transparente, nome, cotação atual em SFL, preço base anterior e pill de variação percentual destacada em verde (`+XX.X%`).
- **Top 3 Recursos que Mais Desvalorizaram (🔻 Maiores Baixas)**:
  - Exibe os 3 recursos com maior queda/desvalorização percentual.
  - Badges de ranking, dados do recurso e pill de variação percentual em vermelho (`-XX.X%`).
- **Filtro de Período Dinâmico**:
  - Opções selecionáveis: **`24h`**, **`7D`**, **`30D`** e **`90D`** (com `24h` selecionado por padrão).
  - Consulta os dados históricos do Supabase (`v_resource_daily_metrics` e `resource_price_history`) com fallback local para `sfl_hourly_history`.
  - Cache em memória com TTL de 3 minutos para transição instantânea entre filtros sem disparar requisições repetidas.
- **Interatividade Total**:
  - Ao clicar em qualquer recurso nos cards, abre diretamente o `PriceChartModal` com a série temporal e médias móveis (SMA) do item.

### 2. 📊 Sincronização e Ajuste no `PriceChartModal.jsx` e `historyService.js`
- Adicionada função `fetchMarketMovers` em `historyService.js` com cálculo resiliente a dados faltantes.
- Atualizado o seletor de períodos do `PriceChartModal` para oferecer botões consistentes: `24h`, `7D`, `30D` e `90D`.

### 3. 🚀 Build
- Build de produção executado com sucesso (`npm run build`).

---

## [2026-08-14] Hotfix Definitivo: Eliminação de Thread Lock (Congelamento de JS) em Transações, Edições e Modais

### 1. 🔍 Causa Raiz do Thread Lock (Congelamento de Thread JS)
- **Persistência Síncrona Duplicada + Chamadas Remotas no Clique**:
  - Ao comprar ou vender, `handleTransaction` executava `localStorage.setItem` síncrono duas vezes (no updater e em `useEffect`) e disparava chamada remota do Supabase de forma bloqueante no mesmo tick do evento de clique.
  - Ao editar médias de posição, `setCustomAvgPrices` disparava cascata de `useEffect` no modal filho (`PositionDetailsModal`).
- **Renderização e Montagem Fantasma de Modais no App (`App.jsx`)**:
  - `TransactionModal` (duas instâncias) e `AuthModal` ficavam permanentemente montados no DOM com `isOpen={false}`, forçando o React a recalcular props pesadas e diffing de árvores completas a cada clique.
- **Complexidade de Cálculo das Médias Móveis (`calculateMovingAverage` em `historyService.js`)**:
  - O cálculo anterior alocava subarrays com `slice` e `reduce` repetidos, gerando pressão no Garbage Collector.

### 2. 🛠️ Soluções e Desacoplamentos Aplicados
- **Desacoplamento Assíncrono (`useMarketData.js`)**:
  - `handleTransaction`, `updateIsland`, `updateVip`, `updateShrine` e `updateCurrency` agora atualizam o estado local de forma pura e limpa.
  - Qualquer sincronização secundária com o Supabase (`saveTransactionRemote` / `saveSettingsRemote`) foi desacoplada via `setTimeout(..., 100)` fora da thread de clique.
  - Removido `useEffect` redundante que re-gravava `transactions` no `localStorage`.
- **Renderização Condicional de Modais (`App.jsx`)**:
  - Modais agora só são montados quando seus respectivos estados estão abertos (`isBuyModalOpen && <TransactionModal ... />`), eliminando overhead em segundo plano.
- **Cálculo Linear O(N) para SMA (`historyService.js`)**:
  - `calculateMovingAverage` reescrita com soma de janela deslizante O(N), eliminando alocações desnecessárias.
- **Isolamento e Memoização no `TransactionModal.jsx`**:
  - Memoizada a lista filtrada de recursos com `useMemo` e estabilizado `handleSelectResource` com `useCallback`.

### 3. 🚀 Build & Deploy
- Compilação executada com sucesso (`npm run build` em 175ms).
- Publicação efetuada na branch `gh-pages` (`npx gh-pages -d dist`).

---

### 1. 🛡️ Otimização para Brave Shields & Navegadores com Bloqueio de Rastreio
- **Timeouts Rápidos no Supabase (`withTimeout` em `historyService.js`)**: Adicionado timeout com limite de 2,5 segundos para todas as consultas do Supabase no `fetchTokenHistory` e `fetchResourceHistory`. Caso o Brave Shields retarde ou bloqueie consultas REST/WebSockets, o app cai instantaneamente no fallback de dados locais sem travar a interface.
- **Sanitização de Coordenadas SVG (`PriceChartModal.jsx`)**:
  - Garantida sanitização estrita de valores numéricos nos arrays de preços, evitando divisão por zero ou `NaN` que travavam o motor de renderização Blink/Chromium ao traçar paths e círculos SVG.
- **Remoção de Filtros `backdrop-blur` Pesados**:
  - Modais (`PriceChartModal`, `PositionDetailsModal`, `TransactionModal`, `AuthModal`) atualizados com overlay de alto contraste direto (`bg-black/80`), eliminando gargalos de renderização de GPU/Compositor em navegadores desktop.
- **Proteção Contra Erros de Renderização em Detalhes da Posição (`PositionDetailsModal.jsx`)**:
  - Adicionadas verificações defensivas contra `position.nome` nulo e filtragem segura na lista de transações.

### 2. 🚀 Build & Deploy
- Compilação realizada com sucesso (`npm run build`).
- Publicação efetuada na branch `gh-pages` (`npx gh-pages -d dist`).

---

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
