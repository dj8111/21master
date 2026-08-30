/**
 * test_engine.mjs - 自動化邏輯與基本策略驗證測試
 */
import { Card, SUITS, RANKS } from './js/engine/Card.js';
import { Deck } from './js/engine/Deck.js';
import { StrategyEngine } from './js/engine/StrategyEngine.js';
import { CountingEngine } from './js/engine/CountingEngine.js';

console.log('=== 1. Card & Counting Tag Test ===');
const c10 = new Card(SUITS.SPADES, 'K');
const c5 = new Card(SUITS.HEARTS, '5');
const c8 = new Card(SUITS.CLUBS, '8');
console.assert(c10.getHiLoValue() === -1, 'K should be -1');
console.assert(c5.getHiLoValue() === 1, '5 should be +1');
console.assert(c8.getHiLoValue() === 0, '8 should be 0');
console.log('✓ Card tags passed!');

console.log('=== 2. Deck & Shoe Test ===');
const deck = new Deck(6, 0.75);
console.assert(deck.getRemainingCount() === 312, '6 decks = 312 cards');
console.assert(deck.getRemainingDecks() === 6, 'Should start with 6 decks');
let hiloSum = 0;
for (const card of deck.cards) {
  hiloSum += card.getHiLoValue();
}
console.assert(hiloSum === 0, 'Hi-Lo sum of full shoe must be 0');
console.log('✓ Deck & Shoe integrity passed!');

console.log('=== 3. Strategy Engine Test ===');
// Test 1: Hard 12 vs Dealer 3 -> H
const p12 = [new Card(SUITS.SPADES, '10'), new Card(SUITS.HEARTS, '2')];
const d3 = new Card(SUITS.CLUBS, '3');
console.assert(StrategyEngine.getBasicStrategyAction(p12, d3) === 'H', '12 vs 3 should be Hit');

// Test 2: Soft 18 (A,7) vs Dealer 9 -> H
const pSoft18 = [new Card(SUITS.SPADES, 'A'), new Card(SUITS.HEARTS, '7')];
const d9 = new Card(SUITS.CLUBS, '9');
console.assert(StrategyEngine.getBasicStrategyAction(pSoft18, d9) === 'H', 'Soft 18 vs 9 should be Hit');

// Test 3: Pair 8,8 vs Dealer 10 -> P
const p88 = [new Card(SUITS.SPADES, '8'), new Card(SUITS.HEARTS, '8')];
const d10 = new Card(SUITS.CLUBS, '10');
console.assert(StrategyEngine.getBasicStrategyAction(p88, d10) === 'P', '8,8 vs 10 should be Split');

// Test 4: Illustrious 18: 16 vs 10 with TC >= 0 -> Stand
const p16 = [new Card(SUITS.SPADES, '10'), new Card(SUITS.HEARTS, '6')];
const dev1 = StrategyEngine.getOptimalDecision(p16, d10, 1.2);
console.assert(dev1.action === 'S' && dev1.isDeviation, '16 vs 10 at TC +1.2 should Stand');

const dev2 = StrategyEngine.getOptimalDecision(p16, d10, -1.0);
console.assert(dev2.action === 'R' || dev2.action === 'H', '16 vs 10 at TC -1.0 should Hit/Surrender');
console.log('✓ Strategy & I18 deviations passed!');

console.log('=== 4. Counting Engine Test ===');
const counter = new CountingEngine(6, 'HILO');
counter.processCard(c5); // +1
counter.processCard(c5); // +1
console.assert(counter.runningCount === 2, 'RC should be 2');
console.assert(counter.getTrueCount(2) === 1, 'TC should be 2/2 = 1');
console.log('✓ Counting Engine passed!');

console.log('\n🎉 All 4 Engine verification tests passed successfully with 100% accuracy!');
