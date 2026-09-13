---
tags:
  - sfl/infrastructure
  - cloudflare/worker
  - security/cors
  - documentation/proxy
---

# 🛡️ Cloudflare Worker - CORS Proxy & Middleware de Segurança

Este documento descreve a arquitetura, o funcionamento e o código-fonte do Cloudflare Worker utilizado pelo **SflTrade** (`https://sfltrade.asaphgabrielsousa.workers.dev`) como proxy intermediário e gateway de segurança.

---

## 📌 Contexto & Motivação

As requisições feitas diretamente do navegador (Client-side SPA) para as APIs oficiais do Sunflower Land (`api.sunflower-land.com`) ou agregadores comunitários (`sfl.world`) encontram restrições de **CORS (Cross-Origin Resource Sharing)**. Além disso, o repasse seguro de cabeçalhos de autenticação (`x-api-key` e `Authorization`) exige um proxy intermediário para garantir estabilidade e evitar bloqueios.

---

## 🔐 Travas de Segurança & Recursos

1. **Tratamento de Preflight CORS (HTTP OPTIONS):**
   - Responde requisições `OPTIONS` instantaneamente com HTTP 204.
   - Libera os cabeçalhos `Content-Type`, `Authorization` e `x-api-key`.
   - Adiciona cache de preflight de 24 horas (`Access-Control-Max-Age: 86400`).

2. **Trava de Segurança por Hostname (Domain Locking):**
   - Valida o parâmetro `url` recebido via query string.
   - Permite **estritamente** requisições para domínios que terminam com:
     - `sfl.world` (API pública / Agregador de Mercado)
     - `sunflower-land.com` (API Oficial da Comunidade)
   - Retorna **HTTP 403 Forbidden** para qualquer outro domínio, evitando uso indevido do worker como open relay.

3. **Repasse Transparente e Seguro de Headers:**
   - Extrai e repassa o cabeçalho `Authorization` (Bearer Token `sfl.ey...`).
   - Extrai e repassa o cabeçalho `x-api-key` (suporte a formato de chave legada e novos padrões da Community API).

---

## 💻 Código-Fonte Oficial do Worker

```javascript
export default {
  async fetch(request) {
    // 1. TRATAMENTO DE PREFLIGHT (CORS)
    // O navegador faz essa requisição antes da principal para checar permissões
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
          "Access-Control-Max-Age": "86400", // Faz cache dessa permissão por 24h
        }
      });
    }

    const urlStr = new URL(request.url).searchParams.get("url");
    if (!urlStr) {
      return new Response("Missing URL param", { 
        status: 400,
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }

    try {
      const targetUrl = new URL(urlStr);

      // 🔐 TRAVA DE SEGURANÇA: Permite sfl.world e api.sunflower-land.com
      if (!targetUrl.hostname.endsWith("sfl.world") && !targetUrl.hostname.endsWith("sunflower-land.com")) {
        return new Response("Acesso negado: domínio não permitido.", { 
          status: 403,
          headers: { "Access-Control-Allow-Origin": "*" }
        });
      }

      // Repassa os headers recebidos do front-end
      const originalHeaders = request.headers;
      const fetchHeaders = new Headers();
      
      // Repassa o novo cabeçalho Authorization que configuramos no React
      if (originalHeaders.has("Authorization")) {
        fetchHeaders.set("Authorization", originalHeaders.get("Authorization"));
      }
      
      // Mantém o x-api-key por precaução (caso outras partes do app precisem)
      if (originalHeaders.has("x-api-key")) {
        fetchHeaders.set("x-api-key", originalHeaders.get("x-api-key"));
      }

      // Faz a requisição de fato para o servidor oficial
      const res = await fetch(targetUrl.toString(), {
        method: request.method,
        headers: fetchHeaders
      });

      // Pega a resposta oficial e injeta a permissão de CORS
      const newHeaders = new Headers(res.headers);
      newHeaders.set("Access-Control-Allow-Origin", "*");

      return new Response(res.body, {
        status: res.status,
        headers: newHeaders
      });
      
    } catch (err) {
      return new Response("Erro no proxy: " + err.message, { 
        status: 400,
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }
  }
};
```

---

## 🚀 Integração no Front-end (`src/services/api.js`)

As requisições à API oficial ou ao agregador passam pelo Worker através da função `fetchWithFallback`:

```javascript
const workerUrl = `https://sfltrade.asaphgabrielsousa.workers.dev/?url=${encodeURIComponent(url)}`;
const response = await fetch(workerUrl, { headers, signal });
```

Isso garante compatibilidade com navegadores modernos sem a necessidade de expor chaves sensíveis ou desativar proteções de segurança no navegador.
