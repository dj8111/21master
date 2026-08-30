/**
 * TableSimulator.js - 21點專業模擬檯面 (支援0~4位AI玩家、嚴格順序發牌與補牌、結算確認清空檯面)
 */
import { Deck } from '../engine/Deck.js';
import { StrategyEngine } from '../engine/StrategyEngine.js';
import { CountingEngine } from '../engine/CountingEngine.js';

export class TableSimulator {
  constructor(soundEngine, analytics) {
    this.sound = soundEngine;
    this.analytics = analytics;

    // 賭規設定
    this.rules = {
      numDecks: 6,
      penetration: 0.75,
      dealerHitsSoft17: false, // S17
      doubleAfterSplit: true,
      lateSurrender: true,
      blackjackPayout: 1.5, // 3:2
      countingSystem: 'HILO'
    };

    // 玩家與賭桌狀態
    this.bankroll = 1000;
    this.currentBet = 0; // 當前局下注
    this.lastBet = 25; // 記錄上一把下注金額以便 Rebet
    this.selectedChip = 25;
    this.gameState = 'BETTING'; // 'BETTING', 'DEALING', 'SEATS_TURN', 'DEALER_TURN', 'ROUND_OVER'
    this.coachMode = false; // 預設關閉教練模式
    this.showHUD = false; // 預設關閉算牌 HUD
    this.aiPlayerCount = 0; // 0~4 位 AI 玩家

    // 座位與手牌模型
    this.seats = [];
    this.playerSeatIndex = 0;
    this.activeSeatIndex = -1;
    this.dealerCards = [];

    this.deck = new Deck(this.rules.numDecks, this.rules.penetration);
    this.counter = new CountingEngine(this.rules.numDecks, this.rules.countingSystem);

    this.initDOM();
    this.setupSeats();
    this.bindEvents();
    this.updateHUD();
    this.render();
  }

  initDOM() {
    this.elBankroll = document.getElementById('table-bankroll');
    this.elCurrentBet = document.getElementById('table-current-bet');
    this.elDealerCards = document.getElementById('dealer-cards');
    this.elDealerBadge = document.getElementById('dealer-hand-badge');
    this.elSeatsContainer = document.getElementById('table-seats-container');
    this.elShoeFill = document.getElementById('shoe-fill-bar');
    this.elShoeDecksText = document.getElementById('shoe-decks-text');
    this.elBetSpot = document.getElementById('table-betting-spot');
    this.elBetChipsStack = document.getElementById('bet-chips-stack');

    // 結算結果卡片元素
    this.elResultOverlay = document.getElementById('round-result-overlay');
    this.elResultIcon = document.getElementById('result-icon-large');
    this.elResultTitle = document.getElementById('result-title-large');
    this.elResultDesc = document.getElementById('result-desc-large');
    this.elResultPayout = document.getElementById('result-payout-tag');
    this.btnNextRoundConfirm = document.getElementById('btn-next-round-confirm');

    // HUD 元素
    this.elHudPanel = document.getElementById('counting-hud-panel');
    this.elHudRC = document.getElementById('hud-running-count');
    this.elHudTC = document.getElementById('hud-true-count');
    this.elHudLowRatio = document.getElementById('hud-low-ratio');
    this.elHudHighRatio = document.getElementById('hud-high-ratio');
    this.elHudSuggestedBet = document.getElementById('hud-suggested-bet');

    // 教練指示牌元素
    this.elCoachBanner = document.getElementById('coach-live-banner');
    this.elCoachRecAction = document.getElementById('coach-rec-action');
    this.elCoachRecReason = document.getElementById('coach-rec-reason');
    this.elCoachStatusText = document.getElementById('coach-status-text');

    // 控制與按鈕
    this.btnDeal = document.getElementById('btn-deal');
    this.btnClearBet = document.getElementById('btn-clear-bet');
    this.btnRebet = document.getElementById('btn-rebet');
    this.btnDoubleBet = document.getElementById('btn-double-bet');
    this.btnHit = document.getElementById('btn-hit');
    this.btnStand = document.getElementById('btn-stand');
    this.btnDouble = document.getElementById('btn-double');
    this.btnSplit = document.getElementById('btn-split');
    this.btnSurrender = document.getElementById('btn-surrender');
    this.btnHint = document.getElementById('btn-hint');
    this.btnToggleHUD = document.getElementById('btn-toggle-hud');
    this.btnToggleCoach = document.getElementById('btn-toggle-coach');
    this.selectAICount = document.getElementById('select-ai-count');

    this.chipButtons = document.querySelectorAll('.chip-selector');
  }

