/**
 * CountingDrill.js - 4大算牌記憶與考核測驗模組 (含深度數學原理、實戰原因與答題解析)
 */
import { Deck } from '../engine/Deck.js';
import { Card, SUITS, RANKS } from '../engine/Card.js';
import { StrategyEngine } from '../engine/StrategyEngine.js';

export class CountingDrill {
  constructor(soundEngine, analytics) {
    this.sound = soundEngine;
    this.analytics = analytics;

    this.currentMode = 'FLASHCARD'; // 'FLASHCARD', 'COUNTDOWN', 'DECK_ESTIMATION', 'DEVIATIONS'
    this.system = 'HILO';
    
    // 測驗執行期變數
    this.drillActive = false;
    this.currentCards = [];
    this.targetRC = 0;
    this.userScore = 0;
    this.totalQuestions = 0;
    this.startTime = 0;
    this.countdownTimer = null;
    this.remainingSeconds = 0;

    this.initDOM();
    this.bindEvents();
  }

  initDOM() {
    this.drillStage = document.getElementById('drill-stage');
    this.modeCards = document.querySelectorAll('.mode-card');
  }

  bindEvents() {
    this.modeCards?.forEach(card => {
      card.addEventListener('click', () => {
        this.modeCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.currentMode = card.dataset.mode;
        this.renderStage();
      });
    });

    // 鍵盤作答 (+1, 0, -1)
    window.addEventListener('keydown', (e) => {
      if (!this.drillActive) return;
      if (this.currentMode === 'FLASHCARD') {
        if (e.key === 'ArrowUp' || e.key === '1' || e.key === '+') this.submitFlashcardAnswer(1);
        if (e.key === 'ArrowRight' || e.key === '0') this.submitFlashcardAnswer(0);
        if (e.key === 'ArrowDown' || e.key === '-1' || e.key === '-') this.submitFlashcardAnswer(-1);
      }
    });
  }

  renderStage() {
    this.stopDrill();
    if (!this.drillStage) return;

    if (this.currentMode === 'FLASHCARD') {
      this.renderFlashcardIntro();
    } else if (this.currentMode === 'COUNTDOWN') {
      this.renderCountdownIntro();
    } else if (this.currentMode === 'DECK_ESTIMATION') {
      this.renderDeckEstimationIntro();
    } else if (this.currentMode === 'DEVIATIONS') {
      this.renderDeviationsIntro();
    }
  }

  /* ==================== 模式 1：閃卡速度訓練 ==================== */
  renderFlashcardIntro() {
    this.drillStage.innerHTML = `
      <div class="glass-card" style="text-align: left; max-width: 680px; width: 100%;">
        <div style="text-align: center; margin-bottom: 1.25rem;">
          <h2 style="font-family: var(--font-heading); color: var(--gold-primary); margin-bottom: 0.25rem;">⚡ Hi-Lo 閃卡秒算訓練</h2>
          <p style="color: var(--text-secondary); font-size: 0.9rem;">單張與成對相消極速反射記憶訓練</p>
        </div>

        <!-- 原理與實戰原因解析 -->
        <div style="background: rgba(0,0,0,0.4); border-left: 4px solid var(--cyan-accent); padding: 1rem 1.25rem; border-radius: 0 var(--radius-md) var(--radius-md) 0; margin-bottom: 1.5rem; font-size: 0.88rem; line-height: 1.6;">
          <h4 style="color: var(--cyan-accent); font-family: var(--font-heading); margin-bottom: 0.4rem;">🔬 為什麼要練這個？（背後數學原理）</h4>
          <p style="color: var(--text-primary); margin-bottom: 0.5rem;">
            <b>• 高低牌賦值原理</b>：21 點是「無放回抽樣」遊戲。當低牌（2-6）被發出時，牌靴中剩餘的高牌比例上升，因此低牌賦予 <b>+1</b>；反之高牌（10-A）發出時賦予 <b>-1</b>；中立牌（7-9）對優勢影響微弱賦予 <b>0</b>。
          </p>
          <p style="color: var(--text-primary); margin-bottom: 0.5rem;">
            <b>• 成對相消法 (Pair Cancellation)</b>：賭場發牌極快（每秒 2~3 張）。優勢玩家不會一張一張心算，而是利用雙眼掃描將檯面上的高牌 (-1) 與低牌 (+1) 瞬間抵銷為 0，大幅降低大腦負載。
          </p>
          <p style="color: var(--text-gold);">
            <b>🏆 職業 AP 達標標準</b>：單張反應時間低於 <b>300 毫秒</b>，成對相消準確率達 <b>98% 以上</b>。
          </p>
        </div>

        <div style="display: flex; justify-content: center; gap: 1rem;">
          <button id="btn-start-single-flash" class="btn btn-primary">開始單張秒算 (30題)</button>
          <button id="btn-start-pair-flash" class="btn btn-cyan">開始成對相消測驗</button>
        </div>
      </div>
    `;

    document.getElementById('btn-start-single-flash')?.addEventListener('click', () => this.startFlashcardDrill(false));
    document.getElementById('btn-start-pair-flash')?.addEventListener('click', () => this.startFlashcardDrill(true));
  }

