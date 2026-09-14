# 🌻 SFL Tracker (SflTrade)

> **A plataforma analítica, rastreador de mercado e gerenciador de portfólio definitivo para o ecossistema Sunflower Land.**

[![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-success?style=flat-square&logo=github)](https://asaphgabriel.github.io/SflTrade/)
[![React](https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-purple?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Backend-Supabase-emerald?style=flat-square&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

O **SflTrade** é uma ferramenta analítica *open-source*, construída por e para negociantes do jogo Web3 **Sunflower Land**. A plataforma simplifica o acompanhamento de cotações P2P em tempo real, monitora o *Floor Price* de NFTs com bônus (*Power Ups*), calcula lucros e prejuízos (PnL) considerando as taxas exatas de cada ilha e santuário, e oferece séries temporais com médias móveis para apoiar tomadas de decisão lucrativas.

---

## 🌐 Acesse a Aplicação

A aplicação está disponível e pronta para uso em qualquer navegador ou celular:  
👉 **[https://asaphgabriel.github.io/SflTrade/](https://asaphgabriel.github.io/SflTrade/)**

---

## 🚀 Principais Funcionalidades

### 📈 Cotação em Tempo Real do Token $FLOWER
- **Cotação Atualizada:** Preço em dólar ($USD) e conversão automática do token oficial **$FLOWER**.
- **Multi-Moeda Dinâmica:** Visualize portfólio, lucros e cotações em **USD ($)**, **BRL (R$)**, **EUR (€)**, **SGD (S$)** e **POL**.
- **Conversor Rápido Integrado:** Calcule instantaneamente o valor de qualquer quantidade de $FLOWER na moeda de sua preferência.

### ⚡ Power Ups & Mercado de NFTs (Collectibles & Wearables)
- **Rastreamento de Buffs:** Monitoramento de mais de 200 itens com efeitos ativos no jogo (`have_boost === 1`).
- **Floor Price & Última Venda:** Consulta do menor preço de mercado e histórico recente de liquidez.
- **Identificação de Habilidade:** Exibição clara do texto de bônus (*ex: "+0.2 Eggplant", "-25% Growth Time"*) em cada card.
- **Gráficos de Floor Price:** Séries históricas com médias móveis para identificar pontos de compra e venda de colecionáveis e vestíveis.

### 📊 Destaques de Mercado (Market Movers)
- **Maiores Altas e Baixas:** Identificação automática dos itens que mais valorizaram e desvalorizaram no mercado.
- **Filtro por Categoria:** Alterne com um clique entre **Recursos** e **Power Ups (NFTs)**.
- **Janelas Temporais:** Análise de variações em **24h**, **7D**, **30D** e **90D**.
- **Auditoria de Liquidez:** Cálculo comparativo com o preço base do período para identificar tendências de mercado.

### 📉 Gráficos Interativos & Séries Temporais
- **Gráficos SVG Responsivos:** Séries históricas leves e limpas para Recursos, NFTs e para o token $FLOWER.
- **Médias Móveis Integradas:** Cálculo automático de **SMA 7** (curto prazo) e **SMA 30** (médio prazo).
- **Métricas Chave da Janela:** Exibição consolidada de Preço Atual, Média do Período, Variação Percentual (%) e Faixa Mínima/Máxima.

### 🛒 Mercado P2P por Categorias Oficiais
Visualização organizada em cards com as artes oficiais do jogo e filtro de busca instantâneo:
- **Crops (Plantações):** Sunflower, Potato, Pumpkin, Carrot, Cabbage, Beetroot, Cauliflower, Parsnip, Radish, Wheat, Corn, etc.
- **Fruits (Frutas):** Apple, Orange, Blueberry, Banana, Lunara, Celestine, etc.
- **Animal Production (Animais):** Egg, Milk, Wool, Leather, Feather, Honey.
- **Minerals & Resources (Minérios):** Wood, Stone, Iron, Gold, Crimstone, Sunstone, Obsidian, Salt.
- **Misc & Badges (Diversos):** Emblemas de Facção, Baús, Saltwort, Heart Leaf, etc.
- **Power Ups (NFTs):** Colecionáveis e Vestíveis ordenados por menor *Floor Price*.

### 🧮 Calculadora de Margem e Taxas Efetivas
Cálculo automático de liquidação conforme as regras de negócio vigentes no jogo:
- **Taxas Base por Ilha:**
  - **Petal Island:** 50%
  - **Desert Island:** 20%
  - **Volcano Island:** 15%
  - **Basic Island:** Sem mercado
- **Descontos Aplicáveis:**
  - **VIP do Sunflower Land:** 50% de desconto sobre a taxa base da ilha.
  - **Trading Shrine (Santuário):** -2.5% de desconto adicional.

$$\text{Venda Líquida} = \text{Preço Bruto} \times (1 - \text{Taxa Total})$$

$$\text{Lucro Percentual} = \left( \frac{\text{Venda Líquida} - \text{Custo Médio}}{\text{Venda Líquida}} \right) \times 100$$

### 📦 Gestão de Carteira & PnL (Portfólio)
- **Registro de Compras e Vendas:** Cadastre transações com cálculo instantâneo de custo total e preço médio.
- **Preço Médio Personalizável:** Ajuste manual do preço médio para refletir itens colhidos ou compras anteriores.
- **Lucro Líquido Real (PnL):** Estimativa exata de retorno em $FLOWER e moeda fiat/fiduciária.

### 🧑‍🌾 Dashboard da Fazenda & Dual-API Resiliente
- **Busca por Farm ID / Nick:** Carregamento instantâneo do estado da fazenda do jogador.
- **Dual-API com Fallback Inteligente:**
  1. *API Oficial da Comunidade (`sunflower-land.com`)*: Suporte a chave autenticada (`x-api-key`).
  2. *Agregador Público (`sfl.world`)*: Fallback automático caso a chave oficial não seja fornecida.
  3. *Cloudflare Worker Proxy (`sfltrade.asaphgabrielsousa.workers.dev`)*: Bypass seguro de restrições de CORS para requisições de cliente.
- **Inventário e Nível:** Visualização do Bumpkin, saldo em moedas/gemas e estoque de itens.

### ☁️ Sincronização em Nuvem (Supabase Auth)
- **Multi-Dispositivo:** Faça login com E-mail ou Link Mágico para sincronizar transações, portfólio e preferências entre computador e celular.
- **Persistência Local e Nuvem:** Dados mantidos em `localStorage` para velocidade instantânea e salvos no Supabase para segurança permanente.

### 📱 PWA Standalone (Instalação Nativa)
- **Instalável no Android e iOS:** Suporte a WebAPK e modo Safari Standalone, abrindo em tela cheia sem barras de navegador.
- **Cache Local Inteligente:** Resiliência a oscilações de internet com cache de cotações e ícones.

### 🌐 Internacionalização (i18n)
- Alternância nativa e instantânea entre **Português (PT)** e **Inglês (EN)**.

---

## 💛 Apoie o Projeto (Open-Source)

O **SflTrade** é um projeto de código aberto mantido de forma independente para a comunidade. Se a ferramenta te ajudou a lucrar, evitar trades ruins ou organizar suas metas no jogo, considere apoiar o desenvolvimento e os custos de infraestrutura:

- **Endereço Público EVM:** `0xC0A82b833562D72C51aC2b66BF4C4AEF5B955222`
- **Redes Compatíveis:** 
  - **Base** ($FLOWER, ETH, USDC)
  - **Polygon** (POL, SFL)
  - **Ronin** (RON, FLOWER)
  - **Ethereum Mainnet** / Arbitrum / Optimism

*(Você também pode clicar no botão **Apoiar** no cabeçalho da aplicação para escanear o QR Code).*

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia | Papel no Projeto |
| :--- | :--- | :--- |
| **Interface** | React 18 + Vite | Componentização modular e renderização ultrarrápida |
| **Estilização** | Tailwind CSS + Custom Dark CSS | Interface moderna, responsiva e pixel-perfect |
| **Backend & Auth** | Supabase (PostgreSQL + RLS + Auth) | Histórico de preços, agregação diária e sincronização de usuários |
| **Proxy Middleware** | Cloudflare Workers | Proxy de segurança com trava de domínio e tratamento de CORS |
| **Internacionalização** | Motor customizado de i18n (`src/i18n.js`) | Tradução sem dependências externas pesadas |
| **Distribuição** | PWA (Service Worker + Web Manifest) | Experiência idêntica a aplicativo nativo mobile |
| **Deploy** | GitHub Pages | Integração e publicação contínua |

---

## 📁 Estrutura de Documentação Técnica

O repositório conta com especificações detalhadas na pasta [`docs/`](./docs):

- [`API_Reference.md`](./docs/API_Reference.md) — Contratos e rotas das APIs do Sunflower Land e agregadores.
- [`Cloudflare_Worker.md`](./docs/Cloudflare_Worker.md) — Código-fonte e travas de segurança do proxy de CORS.
- [`NFT_Pricing_API.md`](./docs/NFT_Pricing_API.md) — Mapeamento e lógica de extração de dados de Collectibles e Wearables.
- [`Tax_Rules.md`](./docs/Tax_Rules.md) — Regras de negócio de taxas por ilha e bônus de santuário.
- [`Planejamento_Monetizacao_PRO.md`](./docs/Planejamento_Monetizacao_PRO.md) — Estudo formal de viabilidade, engenharia de requisitos e roadmap.
- [`MEMORIA_SFLTRADE.md`](./docs/MEMORIA_SFLTRADE.md) — Contexto histórico e diretrizes permanentes de governança.

---

## 💻 Como Rodar Localmente

### Pré-requisitos
- **Node.js** (v18 ou superior)
- **npm**

### Instalação e Execução
```bash
# 1. Clone o repositório
git clone https://github.com/AsaphGabriel/SflTrade.git
cd SflTrade

# 2. Instale as dependências
npm install

# 3. Inicie o servidor de desenvolvimento
npm run dev

# 4. Para compilar a versão de produção
npm run build
```

---

## 📄 Licença

Este projeto é distribuído sob a licença [MIT](LICENSE). Sinta-se livre para contribuir, sugerir melhorias e compartilhar com a comunidade!
