# Roadmap de Migração para React + Vite

## Decisão Arquitetural

**Migração Total para React + Vite**:
- **Motivação**: Melhorar a manutenibilidade, performance e escalabilidade do projeto.
- **Benefícios**:
  - Componentização modular.
  - Build mais rápido e eficiente.
  - Suporte a TypeScript.
  - Melhor experiência de desenvolvimento.

## Metas de Desenvolvimento

### Fase 1 - MVP React + Vite
- [ ] Inicializar a nova estrutura do projeto usando React + Vite.
- [ ] Implementar o componente modular da aba "Informações Básicas da Land" (exibindo moedas, diamantes, flores, nível, colheitas e animais via API).

### Fase 2 - Refatoração Completa do Legacy
- [ ] Migrar e reorganizar todo o HTML, JS e CSS monolítico legados da aplicação para componentes isolados em React.
- [ ] Implementar os seguintes componentes:
  - Tabela do Mercado
  - Filtros
  - Proxies
  - Cotação do SFL
  - Header

### Próximos Passos
- [ ] Definir a estrutura de pastas e arquivos para o novo projeto.
- [ ] Configurar o ambiente de desenvolvimento com Vite.
- [ ] Criar os componentes básicos e testar a integração com a API.