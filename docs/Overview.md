---
title: SFL Trade Tracker - Contexto & Roadmap
type: project
status: em_desenvolvimento
tags:
  - project/sfl-tracker
  - dev/pwa
  - dev/react
  - dev/vite
  - game/sunflower-land
created: 2026-07-31
repository: "https://github.com/AsaphGabriel/SflTrade.git"
last_updated: 2026-08-05
---

# 🌾 SFL Trade Tracker (React + Vite)

>[!ABSTRACT] Visão Geral do Projeto
>Aplicação Web / PWA desenvolvida para acompanhamento de cotações, cálculo de PnL (Lucro/Prejuízo) em tempo real, monitoramento de inventários de fazendas (*lands*) e gestão do patrimônio (*Net Worth*) no jogo Web3 **Sunflower Land (SFL)**.

---

## 🎯 Objetivos Principais

- [x] **Migração de Arquitetura:** Conversão completa de Vanilla JS (script.js) para React + Vite + Componentes Modulares.
- [x] **Gestão de Carteira & P2P:** Acompanhar compras/vendas de recursos com cálculo de preço médio e lucro líquido estimado.
- [x] **Calculadora Inteligente de Taxas:** Aplicar regras do jogo (Ilhas, VIP e Trading Shrine) para definir a taxa de venda real.
- [x] **Integração Automática via Farm ID:** Carregar dados da fazenda e preferências de taxa direto da API oficial do jogador.
- [ ] **Valoração de NFTs & Assets:** Calcular o valor total em carteira considerando Collectibles e Wearables (Floor Prices).
- [ ] **Persistência em Nuvem & Histórico:** Transicionar de `localStorage` para Supabase (PostgreSQL).

---

## 🛠️ Stack Técnica Atualizada

| Camada | Tecnologia / Ferramenta | Detalhes |
| :--- | :--- | :--- |
| **Front-end** | React 18 + Vite | Componentização reativa em JSX |
| **Estilização** | Tailwind CSS | Utility-first CSS integrado no Vite |
| **i18n** | react-i18next / i18n custom | Suporte dinâmico EN / PT |
| **Mobile / PWA** | Web App Manifest + Service Worker | Execução Standalone no Android/iOS/Brave |
| **Hospedagem** | GitHub Pages / Cloudflare | Deploy contínuo via repositório |
| **APIs Externas** | `sfl.world` via Worker CORS | Exchange, P2P Prices, Land Info |

---

## 📐 Estrutura do Projeto (`src/`)

- `src/main.jsx` – Ponto de entrada da aplicação React e inicialização do i18n.
- `src/App.jsx` – Componente raiz que orquestra estados globais e navegação de abas.
- `src/i18n.js` – Dicionário e configuração de internacionalização (EN/PT).
- `src/components/` – Componentes modulares de UI:
  - `Header.jsx` – Seletores de moeda, idioma e atalhos.
  - `LandInfo.jsx` – Controles de Ilha, VIP e Trading Shrine com indicador de taxa.
  - `ResourceGrid.jsx` – Cards de mercado filtráveis por categoria (Crops, Fruits, etc.).
  - `PortfolioTable.jsx` – Tabela e cards do portfólio de ativos com cálculo de PnL.
  - `TransactionModal.jsx` – Modal de registro de compra e venda com cálculo automático.
  - `BottomNav.jsx` – Navegação inferior para dispositivos móveis.
- `src/hooks/` – Custom Hooks reativos (`useMarketData.js`).
- `src/services/` – Módulos de requisição HTTP e integração de API (`api.js`).