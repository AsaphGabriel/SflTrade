---
tags:
  - sfl/api
  - documentation/endpoints
  - reference/react-architecture
---

# 📡 SFL - Community API Reference & Arquitetura React

Documentação técnica dos endpoints públicos e estrutura de serviços/hooks do projeto.

---

## 🔗 Base URLs & Endpoints

* **Community API Base:** `https://sfl.world/api/`
* **Proxy CORS (Worker):** `https://sfltrade.asaphgabrielsousa.workers.dev`

### 1. Cotação do SFL (`GET /v1.1/exchange`)
Retorna preços do SFL em USD e MATIC/POL.

### 2. Preços P2P de Mercado (`GET /v1/prices`)
Retorna objeto com preços P2P em tempo real de todas as mercadorias.

### 3. Dados da Fazenda (`GET /v1.1/land/{farm_id}`)
Retorna ilha ativa, status VIP e preferências da fazenda do jogador.

---

## 🧩 Arquitetura de Estado e Componentes React

Substituindo o antigo modelo monolítico (`script.js`), a lógica agora é dividida em Hooks e Serviços:

### 1. `useMarketData()` (`src/hooks/useMarketData.js`)
- **Papel:** Hook reativo responsável pelo ciclo de vida do fetching de dados P2P e Cotação.
- **Retornos Principais:** `{ marketData, sflPrices, loading, error, refreshData }`.
- **Resiliência:** Utiliza fallback local estático caso a API ou o worker falhem.

### 2. `api.js` (`src/services/api.js`)
- **`fetchJsonSmart(url)`**: Trata requisições através do Cloudflare Worker para ignorar bloqueios de CORS e parsear payloads envelopados em `<pre>`.
- **`fetchFarmData(farmId)`**: Consulta dados de land e converte automaticamente a ilha ativa e status VIP para o estado da aplicação.

### 3. Calculadora de Taxa Efetiva (`LandInfo.jsx` / Utils)
A taxa decimal efetiva é calculada dinamicamente:
- **Petal Island:** 50%
- **Desert Island:** 20%
- **Volcano Island:** 15%
- **VIP Modifier:** 50% de desconto sobre a taxa base da ilha.
- **Trading Shrine:** -2.5% adicionais.