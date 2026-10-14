import { describe, it, expect } from 'vitest';
import {
  computeChangePct,
  rankMovers,
  getTargetTimestamp,
  getActualTimeframeLabel,
  calculateEffectiveTax,
  calculateSpreadPct,
  convertSflToCurrency,
  convertCurrencyToSfl,
  calculateNetProceeds,
  MoverItem
} from './marketMath';

describe('marketMath - Invariantes Matemáticas & Funções de Mercado', () => {

  describe('computeChangePct', () => {
    it('calcula porcentagem positiva com precisão', () => {
      expect(computeChangePct(150, 100)).toBe(50);
      expect(computeChangePct(1.05, 1.00)).toBe(5);
    });

    it('calcula porcentagem negativa com precisão', () => {
      expect(computeChangePct(80, 100)).toBe(-20);
      expect(computeChangePct(0.5, 1.0)).toBe(-50);
    });

    it('retorna 0 para valores idênticos', () => {
      expect(computeChangePct(100, 100)).toBe(0);
      expect(computeChangePct(0.005, 0.005)).toBe(0);
    });

    it('retorna null se a base for zero (proteção divisão por zero)', () => {
      expect(computeChangePct(100, 0)).toBeNull();
      expect(computeChangePct(0, 0)).toBeNull();
    });

    it('retorna null se a base for negativa', () => {
      expect(computeChangePct(100, -50)).toBeNull();
    });

    it('retorna null para entradas nulas, indefinidas ou NaN', () => {
      expect(computeChangePct(null, 100)).toBeNull();
      expect(computeChangePct(100, null)).toBeNull();
      expect(computeChangePct(undefined, 100)).toBeNull();
      expect(computeChangePct(NaN, 100)).toBeNull();
      expect(computeChangePct(100, NaN)).toBeNull();
    });

    it('arredonda determinísticamente para 2 casas decimais', () => {
      // 100 -> 100.333333 = +0.33%
      expect(computeChangePct(100.33333, 100)).toBe(0.33);
    });
  });

  describe('rankMovers', () => {
    const mockItems: MoverItem[] = [
      { name: 'Sunflower', currentPriceSfl: 0.005, basePriceSfl: 0.004, changePct: 25, isNft: false },
      { name: 'Potato', currentPriceSfl: 0.003, basePriceSfl: 0.004, changePct: -25, isNft: false },
      { name: 'Pumpkin', currentPriceSfl: 0.02, basePriceSfl: 0.01, changePct: 100, isNft: false },
      { name: 'Carrot', currentPriceSfl: 0.01, basePriceSfl: 0.02, changePct: -50, isNft: false },
      { name: 'Cabbage', currentPriceSfl: 0.05, basePriceSfl: 0.025, changePct: 100, isNft: false },
      { name: 'Beetroot', currentPriceSfl: 0.01, basePriceSfl: 0.01, changePct: 0, isNft: false }, // Variação neutra
      { name: 'Iron', currentPriceSfl: 0.1, basePriceSfl: 0.2, changePct: -50, isNft: false },
      { name: 'Gold', currentPriceSfl: 0.5, basePriceSfl: 0.2, changePct: 150, isNft: false },
    ];

    it('separa top gainers em ordem decrescente limitando a 3 itens', () => {
      const result = rankMovers(mockItems);
      expect(result.topGainers).toHaveLength(3);
      expect(result.topGainers[0].name).toBe('Gold'); // +150%
      expect(result.topGainers[1].changePct).toBe(100);
      expect(result.topGainers[2].changePct).toBe(100);
    });

    it('separa top losers em ordem crescente limitando a 3 itens', () => {
      const result = rankMovers(mockItems);
      expect(result.topLosers).toHaveLength(3);
      expect(result.topLosers[0].changePct).toBe(-50);
      expect(result.topLosers[1].changePct).toBe(-50);
      expect(result.topLosers[2].changePct).toBe(-25);
    });

    it('descarta itens com 0% de variação ou valores não finitos', () => {
      const itemsComZero: MoverItem[] = [
        { name: 'ZeroItem', currentPriceSfl: 1, basePriceSfl: 1, changePct: 0, isNft: false },
        { name: 'NanItem', currentPriceSfl: 1, basePriceSfl: 1, changePct: NaN, isNft: false },
      ];
      const result = rankMovers(itemsComZero);
      expect(result.hasData).toBe(false);
      expect(result.topGainers).toHaveLength(0);
      expect(result.topLosers).toHaveLength(0);
    });

    it('retorna hasData: false para lista vazia', () => {
      const result = rankMovers([]);
      expect(result.hasData).toBe(false);
      expect(result.topGainers).toHaveLength(0);
      expect(result.topLosers).toHaveLength(0);
    });
  });

  describe('getTargetTimestamp', () => {
    const fixedNow = 1700000000000;

    it('calcula o timestamp de 24h atrás corretamente', () => {
      const expected = fixedNow - 24 * 60 * 60 * 1000;
      expect(getTargetTimestamp('24h', fixedNow)).toBe(expected);
    });

    it('calcula o timestamp de 7D atrás corretamente', () => {
      const expected = fixedNow - 7 * 24 * 60 * 60 * 1000;
      expect(getTargetTimestamp('7D', fixedNow)).toBe(expected);
    });

    it('calcula o timestamp de 30D atrás corretamente', () => {
      const expected = fixedNow - 30 * 24 * 60 * 60 * 1000;
      expect(getTargetTimestamp('30D', fixedNow)).toBe(expected);
    });

    it('calcula o timestamp de 90D atrás corretamente', () => {
      const expected = fixedNow - 90 * 24 * 60 * 60 * 1000;
      expect(getTargetTimestamp('90D', fixedNow)).toBe(expected);
    });

    it('aplica fallback de 24h para timeframe desconhecido', () => {
      // @ts-expect-error teste proposital de tipo frouxo
      expect(getTargetTimestamp('invalido', fixedNow)).toBe(fixedNow - 24 * 60 * 60 * 1000);
    });
  });

  describe('getActualTimeframeLabel', () => {
    const ONE_HOUR = 60 * 60 * 1000;
    const ONE_DAY = 24 * 60 * 60 * 1000;

    it('retorna horas se o histórico 24h tiver menos de 18 horas', () => {
      expect(getActualTimeframeLabel('24h', 10 * ONE_HOUR)).toBe('10h');
      expect(getActualTimeframeLabel('24h', 17 * ONE_HOUR)).toBe('17h');
      expect(getActualTimeframeLabel('24h', 18 * ONE_HOUR)).toBe('24h');
    });

    it('retorna dias reais quando histórico for menor que o solicitado', () => {
      expect(getActualTimeframeLabel('7D', 4 * ONE_DAY)).toBe('4D');
      expect(getActualTimeframeLabel('7D', 6 * ONE_DAY)).toBe('7D');
      expect(getActualTimeframeLabel('30D', 14 * ONE_DAY)).toBe('14D');
      expect(getActualTimeframeLabel('30D', 26 * ONE_DAY)).toBe('30D');
      expect(getActualTimeframeLabel('90D', 60 * ONE_DAY)).toBe('60D');
      expect(getActualTimeframeLabel('90D', 85 * ONE_DAY)).toBe('90D');
    });
  });

  describe('calculateEffectiveTax (Taxa de Ilha, VIP e Shrine)', () => {
    it('retorna taxa zero para basic island', () => {
      expect(calculateEffectiveTax('basic')).toBe(0);
      expect(calculateEffectiveTax('basic', true, true)).toBe(0);
    });

    it('retorna taxas nominais padrão para cada ilha', () => {
      expect(calculateEffectiveTax('petal')).toBe(0.50);
      expect(calculateEffectiveTax('desert')).toBe(0.20);
      expect(calculateEffectiveTax('volcano')).toBe(0.15);
      expect(calculateEffectiveTax('desconhecida')).toBe(0.15);
    });

    it('aplica desconto de 50% para status VIP', () => {
      expect(calculateEffectiveTax('petal', true)).toBe(0.25);
      expect(calculateEffectiveTax('desert', true)).toBe(0.10);
      expect(calculateEffectiveTax('volcano', true)).toBe(0.075);
    });

    it('aplica desconto de 2.5% do Shrine', () => {
      expect(calculateEffectiveTax('petal', false, true)).toBe(0.475);
      expect(calculateEffectiveTax('desert', false, true)).toBe(0.175);
      expect(calculateEffectiveTax('volcano', false, true)).toBe(0.125);
    });

    it('combina VIP e Shrine com ordem determinística', () => {
      // Petal: 0.50 / 2 = 0.25 -> 0.25 - 0.025 = 0.225
      expect(calculateEffectiveTax('petal', true, true)).toBe(0.225);
      // Volcano: 0.15 / 2 = 0.075 -> 0.075 - 0.025 = 0.05
      expect(calculateEffectiveTax('volcano', true, true)).toBe(0.05);
    });

    it('garante que a taxa nunca fica negativa com múltiplos descontos', () => {
      // Se houvesse uma ilha com taxa 0.02, 0.02 - 0.025 ficaria -0.005 -> clamp para 0
      expect(calculateEffectiveTax('basic', true, true)).toBe(0);
    });
  });

  describe('calculateSpreadPct (Arbitragem & Spreads de Mercado)', () => {
    it('calcula spread percentual bid-ask com precisão', () => {
      // ask = 10, bid = 9 -> spread = ((10 - 9) / 10) * 100 = 10%
      expect(calculateSpreadPct(10, 9)).toBe(10);
      // ask = 2.0, bid = 1.9 -> spread = 5%
      expect(calculateSpreadPct(2.0, 1.9)).toBe(5);
    });

    it('retorna 0 quando ask e bid são iguais', () => {
      expect(calculateSpreadPct(1.5, 1.5)).toBe(0);
    });

    it('retorna null se askPrice <= 0 ou bidPrice < 0', () => {
      expect(calculateSpreadPct(0, 5)).toBeNull();
      expect(calculateSpreadPct(-10, 5)).toBeNull();
      expect(calculateSpreadPct(10, -1)).toBeNull();
    });

    it('retorna null para entradas nulas, indefinidas ou NaN', () => {
      expect(calculateSpreadPct(null, 10)).toBeNull();
      expect(calculateSpreadPct(10, null)).toBeNull();
      expect(calculateSpreadPct(undefined, 10)).toBeNull();
      expect(calculateSpreadPct(NaN, 10)).toBeNull();
    });
  });

  describe('convertSflToCurrency & convertCurrencyToSfl (SFL / USDC / Fiat)', () => {
    it('converte SFL para USDC/USD com arredondamento determinístico', () => {
      // 100 SFL @ 0.087 USD/SFL = 8.7 USD
      expect(convertSflToCurrency(100, 0.087)).toBe(8.7);
      // 13.55 SFL @ 0.0876 USD/SFL
      expect(convertSflToCurrency(13.55, 0.0876)).toBe(1.187);
    });

    it('converte USDC/USD para SFL com proteção contra divisão por zero', () => {
      // 8.7 USD @ 0.087 USD/SFL = 100 SFL
      expect(convertCurrencyToSfl(8.7, 0.087)).toBe(100);
      expect(convertCurrencyToSfl(10, 0)).toBe(0);
      expect(convertCurrencyToSfl(10, -0.05)).toBe(0);
    });

    it('retorna 0 para entradas inválidas ou negativas', () => {
      expect(convertSflToCurrency(-50, 0.087)).toBe(0);
      expect(convertSflToCurrency(null, 0.087)).toBe(0);
      expect(convertCurrencyToSfl(-10, 0.087)).toBe(0);
      expect(convertCurrencyToSfl(10, null)).toBe(0);
    });
  });

  describe('calculateNetProceeds (Retorno Líquido Pós-Taxa)', () => {
    it('deduz a taxa de ilha corretamente', () => {
      // 100 SFL com taxa de 15% = 85 SFL
      expect(calculateNetProceeds(100, 0.15)).toBe(85);
      // 50 SFL com taxa de 50% = 25 SFL
      expect(calculateNetProceeds(50, 0.50)).toBe(25);
      // 100 SFL com taxa de 0% = 100 SFL
      expect(calculateNetProceeds(100, 0)).toBe(100);
    });

    it('retorna 0 para valores brutos inválidos ou menores ou iguais a zero', () => {
      expect(calculateNetProceeds(0, 0.15)).toBe(0);
      expect(calculateNetProceeds(-50, 0.15)).toBe(0);
      expect(calculateNetProceeds(null, 0.15)).toBe(0);
    });

    it('ignora taxas fora do intervalo [0, 1] aplicando taxa 0', () => {
      expect(calculateNetProceeds(100, -0.1)).toBe(100);
      expect(calculateNetProceeds(100, 1.5)).toBe(100);
    });
  });
});