  /**
   * 根據 AI 人數分配座位配置
   */
  setupSeats() {
    this.seats = [];
    const aiCount = this.aiPlayerCount;
    const aiNames = ['老王 (穩健)', '小陳 (衝動)', '大衛 (保守)', '艾米 (算牌手)'];

    if (aiCount === 0) {
      // 單人本家
      this.playerSeatIndex = 0;
      this.seats.push({ isAI: false, name: '玩家 (本家)', cards: [], bet: 0, status: 'WAITING' });
    } else if (aiCount === 1) {
      // 1 AI + 1 玩家
      this.playerSeatIndex = 1;
      this.seats.push({ isAI: true, name: aiNames[0], cards: [], bet: 25, status: 'WAITING' });
      this.seats.push({ isAI: false, name: '玩家 (本家)', cards: [], bet: 0, status: 'WAITING' });
    } else if (aiCount === 2) {
      // 1 AI + 1 玩家 + 1 AI
      this.playerSeatIndex = 1;
      this.seats.push({ isAI: true, name: aiNames[0], cards: [], bet: 25, status: 'WAITING' });
      this.seats.push({ isAI: false, name: '玩家 (本家)', cards: [], bet: 0, status: 'WAITING' });
      this.seats.push({ isAI: true, name: aiNames[1], cards: [], bet: 25, status: 'WAITING' });
    } else if (aiCount === 3) {
      // 2 AI + 1 玩家 + 1 AI
      this.playerSeatIndex = 2;
      this.seats.push({ isAI: true, name: aiNames[0], cards: [], bet: 25, status: 'WAITING' });
      this.seats.push({ isAI: true, name: aiNames[1], cards: [], bet: 25, status: 'WAITING' });
      this.seats.push({ isAI: false, name: '玩家 (本家)', cards: [], bet: 0, status: 'WAITING' });
      this.seats.push({ isAI: true, name: aiNames[2], cards: [], bet: 25, status: 'WAITING' });
    } else {
      // 2 AI + 1 玩家 + 2 AI (滿桌5人)
      this.playerSeatIndex = 2;
      this.seats.push({ isAI: true, name: aiNames[0], cards: [], bet: 25, status: 'WAITING' });
      this.seats.push({ isAI: true, name: aiNames[1], cards: [], bet: 25, status: 'WAITING' });
      this.seats.push({ isAI: false, name: '玩家 (本家)', cards: [], bet: 0, status: 'WAITING' });
      this.seats.push({ isAI: true, name: aiNames[2], cards: [], bet: 25, status: 'WAITING' });
      this.seats.push({ isAI: true, name: aiNames[3], cards: [], bet: 25, status: 'WAITING' });
    }
  }

