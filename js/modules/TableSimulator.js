/**
 * TableSimulator.js - 21點模擬檯面對賭、教練提示與即時算牌 HUD 模組
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
    this.currentBet = 0; // 每局開始前需主動下注
    this.lastBet = 25; // 記錄上一把下注金額以便 Rebet
    this.selectedChip = 25;
    this.gameState = 'BETTING'; // 'BETTING', 'PLAYER_TURN', 'DEALER_TURN', 'RESOLVED'
    this.coachMode = false; // 預設關閉教練模式
    this.showHUD = false; // 預設關閉算牌 HUD

    this.dealerCards = [];
    this.playerCards = [];
    this.splitHands = [];
    this.activeHandIndex = 0;

    this.deck = new Deck(this.rules.numDecks, this.rules.penetration);
    this.counter = new CountingEngine(this.rules.numDecks, this.rules.countingSystem);

    this.initDOM();
    this.bindEvents();
    this.updateHUD();
    this.render();
  }

  initDOM() {
    this.elBankroll = document.getElementById('table-bankroll');
    this.elCurrentBet = document.getElementById('table-current-bet');
    this.elDealerCards = document.getElementById('dealer-cards');
    this.elDealerBadge = document.getElementById('dealer-hand-badge');
    this.elPlayerCards = document.getElementById('player-cards');
    this.elPlayerBadge = document.getElementById('player-hand-badge');
    this.elShoeFill = document.getElementById('shoe-fill-bar');
    this.elShoeDecksText = document.getElementById('shoe-decks-text');
    this.elBetSpot = document.getElementById('table-betting-spot');
    this.elBetChipsStack = document.getElementById('bet-chips-stack');

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

    // 操作按鈕
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

    // 籌碼選擇按鈕
    this.chipButtons = document.querySelectorAll('.chip-selector');
  }

  bindEvents() {
    this.btnDeal?.addEventListener('click', () => this.startDeal());
    this.btnClearBet?.addEventListener('click', () => this.clearBet());
    this.btnRebet?.addEventListener('click', () => this.rebet());
    this.btnDoubleBet?.addEventListener('click', () => this.doublePreBet());

    this.btnHit?.addEventListener('click', () => this.handleAction('H'));
    this.btnStand?.addEventListener('click', () => this.handleAction('S'));
    this.btnDouble?.addEventListener('click', () => this.handleAction('D'));
    this.btnSplit?.addEventListener('click', () => this.handleAction('P'));
    this.btnSurrender?.addEventListener('click', () => this.handleAction('R'));
    this.btnHint?.addEventListener('click', () => this.showHintToast());

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

    // 點擊籌碼按鈕直接將該籌碼金額加到下注圈
    this.chipButtons?.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseInt(btn.dataset.value, 10);
        this.selectedChip = val;
        this.chipButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.addBet(val);
      });
    });

    // 點擊下注圈增加當前選擇的籌碼
    this.elBetSpot?.addEventListener('click', () => {
      this.addBet(this.selectedChip);
    });

    // 鍵盤快速鍵
    window.addEventListener('keydown', (e) => {
      if (document.querySelector('.tab-pane#pane-table.active')) {
        const key = e.key.toUpperCase();
        if (this.gameState === 'BETTING') {
          if (e.code === 'Space') {
            e.preventDefault();
            this.startDeal();
          } else if (key === 'C') {
            this.clearBet();
          } else if (key === 'R') {
            this.rebet();
          }
        } else if (this.gameState === 'PLAYER_TURN') {
          if (key === 'H') this.handleAction('H');
          if (key === 'S') this.handleAction('S');
          if (key === 'D') this.handleAction('D');
          if (key === 'P') this.handleAction('P');
          if (key === 'R') this.handleAction('R');
        }
      }
    });
  }

  /**
   * 點擊籌碼或下注圈增加下注
   */
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

  /**
   * 清除當前下注
   */
  clearBet() {
    if (this.gameState !== 'BETTING') return;
    this.currentBet = 0;
    this.sound.playChipClink();
    this.render();
  }

  /**
   * 重複上一局下注金額 (Rebet)
   */
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

  /**
   * 下注前翻倍 (2x Bet)
   */
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
   * 開始新回合發牌
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

    this.lastBet = this.currentBet; // 記錄本輪下注以供下一輪 Rebet
    this.bankroll -= this.currentBet;
    this.gameState = 'PLAYER_TURN';
    this.dealerCards = [];
    this.playerCards = [];

    if (this.deck.needsReshuffle) {
      this.deck.initShoe();
      this.counter.initSystem();
      this.showToast('牌靴已達切牌深度，已重新洗牌！', 'info');
    }

    // 發牌序列 (Player 1 -> Dealer 1 -> Player 2 -> Dealer 2[Face Down])
    const p1 = this.deck.deal();
    this.playerCards.push(p1);
    this.counter.processCard(p1);
    this.sound.playCardSlide();

    setTimeout(() => {
      const d1 = this.deck.deal();
      this.dealerCards.push(d1);
      this.counter.processCard(d1);
      this.sound.playCardSlide();

      setTimeout(() => {
        const p2 = this.deck.deal();
        this.playerCards.push(p2);
        this.counter.processCard(p2);
        this.sound.playCardSlide();

        setTimeout(() => {
          const d2 = this.deck.deal(); // 莊家暗牌 (不計入跑數，直到翻開)
          this.dealerCards.push(d2);
          this.sound.playCardSlide();

          this.checkInitialBlackjack();
          this.updateHUD();
          this.render();
        }, 200);
      }, 200);
    }, 200);
  }

  checkInitialBlackjack() {
    const playerEval = StrategyEngine.evaluateHand(this.playerCards);
    const dealerEval = StrategyEngine.evaluateHand(this.dealerCards);

    if (playerEval.isBlackjack) {
      // 翻開莊家暗牌
      this.counter.processCard(this.dealerCards[1]);
      if (dealerEval.isBlackjack) {
        // 平手 Push
        this.bankroll += this.currentBet;
        this.endRound('Push! 雙方皆為黑傑克平手', 'push');
      } else {
        // 玩家獲勝 3:2
        const winAmount = this.currentBet + this.currentBet * this.rules.blackjackPayout;
        this.bankroll += winAmount;
        this.sound.playWin();
        this.endRound(`Blackjack! 恭喜獲得 ${this.rules.blackjackPayout === 1.5 ? '3:2' : '6:5'} 賠率獎金`, 'win');
      }
    }
  }

  /**
   * 玩家執行動作 (Hit, Stand, Double, Split, Surrender)
   */
  handleAction(action) {
    if (this.gameState !== 'PLAYER_TURN') return;

    // 教練評估
    const remainingDecks = this.deck.getRemainingDecks();
    const trueCount = this.counter.getTrueCount(remainingDecks);
    const optimal = StrategyEngine.getOptimalDecision(this.playerCards, this.dealerCards[0], trueCount, this.rules);

    // 檢查是否符合最優決策
    const isActionOptimal = this.validateActionMatch(action, optimal.action);
    if (!isActionOptimal && this.coachMode) {
      this.sound.playWrong();
      this.showMistakeToast(action, optimal);
      this.analytics.recordDecision(false, optimal.reason);
    } else {
      this.sound.playCorrect();
      this.analytics.recordDecision(true);
    }

    // 執行對應動作
    if (action === 'H') {
      const card = this.deck.deal();
      this.playerCards.push(card);
      this.counter.processCard(card);
      this.sound.playCardSlide();

      const evalHand = StrategyEngine.evaluateHand(this.playerCards);
      if (evalHand.total > 21) {
        this.sound.playWrong();
        this.endRound('Bust! 點數爆牌了', 'lose');
      } else if (evalHand.total === 21) {
        this.handleAction('S'); // 自動停牌
      }
    } else if (action === 'S') {
      this.sound.playTableTap();
      this.runDealerTurn();
    } else if (action === 'D') {
      if (this.bankroll >= this.currentBet) {
        this.bankroll -= this.currentBet;
        this.currentBet *= 2;
        const card = this.deck.deal();
        this.playerCards.push(card);
        this.counter.processCard(card);
        this.sound.playCardSlide();

        const evalHand = StrategyEngine.evaluateHand(this.playerCards);
        if (evalHand.total > 21) {
          this.sound.playWrong();
          this.endRound('Bust! 加倍後爆牌', 'lose');
        } else {
          this.runDealerTurn();
        }
      } else {
        alert('籌碼餘額不足，無法加倍！');
      }
    } else if (action === 'R') {
      // 投降取回 50%
      this.bankroll += this.currentBet * 0.5;
      this.endRound('投降 (Surrender)，取回半數注碼', 'surrender');
    }

    this.updateHUD();
    this.render();
  }

  validateActionMatch(playerAction, optimalAction) {
    if (playerAction === optimalAction) return true;
    if (optimalAction === 'Ds' && (playerAction === 'D' || playerAction === 'S')) return true;
    if (optimalAction === 'Rh' && (playerAction === 'R' || playerAction === 'H')) return true;
    if (optimalAction === 'Rs' && (playerAction === 'R' || playerAction === 'S')) return true;
    return false;
  }

  /**
   * 莊家補牌流程 (直到 17 點以上)
   */
  runDealerTurn() {
    this.gameState = 'DEALER_TURN';

    // 翻開暗牌並計入算牌
    if (this.dealerCards.length >= 2) {
      this.counter.processCard(this.dealerCards[1]);
    }

    const dealerStep = () => {
      let evalDealer = StrategyEngine.evaluateHand(this.dealerCards);

      // S17: >=17 停牌; H17: Soft 17 必須要牌
      const mustHit = this.rules.dealerHitsSoft17 
        ? (evalDealer.total < 17 || (evalDealer.total === 17 && evalDealer.isSoft))
        : (evalDealer.total < 17);

      if (mustHit) {
        const card = this.deck.deal();
        this.dealerCards.push(card);
        this.counter.processCard(card);
        this.sound.playCardSlide();
        this.render();
        setTimeout(dealerStep, 400);
      } else {
        this.resolveFinalWinner();
      }
    };

    setTimeout(dealerStep, 400);
  }

  /**
   * 結算雙方勝負
   */
  resolveFinalWinner() {
    const pEval = StrategyEngine.evaluateHand(this.playerCards);
    const dEval = StrategyEngine.evaluateHand(this.dealerCards);

    if (dEval.total > 21) {
      // 莊家爆牌
      this.bankroll += this.currentBet * 2;
      this.sound.playWin();
      this.endRound(`莊家爆牌 (${dEval.total} 點)！玩家獲勝 +$${this.currentBet}`, 'win');
    } else if (pEval.total > dEval.total) {
      // 玩家點數大
      this.bankroll += this.currentBet * 2;
      this.sound.playWin();
      this.endRound(`玩家 (${pEval.total} 點) 擊敗莊家 (${dEval.total} 點)！獲勝 +$${this.currentBet}`, 'win');
    } else if (pEval.total === dEval.total) {
      // 平手
      this.bankroll += this.currentBet;
      this.endRound(`平手 (雙方皆為 ${pEval.total} 點)！退回注碼`, 'push');
    } else {
      // 莊家大
      this.sound.playWrong();
      this.endRound(`莊家 (${dEval.total} 點) 贏過玩家 (${pEval.total} 點)`, 'lose');
    }
  }

  endRound(message, type) {
    this.gameState = 'BETTING';
    this.currentBet = 0; // 每一個牌局結束後重設注額，要求重新下注
    this.showToast(message, type);
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
    if (this.gameState !== 'PLAYER_TURN') return;
    const remainingDecks = this.deck.getRemainingDecks();
    const tc = this.counter.getTrueCount(remainingDecks);
    const optimal = StrategyEngine.getOptimalDecision(this.playerCards, this.dealerCards[0], tc, this.rules);

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
    toast.innerHTML = `
      <div class="toast-content" style="white-space: pre-line;">${message}</div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  renderCoachGuidance() {
    // 移除所有按鈕的推薦高亮
    [this.btnHit, this.btnStand, this.btnDouble, this.btnSplit, this.btnSurrender].forEach(btn => {
      btn?.classList.remove('btn-optimal-highlight');
    });

    if (!this.elCoachBanner) return;

    if (!this.coachMode) {
      // 關閉教練模式時直接隱藏，不在牌桌上顯示
      this.elCoachBanner.style.display = 'none';
      return;
    }

    // 開啟教練模式時顯示指示牌
    this.elCoachBanner.style.display = 'flex';
    this.elCoachBanner.classList.remove('hidden-mode');

    if (this.gameState === 'BETTING') {
      if (this.elCoachRecAction) this.elCoachRecAction.innerHTML = '<span style="color: var(--gold-primary);">下注階段</span>';
      if (this.elCoachRecReason) this.elCoachRecReason.textContent = '請點選籌碼下注，點擊「發牌 (Deal)」開始牌局。';
    } else if (this.gameState === 'PLAYER_TURN' && this.playerCards.length > 0 && this.dealerCards.length > 0) {
      const remainingDecks = this.deck.getRemainingDecks();
      const tc = this.counter.getTrueCount(remainingDecks);
      const optimal = StrategyEngine.getOptimalDecision(this.playerCards, this.dealerCards[0], tc, this.rules);

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

      // 高亮最優推薦按鈕
      if (optInfo.btn && !optInfo.btn.disabled) {
        optInfo.btn.classList.add('btn-optimal-highlight');
      } else if (optimal.action === 'D' && this.btnHit && !this.btnHit.disabled) {
        // 若不能加倍則退而高亮 Hit
        this.btnHit.classList.add('btn-optimal-highlight');
      }
    } else {
      if (this.elCoachRecAction) this.elCoachRecAction.innerHTML = '<span style="color: var(--text-muted);">結算中</span>';
      if (this.elCoachRecReason) this.elCoachRecReason.textContent = '牌局已結束，準備進行下一把下注。';
    }
  }

  render() {
    if (this.elBankroll) this.elBankroll.textContent = `$${this.bankroll}`;
    if (this.elCurrentBet) this.elCurrentBet.textContent = `$${this.currentBet}`;

    // 渲染下注圈籌碼堆疊視覺
    if (this.elBetChipsStack) {
      if (this.currentBet > 0) {
        this.elBetChipsStack.innerHTML = `
          <div class="bet-chip-badge">$${this.currentBet}</div>
        `;
      } else {
        this.elBetChipsStack.innerHTML = `<span class="bet-placeholder-text">點擊下注</span>`;
      }
    }

    // 渲染莊家手牌
    if (this.elDealerCards) {
      this.elDealerCards.innerHTML = '';
      this.dealerCards.forEach((card, idx) => {
        const isFaceUp = (this.gameState !== 'PLAYER_TURN') || idx === 0;
        this.elDealerCards.appendChild(card.renderDOM(isFaceUp));
      });

      if (this.dealerCards.length > 0) {
        if (this.gameState === 'PLAYER_TURN') {
          this.elDealerBadge.textContent = `莊家: ${this.dealerCards[0].getValue()} + ? 點`;
        } else {
          const evalD = StrategyEngine.evaluateHand(this.dealerCards);
          this.elDealerBadge.textContent = `莊家: ${evalD.total} 點 ${evalD.isSoft ? '(軟)' : ''}`;
        }
      } else {
        this.elDealerBadge.textContent = '莊家: 0 點';
      }
    }

    // 渲染玩家手牌
    if (this.elPlayerCards) {
      this.elPlayerCards.innerHTML = '';
      this.playerCards.forEach(card => {
        this.elPlayerCards.appendChild(card.renderDOM(true));
      });

      if (this.playerCards.length > 0) {
        const evalP = StrategyEngine.evaluateHand(this.playerCards);
        this.elPlayerBadge.textContent = `玩家: ${evalP.total} 點 ${evalP.isSoft ? '(軟牌)' : ''}`;
      } else {
        this.elPlayerBadge.textContent = '玩家: 0 點';
      }
    }

    // 按鈕可用性更新
    const isBetting = this.gameState === 'BETTING';
    const isPlaying = this.gameState === 'PLAYER_TURN';

    if (this.btnDeal) {
      this.btnDeal.disabled = !isBetting || this.currentBet <= 0;
      if (isBetting && this.currentBet > 0) {
        this.btnDeal.classList.add('pulse-glow');
      } else {
        this.btnDeal.classList.remove('pulse-glow');
      }
    }

    if (this.btnClearBet) this.btnClearBet.disabled = !isBetting || this.currentBet === 0;
    if (this.btnRebet) this.btnRebet.disabled = !isBetting || this.lastBet === 0 || this.bankroll < this.lastBet;
    if (this.btnDoubleBet) this.btnDoubleBet.disabled = !isBetting || this.bankroll < (this.currentBet > 0 ? this.currentBet * 2 : this.selectedChip * 2);

    if (this.btnHit) this.btnHit.disabled = !isPlaying;
    if (this.btnStand) this.btnStand.disabled = !isPlaying;
    if (this.btnDouble) this.btnDouble.disabled = !isPlaying || this.playerCards.length !== 2;
    if (this.btnSplit) {
      const isPair = this.playerCards.length === 2 && this.playerCards[0].getValue() === this.playerCards[1].getValue();
      this.btnSplit.disabled = !isPlaying || !isPair;
    }
    if (this.btnSurrender) this.btnSurrender.disabled = !isPlaying || this.playerCards.length !== 2 || !this.rules.lateSurrender;

    // 渲染教練指引與高亮
    this.renderCoachGuidance();
  }
}