  startFlashcardDrill(isPairMode = false) {
    this.drillActive = true;
    this.isPairMode = isPairMode;
    this.userScore = 0;
    this.totalQuestions = 0;
    this.startTime = Date.now();
    this.nextFlashcardQuestion();
  }

  nextFlashcardQuestion() {
    if (this.totalQuestions >= 30) {
      this.finishFlashcardDrill();
      return;
    }

    this.totalQuestions++;
    const suits = [SUITS.SPADES, SUITS.HEARTS, SUITS.CLUBS, SUITS.DIAMONDS];
    const getRandomCard = () => {
      const s = suits[Math.floor(Math.random() * suits.length)];
      const r = RANKS[Math.floor(Math.random() * RANKS.length)];
      return new Card(s, r);
    };

    if (this.isPairMode) {
      this.currentCards = [getRandomCard(), getRandomCard()];
      this.expectedAnswer = this.currentCards[0].getHiLoValue() + this.currentCards[1].getHiLoValue();
    } else {
      this.currentCards = [getRandomCard()];
      this.expectedAnswer = this.currentCards[0].getHiLoValue();
    }

    this.drillStage.innerHTML = `
      <div style="display: flex; justify-content: space-between; width: 100%; max-width: 480px; margin-bottom: 0.75rem;">
        <span class="stat-label">進度: ${this.totalQuestions} / 30</span>
        <span class="stat-label">得分: <b style="color: var(--color-success);">${this.userScore}</b></span>
      </div>
      <div class="flashcard-display">
        ${this.currentCards.map(c => c.renderDOM(true).outerHTML).join('')}
      </div>
      <div class="counting-keypad">
        <button class="keypad-btn minus" data-val="-1">
          -1
          <span class="subtext">高牌 (10-A)</span>
        </button>
        <button class="keypad-btn zero" data-val="0">
          0
          <span class="subtext">中立 (7-9)</span>
        </button>
        <button class="keypad-btn plus" data-val="1">
          +1
          <span class="subtext">低牌 (2-6)</span>
        </button>
        ${this.isPairMode ? `
          <button class="keypad-btn plus" data-val="2">+2</button>
          <button class="keypad-btn minus" data-val="-2">-2</button>
        ` : ''}
      </div>
    `;

    this.drillStage.querySelectorAll('.keypad-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseInt(btn.dataset.val, 10);
        this.submitFlashcardAnswer(val);
      });
    });
  }

  submitFlashcardAnswer(ans) {
    if (!this.drillActive) return;

    if (ans === this.expectedAnswer) {
      this.userScore++;
      this.sound.playCorrect();
    } else {
      this.sound.playWrong();
    }

    this.nextFlashcardQuestion();
  }

  finishFlashcardDrill() {
    this.drillActive = false;
    const avgMs = ((Date.now() - this.startTime) / 30).toFixed(0);
    const acc = ((this.userScore / 30) * 100).toFixed(1);

    this.analytics.recordCountingDrill('flashcard', acc, avgMs);

    this.drillStage.innerHTML = `
      <div class="glass-card" style="text-align: center; max-width: 520px; width: 100%;">
        <h2 style="font-family: var(--font-heading); color: var(--gold-primary); margin-bottom: 0.5rem;">🎉 測驗完成！</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1.25rem 0;">
          <div class="stat-item">
            <span class="stat-label">準確率</span>
            <span class="stat-value ${acc >= 90 ? 'emerald' : 'gold'}">${acc}%</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">平均反應時間</span>
            <span class="stat-value cyan">${avgMs} ms</span>
          </div>
        </div>

        <div style="background: rgba(0,0,0,0.4); padding: 0.85rem; border-radius: var(--radius-md); font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.25rem;">
          ${avgMs <= 400 && acc >= 90 
            ? '🔥 <b>卓越！</b> 你的辨牌速度已達到賭場 AP 優勢玩家水準！'
            : '💡 <b>建議：</b> 多練習「成對相消」，看到 10+5 直接在大腦中忽略，可大幅降低反應秒數。'}
        </div>

        <button id="btn-retry-flash" class="btn btn-primary">再次挑戰</button>
      </div>
    `;

    document.getElementById('btn-retry-flash')?.addEventListener('click', () => this.startFlashcardDrill(this.isPairMode));
  }

  /* ==================== 模式 2：52 張整副牌倒數挑戰 ==================== */
  renderCountdownIntro() {
    this.drillStage.innerHTML = `
      <div class="glass-card" style="text-align: left; max-width: 680px; width: 100%;">
        <div style="text-align: center; margin-bottom: 1.25rem;">
          <h2 style="font-family: var(--font-heading); color: var(--gold-primary); margin-bottom: 0.25rem;">⏱️ 52張整副牌倒數挑戰</h2>
          <p style="color: var(--text-secondary); font-size: 0.9rem;">MIT 算牌隊入門經典必備考核</p>
        </div>

        <!-- 數學原理與實戰原因 -->
        <div style="background: rgba(0,0,0,0.4); border-left: 4px solid var(--gold-primary); padding: 1rem 1.25rem; border-radius: 0 var(--radius-md) var(--radius-md) 0; margin-bottom: 1.5rem; font-size: 0.88rem; line-height: 1.6;">
          <h4 style="color: var(--gold-primary); font-family: var(--font-heading); margin-bottom: 0.4rem;">🔬 為什麼要練這個？（背後數學原理）</h4>
          <p style="color: var(--text-primary); margin-bottom: 0.5rem;">
            <b>• 平衡系統的零和特性 (Balanced Sum = 0)</b>：在完整 52 張牌中，2~6（20張=+20）與 10~A（20張=-20）嚴格平衡，整副牌的跑數總和<b>必然為 0</b>。
          </p>
          <p style="color: var(--text-primary); margin-bottom: 0.5rem;">
            <b>• 扣牌反推驗證法</b>：當隨機扣下一張牌暗蓋在旁，數完剩餘 51 張牌的 Running Count 為 $+1$ 時，代表被抽走的暗牌價值必定是 $-1$（即高牌 10/J/Q/K/A）。
          </p>
          <p style="color: var(--text-gold);">
            <b>🏆 職業 AP 達標標準</b>：20 秒內連續數完一副牌，且暗牌反推 100% 正確零失誤。
          </p>
        </div>

        <div style="display: flex; justify-content: center; align-items: center; gap: 1rem; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <label class="stat-label">翻牌速度:</label>
            <select id="select-flip-speed" class="form-control" style="width: auto; padding: 0.4rem 0.6rem;">
              <option value="1000">初階速度 (1.0秒/張)</option>
              <option value="600" selected>中階速度 (0.6秒/張)</option>
              <option value="350">AP 職業選手 (0.35秒/張)</option>
            </select>
          </div>
          <button id="btn-start-countdown" class="btn btn-primary">開始倒數發牌</button>
        </div>
      </div>
    `;

    document.getElementById('btn-start-countdown')?.addEventListener('click', () => {
      const speed = parseInt(document.getElementById('select-flip-speed').value, 10);
      this.startCountdownDrill(speed);
    });
  }

  startCountdownDrill(speedMs) {
    this.drillActive = true;
    const deck = new Deck(1, 1.0); // 1副牌
    const cards = [...deck.cards];

    // 抽走 1 張暗牌
    this.hiddenCard = cards.pop();
    this.hiddenCardValue = this.hiddenCard.getHiLoValue();

    let currentCardIndex = 0;
    this.countdownCards = cards;
    this.runningTotal = 0;

    this.drillStage.innerHTML = `
      <div class="stat-label" style="margin-bottom: 0.5rem;">剩餘牌數: <b id="countdown-rem-count" style="color: var(--cyan-accent); font-size: 1.2rem;">${cards.length}</b></div>
      <div id="countdown-card-slot" class="flashcard-display">
        <div class="playing-card face-down"><div class="card-back"><div class="card-back-pattern"></div></div></div>
      </div>
      <p style="color: var(--text-muted); font-size: 0.85rem;">專注心算流水數 (Running Count)...</p>
    `;

    const cardSlot = document.getElementById('countdown-card-slot');
    const remCounter = document.getElementById('countdown-rem-count');

    this.countdownTimer = setInterval(() => {
      if (currentCardIndex >= this.countdownCards.length) {
        clearInterval(this.countdownTimer);
        this.promptCountdownResult();
        return;
      }

      const card = this.countdownCards[currentCardIndex];
      this.runningTotal += card.getHiLoValue();
      if (cardSlot) {
        cardSlot.innerHTML = '';
        cardSlot.appendChild(card.renderDOM(true));
      }
      if (remCounter) remCounter.textContent = this.countdownCards.length - currentCardIndex - 1;
      this.sound.playCardSlide();
      currentCardIndex++;
    }, speedMs);
  }

  promptCountdownResult() {
    this.drillStage.innerHTML = `
      <div class="glass-card" style="text-align: center; max-width: 480px; width: 100%;">
        <h3 style="font-family: var(--font-heading); color: var(--gold-primary); margin-bottom: 0.5rem;">🏁 51 張牌發牌完畢！</h3>
        <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 1.25rem;">整副 52 張總和必為 0，請輸入你算得的最終 Running Count：</p>
        <div class="form-group" style="margin-bottom: 1.25rem;">
          <input type="number" id="input-final-rc" class="form-control" style="font-size: 1.5rem; text-align: center;" placeholder="例如: +1 或 -1">
        </div>
        <button id="btn-submit-countdown-rc" class="btn btn-primary" style="width: 100%;">驗證答案並揭曉暗牌</button>
      </div>
    `;

    const inputRC = document.getElementById('input-final-rc');
    const submitRC = () => {
      const valStr = inputRC?.value.trim();
      if (!valStr || isNaN(parseInt(valStr, 10))) {
        alert('⚠️ 請輸入算得的最終 Running Count (流水數整數值)！');
        inputRC?.focus();
        return;
      }
      const userRC = parseInt(valStr, 10);
      const isCorrect = (userRC === this.runningTotal);

      if (isCorrect) this.sound.playWin();
      else this.sound.playWrong();

      const expectedHiddenTag = -this.runningTotal;

      this.drillStage.innerHTML = `
        <div class="glass-card" style="text-align: center; max-width: 520px; width: 100%;">
          <h2 style="color: ${isCorrect ? 'var(--color-success)' : 'var(--color-danger)'}; margin-bottom: 0.75rem;">
            ${isCorrect ? '✅ 跑數完全正確！' : '❌ 跑數計算有誤！'}
          </h2>
          <p style="font-size: 1.05rem; margin-bottom: 1rem;">
            你的跑數: <b>${userRC}</b> | 正確跑數: <b>${this.runningTotal}</b>
          </p>
          <div style="background: rgba(0,0,0,0.4); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.25rem; border: 1px solid var(--border-glass);">
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 0.5rem;">
              根據零和原理反推暗牌標籤（反轉符號：-(${this.runningTotal}) = <b>${expectedHiddenTag > 0 ? `+${expectedHiddenTag}` : expectedHiddenTag}</b>）：
            </p>
            <div style="display: flex; justify-content: center; margin-bottom: 0.5rem;">
              ${this.hiddenCard.renderDOM(true).outerHTML}
            </div>
            <span style="font-size: 0.8rem; color: var(--gold-primary);">
              牌面為【${this.hiddenCard.rank}】，Hi-Lo 賦值正是 ${this.hiddenCard.getHiLoValue() > 0 ? `+${this.hiddenCard.getHiLoValue()}` : this.hiddenCard.getHiLoValue()}
            </span>
          </div>
          <button id="btn-retry-countdown" class="btn btn-primary">再次挑戰</button>
        </div>
      `;

      document.getElementById('btn-retry-countdown')?.addEventListener('click', () => this.renderCountdownIntro());
    };

    document.getElementById('btn-submit-countdown-rc')?.addEventListener('click', submitRC);
    inputRC?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitRC();
    });
    inputRC?.focus();
  }

  /* ==================== 模式 3：牌靴厚度與真數折算 ==================== */
  renderDeckEstimationIntro() {
    const rc = Math.floor(Math.random() * 15) - 7; // -7 ~ +7
    const remainingDecks = (Math.floor(Math.random() * 6) + 1) * 0.5; // 0.5 ~ 3.5 副
    const expectedTC = Math.round(rc / remainingDecks);

    this.drillStage.innerHTML = `
      <div class="glass-card" style="text-align: left; max-width: 680px; width: 100%;">
        <div style="text-align: center; margin-bottom: 1.25rem;">
          <h2 style="font-family: var(--font-heading); color: var(--cyan-accent); margin-bottom: 0.25rem;">📐 牌靴厚度與真數折算測驗</h2>
          <p style="color: var(--text-secondary); font-size: 0.9rem;">將流水數 (RC) 轉化為真實優勢 (TC) 的關鍵心算</p>
        </div>

        <!-- 數學原理說明 (HTML 公式卡片) -->
        <div style="background: rgba(0,0,0,0.4); border-left: 4px solid var(--color-success); padding: 1rem 1.25rem; border-radius: 0 var(--radius-md) var(--radius-md) 0; margin-bottom: 1.5rem; font-size: 0.88rem; line-height: 1.6;">
          <h4 style="color: var(--color-success); font-family: var(--font-heading); margin-bottom: 0.4rem;">🔬 為什麼要折算真數 (True Count)？</h4>
          <p style="color: var(--text-primary); margin-bottom: 0.5rem;">
            <b>• 稀釋效應 (Dilution Effect)</b>：在 6 副牌剛開始時，流水數 +6 平均分散在 6 副牌中，每副只有 +1，優勢微乎其微；但在發到只剩 1 副牌時，同樣的流水數 +6 代表剩下 52 張牌中有多達 6 張額外高牌，優勢高達 +3.0%！
          </p>
          
          <!-- 漂亮的 HTML/CSS 數學公式框 -->
          <div style="display: flex; justify-content: center; margin: 0.75rem 0;">
            <div class="math-formula-box">
              <span class="math-var">True Count (TC)</span>
              <span class="math-equal">=</span>
              <div class="math-fraction">
                <span class="math-numerator">Running Count (RC 流水數)</span>
                <div class="math-frac-line"></div>
                <span class="math-denominator">剩餘未發副數 (Remaining Decks)</span>
              </div>
            </div>
          </div>

          <p style="color: var(--text-gold);">
            <b>🏆 實戰技巧</b>：在賭場觀察棄牌盒厚度（Discard Tray），以 0.5 副為顆粒度快速四捨五入折算 TC。
          </p>
        </div>

        <div style="text-align: center; margin-bottom: 1.25rem;">
          <p style="color: var(--text-secondary); font-size: 1rem; margin-bottom: 0.75rem;">
            當前流水數 (RC) 為 <b style="color: var(--gold-primary); font-size: 1.4rem;">${rc > 0 ? `+${rc}` : rc}</b>
          </p>

          <div class="shoe-estimation-visual" style="justify-content: center;">
            <div class="discard-tray-visual">
              <div class="tray-cards-stack" style="height: ${(6 - remainingDecks) * 25}px;"></div>
            </div>
            <div style="text-align: left;">
              <span class="stat-label">棄牌盒已發牌視覺估計</span>
              <p style="font-size: 1.2rem; font-weight: 700; color: #fff;">剩餘未發：約 <b style="color: var(--cyan-accent);">${remainingDecks}</b> 副牌</p>
            </div>
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 1.25rem;">
          <label class="form-label" style="text-align: center; display: block;">請輸入換算後的 True Count (真數):</label>
          <input type="number" id="input-tc-answer" class="form-control" style="font-size: 1.4rem; text-align: center; max-width: 280px; margin: 0 auto;" placeholder="輸入整數 TC">
        </div>

        <div style="text-align: center;">
          <button id="btn-submit-tc" class="btn btn-cyan" style="padding: 0.65rem 2rem;">驗收真數答案</button>
        </div>
      </div>
    `;

    const inputTC = document.getElementById('input-tc-answer');
    const submitTC = () => {
      const valStr = inputTC?.value.trim();
      if (!valStr || isNaN(parseInt(valStr, 10))) {
        alert('⚠️ 請輸入計算後的 True Count (真數整數值)！');
        inputTC?.focus();
        return;
      }
      const userTC = parseInt(valStr, 10);
      const isCorrect = userTC === expectedTC;

      if (isCorrect) this.sound.playCorrect();
      else this.sound.playWrong();

      alert(isCorrect 
        ? `🎉 答對了！\n計算公式: ${rc} / ${remainingDecks} = ${(rc/remainingDecks).toFixed(2)} -> 四捨五入為 ${expectedTC}`
        : `❌ 算錯了！\n正確計算: ${rc} / ${remainingDecks} = ${(rc/remainingDecks).toFixed(2)} -> 四捨五入應為 ${expectedTC}`
      );
      this.renderDeckEstimationIntro();
    };

    document.getElementById('btn-submit-tc')?.addEventListener('click', submitTC);
    inputTC?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitTC();
    });
    inputTC?.focus();
  }

  /* ==================== 模式 4：Illustrious 18 偏差測驗 ==================== */
  renderDeviationsIntro() {
    const i18List = [
      {
        player: '16 (硬牌)',
        dealer: '10',
        tc: '+1',
        optimal: 'S',
        base: 'Hit (要牌)',
        why: '【I18 排名 #2 偏差】基本策略中 16 vs 10 應要牌 (Hit)；但在 TC ≥ 0 時，牌靴高牌比例高，莊家拿 10/12~16 爆牌率提升，且玩家要牌爆牌率大增，停牌 (Stand) 期望值高於要牌！'
      },
      {
        player: '15 (硬牌)',
        dealer: '10',
        tc: '+4',
        optimal: 'S',
        base: 'Hit (要牌)',
        why: '【I18 排名 #3 偏差】當 TC ≥ +4 時，牌靴充斥極高比例的 10 點牌，莊家爆牌率激增，此時 15 點選擇停牌 (Stand) 優於要牌。'
      },
      {
        player: '12 (硬牌)',
        dealer: '3',
        tc: '+2',
        optimal: 'S',
        base: 'Hit (要牌)',
        why: '【I18 排名 #7 偏差】基本策略 12 遇 3 必須要牌；但在 TC ≥ +2 時，莊家面牌 3 爆牌機率大幅提升，玩家 12 點應改為停牌 (Stand)。'
      },
      {
        player: '12 (硬牌)',
        dealer: '2',
        tc: '+3',
        optimal: 'S',
        base: 'Hit (要牌)',
        why: '【I18 排名 #8 偏差】基本策略 12 遇 2 應要牌；但在 TC ≥ +3 時，高牌剩餘多，莊家 2 點補成爆牌期望值大增，玩家應改為停牌 (Stand)。'
      },
      {
        player: 'Pair 10,10 (20點)',
        dealer: '5',
        tc: '+5',
        optimal: 'P',
        base: 'Stand (停牌)',
        why: '【I18 排名 #4 偏差】一般絕不拆 20 點；但在極端高真數 (TC ≥ +5) 下，拆成兩門 10 抽到 20/21 點的機率極高，且莊家 5 點爆牌率超高，分牌 (Split) 期望值超越停牌！'
      },
      {
        player: 'Hard 10',
        dealer: '10',
        tc: '+4',
        optimal: 'D',
        base: 'Hit (要牌)',
        why: '【I18 排名 #6 偏差】基本策略 10 遇 10 僅要牌；但在 TC ≥ +4 時，抽到 10 達成 20 點機率極高，加倍下注 (Double) 能放大期望利潤。'
      }
    ];

    const item = i18List[Math.floor(Math.random() * i18List.length)];

    this.drillStage.innerHTML = `
      <div class="glass-card" style="text-align: left; max-width: 680px; width: 100%;">
        <div style="text-align: center; margin-bottom: 1.25rem;">
          <h2 style="font-family: var(--font-heading); color: var(--gold-primary); margin-bottom: 0.25rem;">👑 Illustrious 18 策略偏差測驗</h2>
          <p style="color: var(--text-secondary); font-size: 0.9rem;">優勢玩家捕獲 85% 超額博弈利潤的核心關鍵</p>
        </div>

        <!-- 數學原理說明 -->
        <div style="background: rgba(0,0,0,0.4); border-left: 4px solid var(--gold-primary); padding: 0.85rem 1.25rem; border-radius: 0 var(--radius-md) var(--radius-md) 0; margin-bottom: 1.25rem; font-size: 0.85rem; line-height: 1.5;">
          <h4 style="color: var(--gold-primary); font-family: var(--font-heading); margin-bottom: 0.3rem;">🔬 為什麼需要策略偏差 (Index Play)？</h4>
          <p style="color: var(--text-primary);">
            基本策略是基於中立牌靴（<b>TC = 0</b>）時的靜態解。當真數偏高或偏低時，牌靴高牌分佈改變，偏離基本策略的決策能為玩家帶來額外的正期望值。
          </p>
        </div>

        <div style="background: rgba(15,23,42,0.85); border: 1px solid var(--border-glass-bright); padding: 1.25rem; border-radius: var(--radius-md); margin-bottom: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <span style="font-size: 1.05rem;">玩家手牌：<b style="color: #fff;">${item.player}</b></span>
            <span style="font-size: 1.05rem;">莊家明牌：<b style="color: var(--gold-primary);">${item.dealer}</b></span>
          </div>
          <p style="font-size: 1.1rem; color: var(--cyan-accent); font-family: var(--font-mono); margin-top: 0.5rem;">
            當前 True Count (真數): <b>${item.tc}</b>
          </p>
        </div>

        <p style="color: var(--text-secondary); margin-bottom: 1rem; text-align: center;">在當前真數下，你的最佳進階決策是？</p>

        <div class="action-grid" style="margin: 0 auto 1.5rem auto;">
          <button class="action-opt-btn act-h" data-act="H">Hit (要牌)</button>
          <button class="action-opt-btn act-s" data-act="S">Stand (停牌)</button>
          <button class="action-opt-btn act-d" data-act="D">Double (加倍)</button>
          <button class="action-opt-btn act-p" data-act="P">Split (分牌)</button>
        </div>
      </div>
    `;

    this.drillStage.querySelectorAll('.action-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const act = btn.dataset.act;
        const isCorrect = act === item.optimal;
        if (isCorrect) this.sound.playCorrect();
        else this.sound.playWrong();

        alert(isCorrect 
          ? `✅ 答對了！\n${item.why}`
          : `❌ 答錯了！\n基本策略原本為 ${item.base}，但在當前真數偏差下：\n${item.why}`
        );
        this.renderDeviationsIntro();
      });
    });
  }

  stopDrill() {
    this.drillActive = false;
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }
}
