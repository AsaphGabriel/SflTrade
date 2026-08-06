---
tags:
  - game/sunflower-land
  - sfl/mechanics
  - sfl/fees
---

# 🏝️ SFL - Mecânica de Taxas e Ilhas

Guia de referência para as regras de negócio de taxas de negociação P2P e marketplace no Sunflower Land.

## 📊 Taxas Base por Tipo de Ilha

| Tipo de Ilha | Taxa Base de Venda | Status no Jogo |
| :--- | :--- | :--- |
| **Petal Island** | **50%** | Padrão Inicial |
| **Desert Island** | **20%** | Desbloqueável |
| **Volcano Island** | **15%** | Ilha Avançada |
| **Basic Island** | Sem Mercado | Apenas progresso inicial |
| **Ascension Island**| Bloqueado | Conteúdo Futuro |

---

## 🎟️ Modificadores de Desconto

1. **Assinatura VIP:** Concede **50% de desconto** sobre a taxa base da ilha ativa.
   * *Exemplo na Desert Island:* Taxa base de 20% cai para **10%**.
2. **Trading Shrine (Santuário):** Desconto fixo adicional de **-2.5%** sobre o valor final.

---

## 📐 Fórmula de Margem Líquida P2P

Para padronizar o cálculo do lucro real e margem percentual no app:

$$\text{Venda Líquida} = \text{Preço Bruto} \times (1 - \text{Taxa Total})$$

$$\text{Lucro Percentual} = \left( \frac{\text{Venda Líquida} - \text{Custo Médio}}{\text{Venda Líquida}} \right) \times 100$$