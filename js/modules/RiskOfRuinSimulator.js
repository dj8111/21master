/**
 * RiskOfRuinSimulator.js - 凱利公式 (Kelly Criterion) 與破產風險率 (Risk of Ruin, RoR) 蒙地卡羅量化模擬器
 */

export class RiskOfRuinSimulator {
  constructor(i18n) {
    this.i18n = i18n;
    this.container = null;
    this.chartCanvas = null;
  }

  render(container) {
    if (!container) return;
    this.container = container;

    this.container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 960px; margin: 0 auto; width: 100%;">
        
        <div class="glass-card" style="border-left: 6px solid var(--gold-primary);">
          <h2 style="font-family: var(--font-heading); color: var(--gold-primary); font-size: 1.5rem; margin-bottom: 0.5rem;" data-i18n="ror_title">
            ${this.i18n.t('ror_title')}
          </h2>
          <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.6;" data-i18n="ror_desc">
            ${this.i18n.t('ror_desc')}
          </p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem;">
          
          <!-- 參數設定表單 -->
          <div class="glass-card">
            <h3 style="font-family: var(--font-heading); color: #fff; font-size: 1.15rem; margin-bottom: 1.25rem;">⚙️ 量化參數設定</h3>
            
            <div class="form-group">
              <label class="form-label" data-i18n="ror_param_bankroll">${this.i18n.t('ror_param_bankroll')}</label>
              <input type="number" id="ror-input-bankroll" class="form-control" value="10000" step="500">
            </div>

            <div class="form-group">
              <label class="form-label" data-i18n="ror_param_unit">${this.i18n.t('ror_param_unit')}</label>
              <input type="number" id="ror-input-unit" class="form-control" value="25" step="5">
            </div>

            <div class="form-group">
              <label class="form-label" data-i18n="ror_param_spread">${this.i18n.t('ror_param_spread')}</label>
              <select id="ror-input-spread" class="form-control">
                <option value="8">1 : 8 (保守級距 $25 ~ $200)</option>
                <option value="12" selected>1 : 12 (標準優勢級距 $25 ~ $300)</option>
                <option value="16">1 : 16 (激進 AP 級距 $25 ~ $400)</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" data-i18n="ror_param_hands">${this.i18n.t('ror_param_hands')}</label>
              <select id="ror-input-hands" class="form-control">
                <option value="2000">2,000 手 (約週末 20 小時實戰)</option>
                <option value="5000" selected>5,000 手 (約 50 小時職業實戰)</option>
                <option value="10000">10,000 手 (長期大數法則驗證)</option>
              </select>
            </div>

            <button id="btn-run-ror-sim" class="btn btn-primary" style="width: 100%; margin-top: 0.5rem;" data-i18n="ror_btn_calc">
              ${this.i18n.t('ror_btn_calc')}
            </button>
          </div>

          <!-- 理論指標面板 -->
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            
            <div class="glass-card">
              <span class="stat-label" data-i18n="ror_stat_ev">${this.i18n.t('ror_stat_ev')}</span>
              <p class="stat-value emerald" id="ror-stat-ev" style="font-size: 1.8rem; margin: 0.4rem 0;">+$42.50 / hr</p>
              <span style="font-size: 0.8rem; color: var(--text-muted);">假設每小時發 100 手牌，平均優勢 1.4%</span>
            </div>

            <div class="glass-card">
              <span class="stat-label" data-i18n="ror_stat_ror">${this.i18n.t('ror_stat_ror')}</span>
              <p class="stat-value cyan" id="ror-stat-ror" style="font-size: 1.8rem; margin: 0.4rem 0;">1.25%</p>
              <span style="font-size: 0.8rem; color: var(--text-muted);">破產風險低於 2% 即符合職業 AP 安全基準</span>
            </div>

            <div class="glass-card">
              <span class="stat-label" data-i18n="ror_stat_n0">${this.i18n.t('ror_stat_n0')}</span>
              <p class="stat-value gold" id="ror-stat-n0" style="font-size: 1.8rem; margin: 0.4rem 0;">6,800 手</p>
              <span style="font-size: 0.8rem; color: var(--text-muted);">期望獲利超越 1 個標準差波動之所需手數</span>
            </div>

          </div>
        </div>

        <!-- 蒙地卡羅資產走勢模擬折線圖 (Canvas) -->
        <div class="glass-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h3 style="font-family: var(--font-heading); color: var(--cyan-accent); font-size: 1.15rem;">📈 蒙地卡羅資產波動模擬軌跡 (5 次隨機實驗)</h3>
            <span class="brand-badge" id="ror-sim-status">模擬完成</span>
          </div>
          
          <div style="position: relative; width: 100%; height: 320px; background: rgba(0,0,0,0.5); border-radius: var(--radius-md); border: 1px solid var(--border-glass); padding: 10px;">
            <canvas id="ror-simulation-chart" style="width: 100%; height: 100%;"></canvas>
          </div>
        </div>

      </div>
    `;

    document.getElementById('btn-run-ror-sim')?.addEventListener('click', () => this.runSimulation());
    setTimeout(() => this.runSimulation(), 100);
  }

  runSimulation() {
    const bankroll = parseFloat(document.getElementById('ror-input-bankroll')?.value || 10000);
    const unit = parseFloat(document.getElementById('ror-input-unit')?.value || 25);
    const spread = parseInt(document.getElementById('ror-input-spread')?.value || 12, 10);
    const totalHands = parseInt(document.getElementById('ror-input-hands')?.value || 5000, 10);

    // 依下注級距計算平均優勢 (EV) 與標準差 (SD)
    // 6-Deck S17 典型 Hi-Lo 1:12 級距: EV ≈ 1.35% of total action, SD ≈ 1.15 per hand
    const avgAdvantage = 0.0135;
    const avgBetSize = unit * (1 + spread) * 0.25; // 綜合考慮各真數頻率下之平均注碼
    const evPerHand = avgBetSize * avgAdvantage;
    const hourlyEV = (evPerHand * 100).toFixed(2);
    const sdPerHand = avgBetSize * 1.15;

    // 破產率公式: RoR = exp(-2 * (EV * Bankroll) / (SD^2))
    const totalEVRate = evPerHand;
    const variance = Math.pow(sdPerHand, 2);
    const rorRaw = Math.exp(-2 * (totalEVRate * bankroll) / variance);
    const rorPercent = Math.min(100, Math.max(0, rorRaw * 100)).toFixed(2);

    // N0 旋轉點: N0 = (SD / EV)^2
    const n0 = Math.round(Math.pow(sdPerHand / totalEVRate, 2));

    // 更新 DOM
    const elEV = document.getElementById('ror-stat-ev');
    const elRoR = document.getElementById('ror-stat-ror');
    const elN0 = document.getElementById('ror-stat-n0');
    if (elEV) elEV.textContent = `+$${hourlyEV} / hr`;
    if (elRoR) {
      elRoR.textContent = `${rorPercent}%`;
      elRoR.className = `stat-value ${parseFloat(rorPercent) <= 2.0 ? 'emerald' : (parseFloat(rorPercent) <= 5.0 ? 'cyan' : 'danger')}`;
    }
    if (elN0) elN0.textContent = `${n0.toLocaleString()} 手`;

    // 繪製 5 條蒙地卡羅隨機漫步走勢
    this.drawChart(bankroll, evPerHand, sdPerHand, totalHands);
  }

  drawChart(initialBankroll, evPerHand, sdPerHand, totalHands) {
    const canvas = document.getElementById('ror-simulation-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = (canvas.width = canvas.parentElement.clientWidth - 20);
    const height = (canvas.height = canvas.parentElement.clientHeight - 20);

    ctx.clearRect(0, 0, width, height);

    // 產生 5 條模擬曲線
    const lines = [];
    const colors = ['#f59e0b', '#38bdf8', '#10b981', '#a855f7', '#ec4899'];
    const steps = 100;
    const stepSize = Math.floor(totalHands / steps);

    let minY = initialBankroll;
    let maxY = initialBankroll;

    for (let sim = 0; sim < 5; sim++) {
      const points = [initialBankroll];
      let currentB = initialBankroll;

      for (let s = 1; s <= steps; s++) {
        // 每 step 手牌的總獲利 = stepSize * evPerHand + N(0, 1) * sqrt(stepSize) * sdPerHand
        const u1 = Math.random();
        const u2 = Math.random();
        const z0 = Math.sqrt(-2.0 * Math.log(u1 || 0.001)) * Math.cos(2.0 * Math.PI * u2); // Box-Muller
        const delta = (stepSize * evPerHand) + (z0 * Math.sqrt(stepSize) * sdPerHand);
        
        currentB = Math.max(0, currentB + delta);
        points.push(currentB);
        if (currentB < minY) minY = currentB;
        if (currentB > maxY) maxY = currentB;
      }
      lines.push(points);
    }

    minY = Math.max(0, minY * 0.9);
    maxY = maxY * 1.1;

    const scaleX = (idx) => (idx / steps) * (width - 60) + 50;
    const scaleY = (val) => height - 30 - ((val - minY) / (maxY - minY || 1)) * (height - 50);

    // 繪製背景水平網格線
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillStyle = '#64748b';

    for (let i = 0; i <= 4; i++) {
      const yVal = minY + (i / 4) * (maxY - minY);
      const yPos = scaleY(yVal);
      ctx.beginPath();
      ctx.moveTo(50, yPos);
      ctx.lineTo(width, yPos);
      ctx.stroke();
      ctx.fillText(`$${Math.round(yVal)}`, 5, yPos + 3);
    }

    // 繪製初始資金基準線 (Initial Line)
    const initYPos = scaleY(initialBankroll);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(50, initYPos);
    ctx.lineTo(width, initYPos);
    ctx.stroke();
    ctx.setLineDash([]);

    // 繪製 5 條模擬折線
    lines.forEach((points, lIdx) => {
      ctx.strokeStyle = colors[lIdx];
      ctx.lineWidth = 2;
      ctx.beginPath();
      points.forEach((p, idx) => {
        const x = scaleX(idx);
        const y = scaleY(p);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
  }
}
