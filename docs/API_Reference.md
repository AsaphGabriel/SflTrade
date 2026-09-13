---
tags:
  - sfl/api
  - documentation/endpoints
  - reference/react-architecture
  - security/api-key
---

# 📡 SFL - Community API Reference & Arquitetura React

Documentação técnica das diretrizes oficiais da Community API do Sunflower Land, endpoints públicos e estrutura de integração do **SflTrade**.

---

## 🔑 Diretrizes Oficiais da Community API Key

A API oficial da comunidade do Sunflower Land exige autenticação controlada para acesso a dados granulares de fazendas.

### 1. Requisitos para Emissão da API Key
Para gerar e utilizar uma API Key oficial (`sfl.ey...`):
- **Assinatura VIP Ativa:** O jogador deve possuir Gold Pass ou status VIP ativo na fazenda.
- **Nível do Bumpkin:** O Bumpkin da fazenda deve ter **nível 50 ou superior** (`Bumpkin Level 50+`).
- **Formato da Chave:** Chave em formato JWT iniciada com o prefixo `sfl.ey...`.

### 2. Rate Limits & Boas Práticas (Throttling & Back-off)
- **Throttling Recomendado:** Manter um intervalo razoável de **~5 a 10 segundos** entre requisições consecutivas para a mesma fazenda ou chave.
- **Tratamento de Rate Limit (HTTP 429):** Caso o servidor retorne status `429 Too Many Requests`, a aplicação deve interromper imediatamente novas tentativas e aplicar um **back-off mínimo de 10 segundos** antes de tentar novamente.
- **Evitar Polling Agressivo:** Requisições contínuas em curto intervalo acarretam bloqueio temporário ou definitivo da chave API.

### 3. Dumps Diários (`nightlyDump`)
- Para extração de grandes massas de dados, análises históricas ou estatísticas globais do ecossistema, **não faça loops de requisições individuais** para endpoints `/community/farms/{id}`.
- Utilize os **dumps diários oficiais (`nightlyDump`)** disponibilizados pelo Sunflower Land para consumo em lote de dados agregados.

---

## 🔗 Base URLs & Endpoints

| Ambiente | Host Base / Endpoint | Finalidade |
| :--- | :--- | :--- |
| **Mainnet Oficial** | `https://api.sunflower-land.com` | API Oficial de Comunidade (Requer API Key) |
| **Mainnet Agregador** | `https://sfl.world/api` | API Pública de Mercado P2P e Cotação Exchange |
| **Testnet (Polygon Amoy)** | `https://api-amoy.sunflower-land.com` | Ambiente de Testes e Staging |
| **Proxy CORS (Worker)** | `https://sfltrade.asaphgabrielsousa.workers.dev` | Middleware de Bypass CORS e Forward de Headers |

---

## 🎯 Mapeamento de Endpoints Utilizados no SflTrade

### 1. Cotação do SFL (`GET /v1.1/exchange`)
- **URL Completa:** `https://sfl.world/api/v1.1/exchange`
- **Retorno:** Preço do SFL em USD, POL/MATIC, BRL, EUR e SGD.

### 2. Preços P2P de Mercado (`GET /v1/prices`)
- **URL Completa:** `https://sfl.world/api/v1/prices`
- **Retorno:** Tabela de preços P2P atualizados em tempo real para todas as mercadorias e itens do jogo.

### 3. Dados da Fazenda via Agregador Público (`GET /v1.1/land/{farm_id}`)
- **URL Completa:** `https://sfl.world/api/v1.1/land/{farm_id}`
- **Retorno:** Nível da ilha, inventário público e preferências.

### 4. Dados Oficiais Autenticados da Fazenda (`GET /community/farms/{farm_id}`)
- **URL Completa:** `https://api.sunflower-land.com/community/farms/{farm_id}`
- **Autenticação:** Requer cabeçalho `x-api-key: sfl.ey...` e/ou `Authorization: Bearer sfl.ey...`.
- **Retorno:** Estado completo e verificado da fazenda, nível do Bumpkin, inventário detalhado e status VIP.

### 5. Cotações, Floor Price e Boosts de NFTs (`GET /v1/nfts`)
- **URL Completa:** `https://sfl.world/api/v1/nfts`
- **Acesso via Worker Proxy:** `https://sfltrade.asaphgabrielsousa.workers.dev/?url=https%3A%2F%2Fsfl.world%2Fapi%2Fv1%2Fnfts`
- **Autenticação:** Nenhuma (Endpoint público indexado do Marketplace Polygon).
- **Estrutura de Retorno:**
  - `collectibles`: Array de 480+ NFTs colecionáveis/placeables da fazenda (id, floor, lastSalePrice, supply, name, have_boost, boost_text).
  - `wearables`: Array de 360+ itens vestíveis/equipamentos do Bumpkin (id, floor, lastSalePrice, supply, name, have_boost, boost_text).
  - `updatedAt`: Timestamp Unix em milissegundos da última consolidação dos preços.
- **Utilidade Estratégica:** Permite calcular o **Net Worth de NFTs (Valoração de Colecionáveis e Roupas)** cruzando com o inventário oficial da fazenda (`farm.collectibles` / `farm.wardrobe`).

---

## 🧩 Arquitetura de Estado e Serviços no Front-end

A camada de serviços (`src/services/api.js`) gerencia a resiliência e a comunicação com os endpoints através da seguinte estrutura:

### 1. `fetchWithFallback(url, options)`
- Tenta primeiramente realizar a requisição através do **Cloudflare Worker Proxy** (`https://sfltrade.asaphgabrielsousa.workers.dev/?url=...`).
- Repassa os cabeçalhos `x-api-key` e `Authorization` com segurança sem expor segredos no client-side.
- Possui estratégias de contingência (Fetch Direto -> CorsProxy.io) caso o Worker primário fique indisponível.

### 2. `fetchOfficialFarmData(farmId, apiKey)`
- Constrói a requisição oficial para `api.sunflower-land.com`.
- Injeta os cabeçalhos `x-api-key` e `Authorization: Bearer <apiKey>` formatados.

### 3. `fetchFarmDataSmart({ farmId, apiKey, forceRefresh })`
- Orquestrador inteligente com cache local (`sfl_cache_*`) por TTL de 10 minutos.
- Executa consulta autenticada caso haja chave válida e aplica fallback automático para a API pública em caso de falha.