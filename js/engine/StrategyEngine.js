/**
 * StrategyEngine.js - 21點最優基本策略矩陣與 Illustrious 18 策略偏差計算機
 */

export const ACTIONS = {
  HIT: 'H',
  STAND: 'S',
  DOUBLE: 'D',    // Double if allowed, else Hit
  DOUBLE_STAND: 'Ds', // Double if allowed, else Stand
  SPLIT: 'P',
  SURRENDER_HIT: 'Rh', // Surrender if allowed, else Hit
  SURRENDER_STAND: 'Rs' // Surrender if allowed, else Stand
};

export const ACTION_LABELS = {
  'H': { text: '要牌 (Hit)', class: 'action-hit' },
  'S': { text: '停牌 (Stand)', class: 'action-stand' },
  'D': { text: '加倍 (Double)', class: 'action-double' },
  'Ds': { text: '加倍/停牌 (Double/Stand)', class: 'action-double' },
  'P': { text: '分牌 (Split)', class: 'action-split' },
  'Rh': { text: '投降/要牌 (Surrender/Hit)', class: 'action-surrender' },
  'Rs': { text: '投降/停牌 (Surrender/Stand)', class: 'action-surrender' }
};

export class StrategyEngine {
  /**
   * 計算手牌點數與軟牌/硬牌狀態
   * @param {Array<Card>} cards 
   * @returns {{ total: number, isSoft: boolean, isPair: boolean, isBlackjack: boolean }}
   */
  static evaluateHand(cards) {
    if (!cards || cards.length === 0) {
      return { total: 0, isSoft: false, isPair: false, isBlackjack: false };
    }

    let sum = 0;
    let aceCount = 0;

    for (const c of cards) {
      if (c.rank === 'A') {
        aceCount++;
        sum += 11;
      } else {
        sum += c.getValue();
      }
    }

    while (sum > 21 && aceCount > 0) {
      sum -= 10;
      aceCount--;
    }

    const isSoft = aceCount > 0;
    const isPair = cards.length === 2 && (cards[0].getValue() === cards[1].getValue() || cards[0].rank === cards[1].rank);
    const isBlackjack = cards.length === 2 && sum === 21;

    return { total: sum, isSoft, isPair, isBlackjack };
  }

  /**
   * 取得莊家面牌在策略表中的標準欄位索引 (2~10, A)
   */
  static getDealerCardKey(dealerUpcard) {
    if (!dealerUpcard) return '10';
    if (dealerUpcard.rank === 'A') return 'A';
    if (['10', 'J', 'Q', 'K'].includes(dealerUpcard.rank)) return '10';
    return dealerUpcard.rank;
  }

