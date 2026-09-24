import assert from 'node:assert/strict';
import test from 'node:test';
import { VirtualJoystick } from '../src/input/VirtualJoystick.ts';
import type { Vector2 } from '../src/shared/vector2.ts';
import { GameHud } from '../src/ui/GameHud.ts';

class FakeStyle {
  left = '';
  top = '';
  private readonly properties = new Map<string, string>();

  setProperty(name: string, value: string): void {
    this.properties.set(name, value);
  }

  getPropertyValue(name: string): string {
    return this.properties.get(name) ?? '';
  }
}

class FakeClassList {
  private readonly values = new Set<string>();

  add(value: string): void {
    this.values.add(value);
  }

  remove(value: string): void {
    this.values.delete(value);
  }

  contains(value: string): boolean {
    return this.values.has(value);
  }
}

class FakeElement extends EventTarget {
  readonly rect: { left: number; top: number; width: number; height: number };
  readonly style = new FakeStyle();
  readonly classList = new FakeClassList();
  readonly attributes = new Map<string, string>();
  readonly children = new Map<string, FakeElement>();
  focused = false;
  hidden = false;
  interactive = false;

  constructor(rect = { left: 0, top: 0, width: 390, height: 844 }) {
    super();
    this.rect = rect;
  }

  querySelector(selector: string): FakeElement | null {
    return this.children.get(selector) ?? null;
  }

  getBoundingClientRect(): DOMRect {
    return this.rect as DOMRect;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  focus(): void {
    this.focused = true;
  }

  matches(): boolean {
    return this.interactive;
  }
}

class PointerInputEvent extends Event {
  readonly pointerId: number;
  readonly pointerType: string;
  readonly clientX: number;
  readonly clientY: number;

