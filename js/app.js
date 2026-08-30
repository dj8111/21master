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

class App {
  constructor() {
    this.i18n = new I18nManager();
    this.sound = new SoundEngine();
    this.analytics = new Analytics();

    this.tableModule = null;
    this.countingModule = null;
    this.strategyModule = null;
    this.rorModule = null;
    this.shareModal = null;

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
    this.tableModule = new TableSimulator(this.sound, this.analytics);
    this.countingModule = new CountingDrill(this.sound, this.analytics);
    this.strategyModule = new StrategyQuiz(this.sound, this.analytics);
    this.rorModule = new RiskOfRuinSimulator(this.i18n);
    this.shareModal = new ShareModal(this.i18n);

    // 語系變更時重新渲染各模組文字
    this.i18n.subscribe(() => {
      this.tableModule.renderCoachGuidance();
      const currentActiveTab = document.querySelector('.nav-tab-btn.active')?.dataset.tab;
      if (currentActiveTab === 'counting') this.countingModule.renderStage();
      else if (currentActiveTab === 'strategy') this.strategyModule.renderStage();
      else if (currentActiveTab === 'ror') this.rorModule.render(document.getElementById('pane-ror'));
      else if (currentActiveTab === 'stats') this.analytics.renderStatsDOM(document.getElementById('stats-view-container'));
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
          this.countingModule.renderStage();
        } else if (targetTab === 'strategy') {
          this.strategyModule.renderStage();
        } else if (targetTab === 'ror') {
          this.rorModule.render(document.getElementById('pane-ror'));
        } else if (targetTab === 'stats') {
          const container = document.getElementById('stats-view-container');
          this.analytics.renderStatsDOM(container);
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
      modal.classList.add('open');
    });

    btnClose?.addEventListener('click', () => {
      modal.classList.remove('open');
    });

    modal?.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });

    btnSave?.addEventListener('click', () => {
      const decks = parseInt(document.getElementById('setting-num-decks').value, 10);
      const isH17 = document.getElementById('setting-soft17').checked;
      const das = document.getElementById('setting-das').checked;
      const surrender = document.getElementById('setting-surrender').checked;
      const system = document.getElementById('setting-counting-system').value;

      this.tableModule.rules.numDecks = decks;
      this.tableModule.rules.dealerHitsSoft17 = isH17;
      this.tableModule.rules.doubleAfterSplit = das;
      this.tableModule.rules.lateSurrender = surrender;
      this.tableModule.rules.countingSystem = system;

      this.tableModule.deck = new (this.tableModule.deck.constructor)(decks);
      this.tableModule.counter.numDecks = decks;
      this.tableModule.counter.system = system;
      this.tableModule.counter.initSystem();
      this.tableModule.updateHUD();

      modal.classList.remove('open');
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

document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