  /**
   * 硬牌基本策略表 (Hard Totals: 8~17)
   * 莊家欄位順序: 2, 3, 4, 5, 6, 7, 8, 9, 10, A
   */
  static HARD_TABLE = {
    '8':  ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'],
    '9':  ['H', 'D', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
    '10': ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'H', 'H'],
    '11': ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D_H17'],
    '12': ['H', 'H', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
    '13': ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
    '14': ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
    '15': ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'Rh', 'Rh_H17'],
    '16': ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'Rh', 'Rh', 'Rh'],
    '17': ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'Rs_H17']
  };

  /**
   * 軟牌基本策略表 (Soft Totals: A2~A9)
   */
  static SOFT_TABLE = {
    '13': ['H', 'H', 'H', 'D', 'D', 'H', 'H', 'H', 'H', 'H'], // A,2
    '14': ['H', 'H', 'H', 'D', 'D', 'H', 'H', 'H', 'H', 'H'], // A,3
    '15': ['H', 'H', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'], // A,4
    '16': ['H', 'H', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'], // A,5
    '17': ['H', 'D', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'], // A,6
    '18': ['Ds', 'Ds', 'Ds', 'Ds', 'Ds', 'S', 'S', 'H', 'H', 'H'], // A,7
    '19': ['S', 'S', 'S', 'S', 'Ds_H17', 'S', 'S', 'S', 'S', 'S'], // A,8
    '20': ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S']  // A,9
  };

  /**
   * 分牌基本策略表 (Pairs: 22~AA)
   */
  static PAIR_TABLE = {
    '2':  ['P_DAS', 'P_DAS', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
    '3':  ['P_DAS', 'P_DAS', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
    '4':  ['H', 'H', 'H', 'P_DAS', 'P_DAS', 'H', 'H', 'H', 'H', 'H'],
    '5':  ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'H', 'H'],
    '6':  ['P_DAS', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H', 'H'],
    '7':  ['P', 'P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
    '8':  ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    '9':  ['P', 'P', 'P', 'P', 'P', 'S', 'P', 'P', 'S', 'S'],
    '10': ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
    'A':  ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P']
  };

  static DEALER_KEYS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A'];

  /**
   * 取得標準基本策略決策 (Basic Strategy Action)
   */
  static getBasicStrategyAction(playerHand, dealerUpcard, rules = { dealerHitsSoft17: false, doubleAfterSplit: true, lateSurrender: true }) {
    const handInfo = this.evaluateHand(playerHand.cards || playerHand);
    const dealerKey = this.getDealerCardKey(dealerUpcard);
    const dIdx = this.DEALER_KEYS.indexOf(dealerKey);

    const isH17 = rules.dealerHitsSoft17;
    const canDAS = rules.doubleAfterSplit;
    const canSurrender = rules.lateSurrender && (playerHand.cards ? playerHand.cards.length === 2 : playerHand.length === 2);
    const canDouble = (playerHand.cards ? playerHand.cards.length === 2 : playerHand.length === 2);

    // 1. 分牌判定 (僅限兩張同點牌)
    if (handInfo.isPair && (playerHand.cards ? playerHand.cards.length === 2 : playerHand.length === 2)) {
      const pairRank = (playerHand.cards ? playerHand.cards[0] : playerHand[0]).rank;
      const pairKey = ['J', 'Q', 'K'].includes(pairRank) ? '10' : pairRank;
      const rawAction = this.PAIR_TABLE[pairKey] ? this.PAIR_TABLE[pairKey][dIdx] : 'S';

      if (rawAction === 'P') return 'P';
      if (rawAction === 'P_DAS') return canDAS ? 'P' : 'H';
      if (rawAction === 'D') return canDouble ? 'D' : 'H';
      if (rawAction === 'S') return 'S';
      if (rawAction === 'H') return 'H';
    }

    // 2. 軟牌判定 (Soft Totals)
    if (handInfo.isSoft && handInfo.total >= 13 && handInfo.total <= 20) {
      const softKey = handInfo.total.toString();
      let rawAction = this.SOFT_TABLE[softKey] ? this.SOFT_TABLE[softKey][dIdx] : 'S';

      if (rawAction === 'Ds_H17') rawAction = isH17 ? 'Ds' : 'S';
      
      if (rawAction === 'Ds') {
        if (canDouble) return 'D';
        return 'S';
      }
      if (rawAction === 'D') {
        if (canDouble) return 'D';
        return 'H';
      }
      return rawAction;
    }

    // 3. 硬牌判定 (Hard Totals)
    if (handInfo.total >= 18) {
      // 18點以上必定停牌
      return 'S';
    }
    const hardTotal = Math.max(handInfo.total, 8);
    let rawAction = this.HARD_TABLE[hardTotal.toString()] ? this.HARD_TABLE[hardTotal.toString()][dIdx] : 'H';

    if (rawAction === 'D_H17') rawAction = isH17 ? 'D' : 'H';
    if (rawAction === 'Rh_H17') rawAction = isH17 ? 'Rh' : 'H';
    if (rawAction === 'Rs_H17') rawAction = isH17 ? 'Rs' : 'S';

    if (rawAction === 'Rh') {
      if (canSurrender) return 'R';
      return 'H';
    }
    if (rawAction === 'Rs') {
      if (canSurrender) return 'R';
      return 'S';
    }
    if (rawAction === 'D') {
      if (canDouble) return 'D';
      return 'H';
    }

    return rawAction;
  }

  /**
   * 結合 Illustrious 18 / Fab 4 計算高階算牌策略偏差
   * @param {Object} playerHand 
   * @param {Object} dealerUpcard 
   * @param {number} trueCount 
   * @param {Object} rules 
   * @returns {{ action: string, reason: string, isDeviation: boolean }}
   */
  static getOptimalDecision(playerHand, dealerUpcard, trueCount = 0, rules = { dealerHitsSoft17: false, doubleAfterSplit: true, lateSurrender: true }) {
    const handInfo = this.evaluateHand(playerHand.cards || playerHand);
    const dealerKey = this.getDealerCardKey(dealerUpcard);
    const basicAction = this.getBasicStrategyAction(playerHand, dealerUpcard, rules);

    const tc = Math.round(trueCount); // 常用整數真數判斷

    // Illustrious 18 偏差檢查
    // 1. 保險偏差
    if (dealerKey === 'A' && tc >= 3) {
      // 外部可獨立判斷保險
    }

    // 2. 16 vs 10 (TC >= 0 -> Stand)
    if (handInfo.total === 16 && !handInfo.isSoft && dealerKey === '10') {
      if (tc >= 0) {
        return { action: 'S', reason: `I18: 16 vs 10 在 TC >= 0 時停牌 (當前 TC: ${trueCount.toFixed(1)})`, isDeviation: true };
      }
    }

    // 3. 15 vs 10 (TC >= 4 -> Stand)
    if (handInfo.total === 15 && !handInfo.isSoft && dealerKey === '10') {
      if (tc >= 4) {
        return { action: 'S', reason: `I18: 15 vs 10 在 TC >= +4 時停牌 (當前 TC: ${trueCount.toFixed(1)})`, isDeviation: true };
      }
    }

    // 4. 10,10 vs 5 (TC >= 5 -> Split)
    if (handInfo.isPair && handInfo.total === 20 && dealerKey === '5') {
      if (tc >= 5) {
        return { action: 'P', reason: `I18: 10,10 vs 5 在 TC >= +5 時分牌 (當前 TC: ${trueCount.toFixed(1)})`, isDeviation: true };
      }
    }

    // 5. 10,10 vs 6 (TC >= 4 -> Split)
    if (handInfo.isPair && handInfo.total === 20 && dealerKey === '6') {
      if (tc >= 4) {
        return { action: 'P', reason: `I18: 10,10 vs 6 在 TC >= +4 時分牌 (當前 TC: ${trueCount.toFixed(1)})`, isDeviation: true };
      }
    }

    // 6. 10 vs 10 (TC >= 4 -> Double)
    if (handInfo.total === 10 && !handInfo.isSoft && dealerKey === '10') {
      if (tc >= 4) {
        return { action: 'D', reason: `I18: 10 vs 10 在 TC >= +4 時加倍 (當前 TC: ${trueCount.toFixed(1)})`, isDeviation: true };
      }
    }

    // 7. 12 vs 3 (TC >= 2 -> Stand)
    if (handInfo.total === 12 && !handInfo.isSoft && dealerKey === '3') {
      if (tc >= 2) {
        return { action: 'S', reason: `I18: 12 vs 3 在 TC >= +2 時停牌 (當前 TC: ${trueCount.toFixed(1)})`, isDeviation: true };
      }
    }

    // 8. 12 vs 2 (TC >= 3 -> Stand)
    if (handInfo.total === 12 && !handInfo.isSoft && dealerKey === '2') {
      if (tc >= 3) {
        return { action: 'S', reason: `I18: 12 vs 2 在 TC >= +3 時停牌 (當前 TC: ${trueCount.toFixed(1)})`, isDeviation: true };
      }
    }

    // 9. 11 vs A (TC >= 1 -> Double on S17)
    if (handInfo.total === 11 && !handInfo.isSoft && dealerKey === 'A') {
      if (tc >= 1) {
        return { action: 'D', reason: `I18: 11 vs A 在 TC >= +1 時加倍 (當前 TC: ${trueCount.toFixed(1)})`, isDeviation: true };
      }
    }

    // 10. 9 vs 2 (TC >= 1 -> Double)
    if (handInfo.total === 9 && !handInfo.isSoft && dealerKey === '2') {
      if (tc >= 1) {
        return { action: 'D', reason: `I18: 9 vs 2 在 TC >= +1 時加倍 (當前 TC: ${trueCount.toFixed(1)})`, isDeviation: true };
      }
    }

    // 11. 10 vs A (TC >= 4 -> Double)
    if (handInfo.total === 10 && !handInfo.isSoft && dealerKey === 'A') {
      if (tc >= 4) {
        return { action: 'D', reason: `I18: 10 vs A 在 TC >= +4 時加倍 (當前 TC: ${trueCount.toFixed(1)})`, isDeviation: true };
      }
    }

    // 12. 9 vs 7 (TC >= 3 -> Double)
    if (handInfo.total === 9 && !handInfo.isSoft && dealerKey === '7') {
      if (tc >= 3) {
        return { action: 'D', reason: `I18: 9 vs 7 在 TC >= +3 時加倍 (當前 TC: ${trueCount.toFixed(1)})`, isDeviation: true };
      }
    }

    // 13. 16 vs 9 (TC >= 5 -> Stand)
    if (handInfo.total === 16 && !handInfo.isSoft && dealerKey === '9') {
      if (tc >= 5) {
        return { action: 'S', reason: `I18: 16 vs 9 在 TC >= +5 時停牌 (當前 TC: ${trueCount.toFixed(1)})`, isDeviation: true };
      }
    }

    // 14. 13 vs 2 (TC < -1 -> Hit)
    if (handInfo.total === 13 && !handInfo.isSoft && dealerKey === '2') {
      if (tc < -1) {
        return { action: 'H', reason: `I18: 13 vs 2 在 TC < -1 時要牌 (當前 TC: ${trueCount.toFixed(1)})`, isDeviation: true };
      }
    }

    // 15. 12 vs 4 (TC < 0 -> Hit)
    if (handInfo.total === 12 && !handInfo.isSoft && dealerKey === '4') {
      if (tc < 0) {
        return { action: 'H', reason: `I18: 12 vs 4 在 TC < 0 時要牌 (當前 TC: ${trueCount.toFixed(1)})`, isDeviation: true };
      }
    }

    // 16. 12 vs 5 (TC < -2 -> Hit)
    if (handInfo.total === 12 && !handInfo.isSoft && dealerKey === '5') {
      if (tc < -2) {
        return { action: 'H', reason: `I18: 12 vs 5 在 TC < -2 時要牌 (當前 TC: ${trueCount.toFixed(1)})`, isDeviation: true };
      }
    }

    // 17. 12 vs 6 (TC < -1 -> Hit)
    if (handInfo.total === 12 && !handInfo.isSoft && dealerKey === '6') {
      if (tc < -1) {
        return { action: 'H', reason: `I18: 12 vs 6 在 TC < -1 時要牌 (當前 TC: ${trueCount.toFixed(1)})`, isDeviation: true };
      }
    }

    // 18. 13 vs 3 (TC < -2 -> Hit)
    if (handInfo.total === 13 && !handInfo.isSoft && dealerKey === '3') {
      if (tc < -2) {
        return { action: 'H', reason: `I18: 13 vs 3 在 TC < -2 時要牌 (當前 TC: ${trueCount.toFixed(1)})`, isDeviation: true };
      }
    }

    return { action: basicAction, reason: '依據最優基本策略 (Basic Strategy)', isDeviation: false };
  }
}