  constructor(
    type: string,
    pointerId: number,
    pointerType: string,
    clientX: number,
    clientY: number,
  ) {
    super(type, { bubbles: true, cancelable: true });
    this.pointerId = pointerId;
    this.pointerType = pointerType;
    this.clientX = clientX;
    this.clientY = clientY;
  }
}

function pointerEvent(
  type: string,
  pointerId: number,
  pointerType: string,
  clientX: number,
  clientY: number,
  path: FakeElement[],
): PointerInputEvent {
  const event = new PointerInputEvent(type, pointerId, pointerType, clientX, clientY);
  Object.defineProperty(event, 'composedPath', { value: () => path });
  return event;
}

test('Pause opens an accessible overlay and Resume closes it and restores focus', () => {
  const playSurface = new FakeElement();
  const pause = new FakeElement();
  const overlay = new FakeElement();
  const resume = new FakeElement();
  overlay.hidden = true;
  playSurface.children.set('#pause-button', pause);
  playSurface.children.set('#pause-overlay', overlay);
  playSurface.children.set('#resume-button', resume);
  new GameHud(playSurface as unknown as HTMLElement);

  pause.dispatchEvent(new Event('click'));
  assert.equal(overlay.hidden, false);
  assert.equal(pause.attributes.get('aria-expanded'), 'true');
  assert.equal(resume.focused, true);

  resume.dispatchEvent(new Event('click'));
  assert.equal(overlay.hidden, true);
  assert.equal(pause.attributes.get('aria-expanded'), 'false');
  assert.equal(pause.focused, true);
});

test('floating joystick anchors touch in host coordinates and follows that pointer', () => {
  const playSurface = new FakeElement({ left: 20, top: 40, width: 390, height: 844 });
  const joystickElement = new FakeElement();
  const knobElement = new FakeElement();
  const eventTarget = new EventTarget();
  const directions: Vector2[] = [];
  new VirtualJoystick(
    playSurface as unknown as HTMLElement,
    joystickElement as unknown as HTMLElement,
    knobElement as unknown as HTMLElement,
    eventTarget,
    (vector) => directions.push(vector),
  );

  const start = pointerEvent('pointerdown', 4, 'touch', 140, 240, [playSurface]);
  playSurface.dispatchEvent(start);
  assert.deepEqual(directions, [{ x: 0, y: 0 }]);
  assert.equal(joystickElement.classList.contains('is-visible'), true);
  assert.equal(joystickElement.style.left, '120px');
  assert.equal(joystickElement.style.top, '200px');
  assert.equal(joystickElement.attributes.get('aria-hidden'), 'false');

  playSurface.dispatchEvent(pointerEvent('pointerdown', 5, 'touch', 200, 240, [playSurface]));
  eventTarget.dispatchEvent(pointerEvent('pointermove', 5, 'touch', 260, 240, [playSurface]));
  assert.equal(directions.length, 1);

  eventTarget.dispatchEvent(pointerEvent('pointermove', 4, 'touch', 180, 240, [playSurface]));
  assert.ok(directions[1].x > 0 && directions[1].x < 1);
  assert.equal(directions[1].y, 0);
  assert.ok(Number.parseFloat(knobElement.style.getPropertyValue('--knob-x')) > 0);
  assert.equal(knobElement.style.getPropertyValue('--knob-y'), '0px');

  eventTarget.dispatchEvent(pointerEvent('pointermove', 4, 'touch', 250, 240, [playSurface]));
  assert.deepEqual(directions[2], { x: 1, y: 0 });

  eventTarget.dispatchEvent(pointerEvent('pointerup', 4, 'touch', 180, 240, [playSurface]));
  assert.deepEqual(directions[3], { x: 0, y: 0 });
  assert.equal(joystickElement.classList.contains('is-visible'), false);
  assert.equal(joystickElement.attributes.get('aria-hidden'), 'true');
});

test('mouse and interactive UI pointer starts do not reveal the joystick', () => {
  const playSurface = new FakeElement();
  const joystickElement = new FakeElement();
  const knobElement = new FakeElement();
  const button = new FakeElement();
  button.interactive = true;
  const eventTarget = new EventTarget();
  new VirtualJoystick(
    playSurface as unknown as HTMLElement,
    joystickElement as unknown as HTMLElement,
    knobElement as unknown as HTMLElement,
    eventTarget,
  );

  playSurface.dispatchEvent(pointerEvent('pointerdown', 1, 'mouse', 30, 40, [playSurface]));
  playSurface.dispatchEvent(pointerEvent('pointerdown', 2, 'touch', 30, 40, [button, playSurface]));
  assert.equal(joystickElement.classList.contains('is-visible'), false);
});

test('pointer cancellation hides the floating joystick', () => {
  const playSurface = new FakeElement();
  const joystickElement = new FakeElement();
  const knobElement = new FakeElement();
  const eventTarget = new EventTarget();
  const directions: Vector2[] = [];
  new VirtualJoystick(
    playSurface as unknown as HTMLElement,
    joystickElement as unknown as HTMLElement,
    knobElement as unknown as HTMLElement,
    eventTarget,
    (vector) => directions.push(vector),
  );

  playSurface.dispatchEvent(pointerEvent('pointerdown', 5, 'touch', 120, 200, [playSurface]));
  eventTarget.dispatchEvent(pointerEvent('pointercancel', 5, 'touch', 120, 200, [playSurface]));
  assert.deepEqual(directions, [{ x: 0, y: 0 }, { x: 0, y: 0 }]);
  assert.equal(joystickElement.classList.contains('is-visible'), false);
  assert.equal(joystickElement.attributes.get('aria-hidden'), 'true');
});

test('leaving the play surface ends the floating joystick gesture', () => {
  const playSurface = new FakeElement({ left: 20, top: 40, width: 390, height: 844 });
  const joystickElement = new FakeElement();
  const knobElement = new FakeElement();
  const eventTarget = new EventTarget();
  const directions: Vector2[] = [];
  new VirtualJoystick(
    playSurface as unknown as HTMLElement,
    joystickElement as unknown as HTMLElement,
    knobElement as unknown as HTMLElement,
    eventTarget,
    (vector) => directions.push(vector),
  );

  playSurface.dispatchEvent(pointerEvent('pointerdown', 7, 'touch', 140, 240, [playSurface]));
  eventTarget.dispatchEvent(pointerEvent('pointermove', 7, 'touch', 10, 240, [playSurface]));

  assert.equal(joystickElement.classList.contains('is-visible'), false);
  assert.equal(joystickElement.attributes.get('aria-hidden'), 'true');
  assert.equal(knobElement.style.getPropertyValue('--knob-x'), '0px');
  assert.deepEqual(directions.at(-1), { x: 0, y: 0 });
});

test('lost pointer capture hides the floating joystick', () => {
  const playSurface = new FakeElement();
  const joystickElement = new FakeElement();
  const knobElement = new FakeElement();
  const eventTarget = new EventTarget();
  const directions: Vector2[] = [];
  new VirtualJoystick(
    playSurface as unknown as HTMLElement,
    joystickElement as unknown as HTMLElement,
    knobElement as unknown as HTMLElement,
    eventTarget,
    (vector) => directions.push(vector),
  );

  playSurface.dispatchEvent(pointerEvent('pointerdown', 6, 'touch', 160, 280, [playSurface]));
  playSurface.dispatchEvent(pointerEvent('lostpointercapture', 6, 'touch', 160, 280, [playSurface]));
  assert.deepEqual(directions, [{ x: 0, y: 0 }, { x: 0, y: 0 }]);
  assert.equal(joystickElement.classList.contains('is-visible'), false);
  assert.equal(joystickElement.attributes.get('aria-hidden'), 'true');
});

test('disabling the joystick clears active input and requires a fresh touch after enabling', () => {
  const playSurface = new FakeElement();
  const joystickElement = new FakeElement();
  const knobElement = new FakeElement();
  const eventTarget = new EventTarget();
  const directions: Vector2[] = [];
  const joystick = new VirtualJoystick(
    playSurface as unknown as HTMLElement,
    joystickElement as unknown as HTMLElement,
    knobElement as unknown as HTMLElement,
    eventTarget,
    (vector) => directions.push(vector),
  );

  playSurface.dispatchEvent(pointerEvent('pointerdown', 8, 'touch', 120, 200, [playSurface]));
  eventTarget.dispatchEvent(pointerEvent('pointermove', 8, 'touch', 180, 200, [playSurface]));
  assert.ok(directions.at(-1)!.x > 0);

  joystick.setEnabled(false);
  assert.deepEqual(directions.at(-1), { x: 0, y: 0 });
  assert.equal(joystickElement.classList.contains('is-visible'), false);

  playSurface.dispatchEvent(pointerEvent('pointerdown', 9, 'touch', 120, 200, [playSurface]));
  assert.equal(joystickElement.classList.contains('is-visible'), false);

  joystick.setEnabled(true);
  playSurface.dispatchEvent(pointerEvent('pointerdown', 9, 'touch', 120, 200, [playSurface]));
  assert.deepEqual(directions.at(-1), { x: 0, y: 0 });
  assert.equal(joystickElement.classList.contains('is-visible'), true);
});

test('destroying the joystick clears input and removes its pointer listeners', () => {
  const playSurface = new FakeElement();
  const joystickElement = new FakeElement();
  const knobElement = new FakeElement();
  const eventTarget = new EventTarget();
  const directions: Vector2[] = [];
  const joystick = new VirtualJoystick(
    playSurface as unknown as HTMLElement,
    joystickElement as unknown as HTMLElement,
    knobElement as unknown as HTMLElement,
    eventTarget,
    (vector) => directions.push(vector),
  );

  playSurface.dispatchEvent(pointerEvent('pointerdown', 10, 'touch', 120, 200, [playSurface]));
  eventTarget.dispatchEvent(pointerEvent('pointermove', 10, 'touch', 180, 200, [playSurface]));
  joystick.destroy();

  assert.deepEqual(directions.at(-1), { x: 0, y: 0 });
  assert.equal(joystickElement.classList.contains('is-visible'), false);
  const countAfterDestroy = directions.length;
  playSurface.dispatchEvent(pointerEvent('pointerdown', 11, 'touch', 120, 200, [playSurface]));
  eventTarget.dispatchEvent(pointerEvent('pointermove', 10, 'touch', 220, 200, [playSurface]));
  eventTarget.dispatchEvent(pointerEvent('pointerup', 10, 'touch', 220, 200, [playSurface]));
  assert.equal(directions.length, countAfterDestroy);
});
