# 21Master - 21點專業學習與算牌訓練平台 (Blackjack Pro & Card Counting Simulator)

![Platform](https://img.shields.io/badge/Platform-Web-blue.svg)
![Vanilla JS](https://img.shields.io/badge/Tech-HTML5%20%7C%20CSS3%20%7C%20ES6-emerald.svg)
![License](https://img.shields.io/badge/License-MIT-gold.svg)

**21Master** 是一款現代高奢科技暗黑風格、純前端零依賴、具備三大核心模組的 21 點（Blackjack）互動學習、算牌訓練與策略考核平台。

> ### ⚠️ 免責聲明與教育學習聲明 (Disclaimer & Educational Purpose)
> 1. **學術與程式開發研究**：本專案純粹為開發者個人研究**機率統計、博弈數學理論（Game Theory）、蒙地卡羅模擬（Monte Carlo Simulation）與前端技術**之學習與技術分享成果。
> 2. **非投資與博弈建議**：本平台內所有模擬數據、策略矩陣、算牌指引與凱利公式計算結果**僅供數學教學、學術研究與休閒娛樂參考**，不構成任何商業投注或博弈獲利保證。
> 3. **反對並嚴禁不法賭博**：本專案**絕不提倡、推廣或鼓勵任何形式之非法賭博、地下賭博或沉迷博弈行為**。真實賭場規則與防算牌措施多變，使用者應遵守所在地之法律法規，並對個人行為完全自負其責。

---

## 🌟 核心特色

### 1. 擬真半圓形綠氈牌桌對賭 (Interactive Table Simulator)
- **桌上一體化設計**：籌碼餘額、當前注額、牌靴狀態、籌碼架與決策按鈕直接內建於桌面。
- **嚴格每局重新下注機制**：支援籌碼堆疊、Clear 清空、2x 加倍、Rebet 重複注碼。
- **有感教練模式 (Coach Mode)**：
  - 開啟時：桌中央即時推薦最佳動作，並於對應按鈕加上金色呼吸光暈與「★ 推薦」徽章；走錯時彈出 EV 損失警報。
  - 關閉時：100% 還原真實賭場實戰，無任何提示干擾。
- **自訂賭規引擎**：副數 (1~8)、S17/H17、DAS、Late Surrender 及 Hi-Lo / KO / Omega II 算牌法。

### 2. 算牌記憶考核營 (Card Counting Camp)
- ⚡ **閃卡秒算訓練**：單張與成對相消 (+1, 0, -1) 極速鍵盤反射考核。
- ⏱️ **52張整副牌倒數挑戰**：隨機扣暗牌，訓練 20 秒內數完 51 張並依零和原理反推暗牌。
- 📐 **牌靴厚度與真數折算**：目測棄牌盒厚度，心算除法折算 True Count。
- 👑 **Illustrious 18 偏差測驗**：針對真數改變時偏離基本策略的高階決策進行考核。

### 3. 基本策略精熟測驗 (Basic Strategy Mastery)
- 🎯 **情境快問快答**：Hard / Soft / Pair / Surrender 快速判斷與連擊計分。
- 📊 **全策略矩陣 100 格填空**：即時顏色糾錯與一鍵解答。
- 🛡️ **4 大最高失誤率盲點專項突擊**：Soft 18 (A,7)、12 vs 2/3、9,9 vs 7 等經典難題深入解析。

### 4. 學習數據與 5 階等級成就系統 (Analytics & Progression)
- 自動記錄決策準確率、反應毫秒、錯題紀錄並儲存於 `localStorage`。
- 從「Lv 1. 賭場綠角」至「Lv 5. MIT 傳奇玩家」的成長等級。

---

## 🚀 快速開始

本專案採用純原生前端技術（HTML5 + Vanilla CSS3 + ES6 Modules + Web Audio API），無任何第三方套件依賴：

```bash
# 啟動本地靜態伺服器
python -m http.server 3000
```
開啟瀏覽器造訪：`http://localhost:3000` 即可暢玩。

---

## 📁 專案架構

- `index.html`：主應用入口
- `css/`：設計系統 Tokens、賭桌樣式、算牌測驗、策略測驗與 Mobile RWD 樣式
- `js/engine/`：撲克牌定義、牌靴洗牌、基本策略/偏差矩陣、算牌引擎、Web Audio 音效合成器
- `js/modules/`：對賭模擬器、算牌考核營、策略測驗、數據分析
- `BLACKJACK_STRATEGY_AND_CARD_COUNTING_GUIDE.md`：21點算牌法與策略表權威資料庫
- `PRD_BLACKJACK_LEARNING_PLATFORM.md`：產品需求文件 (PRD)

---

## 📄 License
MIT License
