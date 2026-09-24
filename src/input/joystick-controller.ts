import { calculateKnobOffset, type KnobOffset } from './joystick-math.ts';

export interface JoystickOrigin {
  x: number;
  y: number;
}

export class JoystickController {
  private _activePointerId: number | null = null;
  private _origin: JoystickOrigin | null = null;
  private readonly radius: number;
  private readonly deadZone: number;

  constructor(radius: number, deadZone: number) {
    this.radius = radius;
    this.deadZone = deadZone;
  }

  get activePointerId(): number | null {
    return this._activePointerId;
  }

  get origin(): JoystickOrigin | null {
    return this._origin ? { ...this._origin } : null;
  }

  begin(
    pointerId: number,
    pointerType: string,
    x: number,
    y: number,
    isInteractiveTarget: boolean,
  ): boolean {
    if (
      pointerType !== 'touch' ||
      isInteractiveTarget ||
      this._activePointerId !== null ||
      !Number.isFinite(x) ||
      !Number.isFinite(y)
    ) {
      return false;
    }

    this._activePointerId = pointerId;
    this._origin = { x, y };
    return true;
  }

  move(pointerId: number, x: number, y: number): KnobOffset | null {
    if (pointerId !== this._activePointerId || !this._origin) return null;
    return calculateKnobOffset(x - this._origin.x, y - this._origin.y, this.radius, this.deadZone);
  }

  end(pointerId: number): boolean {
    if (pointerId !== this._activePointerId) return false;

    this._activePointerId = null;
    this._origin = null;
    return true;
  }
}
