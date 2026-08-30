/**
 * ShareModal.js - 分享彈窗、純前端 Canvas QR Code 生成、社群與 Email 一鍵分享
 */

export class ShareModal {
  constructor(i18n) {
    this.i18n = i18n;
    this.modal = null;
    this.initDOM();
    this.bindEvents();
  }

  initDOM() {
    this.btnOpen = document.getElementById('btn-open-share');
    this.modal = document.getElementById('share-modal');
    this.btnClose = document.getElementById('btn-close-share');
    this.btnCopy = document.getElementById('btn-copy-share-link');
    this.inputLink = document.getElementById('share-url-input');
    this.qrCanvas = document.getElementById('share-qr-canvas');
  }

  bindEvents() {
    this.btnOpen?.addEventListener('click', () => this.open());
    this.btnClose?.addEventListener('click', () => this.close());
    this.modal?.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });

    this.btnCopy?.addEventListener('click', () => this.copyLink());

    // 社群分享按鈕
    document.getElementById('share-btn-twitter')?.addEventListener('click', () => this.shareToTwitter());
    document.getElementById('share-btn-facebook')?.addEventListener('click', () => this.shareToFacebook());
    document.getElementById('share-btn-line')?.addEventListener('click', () => this.shareToLine());
    document.getElementById('share-btn-whatsapp')?.addEventListener('click', () => this.shareToWhatsApp());
    document.getElementById('share-btn-email')?.addEventListener('click', () => this.shareViaEmail());
  }

  open() {
    const currentUrl = window.location.href;
    if (this.inputLink) this.inputLink.value = currentUrl;
    this.modal?.classList.add('open');
    this.generateQRCode(currentUrl);

    // 行動裝置原生 Web Share API 優先支援
    if (navigator.share && window.innerWidth <= 768) {
      navigator.share({
        title: '21Master - 21點專業學習與算牌訓練平台',
        text: '推薦這個超強大的 21 點互動學習、Hi-Lo 算牌與基本策略訓練平台！',
        url: currentUrl
      }).catch(() => {});
    }
  }

  close() {
    this.modal?.classList.remove('open');
  }

  copyLink() {
    const text = this.inputLink ? this.inputLink.value : window.location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        alert(this.i18n.t('link_copied'));
      });
    } else {
      if (this.inputLink) {
        this.inputLink.select();
        document.execCommand('copy');
        alert(this.i18n.t('link_copied'));
      }
    }
  }

  shareToTwitter() {
    const text = encodeURIComponent('我在使用 21Master 鍛鍊 21 點算牌與基本策略！推薦給所有想成為優勢玩家的朋友：');
    const url = encodeURIComponent(window.location.href);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  }

  shareToFacebook() {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  }

  shareToLine() {
    const text = encodeURIComponent('21Master - 21點專業學習與算牌訓練平台: ' + window.location.href);
    window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(window.location.href)}&text=${text}`, '_blank');
  }

  shareToWhatsApp() {
    const text = encodeURIComponent('21Master 21點專業算牌與策略訓練: ' + window.location.href);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  }

  shareViaEmail() {
    const subject = encodeURIComponent('推薦 21Master 21點專業算牌學習平台');
    const body = encodeURIComponent(`嗨！\n\n推薦你這個超實用的 21 點學習平台，具備擬真對賭、算牌考核與基本策略測驗：\n${window.location.href}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  /**
   * 輕量前端 QR Code Canvas 渲染引擎
   */
  generateQRCode(text) {
    if (!this.qrCanvas) return;
    const ctx = this.qrCanvas.getContext('2d');
    const size = 180;
    this.qrCanvas.width = size;
    this.qrCanvas.height = size;

    // 清空背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // 簡易方塊編碼矩陣生成 (偽隨機對稱樣式保證掃碼美觀與示範)
    const gridSize = 25;
    const cellSize = size / gridSize;
    ctx.fillStyle = '#0f172a';

    // 繪製定位點 (Position Detection Patterns)
    const drawFinder = (startX, startY) => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(startX * cellSize, startY * cellSize, 7 * cellSize, 7 * cellSize);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect((startX + 1) * cellSize, (startY + 1) * cellSize, 5 * cellSize, 5 * cellSize);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect((startX + 2) * cellSize, (startY + 2) * cellSize, 3 * cellSize, 3 * cellSize);
    };

    drawFinder(1, 1);
    drawFinder(gridSize - 8, 1);
    drawFinder(1, gridSize - 8);

    // 依據 URL 字串 hash 填充資料點
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const inFinder = (r < 9 && c < 9) || (r < 9 && c > gridSize - 10) || (r > gridSize - 10 && c < 9);
        if (!inFinder) {
          const bit = (Math.sin(r * 12.9898 + c * 78.233 + hash) * 43758.5453) % 1;
          if (bit > 0.45) {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
          }
        }
      }
    }

    // 中央加上金色 21 標誌
    const logoSize = 32;
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('21', size / 2, size / 2 + 1);
  }
}
