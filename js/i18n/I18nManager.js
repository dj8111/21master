/**
 * I18nManager.js - 語系管理與 DOM 內容自動替換引擎
 */
import { TRANSLATIONS } from './translations.js';

export class I18nManager {
  constructor() {
    this.currentLang = localStorage.getItem('21master_lang') || 'tw';
    this.listeners = [];
  }

  init() {
    this.applyLanguage(this.currentLang);
  }

  setLanguage(lang) {
    if (!TRANSLATIONS[lang]) return;
    this.currentLang = lang;
    localStorage.setItem('21master_lang', lang);
    this.applyLanguage(lang);
    this.notifyListeners(lang);
  }

  t(key) {
    const dict = TRANSLATIONS[this.currentLang] || TRANSLATIONS['tw'];
    return dict[key] || key;
  }

  applyLanguage(lang) {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS['tw'];

    // 替換所有帶有 data-i18n 的文字元素
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (dict[key]) {
        el.textContent = dict[key];
      }
    });

    // 替換所有帶有 data-i18n-placeholder 的輸入框 placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.dataset.i18nPlaceholder;
      if (dict[key]) {
        el.placeholder = dict[key];
      }
    });

    // 替換所有帶有 data-i18n-title 的 tooltip
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.dataset.i18nTitle;
      if (dict[key]) {
        el.title = dict[key];
      }
    });

    // 更新語言選擇器的值
    const select = document.getElementById('select-lang');
    if (select) select.value = lang;
  }

  subscribe(callback) {
    this.listeners.push(callback);
  }

  notifyListeners(lang) {
    this.listeners.forEach(cb => cb(lang));
  }
}
