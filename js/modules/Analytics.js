/**
 * Analytics.js - 使用者學習進度、決策數據追蹤與 5 階等級成就系統
 */

export class Analytics {
  constructor() {
    this.storageKey = '21master_user_stats';
    this.stats = this.loadStats();
  }

  getDefaultStats() {
    return {
      tableHandsPlayed: 0,
      correctDecisions: 0,
      totalDecisions: 0,
      strategyQuizTotal: 0,
      strategyQuizCorrect: 0,
      countingDrillHistory: [],
      mistakeLog: [],
      achievementsUnlocked: []
    };
  }

  loadStats() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : this.getDefaultStats();
    } catch (e) {
      return this.getDefaultStats();
    }
  }

  saveStats() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.stats));
    } catch (e) {
      console.warn('無法存取 localStorage:', e);
    }
  }

  recordDecision(isCorrect, reason = '') {
    this.stats.totalDecisions++;
    if (isCorrect) {
      this.stats.correctDecisions++;
    } else if (reason) {
      this.stats.mistakeLog.unshift({ reason, timestamp: Date.now() });
      if (this.stats.mistakeLog.length > 50) this.stats.mistakeLog.pop();
    }
    this.saveStats();
  }

  recordStrategyQuiz(isCorrect) {
    this.stats.strategyQuizTotal++;
    if (isCorrect) this.stats.strategyQuizCorrect++;
    this.saveStats();
  }

  recordCountingDrill(type, accuracy, avgMs) {
    this.stats.countingDrillHistory.unshift({
      type,
      accuracy: parseFloat(accuracy),
      avgMs: parseInt(avgMs, 10),
      timestamp: Date.now()
    });
    if (this.stats.countingDrillHistory.length > 50) this.stats.countingDrillHistory.pop();
    this.saveStats();
  }

  /**
   * 計算目前玩家等級稱號
   */
  getUserRank() {
    const totalQuiz = this.stats.strategyQuizTotal;
    const quizAcc = totalQuiz > 0 ? (this.stats.strategyQuizCorrect / totalQuiz) : 0;
    const tableDecisions = this.stats.totalDecisions;

    if (tableDecisions >= 100 && quizAcc >= 0.95 && this.stats.countingDrillHistory.length >= 5) {
      return { rank: 'Lv 5. MIT 傳奇玩家 (MIT Team Leader)', desc: '精通算牌、真數折算與 I18 偏差的賭場剋星', color: '#f59e0b' };
    }
    if (this.stats.countingDrillHistory.length >= 3 && quizAcc >= 0.9) {
      return { rank: 'Lv 4. 算牌新星 (Hi-Lo Counter)', desc: '具備流水數秒算與基本策略肌肉記憶', color: '#38bdf8' };
    }
    if (totalQuiz >= 50 && quizAcc >= 0.9) {
      return { rank: 'Lv 3. 策略大師 (Basic Strategy Master)', desc: '基本策略矩陣失誤率極低', color: '#10b981' };
    }
    if (totalQuiz >= 20 || tableDecisions >= 20) {
      return { rank: 'Lv 2. 策略學徒 (Strategy Apprentice)', desc: '正在建立基本策略反射神經', color: '#94a3b8' };
    }
    return { rank: 'Lv 1. 賭場綠角 (Casino Tourist)', desc: '剛進入 21 點數學世界的新手', color: '#64748b' };
  }

  renderStatsDOM(container) {
    if (!container) return;

    const rankInfo = this.getUserRank();
    const decAcc = this.stats.totalDecisions > 0 
      ? ((this.stats.correctDecisions / this.stats.totalDecisions) * 100).toFixed(1)
      : '0.0';
    const quizAcc = this.stats.strategyQuizTotal > 0
      ? ((this.stats.strategyQuizCorrect / this.stats.strategyQuizTotal) * 100).toFixed(1)
      : '0.0';

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 860px; margin: 0 auto;">
        <div class="glass-card" style="display: flex; align-items: center; justify-content: space-between; border-left: 6px solid ${rankInfo.color};">
          <div>
            <span class="stat-label">當前成就等級</span>
            <h2 style="font-family: var(--font-heading); color: ${rankInfo.color}; font-size: 1.5rem; margin-top: 0.25rem;">${rankInfo.rank}</h2>
            <p style="color: var(--text-secondary); font-size: 0.9rem;">${rankInfo.desc}</p>
          </div>
          <div class="brand-logo" style="width: 54px; height: 54px; font-size: 1.8rem;">♠</div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
          <div class="glass-card">
            <span class="stat-label">檯面對賭決策準確率</span>
            <p class="stat-value emerald" style="font-size: 1.8rem; margin: 0.5rem 0;">${decAcc}%</p>
            <span style="font-size: 0.8rem; color: var(--text-muted);">共累積 ${this.stats.totalDecisions} 次決策</span>
          </div>

          <div class="glass-card">
            <span class="stat-label">策略測驗準確率</span>
            <p class="stat-value cyan" style="font-size: 1.8rem; margin: 0.5rem 0;">${quizAcc}%</p>
            <span style="font-size: 0.8rem; color: var(--text-muted);">共完成 ${this.stats.strategyQuizTotal} 題</span>
          </div>

          <div class="glass-card">
            <span class="stat-label">算牌考核完成次數</span>
            <p class="stat-value gold" style="font-size: 1.8rem; margin: 0.5rem 0;">${this.stats.countingDrillHistory.length}</p>
            <span style="font-size: 0.8rem; color: var(--text-muted);">涵蓋閃卡與整副牌倒數</span>
          </div>
        </div>

        <div class="glass-card">
          <h3 style="font-family: var(--font-heading); color: var(--gold-primary); margin-bottom: 1rem;">📋 最近決策失誤檢討</h3>
          ${this.stats.mistakeLog.length === 0 ? '<p style="color: var(--text-muted);">目前尚無失誤紀錄，保持完美！</p>' : `
            <ul style="list-style: none; display: flex; flex-direction: column; gap: 0.5rem;">
              ${this.stats.mistakeLog.slice(0, 6).map(m => `
                <li style="background: rgba(0,0,0,0.3); padding: 0.6rem 0.85rem; border-radius: var(--radius-sm); border-left: 3px solid var(--color-danger); font-size: 0.85rem;">
                  ${m.reason}
                </li>
              `).join('')}
            </ul>
          `}
        </div>
      </div>
    `;
  }
}
