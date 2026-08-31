/**
 * DisclaimerModal.js - 網站開啟前強制入口警示頁模組 (支援 session 內重新整理不重複彈出)
 */

export class DisclaimerModal {
  constructor(i18n, sound) {
    this.i18n = i18n;
    this.sound = sound;
    this.storageKey = "21master_session_disclaimer_accepted";
    this.isReviewMode = false;

    this.modal = null;
    this.mainContent = null;
    this.btnEnter = null;
    this.btnLeave = null;
    this.btnOpenFooter = null;

    this.initDOM();
    this.bindEvents();
    this.registerGlobalHelpers();
    this.checkInitialState();
  }

  initDOM() {
    this.modal = document.getElementById("disclaimer-modal");
    this.mainContent = document.getElementById("main-app-content");
    this.btnEnter = document.getElementById("btn-disclaimer-enter");
    this.btnLeave = document.getElementById("btn-disclaimer-leave");
    this.btnOpenFooter = document.getElementById("link-open-disclaimer");
  }

  bindEvents() {
    const handleEnter = (e) => {
      if (e) e.preventDefault();
      this.acceptAndEnter();
    };

    const handleLeave = (e) => {
      if (e) e.preventDefault();
      this.handleCancel();
    };

    if (this.btnEnter) this.btnEnter.onclick = handleEnter;
    if (this.btnLeave) this.btnLeave.onclick = handleLeave;

    this.modal?.addEventListener("click", (e) => {
      const enterBtn = e.target.closest("#btn-disclaimer-enter");
      const leaveBtn = e.target.closest("#btn-disclaimer-leave");

      if (enterBtn) {
        e.preventDefault();
        this.acceptAndEnter();
        return;
      }

      if (leaveBtn) {
        e.preventDefault();
        this.handleCancel();
        return;
      }

      if (e.target === this.modal) {
        this.shakeCard();
      }
    });

    if (this.btnOpenFooter) {
      this.btnOpenFooter.onclick = (e) => {
        if (e) e.preventDefault();
        this.openReview();
      };
    }

    window.addEventListener("keydown", (e) => {
      if (!this.isOpen()) return;
      if (e.key === "Enter") {
        this.acceptAndEnter();
      } else if (e.key === "Escape" && this.isReviewMode) {
        this.closeReview();
      }
    });
  }

  shakeCard() {
    const card = this.modal?.querySelector(".modal-card");
    card?.classList.add("shake-highlight");
    setTimeout(() => card?.classList.remove("shake-highlight"), 450);
  }

  handleCancel() {
    if (this.isReviewMode) {
      this.closeReview();
      return;
    }
    this.shakeCard();
    alert("⚠️ 歡迎使用 21Master！請詳閱說明並點選「我已詳閱並同意 (進入網站)」以進入主畫面。");
  }

  checkInitialState() {
    let isAcceptedInSession = false;
    try {
      isAcceptedInSession = sessionStorage.getItem(this.storageKey) === "true";
    } catch (e) {
      isAcceptedInSession = false;
    }

    if (isAcceptedInSession) {
      this.revealMainImmediate();
    } else {
      this.showGate();
    }
  }

  revealMainImmediate() {
    this.isReviewMode = false;
    if (this.modal) {
      this.modal.style.display = "none";
      this.modal.classList.remove("open", "gate-mode");
    }
    if (this.mainContent) {
      this.mainContent.style.display = "block";
    }
    document.body.classList.remove("modal-locked");
  }

  showGate() {
    this.isReviewMode = false;
    if (this.mainContent) this.mainContent.style.display = "none";
    if (this.modal) {
      this.modal.style.display = "flex";
      this.modal.classList.add("open", "gate-mode");
      this.modal.classList.remove("fade-out");
    }
    document.body.classList.add("modal-locked");
  }

  acceptAndEnter() {
    try {
      sessionStorage.setItem(this.storageKey, "true");
    } catch (e) {}

    try {
      this.sound?.playCorrect();
    } catch (e) {}

    if (this.modal) {
      this.modal.classList.add("fade-out");
      this.modal.classList.remove("open");
    }
    document.body.classList.remove("modal-locked");

    if (this.mainContent) {
      this.mainContent.style.display = "block";
    }

    setTimeout(() => {
      if (this.modal) this.modal.style.display = "none";
      window.app?.tableModule?.render?.();
    }, 200);
  }

  openReview() {
    this.isReviewMode = true;
    if (this.modal) {
      this.modal.style.display = "flex";
      this.modal.classList.add("open");
      this.modal.classList.remove("fade-out", "gate-mode");
    }
    document.body.classList.add("modal-locked");
  }

  closeReview() {
    if (this.modal) {
      this.modal.classList.add("fade-out");
      this.modal.classList.remove("open");
    }
    document.body.classList.remove("modal-locked");
    setTimeout(() => {
      if (this.modal) this.modal.style.display = "none";
    }, 200);
  }

  isOpen() {
    return this.modal && this.modal.style.display !== "none";
  }

  registerGlobalHelpers() {
    window.disclaimerModalInstance = this;
    window.acceptDisclaimerModal = () => this.acceptAndEnter();
    window.rejectDisclaimerModal = () => this.handleCancel();
    window.closeDisclaimerModal = () => (this.isReviewMode ? this.closeReview() : this.handleCancel());
    window.openDisclaimerModal = () => this.openReview();
  }
}

