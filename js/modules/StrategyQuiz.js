/**
 * StrategyQuiz.js - 基本策略測驗模組 (快問快答 / 100格矩陣填空 / 弱點雷達突擊)
 */
import { Card, SUITS, RANKS } from '../engine/Card.js';
import { StrategyEngine } from '../engine/StrategyEngine.js';

export class StrategyQuiz {
  constructor(soundEngine, analytics) {
    this.sound = soundEngine;
    this.analytics = analytics;

    this.quizMode = 'FLASH'; // 'FLASH', 'MATRIX', 'WEAKNESS'
    this.currentCategory = 'ALL'; // 'HARD', 'SOFT', 'PAIR', 'ALL'
    this.score = 0;
    this.total = 0;
    this.combo = 0;

    this.initDOM();
    this.bindEvents();
  }

  initDOM() {
    this.container = document.getElementById('strategy-quiz-stage');
    this.modeButtons = document.querySelectorAll('.quiz-nav-btn');
  }

  bindEvents() {
    this.modeButtons?.forEach(btn => {
      btn.addEventListener('click', () => {
        this.modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.quizMode = btn.dataset.mode;
        this.renderStage();
      });
    });
  }

  renderStage() {
    if (!this.container) return;

    if (this.quizMode === 'FLASH') {
      this.renderFlashQuiz();
    } else if (this.quizMode === 'MATRIX') {
      this.renderMatrixGrid();
    } else if (this.quizMode === 'WEAKNESS') {
      this.renderWeaknessRadar();
    }
  }

  /* ==================== 模式 1：快問快答 ==================== */
  renderFlashQuiz() {
    this.nextQuestion();
  }

  generateQuestion() {
    const suits = [SUITS.SPADES, SUITS.HEARTS, SUITS.CLUBS, SUITS.DIAMONDS];
    const getRandomCard = () => {
      const s = suits[Math.floor(Math.random() * suits.length)];
      const r = RANKS[Math.floor(Math.random() * RANKS.length)];
      return new Card(s, r);
    };

    let p1, p2, dealerCard;
    const cat = this.currentCategory === 'ALL' 
      ? ['HARD', 'SOFT', 'PAIR'][Math.floor(Math.random() * 3)]
      : this.currentCategory;

    dealerCard = getRandomCard();

    if (cat === 'PAIR') {
      const r = RANKS[Math.floor(Math.random() * RANKS.length)];
      p1 = new Card(SUITS.SPADES, r);
      p2 = new Card(SUITS.HEARTS, r);
    } else if (cat === 'SOFT') {
      p1 = new Card(SUITS.SPADES, 'A');
      const nonAces = ['2', '3', '4', '5', '6', '7', '8', '9'];
      p2 = new Card(SUITS.HEARTS, nonAces[Math.floor(Math.random() * nonAces.length)]);
    } else {
      // HARD
      const lowRanks = ['2', '3', '4', '5', '6', '7', '8', '9', '10'];
      p1 = new Card(SUITS.SPADES, lowRanks[Math.floor(Math.random() * lowRanks.length)]);
      p2 = new Card(SUITS.CLUBS, lowRanks[Math.floor(Math.random() * lowRanks.length)]);
    }

    const optimalAction = StrategyEngine.getBasicStrategyAction([p1, p2], dealerCard);

    return { playerCards: [p1, p2], dealerCard, optimalAction };
  }

