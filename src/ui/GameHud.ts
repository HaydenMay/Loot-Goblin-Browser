export interface GameHudOptions {
  keyboardTarget?: EventTarget;
  onPauseChange?: (paused: boolean) => void;
}

export class GameHud {
  private readonly goldPanel: HTMLElement;
  private readonly goldValue: HTMLElement;
  private readonly pauseButton: HTMLButtonElement;
  private readonly pauseOverlay: HTMLElement;
  private readonly resumeButton: HTMLButtonElement;
  private readonly keyboardTarget: EventTarget;
  private readonly onPauseChange: (paused: boolean) => void;
  private paused = false;

  constructor(playSurface: HTMLElement, options: GameHudOptions = {}) {
    this.goldPanel = this.requireElement<HTMLElement>(playSurface, '#gold-panel');
    this.goldValue = this.requireElement<HTMLElement>(playSurface, '#gold-value');
    this.pauseButton = this.requireElement<HTMLButtonElement>(playSurface, '#pause-button');
    this.pauseOverlay = this.requireElement<HTMLElement>(playSurface, '#pause-overlay');
    this.resumeButton = this.requireElement<HTMLButtonElement>(playSurface, '#resume-button');
    this.keyboardTarget = options.keyboardTarget
      ?? (typeof window === 'undefined' ? new EventTarget() : window);
    this.onPauseChange = options.onPauseChange ?? (() => {});

    this.pauseOverlay.hidden = true;
    this.pauseButton.setAttribute('aria-expanded', 'false');
    this.pauseButton.addEventListener('click', this.openPause);
    this.resumeButton.addEventListener('click', this.closePause);
    this.keyboardTarget.addEventListener('keydown', this.handleKeydown);
  }

  setGold(gold: number): void {
    const value = Number.isFinite(gold) ? Math.max(0, Math.floor(gold)) : 0;
    this.goldValue.textContent = String(value);
    this.goldPanel.setAttribute('aria-label', `Gold: ${value}`);
  }

  destroy(): void {
    this.pauseButton.removeEventListener('click', this.openPause);
    this.resumeButton.removeEventListener('click', this.closePause);
    this.keyboardTarget.removeEventListener('keydown', this.handleKeydown);
  }

  private readonly openPause = (): void => {
    if (this.paused) return;
    this.paused = true;
    this.pauseOverlay.hidden = false;
    this.pauseButton.setAttribute('aria-expanded', 'true');
    this.resumeButton.focus({ preventScroll: true });
    this.onPauseChange(true);
  };

  private readonly closePause = (): void => {
    if (!this.paused) return;
    this.paused = false;
    this.pauseOverlay.hidden = true;
    this.pauseButton.setAttribute('aria-expanded', 'false');
    this.pauseButton.focus({ preventScroll: true });
    this.onPauseChange(false);
  };

  private readonly handleKeydown = (event: Event): void => {
    if (!this.paused) return;

    const keyEvent = event as KeyboardEvent;
    if (keyEvent.key === 'Escape') {
      keyEvent.preventDefault();
      this.closePause();
      return;
    }

    if (keyEvent.key === 'Tab') {
      keyEvent.preventDefault();
      this.resumeButton.focus({ preventScroll: true });
    }
  };

  private requireElement<T extends HTMLElement>(parent: ParentNode, selector: string): T {
    const element = parent.querySelector<T>(selector);
    if (!element) throw new Error(`Missing required game HUD element: ${selector}`);
    return element;
  }
}