  bindEvents() {
    this.btnDeal?.addEventListener('click', () => this.startDeal());
    this.btnClearBet?.addEventListener('click', () => this.clearBet());
    this.btnRebet?.addEventListener('click', () => this.rebet());
    this.btnDoubleBet?.addEventListener('click', () => this.doublePreBet());

    this.btnHit?.addEventListener('click', () => this.handlePlayerAction('H'));
    this.btnStand?.addEventListener('click', () => this.handlePlayerAction('S'));
    this.btnDouble?.addEventListener('click', () => this.handlePlayerAction('D'));
    this.btnSplit?.addEventListener('click', () => this.handlePlayerAction('P'));
    this.btnSurrender?.addEventListener('click', () => this.handlePlayerAction('R'));
    this.btnHint?.addEventListener('click', () => this.showHintToast());

    // 結算確認按鈕
    this.btnNextRoundConfirm?.addEventListener('click', () => this.confirmAndClearTable());

    this.btnToggleHUD?.addEventListener('click', () => {
      this.showHUD = !this.showHUD;
      if (this.elHudPanel) {
        this.elHudPanel.style.display = this.showHUD ? 'grid' : 'none';
      }
      this.btnToggleHUD.classList.toggle('active', this.showHUD);
      this.btnToggleHUD.textContent = this.showHUD ? '👁️ 算牌 HUD (開啟)' : '👁️ 算牌 HUD (關閉)';
    });

    this.btnToggleCoach?.addEventListener('click', () => {
      this.coachMode = !this.coachMode;
      this.btnToggleCoach.classList.toggle('active', this.coachMode);
      if (this.elCoachStatusText) {
        this.elCoachStatusText.textContent = this.coachMode ? '開啟' : '關閉';
      }
      const dot = this.btnToggleCoach.querySelector('.coach-status-dot');
      if (dot) dot.classList.toggle('off', !this.coachMode);
      this.renderCoachGuidance();
    });

    // 選擇 AI 人數 (0~4人)
    this.selectAICount?.addEventListener('change', (e) => {
      if (this.gameState !== 'BETTING') {
        alert('請在下注階段切換 AI 玩家人數！');
        this.selectAICount.value = this.aiPlayerCount;
        return;
      }
      this.aiPlayerCount = parseInt(e.target.value, 10);
      this.setupSeats();
      this.render();
      this.showToast(`👥 已設定同桌 AI 玩家人數為 ${this.aiPlayerCount} 位`, 'info');
    });

    // 點擊籌碼選擇器
    this.chipButtons?.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseInt(btn.dataset.value, 10);
        this.selectedChip = val;
        this.chipButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.addBet(val);
      });
    });

    // 點擊中央下注圈增加籌碼
    this.elBetSpot?.addEventListener('click', () => {
      this.addBet(this.selectedChip);
    });

    // 鍵盤快速鍵支援
    window.addEventListener('keydown', (e) => {
      if (!document.querySelector('.tab-pane#pane-table.active')) return;
      const key = e.key.toUpperCase();

      if (this.gameState === 'ROUND_OVER') {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          this.confirmAndClearTable();
        }
      } else if (this.gameState === 'BETTING') {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          this.startDeal();
        } else if (key === 'C') {
          this.clearBet();
        } else if (key === 'R') {
          this.rebet();
        }
      } else if (this.gameState === 'SEATS_TURN' && this.activeSeatIndex === this.playerSeatIndex) {
        if (key === 'H') this.handlePlayerAction('H');
        if (key === 'S') this.handlePlayerAction('S');
        if (key === 'D') this.handlePlayerAction('D');
        if (key === 'P') this.handlePlayerAction('P');
        if (key === 'R') this.handlePlayerAction('R');
      }
    });
  }

  addBet(amount) {
    if (this.gameState !== 'BETTING') return;
    if (this.bankroll >= this.currentBet + amount) {
      this.currentBet += amount;
      this.sound.playChipClink();
      this.render();
    } else {
      this.showToast('餘額不足，無法再增加下注！', 'mistake');
    }
  }

  clearBet() {
    if (this.gameState !== 'BETTING') return;
    this.currentBet = 0;
    this.sound.playChipClink();
    this.render();
  }

  rebet() {
    if (this.gameState !== 'BETTING') return;
    if (this.lastBet > 0 && this.bankroll >= this.lastBet) {
      this.currentBet = this.lastBet;
      this.sound.playChipClink();
      this.render();
    } else {
      this.showToast('餘額不足或無歷史注額記錄！', 'mistake');
    }
  }

  doublePreBet() {
    if (this.gameState !== 'BETTING') return;
    const target = (this.currentBet === 0 ? this.selectedChip * 2 : this.currentBet * 2);
    if (this.bankroll >= target) {
      this.currentBet = target;
      this.sound.playChipClink();
      this.render();
    } else {
      this.showToast('餘額不足以翻倍！', 'mistake');
    }
  }

  /**
   * 開始新回合：嚴格依順序發牌
   * 順序：第一輪 Seat 0..N -> Dealer(Up)；第二輪 Seat 0..N -> Dealer(Down)
   */
  startDeal() {
    if (this.gameState !== 'BETTING') return;
    if (this.currentBet <= 0) {
      this.showToast('請先點擊籌碼下注後再發牌！', 'hint');
      return;
    }
    if (this.bankroll < this.currentBet) {
      this.showToast('籌碼餘額不足！', 'mistake');
      return;
    }

    this.lastBet = this.currentBet;
    this.bankroll -= this.currentBet;
    this.gameState = 'DEALING';
    this.dealerCards = [];
    this.activeSeatIndex = -1;

    // 清空重設所有座位卡牌與狀態
    this.seats.forEach((seat, idx) => {
      seat.cards = [];
      seat.status = 'PLAYING';
      seat.bet = (idx === this.playerSeatIndex) ? this.currentBet : (Math.floor(Math.random() * 3) + 1) * 25;
    });

    if (this.deck.needsReshuffle) {
      this.deck.initShoe();
      this.counter.initSystem();
      this.showToast('牌靴已達切牌深度，已重新洗牌！', 'info');
    }

    this.render();

    // 建立嚴格順序發牌佇列
    const dealSequence = [];

    // 第一輪：各座位發 1 張明牌
    this.seats.forEach((_, seatIdx) => {
      dealSequence.push({ type: 'SEAT', seatIdx, faceUp: true });
    });
    // 莊家第 1 張明牌
    dealSequence.push({ type: 'DEALER', faceUp: true });

    // 第二輪：各座位發第 2 張明牌
    this.seats.forEach((_, seatIdx) => {
      dealSequence.push({ type: 'SEAT', seatIdx, faceUp: true });
    });
    // 莊家第 2 張暗牌
    dealSequence.push({ type: 'DEALER', faceUp: false });

    let step = 0;
    const processDealStep = () => {
      if (step >= dealSequence.length) {
        // 發牌完成，進入座位依序補牌階段
        this.gameState = 'SEATS_TURN';
        this.updateHUD();
        this.render();
        this.startNextSeatTurn(0);
        return;
      }

      const item = dealSequence[step];
      const card = this.deck.deal();

      if (item.type === 'SEAT') {
        this.seats[item.seatIdx].cards.push(card);
        this.counter.processCard(card);
      } else {
        this.dealerCards.push(card);
        if (item.faceUp) {
          this.counter.processCard(card);
        }
      }

      this.sound.playCardSlide();
      this.updateHUD();
      this.render();
      step++;
      setTimeout(processDealStep, 160);
    };

    setTimeout(processDealStep, 100);
  }

  /**
   * 嚴格依順序補牌 (從 Seat 0 開始，依序交棒給下一座位)
   */
  startNextSeatTurn(seatIndex) {
    if (seatIndex >= this.seats.length) {
      // 所有座位皆完成行動，換莊家補牌
      this.runDealerTurn();
      return;
    }

    this.activeSeatIndex = seatIndex;
    const currentSeat = this.seats[seatIndex];
    this.render();

    // 檢查此座位是否一開始就拿到 Natural Blackjack
    const evalHand = StrategyEngine.evaluateHand(currentSeat.cards);
    if (evalHand.isBlackjack) {
      currentSeat.status = 'BLACKJACK';
      this.render();
      setTimeout(() => this.startNextSeatTurn(seatIndex + 1), 600);
      return;
    }

    if (currentSeat.isAI) {
      // AI 玩家回合：自動模擬補牌
      this.processAITurn(seatIndex);
    } else {
      // 玩家本家回合：開放按鈕，等待使用者互動
      this.renderCoachGuidance();
    }
  }

  /**
   * AI 玩家模擬行動 (依不同性格決策)
   */
  processAITurn(seatIndex) {
    const seat = this.seats[seatIndex];

    const aiStep = () => {
      const evalH = StrategyEngine.evaluateHand(seat.cards);
      if (evalH.total >= 21) {
        seat.status = (evalH.total === 21) ? 'STAND' : 'BUST';
        this.render();
        setTimeout(() => this.startNextSeatTurn(seatIndex + 1), 400);
        return;
      }

      // 決策邏輯 (小於 16 要牌，16/17 依莊家明牌微調)
      const dealerUp = this.dealerCards[0];
      const shouldHit = evalH.total < 16 || (evalH.total === 16 && dealerUp && dealerUp.getValue() >= 7);

      if (shouldHit) {
        const card = this.deck.deal();
        seat.cards.push(card);
        this.counter.processCard(card);
        this.sound.playCardSlide();
        this.updateHUD();
        this.render();
        setTimeout(aiStep, 450);
      } else {
        seat.status = 'STAND';
        this.sound.playKnock();
        this.render();
        setTimeout(() => this.startNextSeatTurn(seatIndex + 1), 400);
      }
    };

    setTimeout(aiStep, 400);
  }

  /**
   * 玩家本家操作行動
   */
  handlePlayerAction(action) {
    if (this.gameState !== 'SEATS_TURN' || this.activeSeatIndex !== this.playerSeatIndex) return;

    const playerSeat = this.seats[this.playerSeatIndex];
    const dealerUp = this.dealerCards[0];
    const remainingDecks = this.deck.getRemainingDecks();
    const tc = this.counter.getTrueCount(remainingDecks);
    const optimal = StrategyEngine.getOptimalDecision(playerSeat.cards, dealerUp, tc, this.rules);

    // 記錄決策準確度
    const isCorrect = (action === optimal.action || (action === 'H' && optimal.action === 'D'));
    this.analytics.recordDecision(isCorrect, isCorrect ? '' : `手牌: ${playerSeat.cards.map(c=>c.rank).join(',')} vs 莊家: ${dealerUp.rank}。建議: ${optimal.action} (${optimal.reason})`);

    if (!isCorrect && this.coachMode) {
      this.showMistakeToast(action, optimal);
      this.sound.playWrong();
    }

    if (action === 'H') {
      const card = this.deck.deal();
      playerSeat.cards.push(card);
      this.counter.processCard(card);
      this.sound.playCardSlide();

      const evalH = StrategyEngine.evaluateHand(playerSeat.cards);
      if (evalH.total >= 21) {
        playerSeat.status = (evalH.total === 21) ? 'STAND' : 'BUST';
        this.updateHUD();
        this.render();
        setTimeout(() => this.startNextSeatTurn(this.playerSeatIndex + 1), 500);
      } else {
        this.updateHUD();
        this.render();
      }
    } else if (action === 'S') {
      playerSeat.status = 'STAND';
      this.sound.playKnock();
      this.render();
      setTimeout(() => this.startNextSeatTurn(this.playerSeatIndex + 1), 400);
    } else if (action === 'D') {
      if (this.bankroll >= this.currentBet) {
        this.bankroll -= this.currentBet;
        this.currentBet *= 2;
        playerSeat.bet = this.currentBet;
        this.sound.playChipClink();

        const card = this.deck.deal();
        playerSeat.cards.push(card);
        this.counter.processCard(card);
        this.sound.playCardSlide();

        const evalH = StrategyEngine.evaluateHand(playerSeat.cards);
        playerSeat.status = (evalH.total > 21) ? 'BUST' : 'STAND';
        this.updateHUD();
        this.render();
        setTimeout(() => this.startNextSeatTurn(this.playerSeatIndex + 1), 500);
      } else {
        this.showToast('餘額不足，無法加倍！', 'mistake');
      }
    } else if (action === 'R') {
      playerSeat.status = 'SURRENDER';
      this.bankroll += Math.floor(this.currentBet / 2);
      this.render();
      setTimeout(() => this.startNextSeatTurn(this.playerSeatIndex + 1), 400);
    } else if (action === 'P') {
      this.showToast('分牌目前以主手牌繼續進行', 'info');
      this.handlePlayerAction('H');
    }
  }

  /**
   * 莊家回合：翻開暗牌並補牌至 17 點以上
   */
  runDealerTurn() {
    this.gameState = 'DEALER_TURN';
    this.activeSeatIndex = -1;

    // 翻開暗牌並計入算牌
    if (this.dealerCards.length >= 2) {
      this.counter.processCard(this.dealerCards[1]);
    }
    this.updateHUD();
    this.render();

    const dealerStep = () => {
      let evalDealer = StrategyEngine.evaluateHand(this.dealerCards);
      const mustHit = this.rules.dealerHitsSoft17 
        ? (evalDealer.total < 17 || (evalDealer.total === 17 && evalDealer.isSoft))
        : (evalDealer.total < 17);

      if (mustHit) {
        const card = this.deck.deal();
        this.dealerCards.push(card);
        this.counter.processCard(card);
        this.sound.playCardSlide();
        this.updateHUD();
        this.render();
        setTimeout(dealerStep, 450);
      } else {
        this.resolveRoundResults();
      }
    };

    setTimeout(dealerStep, 500);
  }

  /**
   * 結算所有座位與莊家之勝負，並彈出結果確認浮層
   */
  resolveRoundResults() {
    this.gameState = 'ROUND_OVER';
    const dEval = StrategyEngine.evaluateHand(this.dealerCards);
    const pSeat = this.seats[this.playerSeatIndex];
    const pEval = StrategyEngine.evaluateHand(pSeat.cards);

    let resultTitle = '';
    let resultDesc = '';
    let payoutText = '';
    let payoutClass = 'win';
    let icon = '🎉';

    if (pSeat.status === 'SURRENDER') {
      resultTitle = '投降 (Surrender)';
      resultDesc = '你選擇了遲投降，收回 50% 籌碼本金。';
      payoutText = `-$${Math.floor(this.currentBet / 2)}`;
      payoutClass = 'lose';
      icon = '🏳️';
    } else if (pSeat.status === 'BUST' || pEval.total > 21) {
      resultTitle = '玩家爆牌 (Bust)！';
      resultDesc = `手牌點數達 ${pEval.total} 點超過 21 點。`;
      payoutText = `-$${this.currentBet}`;
      payoutClass = 'lose';
      icon = '💥';
      this.sound.playWrong();
    } else if (pSeat.status === 'BLACKJACK' || pEval.isBlackjack) {
      if (dEval.isBlackjack) {
        this.bankroll += this.currentBet;
        resultTitle = '雙方皆為 Blackjack (Push)！';
        resultDesc = '雙方首兩張皆為 21 點，平手退回注碼。';
        payoutText = '$0';
        payoutClass = 'push';
        icon = '🤝';
      } else {
        const winAmount = Math.floor(this.currentBet * this.rules.blackjackPayout);
        this.bankroll += this.currentBet + winAmount;
        resultTitle = '🔥 Natural Blackjack 3:2 獲勝！';
        resultDesc = `天生 21 點！獲得 1.5 倍賠率獎金。`;
        payoutText = `+$${winAmount}`;
        payoutClass = 'win';
        icon = '👑';
        this.sound.playWin();
      }
    } else if (dEval.total > 21) {
      this.bankroll += this.currentBet * 2;
      resultTitle = '莊家爆牌 (Dealer Bust)！';
      resultDesc = `莊家補牌至 ${dEval.total} 點爆牌，玩家獲勝！`;
      payoutText = `+$${this.currentBet}`;
      payoutClass = 'win';
      icon = '🏆';
      this.sound.playWin();
    } else if (pEval.total > dEval.total) {
      this.bankroll += this.currentBet * 2;
      resultTitle = '玩家點數大 獲勝！';
      resultDesc = `玩家 (${pEval.total} 點) 擊敗 莊家 (${dEval.total} 點)！`;
      payoutText = `+$${this.currentBet}`;
      payoutClass = 'win';
      icon = '🎉';
      this.sound.playWin();
    } else if (pEval.total === dEval.total) {
      this.bankroll += this.currentBet;
      resultTitle = '平手 (Push)！';
      resultDesc = `雙方點數皆為 ${pEval.total} 點，退回注碼。`;
      payoutText = '$0';
      payoutClass = 'push';
      icon = '🤝';
    } else {
      resultTitle = '莊家獲勝！';
      resultDesc = `莊家 (${dEval.total} 點) 贏過 玩家 (${pEval.total} 點)。`;
      payoutText = `-$${this.currentBet}`;
      payoutClass = 'lose';
      icon = '💀';
      this.sound.playWrong();
    }

    this.showResultOverlay(icon, resultTitle, resultDesc, payoutText, payoutClass);
    this.updateHUD();
    this.render();
  }

  showResultOverlay(icon, title, desc, payout, payoutClass) {
    if (!this.elResultOverlay) return;
    if (this.elResultIcon) this.elResultIcon.textContent = icon;
    if (this.elResultTitle) this.elResultTitle.textContent = title;
    if (this.elResultDesc) this.elResultDesc.textContent = desc;
    if (this.elResultPayout) {
      this.elResultPayout.textContent = payout;
      this.elResultPayout.className = `result-payout-tag ${payoutClass}`;
    }
    this.elResultOverlay.style.display = 'flex';
  }

  /**
   * 點擊確認後：清空檯面上所有手牌並重新開始下注
   */
  confirmAndClearTable() {
    if (this.elResultOverlay) this.elResultOverlay.style.display = 'none';

    this.gameState = 'BETTING';
    this.currentBet = 0; // 清空當前下注
    this.dealerCards = []; // 清空莊家桌面
    this.activeSeatIndex = -1;

    // 清空所有座位手牌
    this.seats.forEach(s => {
      s.cards = [];
      s.status = 'WAITING';
      s.bet = 0;
    });

    this.sound.playChipClink();
    this.updateHUD();
    this.render();
  }

  updateHUD() {
    const remainingDecks = this.deck.getRemainingDecks();
    const rc = this.counter.runningCount;
    const tc = this.counter.getTrueCount(remainingDecks);
    const stats = this.counter.getShoeStats(this.deck.getRemainingCount());

    if (this.elHudRC) this.elHudRC.textContent = (rc > 0 ? `+${rc}` : rc);
    if (this.elHudTC) this.elHudTC.textContent = (tc > 0 ? `+${tc.toFixed(1)}` : tc.toFixed(1));
    if (this.elHudLowRatio) this.elHudLowRatio.textContent = `${stats.lowRatio}%`;
    if (this.elHudHighRatio) this.elHudHighRatio.textContent = `${stats.highRatio}%`;
    
    if (this.elHudSuggestedBet) {
      const bet = this.counter.getSuggestedBet(tc, 25);
      this.elHudSuggestedBet.textContent = `$${bet}`;
    }

    if (this.elShoeDecksText) {
      this.elShoeDecksText.textContent = `${remainingDecks} 副`;
    }
    if (this.elShoeFill) {
      const ratio = 1 - this.deck.getDealtRatio();
      this.elShoeFill.style.width = `${Math.max(5, ratio * 100)}%`;
    }
  }

  showHintToast() {
    if (this.gameState !== 'SEATS_TURN' || this.activeSeatIndex !== this.playerSeatIndex) return;
    const playerSeat = this.seats[this.playerSeatIndex];
    const remainingDecks = this.deck.getRemainingDecks();
    const tc = this.counter.getTrueCount(remainingDecks);
    const optimal = StrategyEngine.getOptimalDecision(playerSeat.cards, this.dealerCards[0], tc, this.rules);

    this.showToast(`💡 教練指引：建議「${optimal.action}」 - ${optimal.reason}`, 'hint');
  }

  showMistakeToast(playerAction, optimal) {
    this.showToast(`⚠️ 決策失誤：你選擇了 ${playerAction}，但最優解為 ${optimal.action}！\n${optimal.reason}`, 'mistake');
  }

  showToast(message, type = 'info') {
    const oldToast = document.querySelector('.coach-toast');
    if (oldToast) oldToast.remove();

    const toast = document.createElement('div');
    toast.className = `coach-toast ${type}`;
    toast.innerHTML = `<div class="toast-content" style="white-space: pre-line;">${message}</div>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  renderCoachGuidance() {
    [this.btnHit, this.btnStand, this.btnDouble, this.btnSplit, this.btnSurrender].forEach(btn => {
      btn?.classList.remove('btn-optimal-highlight');
    });

    if (!this.elCoachBanner) return;

    if (!this.coachMode) {
      this.elCoachBanner.style.display = 'none';
      return;
    }

    this.elCoachBanner.style.display = 'flex';
    this.elCoachBanner.classList.remove('hidden-mode');

    const playerSeat = this.seats[this.playerSeatIndex];

    if (this.gameState === 'BETTING') {
      if (this.elCoachRecAction) this.elCoachRecAction.innerHTML = '<span style="color: var(--gold-primary);">下注階段</span>';
      if (this.elCoachRecReason) this.elCoachRecReason.textContent = '請點選籌碼下注，點擊「發牌 (Deal)」開始牌局。';
    } else if (this.gameState === 'SEATS_TURN' && this.activeSeatIndex === this.playerSeatIndex && playerSeat.cards.length >= 2 && this.dealerCards.length >= 1) {
      const remainingDecks = this.deck.getRemainingDecks();
      const tc = this.counter.getTrueCount(remainingDecks);
      const optimal = StrategyEngine.getOptimalDecision(playerSeat.cards, this.dealerCards[0], tc, this.rules);

      const actionMap = {
        'H': { text: '要牌 (Hit)', btn: this.btnHit },
        'S': { text: '停牌 (Stand)', btn: this.btnStand },
        'D': { text: '加倍 (Double)', btn: this.btnDouble },
        'Ds': { text: '加倍/停牌 (Double)', btn: this.btnDouble },
        'P': { text: '分牌 (Split)', btn: this.btnSplit },
        'R': { text: '投降 (Surrender)', btn: this.btnSurrender },
        'Rh': { text: '投降/要牌', btn: this.btnSurrender },
        'Rs': { text: '投降/停牌', btn: this.btnSurrender }
      };

      const optInfo = actionMap[optimal.action] || { text: optimal.action, btn: null };

      if (this.elCoachRecAction) {
        this.elCoachRecAction.innerHTML = `<b style="color: ${optimal.isDeviation ? 'var(--cyan-accent)' : 'var(--gold-primary)'}; font-size: 1.05rem;">【${optInfo.text}】</b> ${optimal.isDeviation ? '<span class="brand-badge" style="font-size: 0.65rem; margin-left: 4px;">I18 偏差</span>' : ''}`;
      }
      if (this.elCoachRecReason) {
        this.elCoachRecReason.textContent = optimal.reason;
      }

      if (optInfo.btn && !optInfo.btn.disabled) {
        optInfo.btn.classList.add('btn-optimal-highlight');
      } else if (optimal.action === 'D' && this.btnHit && !this.btnHit.disabled) {
        this.btnHit.classList.add('btn-optimal-highlight');
      }
    } else {
      if (this.elCoachRecAction) this.elCoachRecAction.innerHTML = '<span style="color: var(--text-muted);">等待其他座位行動中...</span>';
      if (this.elCoachRecReason) this.elCoachRecReason.textContent = '當前由同桌其他玩家或莊家行動，請觀察跑數 (RC) 變化。';
    }
  }

  render() {
    if (this.elBankroll) this.elBankroll.textContent = `$${this.bankroll}`;
    if (this.elCurrentBet) this.elCurrentBet.textContent = `$${this.currentBet}`;

    // 下注圈籌碼堆疊渲染
    if (this.elBetChipsStack) {
      if (this.currentBet > 0) {
        this.elBetChipsStack.innerHTML = `<div class="bet-chip-badge">$${this.currentBet}</div>`;
      } else {
        this.elBetChipsStack.innerHTML = `<span class="bet-placeholder-text">點擊下注</span>`;
      }
    }

    // 渲染莊家桌面
    if (this.elDealerCards) {
      this.elDealerCards.innerHTML = '';
      if (this.dealerCards.length === 0) {
        this.elDealerBadge.textContent = '莊家: 0 點';
      } else {
        this.dealerCards.forEach((card, idx) => {
          const isFaceUp = (this.gameState === 'DEALER_TURN' || this.gameState === 'ROUND_OVER') || idx === 0;
          this.elDealerCards.appendChild(card.renderDOM(isFaceUp));
        });

        if (this.gameState === 'DEALER_TURN' || this.gameState === 'ROUND_OVER') {
          const evalD = StrategyEngine.evaluateHand(this.dealerCards);
          this.elDealerBadge.textContent = `莊家: ${evalD.total} 點 ${evalD.isSoft ? '(軟)' : ''}`;
        } else {
          this.elDealerBadge.textContent = `莊家: ${this.dealerCards[0].getValue()} + ? 點`;
        }
      }
    }

    // 渲染動態多座位手牌區域
    if (this.elSeatsContainer) {
      this.elSeatsContainer.innerHTML = '';

      this.seats.forEach((seat, idx) => {
        const isPlayer = !seat.isAI;
        const isActive = (this.activeSeatIndex === idx);

        const spotEl = document.createElement('div');
        spotEl.className = `player-spot ${isPlayer ? 'seat-player' : 'seat-ai'} ${isActive ? 'seat-active' : ''}`;

        // 徽章點數
        const badgeEl = document.createElement('div');
        badgeEl.className = 'hand-badge';
        if (seat.cards.length === 0) {
          badgeEl.textContent = `${seat.name}: 0 點`;
        } else {
          const ev = StrategyEngine.evaluateHand(seat.cards);
          badgeEl.textContent = `${seat.name}: ${ev.total} 點 ${ev.isSoft ? '(軟)' : ''} ${seat.status === 'BUST' ? '💥' : (seat.status === 'BLACKJACK' ? '👑' : '')}`;
        }
        spotEl.appendChild(badgeEl);

        // 卡牌列
        const cardsRow = document.createElement('div');
        cardsRow.className = 'cards-row';
        seat.cards.forEach(card => {
          cardsRow.appendChild(card.renderDOM(true));
        });
        spotEl.appendChild(cardsRow);

        this.elSeatsContainer.appendChild(spotEl);
      });
    }

    // 按鈕可用性更新
    const isBetting = (this.gameState === 'BETTING');
    const isMyTurn = (this.gameState === 'SEATS_TURN' && this.activeSeatIndex === this.playerSeatIndex);
    const pCards = this.seats[this.playerSeatIndex]?.cards || [];

    if (this.btnDeal) {
      this.btnDeal.disabled = !isBetting || this.currentBet <= 0;
      if (isBetting && this.currentBet > 0) this.btnDeal.classList.add('pulse-glow');
      else this.btnDeal.classList.remove('pulse-glow');
    }

    if (this.btnClearBet) this.btnClearBet.disabled = !isBetting || this.currentBet === 0;
    if (this.btnRebet) this.btnRebet.disabled = !isBetting || this.lastBet === 0 || this.bankroll < this.lastBet;
    if (this.btnDoubleBet) this.btnDoubleBet.disabled = !isBetting || this.bankroll < (this.currentBet > 0 ? this.currentBet * 2 : this.selectedChip * 2);

    if (this.btnHit) this.btnHit.disabled = !isMyTurn;
    if (this.btnStand) this.btnStand.disabled = !isMyTurn;
    if (this.btnDouble) this.btnDouble.disabled = !isMyTurn || pCards.length !== 2 || this.bankroll < this.currentBet;
    if (this.btnSplit) {
      const isPair = pCards.length === 2 && pCards[0].getValue() === pCards[1].getValue();
      this.btnSplit.disabled = !isMyTurn || !isPair || this.bankroll < this.currentBet;
    }
    if (this.btnSurrender) this.btnSurrender.disabled = !isMyTurn || pCards.length !== 2 || !this.rules.lateSurrender;

    this.renderCoachGuidance();
  }
}
