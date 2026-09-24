export class GameHud {
  private readonly pauseButton: HTMLButtonElement;
  private readonly pauseOverlay: HTMLElement;
  private readonly resumeButton: HTMLButtonElement;

  constructor(playSurface: HTMLElement) {
    this.pauseButton = this.requireElement<HTMLButtonElement>(playSurface, '#pause-button');
    this.pauseOverlay = this.requireElement<HTMLElement>(playSurface, '#pause-overlay');
    this.resumeButton = this.requireElement<HTMLButtonElement>(playSurface, '#resume-button');

    this.pauseOverlay.hidden = true;
    this.pauseButton.setAttribute('aria-expanded', 'false');
    this.pauseButton.addEventListener('click', this.openPause);
    this.resumeButton.addEventListener('click', this.closePause);
  }

  private readonly openPause = (): void => {
    this.pauseOverlay.hidden = false;
    this.pauseButton.setAttribute('aria-expanded', 'true');
    this.resumeButton.focus({ preventScroll: true });
  };

  private readonly closePause = (): void => {
    this.pauseOverlay.hidden = true;
    this.pauseButton.setAttribute('aria-expanded', 'false');
    this.pauseButton.focus({ preventScroll: true });
  };

  private requireElement<T extends HTMLElement>(parent: ParentNode, selector: string): T {
    const element = parent.querySelector<T>(selector);
    if (!element) throw new Error(`Missing required game HUD element: ${selector}`);
    return element;
  }
}
