import { JoystickController } from './joystick-controller.ts';
import type { Vector2 } from '../shared/vector2.ts';

const JOYSTICK_RADIUS = 62;
const JOYSTICK_DEAD_ZONE = 12;
const INTERACTIVE_SELECTOR = 'button, a, input, select, textarea, [role="button"], [data-joystick-exclude]';

export class VirtualJoystick {
  private readonly controller = new JoystickController(JOYSTICK_RADIUS, JOYSTICK_DEAD_ZONE);
  private readonly playSurface: HTMLElement;
  private readonly joystickElement: HTMLElement;
  private readonly knobElement: HTMLElement;
  private readonly eventTarget: EventTarget;
  private readonly onDirectionChange: (vector: Vector2) => void;
  private enabled = true;
  private destroyed = false;

  constructor(
    playSurface: HTMLElement,
    joystickElement: HTMLElement,
    knobElement: HTMLElement,
    eventTarget: EventTarget = window,
    onDirectionChange: (vector: Vector2) => void = () => {},
  ) {
    this.playSurface = playSurface;
    this.joystickElement = joystickElement;
    this.knobElement = knobElement;
    this.eventTarget = eventTarget;
    this.onDirectionChange = onDirectionChange;
    this.joystickElement.setAttribute('aria-hidden', 'true');
    this.joystickElement.classList.remove('is-visible');
    this.resetKnob();

    this.playSurface.addEventListener('pointerdown', this.handlePointerDown);
    this.playSurface.addEventListener('lostpointercapture', this.handlePointerEnd);
    this.eventTarget.addEventListener('pointermove', this.handlePointerMove as EventListener);
    this.eventTarget.addEventListener('pointerup', this.handlePointerEnd as EventListener);
    this.eventTarget.addEventListener('pointercancel', this.handlePointerEnd as EventListener);
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (!this.enabled || this.destroyed) return;

    const bounds = this.playSurface.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const isInteractiveTarget = event.composedPath().some((target) => {
      const element = target as Element;
      return typeof element.matches === 'function' && element.matches(INTERACTIVE_SELECTOR);
    });

    if (!this.controller.begin(event.pointerId, event.pointerType, x, y, isInteractiveTarget)) return;

    this.onDirectionChange({ x: 0, y: 0 });

    this.joystickElement.style.left = `${this.controller.origin?.x ?? x}px`;
    this.joystickElement.style.top = `${this.controller.origin?.y ?? y}px`;
    this.joystickElement.setAttribute('aria-hidden', 'false');
    this.joystickElement.classList.add('is-visible');

    try {
      this.playSurface.setPointerCapture(event.pointerId);
    } catch {
      // Window-level pointer listeners still complete the gesture if capture is unavailable.
    }
  };

  private readonly handlePointerMove = (event: Event): void => {
    const pointer = event as PointerEvent;
    const bounds = this.playSurface.getBoundingClientRect();
    const x = pointer.clientX - bounds.left;
    const y = pointer.clientY - bounds.top;
    if (x < 0 || x > bounds.width || y < 0 || y > bounds.height) {
      this.handlePointerEnd(pointer);
      return;
    }

    const offset = this.controller.move(
      pointer.pointerId,
      x,
      y,
    );
    if (!offset) return;

    this.knobElement.style.setProperty('--knob-x', `${offset.x}px`);
    this.knobElement.style.setProperty('--knob-y', `${offset.y}px`);
    this.onDirectionChange({
      x: offset.x / JOYSTICK_RADIUS,
      y: offset.y / JOYSTICK_RADIUS,
    });
  };

  private readonly handlePointerEnd = (event: Event): void => {
    const pointer = event as PointerEvent;
    if (pointer.pointerId !== this.controller.activePointerId) return;
    this.clearActiveGesture();
  };

  private clearActiveGesture(): boolean {
    const pointerId = this.controller.activePointerId;
    if (pointerId === null || !this.controller.end(pointerId)) return false;

    this.hideAndReset();
    this.onDirectionChange({ x: 0, y: 0 });

    try {
      if (this.playSurface.hasPointerCapture(pointerId)) {
        this.playSurface.releasePointerCapture(pointerId);
      }
    } catch {
      // Capture may already have been released by pointercancel or lostpointercapture.
    }

    return true;
  }

  private hideAndReset(): void {
    this.joystickElement.classList.remove('is-visible');
    this.joystickElement.setAttribute('aria-hidden', 'true');
    this.resetKnob();
  }

  setEnabled(enabled: boolean): void {
    if (this.destroyed) return;
    this.enabled = enabled;

    if (!enabled && !this.clearActiveGesture()) {
      this.hideAndReset();
      this.onDirectionChange({ x: 0, y: 0 });
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.clearActiveGesture();
    this.playSurface.removeEventListener('pointerdown', this.handlePointerDown);
    this.playSurface.removeEventListener('lostpointercapture', this.handlePointerEnd);
    this.eventTarget.removeEventListener('pointermove', this.handlePointerMove as EventListener);
    this.eventTarget.removeEventListener('pointerup', this.handlePointerEnd as EventListener);
    this.eventTarget.removeEventListener('pointercancel', this.handlePointerEnd as EventListener);
  }

  private resetKnob(): void {
    this.knobElement.style.setProperty('--knob-x', '0px');
    this.knobElement.style.setProperty('--knob-y', '0px');
  }
}
