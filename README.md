# 🌾 SFL Tracker (SFL Trade Tracker)

> **O guia definitivo e gerenciador de carteira para os amantes de trade do Sunflower Land (SFL).**

O **SFL Tracker** foi criado por e para entusiastas e negociantes do jogo Web3 **Sunflower Land**. A aplicação foi projetada para resolver a complexidade de acompanhar cotações de mercado P2P, calcular lucros e prejuízos (PnL) com precisão cirúrgica considerando as taxas reais do jogo (Ilhas, VIP e Trading Shrine) e gerenciar o patrimônio de ativos em tempo real, seja no computador ou no celular.

---

## 🚀 Principais Funcionalidades

### 📈 Cotação em Tempo Real & Conversor Rápido
- **Preço da $FLOWER**: Acompanhamento atualizado da cotação do token $FLOWER/SFL.
- **Suporte Multi-Moeda**: Alterne dinamicamente o valor das posições e lucros entre **USD ($)**, **BRL (R$)**, **EUR (€)**, **SGD (S$)** e **POL**.
- **Conversor Rápido**: Calcule instantaneamente o valor de qualquer quantidade de $FLOWER na moeda selecionada.

### 🛒 Mercado P2P por Categoria com Ícones Oficiais
- Visualização em cards responsivos de todas as mercadorias do Sunflower Land agrupadas por categorias oficiais com artes PNG do jogo:
  - 🌻 **Crops (Plantações)**: Sunflower, Potato, Pumpkin, Carrot, Wheat, etc.
  - 🍎 **Fruits (Frutas)**: Apple, Orange, Blueberry, Banana, Lunara, etc.
  - 🐔 **Animal Production (Produção Animal)**: Egg, Milk, Wool, Leather, Feather, Honey.
  - ⛏️ **Minerals & Resources (Minérios e Recursos)**: Wood, Stone, Iron, Gold, Crimstone, Obsidian, Salt.
  - 📦 **Misc & Badges (Diversos e Emblemas)**: Emblem de Facções, Baú, Saltwort, Heart Leaf, etc.
- **Busca Rápida**: Filtro por nome de recurso em tempo real.

### 🧮 Calculadora Inteligente de Taxas Efetivas
Cálculo automático do desconto de taxa de venda com base na mecânica do jogo:
- **Taxas Base por Ilha**:
  - 🌸 **Petal Island**: 50%
  - 🏜️ **Desert Island**: 20%
  - 🌋 **Volcano Island**: 15%
  - 🏝️ **Basic Island**: Sem Mercado
- **Modificadores de Desconto**:
  - 👑 **Assinatura VIP**: 50% de desconto sobre a taxa base da ilha ativa.
  - ⛩️ **Trading Shrine (Santuário)**: -2.5% de desconto adicional.

### 📦 Gestão de Carteira & PnL (Portfólio)
- **Registro de Transações**: Adicione registros de compra e venda por recurso.
- **Preço Médio & Custo Total**: Cálculo dinâmico do preço médio de aquisição.
- **Lucro Líquido Estimado (PnL)**: Exibição da estimativa de lucro/prejuízo em quantidade de $FLOWER e na moeda fiat/crypto escolhida (ex: USD/BRL).

### 🧑‍🌾 Dashboard da Fazenda & Arquitetura Dual-API
- **Busca por Farm ID ou Nickname**: Carregamento automático dos dados da fazenda via `sfl.world`.
- **Arquitetura Dual-API Resiliente**:
  1. **API Oficial Autenticada (`sunflower-land.com`)**: Suporte a chave API (`x-api-key`).
  2. **Agregador Público (`sfl.world`)**: Fallback transparente caso a API oficial não seja utilizada.
  3. **Sistema de Cache Local (TTL 10 min)**: Salva consultas no `localStorage` garantindo velocidade e suporte a contingência offline.
  4. **Fallback por Proxies Resilientes**: Redirecionamento automático através de Cloudflare Worker próprio e CorsProxy para evitar bloqueios de CORS.
- **Métricas da Fazenda**: Exibição de saldo de moedas, SFL, gemas, nível do Bumpkin, experiência e inventário oficial.

### 📱 Aplicativo PWA Standalone
- **Instalação Nativa no Celular**: Pode ser adicionado à tela inicial no Android (WebAPK) e iOS (Safari Standalone) funcionando como um aplicativo nativo em tela cheia (sem barras de navegador).
- **Service Worker Offline**: Cache inteligente de assets e ícones em alta definição.

### 🌐 Suporte Bilingue (i18n)
- Suporte dinâmico aos idiomas **Português (PT)** e **Inglês (EN)**.

---

## 📊 Mecânica de Taxas e Fórmulas

Para garantir a transparência no cálculo do retorno financeiro das operações P2P:

$$\text{Venda Líquida} = \text{Preço Bruto} \times (1 - \text{Taxa Total})$$

$$\text{Lucro Percentual} = \left( \frac{\text{Venda Líquida} - \text{Custo Médio}}{\text{Venda Líquida}} \right) \times 100$$

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia | Descrição |
| :--- | :--- | :--- |
| **Front-end** | React 18 + Vite | Interface reativa rápida com componentes modulares |
| **Estilização** | Vanilla CSS + Tailwind CSS | Layout responsivo e tema Dark estilizado |
| **Internacionalização** | Dicionário Customizado (i18n) | Suporte a EN e PT |
| **PWA & Cache** | Web App Manifest + Service Worker | Suporte a PWA Standalone e cache local |
| **Proxy & Conexão** | Cloudflare Workers + Fetch API | Resiliência contra falhas de rede e CORS |
| **Hospedagem** | GitHub Pages | Deploy contínuo da aplicação |

---

## 💻 Como Rodar o Projeto Localmente

### Pré-requisitos
- **Node.js** (versão 18 ou superior)
- **npm**

### Passos
1. Clone o repositório:
   ```bash
   git clone https://github.com/AsaphGabriel/SflTrade.git
   cd SflTrade
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Execute o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

4. Abra o navegador no endereço indicado (ex: `http://localhost:5173/SflTrade/`).

5. Para gerar a versão de produção:
   ```bash
   npm run build
   ```

---

## 🌐 Acesse a Aplicação

O projeto está publicado e disponível no GitHub Pages:
👉 **[https://asaphgabriel.github.io/SflTrade/](https://asaphgabriel.github.io/SflTrade/)**
