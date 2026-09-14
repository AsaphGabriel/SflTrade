---
title: "Integração de Pagamentos Cripto (VIP)"
tags:
  - sfl/monetization
  - web3/payments
---

# 🪙 Sistema de Pagamentos Cripto (Paywall VIP)

Este documento detalha como implementar um sistema de cobrança de assinaturas semelhante ao de bots do Telegram (onde um endereço único de depósito é gerado por usuário), sem exigir conexão direta com a carteira MetaMask na interface.

---

## 1. O Gateway Escolhido: NOWPayments (ou Similar)

Para gerar endereços únicos automaticamente, gerenciar a varredura (sweeping) e receber notificações no Supabase (Webhooks), o padrão da indústria é utilizar APIs como o **NOWPayments** ou **Coinbase Commerce**.

### 📊 Taxas Efetivas (Redes Polygon e Base)

Na rede Polygon (POL/MATIC) ou na rede Base (ETH), as taxas de rede (*gas*) são minúsculas (frações de centavo). 

**Estrutura de Custos do NOWPayments:**
1. **Taxa de Processamento:** `0.5%` sobre o valor transacionado.
2. **Taxa de Rede (Sweep Gas):** Quando o sistema detecta que o usuário pagou, ele repassa o dinheiro para a sua Carteira Mestre. Essa transação de repasse consome uma pequena taxa de rede nativa.
   - **Na Polygon/Base:** Historicamente custa menos de `$0.01` a `$0.02` por repasse.

**Simulação de Pagamento de R$ 1,00 (aprox. $0.20 USD) em POL:**
- Usuário envia: `$0.20`
- Taxa NOWPayments (0.5%): `$0.001`
- Taxa de Rede (Gas): `$0.01`
- **Líquido na sua carteira mestre:** `~$0.189` (Aprox. 94.5% de retenção).
*(Nota: Para micropagamentos muito baixos, o percentual perdido no gas da rede é maior do que em pagamentos de $5, mas na Polygon/Base ainda é praticamente imperceptível).*

---

## 2. Arquitetura da Integração

A integração exigirá o uso do Supabase para manter o controle seguro de assinaturas.

### A. Fluxo de Geração de Pagamento (Frontend -> API -> NOWPayments)
1. O usuário clica em "Renovar VIP" no site.
2. O seu site (React) chama uma **Edge Function** no seu Supabase.
3. A Edge Function faz uma requisição POST segura para a API do NOWPayments com a sua chave secreta:
   ```json
   POST https://api.nowpayments.io/v1/payment
   {
     "price_amount": 0.2,
     "price_currency": "usd",
     "pay_currency": "matic",
     "order_id": "vip_user_12345",
     "ipn_callback_url": "https://seu-supabase.supabase.co/functions/v1/webhook_vip"
   }
   ```
4. A API responde com um endereço único (`pay_address: "0xABC..."`).
5. O site exibe esse endereço para o usuário com a mensagem: *"Envie no mínimo 0.5 POL para este endereço"*.

### B. O Webhook de Validação Automática
1. O usuário abre o celular (ou carteira de sua preferência) e envia a moeda para o endereço `0xABC...`.
2. A rede blockchain processa. O NOWPayments identifica a entrada.
3. O NOWPayments dispara um `POST` automático (Webhook) para a sua rota secreta no Supabase (`webhook_vip`).
4. O Supabase recebe o aviso de "Pago" (`payment_status: "finished"`).
5. O Supabase executa um `UPDATE` na tabela `profiles`, definindo `is_vip = true` e `vip_expires_at = NOW() + 30 days`.

---

## 3. O que precisa ser feito no SflTrade?

Para tirar isso do papel, precisamos configurar os seguintes componentes:

1. **Conta Comercial (Gratuita):** Criar conta no NOWPayments e cadastrar a sua Carteira Mestre que vai receber todo o dinheiro da comunidade.
2. **Supabase (Backend):**
   - Criar uma tabela `user_profiles` ligada à autenticação.
   - Criar uma Edge Function (código rodando na nuvem) para ouvir o Webhook e atualizar a data de expiração.
3. **React (Frontend):**
   - Criar o componente visual que pede o plano (exibe o QR Code ou endereço).
   - Ocultar os botões 7D, 30D e 90D baseando-se no banco de dados e não no `localStorage`.
