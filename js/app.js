/**
 * app.js - 21Master 應用程式主入口與模組協調中心
 */
import { SoundEngine } from './engine/SoundEngine.js';
import { Analytics } from './modules/Analytics.js';
import { TableSimulator } from './modules/TableSimulator.js';
import { CountingDrill } from './modules/CountingDrill.js';
import { StrategyQuiz } from './modules/StrategyQuiz.js';

class App {
  constructor() {
    this.sound = new SoundEngine();
    this.analytics = new Analytics();

    this.tableModule = null;
    this.countingModule = null;
    this.strategyModule = null;

    this.init();
  }

  init() {
    this.initModules();
    this.bindNavigation();
    this.bindSettingsModal();
    this.bindSoundToggle();
  }

  initModules() {
    this.tableModule = new TableSimulator(this.sound, this.analytics);
    this.countingModule = new CountingDrill(this.sound, this.analytics);
    this.strategyModule = new StrategyQuiz(this.sound, this.analytics);
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

        // 當切換到特定 Tab 時觸發初次渲染
        if (targetTab === 'counting') {
          this.countingModule.renderStage();
        } else if (targetTab === 'strategy') {
          this.strategyModule.renderStage();
        } else if (targetTab === 'stats') {
          const container = document.getElementById('stats-view-container');
          this.analytics.renderStatsDOM(container);
        }
      });
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
      // 讀取設定表單
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

      // 重新初始化牌靴
      this.tableModule.deck = new (this.tableModule.deck.constructor)(decks);
      this.tableModule.counter.numDecks = decks;
      this.tableModule.counter.system = system;
      this.tableModule.counter.initSystem();
      this.tableModule.updateHUD();

      modal.classList.remove('open');
      alert('賭規設定已更新，並已重新洗牌！');
    });
  }
}

// 頁面載入後啟動
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
