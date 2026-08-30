/**
 * CountingEngine.js - 即時維護與計算 Hi-Lo / KO / Omega II 的 RC 與 TC
 */

export class CountingEngine {
  constructor(numDecks = 6, system = 'HILO') {
    this.numDecks = numDecks;
    this.system = system; // 'HILO', 'KO', 'OMEGA2'
    this.runningCount = 0;
    this.history = []; // 紀錄每張牌
    this.lowCardsCount = 0; // 2-6
    this.neutralCardsCount = 0; // 7-9
    this.highCardsCount = 0; // 10-A
    this.totalDealt = 0;

    this.initSystem();
  }

  initSystem() {
    this.runningCount = 0;
    this.history = [];
    this.lowCardsCount = 0;
    this.neutralCardsCount = 0;
    this.highCardsCount = 0;
    this.totalDealt = 0;

    if (this.system === 'KO') {
      // 6副牌 KO 初始跑數 (IRC) 為 -20, 2副為 -4, 8副為 -28
      if (this.numDecks === 1) this.runningCount = 0;
      else if (this.numDecks === 2) this.runningCount = -4;
      else if (this.numDecks === 6) this.runningCount = -20;
      else if (this.numDecks === 8) this.runningCount = -28;
      else this.runningCount = -(4 * (this.numDecks - 1));
    }
  }

  /**
   * 當有一張新牌翻開時記錄並更新點數
   */
  processCard(card) {
    if (!card) return;

    let value = 0;
    if (this.system === 'HILO') {
      value = card.getHiLoValue();
    } else if (this.system === 'KO') {
      value = card.getKOValue();
    } else if (this.system === 'OMEGA2') {
      value = card.getOmegaIIValue();
    }

    this.runningCount += value;
    this.totalDealt++;
    this.history.push({ card, value, rc: this.runningCount });

    // 統計高低牌分佈
    const r = card.rank;
    if (['2', '3', '4', '5', '6'].includes(r)) {
      this.lowCardsCount++;
    } else if (['7', '8', '9'].includes(r)) {
      this.neutralCardsCount++;
    } else {
      this.highCardsCount++;
    }
  }

  /**
   * 計算當前 True Count (真數)
   * @param {number} remainingDecks 剩餘未發副數
   */
  getTrueCount(remainingDecks) {
    if (this.system === 'KO') {
      // KO 是非平衡系統，直接看跑數與樞紐點 (Pivot +4)
      return this.runningCount;
    }

    const decks = Math.max(0.5, remainingDecks);
    return this.runningCount / decks;
  }

  /**
   * 取得推薦下注倍率 (依 True Count & Kelly Criterion 概念)
   * @param {number} trueCount 
   * @param {number} baseUnit 基本下注單位 (如 $25)
   */
  getSuggestedBet(trueCount, baseUnit = 25) {
    const tc = Math.floor(trueCount);
    if (tc <= 1) return baseUnit; // 1 unit
    if (tc === 2) return baseUnit * 2; // 2 units
    if (tc === 3) return baseUnit * 4; // 4 units
    if (tc === 4) return baseUnit * 8; // 8 units
    if (tc >= 5) return baseUnit * 12; // 12 units (Max Bet)
    return baseUnit;
  }

  /**
   * 取得牌靴分佈統計數據
   */
  getShoeStats(remainingTotal) {
    const totalCards = this.numDecks * 52;
    const initialLow = this.numDecks * 20;     // 2-6 共 5*4 = 20張/副
    const initialNeutral = this.numDecks * 12; // 7-9 共 3*4 = 12張/副
    const initialHigh = this.numDecks * 20;    // 10-A 共 5*4 = 20張/副

    const remainingLow = Math.max(0, initialLow - this.lowCardsCount);
    const remainingNeutral = Math.max(0, initialNeutral - this.neutralCardsCount);
    const remainingHigh = Math.max(0, initialHigh - this.highCardsCount);
    const remTotal = Math.max(1, remainingTotal || (remainingLow + remainingNeutral + remainingHigh));

    return {
      lowRatio: ((remainingLow / remTotal) * 100).toFixed(1),
      neutralRatio: ((remainingNeutral / remTotal) * 100).toFixed(1),
      highRatio: ((remainingHigh / remTotal) * 100).toFixed(1),
      remainingLow,
      remainingNeutral,
      remainingHigh
    };
  }
}
