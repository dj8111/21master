/**
 * Deck.js - 多副牌靴管理、Fisher-Yates 洗牌與切牌深度
 */
import { Card, SUITS, RANKS } from './Card.js';

export class Deck {
  constructor(numDecks = 6, penetration = 0.75) {
    this.numDecks = numDecks;
    this.penetration = penetration; // 75% 切牌深度
    this.cards = [];
    this.dealtCards = [];
    this.cutCardIndex = 0;
    this.needsReshuffle = false;
    
    this.initShoe();
  }

  /**
   * 初始化牌靴並洗牌
   */
  initShoe() {
    this.cards = [];
    this.dealtCards = [];

    const suitsList = [SUITS.SPADES, SUITS.HEARTS, SUITS.CLUBS, SUITS.DIAMONDS];
    for (let d = 0; d < this.numDecks; d++) {
      for (const suit of suitsList) {
        for (const rank of RANKS) {
          this.cards.push(new Card(suit, rank));
        }
      }
    }

    this.shuffle();
    this.cutCardIndex = Math.floor(this.cards.length * (1 - this.penetration));
    this.needsReshuffle = false;
  }

  /**
   * Fisher-Yates 現代隨機洗牌演算法
   */
  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  /**
   * 發一張牌
   */
  deal() {
    if (this.cards.length === 0) {
      this.initShoe();
    }

    const card = this.cards.pop();
    this.dealtCards.push(card);

    if (this.cards.length <= this.cutCardIndex) {
      this.needsReshuffle = true;
    }

    return card;
  }

  /**
   * 取得剩餘未發總張數
   */
  getRemainingCount() {
    return this.cards.length;
  }

  /**
   * 取得剩餘未發總副數（以 0.5 副為顆粒度，或精確浮點數）
   */
  getRemainingDecks(precision = 1) {
    const raw = this.cards.length / 52;
    if (precision === 0.5) {
      return Math.max(0.5, Math.round(raw * 2) / 2);
    }
    return Math.max(0.5, parseFloat(raw.toFixed(1)));
  }

  /**
   * 取得牌靴當前已發牌比例
   */
  getDealtRatio() {
    const total = this.numDecks * 52;
    return (total - this.cards.length) / total;
  }
}
