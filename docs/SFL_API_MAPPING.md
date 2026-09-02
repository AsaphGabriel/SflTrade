# Documentação: Mapeamento da API Oficial Sunflower Land

Esta documentação descreve o mapeamento da estrutura JSON recebida da API Oficial (`api.sunflower-land.com`) vs o que era usado na API pública (`sfl.world`), e como o `sfltrade` extrai essas informações.

## Como funciona a Orquestração (Dual-API)

O nosso sistema já está configurado para **sempre preferir a API Oficial** se a API Key for fornecida. 
O fluxo no arquivo `src/services/api.js` (`fetchFarmDataSmart`) funciona assim:
1. Checa se o usuário forneceu a API Key (começada com `sfl.`).
2. Se sim, chama a API Oficial usando o Cloudflare Worker para burlar o CORS (`fetchOfficialFarmData`).
3. Se a chave estiver ausente, expirar, ou o servidor oficial cair, o código **automaticamente** faz um "fallback" e tenta puxar as informações públicas via `sfl.world` (`fetchPublicLandData`).

---

## Mapeamento de Dados

A função `normalizeFarmResponse(rawData, source)` no arquivo `api.js` é a responsável por ler as duas APIs e montar um objeto padrão que a interface do React entende.

### 1. Dados Financeiros (Moedas, Gemas, etc)
Na API Oficial, todos os dados ficam dentro da raiz `farm`. A API pública tinha formatos variados.

| Dado | JSON Oficial (api.sunflower-land.com) | Como extraímos no SFL Trade |
| :--- | :--- | :--- |
| **Moedas (Coins)** | `farm.coins` | `rawData.farm.coins` |
| **SFL Balance** | `farm.balance` | `parseFloat(rawData.farm.balance)` |
| **Gemas (Gems)** | `farm.inventory["Gem"]` | `rawData.farm.inventory?.Gem` |
| **Marcas (Marks)** | `farm.inventory["Mark"]` | `rawData.farm.inventory?.Mark` |
| **Charme (Love Charm)** | `farm.inventory["Love Charm"]` | `rawData.farm.inventory?.['Love Charm']` |
| **Alegria (Cheer)** | `farm.inventory["Cheer"]` | `rawData.farm.inventory?.Cheer` |

**Nota:** Os valores de **Charme** e **Alegria** não ficavam explícitos antigamente, mas na API Oficial eles são tratados como **itens do inventário**.

### 2. Dados da Ilha e Perfil
| Dado | JSON Oficial | SFL Trade |
| :--- | :--- | :--- |
| **Tipo de Ilha** | `farm.island.type` | `rawData.farm.island.type` |
| **Status VIP** | `farm.inventory["Gold Pass"]` | `Boolean(rawData.farm.inventory?.['Gold Pass'])` |
| **Inventário (Seeds)** | `farm.inventory` | `rawData.farm.inventory` |

### 3. Dados do Personagem (Bumpkin)
O grande desafio da API Oficial é o nível do Bumpkin. 

| Dado | JSON Oficial | Problema Encontrado |
| :--- | :--- | :--- |
| **Experiência (XP)** | `farm.bumpkin.experience` | Vem como um número enorme (ex: `26226477.98`). |
| **Nível (Level)** | ❌ *Não existe!* | A API oficial não retorna o nível pronto. |

**Atenção:** A API do `sfl.world` fazia um cálculo interno com a XP e retornava o `level` mastigado (ex: Nível 22). **A API Oficial não retorna o Nível do Bumpkin**, ela só retorna a Experiência (`experience`). Atualmente o app vai exibir `Nível 1` porque não acha o atributo `level` no JSON da oficial. Precisamos implementar a fórmula matemática de XP -> Level dentro do nosso código.
