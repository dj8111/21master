/**
 * Card.js - 撲克牌物件與算牌系統標籤映射
 */
export const SUITS = {
  SPADES: { symbol: '♠', name: 'spades', color: 'black' },
  HEARTS: { symbol: '♥', name: 'hearts', color: 'red' },
  CLUBS: { symbol: '♣', name: 'clubs', color: 'black' },
  DIAMONDS: { symbol: '♦', name: 'diamonds', color: 'red' }
};

export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export class Card {
  constructor(suit, rank) {
    this.suit = suit; // SUITS object
    this.rank = rank; // '2'-'10', 'J', 'Q', 'K', 'A'
    // 使用 CSPRNG 生成唯一 ID（同時相容瀏覽器與 Node.js 環境）
    let randomSuffix;
    try {
      randomSuffix = Array.from(
        (globalThis.crypto || require('crypto').webcrypto).getRandomValues(new Uint8Array(6))
      ).map(b => b.toString(36)).join('');
    } catch (e) {
      randomSuffix = Math.random().toString(36).substr(2, 9);
    }
    this.id = `${rank}_${suit.symbol}_${randomSuffix}`;
  }

  /**
   * 取得 21 點數值（A 預設算 11，後續由 Hand 計算動態降為 1）
   */
  getValue() {
    if (['J', 'Q', 'K'].includes(this.rank)) return 10;
    if (this.rank === 'A') return 11;
    return parseInt(this.rank, 10);
  }

  /**
   * 取得 Hi-Lo 算牌標籤 (+1, 0, -1)
   */
  getHiLoValue() {
    if (['2', '3', '4', '5', '6'].includes(this.rank)) return 1;
    if (['7', '8', '9'].includes(this.rank)) return 0;
    return -1; // 10, J, Q, K, A
  }

  /**
   * 取得 KO (Knock-Out) 算牌標籤
   */
  getKOValue() {
    if (['2', '3', '4', '5', '6', '7'].includes(this.rank)) return 1;
    if (['8', '9'].includes(this.rank)) return 0;
    return -1; // 10, J, Q, K, A
  }

  /**
   * 取得 Omega II 算牌標籤
   */
  getOmegaIIValue() {
    if (['2', '3', '7'].includes(this.rank)) return 1;
    if (['4', '5', '6'].includes(this.rank)) return 2;
    if (this.rank === '8') return 0;
    if (this.rank === '9') return -1;
    if (['10', 'J', 'Q', 'K'].includes(this.rank)) return -2;
    return 0; // Ace 算 0 (配合獨立 Ace Side Count)
  }

  /**
   * 渲染為 HTML DOM 結構
   */
  renderDOM(isFaceUp = true) {
    const cardEl = document.createElement('div');
    cardEl.className = `playing-card ${this.suit.color} ${isFaceUp ? 'face-up' : 'face-down'}`;
    cardEl.dataset.id = this.id;

    if (!isFaceUp) {
      cardEl.innerHTML = `
        <div class="card-back">
          <div class="card-back-pattern"></div>
        </div>
      `;
      return cardEl;
    }

    cardEl.innerHTML = `
      <div class="card-corner top-left">
        <span class="card-rank">${this.rank}</span>
        <span class="card-suit">${this.suit.symbol}</span>
      </div>
      <div class="card-center">
        <span class="card-large-suit">${this.suit.symbol}</span>
      </div>
      <div class="card-corner bottom-right">
        <span class="card-rank">${this.rank}</span>
        <span class="card-suit">${this.suit.symbol}</span>
      </div>
    `;
    return cardEl;
  }
}
