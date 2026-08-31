/**
 * app.js - 21Master 應用程式主入口 (含 i18n 語系引擎、PWA、RoR 與分享彈窗)
 */
import { I18nManager } from './i18n/I18nManager.js';
import { SoundEngine } from './engine/SoundEngine.js';
import { Analytics } from './modules/Analytics.js';
import { TableSimulator } from './modules/TableSimulator.js';
import { CountingDrill } from './modules/CountingDrill.js';
import { StrategyQuiz } from './modules/StrategyQuiz.js';
import { RiskOfRuinSimulator } from './modules/RiskOfRuinSimulator.js';
import { ShareModal } from './modules/ShareModal.js';
import { DisclaimerModal } from './modules/DisclaimerModal.js';

class App {
  constructor() {
    window.app = this;
    this.i18n = new I18nManager();
    this.sound = new SoundEngine();
    this.analytics = new Analytics();

    this.tableModule = null;
    this.countingModule = null;
    this.strategyModule = null;
    this.rorModule = null;
    this.shareModal = null;
    this.disclaimerModal = null;

    this.init();
  }

  init() {
    this.i18n.init();
    this.initModules();
    this.bindNavigation();
    this.bindSettingsModal();
    this.bindSoundToggle();
    this.bindLanguageSelector();
    this.registerPWA();
  }

  initModules() {
    // 優先初始化免責聲明彈窗
    try {
      this.disclaimerModal = new DisclaimerModal(this.i18n, this.sound);
    } catch (e) {
      console.error('DisclaimerModal init error:', e);
    }

    try {
      this.tableModule = new TableSimulator(this.sound, this.analytics);
    } catch (e) {
      console.error('TableSimulator init error:', e);
    }

    try {
      this.countingModule = new CountingDrill(this.sound, this.analytics);
    } catch (e) {
      console.error('CountingDrill init error:', e);
    }

    try {
      this.strategyModule = new StrategyQuiz(this.sound, this.analytics);
    } catch (e) {
      console.error('StrategyQuiz init error:', e);
    }

    try {
      this.rorModule = new RiskOfRuinSimulator(this.i18n);
    } catch (e) {
      console.error('RiskOfRuinSimulator init error:', e);
    }

    try {
      this.shareModal = new ShareModal(this.i18n);
    } catch (e) {
      console.error('ShareModal init error:', e);
    }

    // 語系變更時重新渲染各模組文字
    this.i18n.subscribe(() => {
      this.tableModule?.render?.();
      this.tableModule?.renderCoachGuidance?.();
      const currentActiveTab = document.querySelector('.nav-tab-btn.active')?.dataset.tab;
      if (currentActiveTab === 'counting') this.countingModule?.renderStage?.();
      else if (currentActiveTab === 'strategy') this.strategyModule?.renderStage?.();
      else if (currentActiveTab === 'ror') this.rorModule?.render?.(document.getElementById('pane-ror'));
      else if (currentActiveTab === 'stats') this.analytics?.renderStatsDOM?.(document.getElementById('stats-view-container'));
    });
  }

  bindNavigation() {
    const tabButtons = document.querySelectorAll('.nav-tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;

        tabButtons.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const activePane = document.getElementById(`pane-${targetTab}`);
        if (activePane) {
          activePane.classList.add('active');
        }

        if (targetTab === 'counting') {
          this.countingModule?.renderStage?.();
        } else if (targetTab === 'strategy') {
          this.strategyModule?.renderStage?.();
        } else if (targetTab === 'ror') {
          this.rorModule?.render?.(document.getElementById('pane-ror'));
        } else if (targetTab === 'stats') {
          const container = document.getElementById('stats-view-container');
          this.analytics?.renderStatsDOM?.(container);
        }
      });
    });
  }

  bindLanguageSelector() {
    const select = document.getElementById('select-lang');
    select?.addEventListener('change', (e) => {
      this.i18n.setLanguage(e.target.value);
    });
  }

  bindSoundToggle() {
    const btnSound = document.getElementById('btn-toggle-sound');
    let soundOn = true;

    btnSound?.addEventListener('click', () => {
      soundOn = !soundOn;
      this.sound.toggleSound(soundOn);
      btnSound.classList.toggle('active', soundOn);
    });
  }

  bindSettingsModal() {
    const btnSettings = document.getElementById('btn-open-settings');
    const modal = document.getElementById('settings-modal');
    const btnClose = document.getElementById('btn-close-settings');
    const btnSave = document.getElementById('btn-save-settings');

    btnSettings?.addEventListener('click', () => {
      modal?.classList.add('open');
    });

    btnClose?.addEventListener('click', () => {
      modal?.classList.remove('open');
    });

    modal?.addEventListener('click', (e) => {
      if (e.target === modal) modal?.classList.remove('open');
    });

    btnSave?.addEventListener('click', () => {
      const decks = parseInt(document.getElementById('setting-num-decks').value, 10);
      const isH17 = document.getElementById('setting-soft17').checked;
      const das = document.getElementById('setting-das').checked;
      const surrender = document.getElementById('setting-surrender').checked;
      const system = document.getElementById('setting-counting-system').value;

      if (this.tableModule) {
        // 若遊戲進行中，強制重置至下注狀態
        if (this.tableModule.gameState !== 'BETTING') {
          this.tableModule.gameState = 'BETTING';
          this.tableModule.currentBet = 0;
          this.tableModule.dealerCards = [];
          this.tableModule.activeSeatIndex = -1;
          this.tableModule.seats.forEach(s => { s.cards = []; s.status = 'WAITING'; s.bet = 0; });
          const overlay = document.getElementById('round-result-overlay');
          if (overlay) overlay.style.display = 'none';
        }

        this.tableModule.rules.numDecks = decks;
        this.tableModule.rules.dealerHitsSoft17 = isH17;
        this.tableModule.rules.doubleAfterSplit = das;
        this.tableModule.rules.lateSurrender = surrender;
        this.tableModule.rules.countingSystem = system;

        // 正確傳入 numDecks 與 penetration 重建牌靴
        this.tableModule.deck = new (this.tableModule.deck.constructor)(decks, this.tableModule.rules.penetration);
        this.tableModule.counter.numDecks = decks;
        this.tableModule.counter.system = system;
        this.tableModule.counter.initSystem();
        this.tableModule.updateHUD();
        this.tableModule.render();
      }

      modal?.classList.remove('open');
      alert(this.i18n.t('settings_save'));
    });
  }

  registerPWA() {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js').catch((err) => {
          console.log('SW registration error:', err);
        });
      });
    }
  }
}

function startApp() {
  if (!window.app) {
    try {
      window.app = new App();
    } catch (err) {
      console.error('Failed to instantiate App:', err);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}