  nextQuestion() {
    this.currentQ = this.generateQuestion();
    const evalP = StrategyEngine.evaluateHand(this.currentQ.playerCards);

    this.container.innerHTML = `
      <div class="quiz-card-scenario">
        <div class="scenario-header">
          <span class="stat-label">連續答對 Combo: <b style="color: var(--gold-primary); font-size: 1.1rem;">${this.combo}</b></span>
          <span class="stat-label">累積得分: <b style="color: var(--color-success); font-size: 1.1rem;">${this.score} / ${this.total}</b></span>
        </div>

        <div class="scenario-duel">
          <div class="duel-side">
            <span class="duel-title">莊家明牌</span>
            ${this.currentQ.dealerCard.renderDOM(true).outerHTML}
          </div>
          <div style="font-size: 1.5rem; font-weight: 800; color: var(--text-muted);">VS</div>
          <div class="duel-side">
            <span class="duel-title">你的手牌 (${evalP.total}點 ${evalP.isSoft ? '軟' : ''})</span>
            <div class="cards-row" style="min-height: auto;">
              ${this.currentQ.playerCards.map(c => c.renderDOM(true).outerHTML).join('')}
            </div>
          </div>
        </div>

        <p style="color: var(--text-secondary); font-size: 0.9rem;">依據標準基本策略，你的最佳行動是？</p>

        <div class="action-grid">
          <button class="action-opt-btn act-h" data-act="H">Hit (要牌)</button>
          <button class="action-opt-btn act-s" data-act="S">Stand (停牌)</button>
          <button class="action-opt-btn act-d" data-act="D">Double (加倍)</button>
          <button class="action-opt-btn act-p" data-act="P">Split (分牌)</button>
          <button class="action-opt-btn act-r" data-act="R" style="grid-column: span 2;">Surrender (投降)</button>
        </div>
      </div>
    `;

    this.container.querySelectorAll('.action-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const act = btn.dataset.act;
        this.submitAnswer(act);
      });
    });
  }

  submitAnswer(playerAct) {
    this.total++;
    const optimal = this.currentQ.optimalAction;
    const isCorrect = (playerAct === optimal) 
      || (optimal === 'Ds' && (playerAct === 'D' || playerAct === 'S'))
      || (optimal === 'Rh' && (playerAct === 'R' || playerAct === 'H'))
      || (optimal === 'Rs' && (playerAct === 'R' || playerAct === 'S'));

    if (isCorrect) {
      this.score++;
      this.combo++;
      this.sound.playCorrect();
      this.analytics.recordStrategyQuiz(true);
    } else {
      this.combo = 0;
      this.sound.playWrong();
      this.analytics.recordStrategyQuiz(false);
    }

    this.nextQuestion();
  }

  /* ==================== 模式 2：全策略矩陣填空 ==================== */
  renderMatrixGrid() {
    const dealerCols = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A'];
    const hardRows = ['17+', '16', '15', '14', '13', '12', '11', '10', '9', '8'];

    let rowsHTML = '';
    hardRows.forEach(row => {
      let cells = `<tr><td class="row-header">Hard ${row}</td>`;
      dealerCols.forEach(col => {
        cells += `
          <td>
            <input type="text" class="matrix-input" maxlength="2" data-type="hard" data-row="${row}" data-col="${col}" placeholder="-">
          </td>
        `;
      });
      cells += '</tr>';
      rowsHTML += cells;
    });

    this.container.innerHTML = `
      <div class="matrix-container">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h3 style="font-family: var(--font-heading); color: var(--gold-primary);">📊 硬牌 (Hard Totals) 全矩陣填空挑戰</h3>
          <div>
            <button id="btn-check-matrix" class="btn btn-emerald">驗證所有答案</button>
            <button id="btn-show-cheat-matrix" class="btn btn-secondary">顯示正確解答</button>
          </div>
        </div>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1rem;">
          代號說明：H = 要牌, S = 停牌, D = 加倍, Rh = 投降/要牌
        </p>
        <table class="matrix-table">
          <thead>
            <tr>
              <th>玩家手牌 \\ 莊家</th>
              ${dealerCols.map(c => `<th>${c}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>
      </div>
    `;

    document.getElementById('btn-check-matrix')?.addEventListener('click', () => this.checkMatrixAnswers());
    document.getElementById('btn-show-cheat-matrix')?.addEventListener('click', () => this.fillCorrectMatrix());
  }

  checkMatrixAnswers() {
    const inputs = this.container.querySelectorAll('.matrix-input');
    let correctCount = 0;
    let totalCount = 0;

    inputs.forEach(input => {
      totalCount++;
      const row = input.dataset.row;
      const col = input.dataset.col;
      const val = input.value.trim().toUpperCase();

      // 取得正確解
      const key = row === '17+' ? '17' : row;
      const colIdx = StrategyEngine.DEALER_KEYS.indexOf(col);
      const expected = StrategyEngine.HARD_TABLE[key] ? StrategyEngine.HARD_TABLE[key][colIdx] : 'S';

      const match = (val === expected) 
        || (expected.startsWith('D') && val === 'D') 
        || (expected.startsWith('Rh') && (val === 'R' || val === 'RH'))
        || (expected === 'S' && val === 'S')
        || (expected === 'H' && val === 'H');

      if (match) {
        correctCount++;
        input.classList.remove('wrong');
        input.classList.add('correct');
      } else {
        input.classList.remove('correct');
        input.classList.add('wrong');
      }
    });

    if (correctCount === totalCount) this.sound.playWin();
    else this.sound.playWrong();

    alert(`矩陣批改完成！\n正確率: ${correctCount} / ${totalCount} (${((correctCount/totalCount)*100).toFixed(1)}%)`);
  }

  fillCorrectMatrix() {
    const inputs = this.container.querySelectorAll('.matrix-input');
    inputs.forEach(input => {
      const row = input.dataset.row;
      const col = input.dataset.col;
      const key = row === '17+' ? '17' : row;
      const colIdx = StrategyEngine.DEALER_KEYS.indexOf(col);
      const expected = StrategyEngine.HARD_TABLE[key] ? StrategyEngine.HARD_TABLE[key][colIdx] : 'S';
      input.value = expected;
      input.className = 'matrix-input correct';
    });
  }

  /* ==================== 模式 3：弱點雷達針對性突擊 ==================== */
  renderWeaknessRadar() {
    const weaknessList = [
      {
        hand: 'Soft 18 (A,7)',
        dealer: '9, 10, A',
        action: 'Hit (要牌)',
        wrongTrend: '停牌 (Stand)',
        why: '許多新手以為 18 點很大而停牌，但莊家拿 9/10/A 時有超過 60% 機率是 19~21 點。Hit 即使抽到高牌爆掉，整體期望值仍遠高於 Stand！'
      },
      {
        hand: 'Hard 12',
        dealer: '2 或 3',
        action: 'Hit (要牌)',
        wrongTrend: '停牌 (Stand)',
        why: '莊家 2/3 點爆牌率僅約 35%~37%，不及 4/5/6 的 40% 以上。玩家 12 點抽 10 爆牌率為 30.7%，要牌勝率高於停牌。'
      },
      {
        hand: 'Pair 9,9',
        dealer: '7',
        action: 'Stand (停牌)',
        wrongTrend: '分牌 (Split)',
        why: '莊家面牌 7 時最常落在 17 點。玩家手中已有 18 點穩贏莊家 17 點，若拆牌反而降低勝率。'
      },
      {
        hand: 'Pair 4,4',
        dealer: '5 或 6 (DAS 規則下)',
        action: 'Split (分牌)',
        wrongTrend: '要牌 (Hit)',
        why: '若賭場允許分牌後加倍 (DAS)，拆成兩門 4 後補到 5/6/7 能立刻加倍 (Double)，放大莊家爆牌時的收益。'
      }
    ];

    let itemsHTML = weaknessList.map(item => `
      <div class="glass-card" style="margin-bottom: 1rem; border-left: 4px solid var(--gold-primary);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <h4 style="font-family: var(--font-heading); color: #fff; font-size: 1.1rem;">🎯 易錯手牌：${item.hand} vs 莊家 ${item.dealer}</h4>
          <span class="brand-badge" style="background: rgba(239, 68, 68, 0.2); color: #f87171; border-color: #ef4444;">最常犯錯: ${item.wrongTrend}</span>
        </div>
        <p style="color: var(--color-success); font-weight: 700; margin-bottom: 0.5rem;">最優策略：${item.action}</p>
        <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">${item.why}</p>
      </div>
    `).join('');

    this.container.innerHTML = `
      <div style="max-width: 780px; margin: 0 auto;">
        <h3 style="font-family: var(--font-heading); color: var(--gold-primary); margin-bottom: 0.5rem;">🛡️ 21點 4 大最高失誤率盲點專項突擊</h3>
        <p style="color: var(--text-muted); margin-bottom: 1.5rem; font-size: 0.9rem;">
          根據數十億手牌大數據統計，以下是玩家在賭場實戰中最常因直覺誤判而損失期望值 (EV) 的手牌。
        </p>
        ${itemsHTML}
      </div>
    `;
  }
}
