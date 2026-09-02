# 🧠 MEMÓRIA DE APRENDIZADO & CONTEXTO - SFLTRADE

### 📌 Estado Atual do Projeto (2026)
- **Tech Stack:** React (Vite), PWA, Tailwind/CSS modular, JavaScript Moderno.
- **Estrutura de Pastas:**
  - `src/`: Componentes React, hooks, lógica principal e sistema de tradução customizado (`translations`).
  - `02 - Projetos/SflTrade/`: Caminho raiz absoluto do workspace.

---

### 🚦 Regras Permanentes de Desenvolvimento
1. **Arquitetura & Código Limpo:** Manter código modular, componentizado e com tratamento de erros robusto.
2. **Tradução:** Utilizar exclusivamente o sistema customizado de tradução (`translations` e função `t()`), evitando dependências externas como `i18next` no core atual.
3. **Gerenciamento de Dependências & Imports:** Sempre validar caminhos relativos/absolutos de arquivos antes de refatorar componentes para evitar quebras de build no Vite.
4. **Agentes & Ferramentas:** Utilizar o motor Antigravity e o SDK com capacidades completas de terminal e manipulação de arquivos quando aplicável.

---

### 🔄 Histórico de Atualizações Recentes
- **[2026-04]** Migração estrutural para o ecossistema de agentes Antigravity (Gemini 3.1 Pro / Flash).
- **[2026-04]** Reestruturação completa de painéis analíticos e rotinas de automação no workspace.
- **[2026-08]** Resolução de CORS da API Oficial Sunflower Land via Cloudflare Worker Proxy (`sfltrade.asaphgabrielsousa.workers.dev`).
- **[2026-08]** Implementação do padrão Dual-API com Fallback (Prioridade para API Key Oficial, fallback para sfl.world).
- **[2026-08]** Implementação de mapeamento matemático performático (Array pre-cache) para cálculo de Experiência (XP) -> Nível do Bumpkin.
- **[2026-08]** Implementação do cálculo de Lucro/Prejuízo real multi-moeda (`USD`, `BRL`, `EUR`, `SGD`, `POL`).
- **[2026-08]** Solução definitiva da instalação PWA Standalone em WebAPK/Safari iOS (correção de escopo/start_url no manifest e remoção de botão/modal legados).
- **[2026-08]** Padronização visual com artes PNG oficiais das categorias do jogo (`Sunflower`, `Apple`, `Egg`, `Wood`, `Sunflorian Emblem`) substituindo emojis Unicode.
- **[2026-08]** Elaboração e publicação do `README.md` abrangente focado na comunidade de traders do Sunflower Land.