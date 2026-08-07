# Roadmap de Migração e Evolução (React + Vite)

## Decisão Arquitetural

**Migração Total para React + Vite**:
- **Motivação**: Melhorar a manutenibilidade, performance e escalabilidade do projeto.
- **Benefícios**:
  - Componentização modular.
  - Build mais rápido e eficiente.
  - Suporte a PWA.
  - Melhor experiência de desenvolvimento.

## Metas de Desenvolvimento

### Fase 1 - MVP React + Vite
- [x] Inicializar a nova estrutura do projeto usando React + Vite.
- [x] Implementar o componente modular da aba "Informações Básicas da Land" (exibindo moedas, diamantes, flores, nível, colheitas e animais via API).

### Fase 2 - Refatoração Completa do Legacy
- [x] Migrar e reorganizar todo o HTML, JS e CSS monolítico legados da aplicação para componentes isolados em React.
- [x] Implementar os seguintes componentes:
  - Tabela do Mercado / Portfólio
  - Filtros e Seleção de Ilha / Taxas
  - Resiliência por Proxies (Direct, Cloudflare Worker, CorsProxy)
  - Cotação do SFL & Conversor Rápido
  - Header & Navegação PWA

### Fase 3 - Conexão Dual de Endpoints (Patch Agosto 2026)
- [x] Implementar consumo do endpoint oficial autenticado (`https://api.sunflower-land.com/community/farms/{id}`) com cabeçalho `x-api-key`.
- [x] Manter fallback transparente para o agregador público (`https://sfl.world/api/v1.1/land/{id}`).
- [x] Implementar cache local por TTL em `localStorage` (10 minutos) e badges visuais de proveniência dos dados.