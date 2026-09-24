import Phaser from 'phaser';
import type { Vector2 } from '../shared/vector2.ts';
import { AutoAttackController } from './combat/auto-attack.ts';
import { applySlimeDamage, type SlimeHealthState } from './combat/slime-health.ts';
import { advanceMagnetCoin, type MagnetCoin } from './loot/coin-collection.ts';
import { moveWithinBounds } from './movement.ts';
import { getWorldLayout, type WorldPoint } from './world-layout.ts';

const FLOOR_TILE_SIZE = 96;
const MOVEMENT_SPEED = 220;
const MELEE_RANGE = 100;
const ATTACK_WINDUP_MS = 180;
const ATTACK_REPEAT_INTERVAL_MS = 750;
const SLIME_MAX_HEALTH = 3;
const LOOT_COUNT = 3;
const COIN_VALUE = 1;
const COIN_POP_DURATION_MS = 300;
const COIN_PICKUP_RADIUS = 18;
const COIN_MAGNET_SPEED = 400;
const ACTOR_INSET = 0.06;

interface WorldBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface CoinState {
  model: MagnetCoin;
  visual: Phaser.GameObjects.Arc;
  popping: boolean;
}

export class PrototypeScene extends Phaser.Scene {
  private floor!: Phaser.GameObjects.Graphics;
  private roomDetails!: Phaser.GameObjects.Graphics;
  private goblin!: Phaser.GameObjects.Container;
  private slime!: Phaser.GameObjects.Container;
  private hammerPivot!: Phaser.GameObjects.Container;
  private movementVector: Vector2 = { x: 0, y: 0 };
  private attackController = new AutoAttackController(
    MELEE_RANGE,
    ATTACK_WINDUP_MS,
    ATTACK_REPEAT_INTERVAL_MS,
    1,
  );
  private slimeHealth: SlimeHealthState = {
    current: SLIME_MAX_HEALTH,
    max: SLIME_MAX_HEALTH,
    dead: false,
  };
  private slimeDead = false;
  private coins: CoinState[] = [];
  private gold = 0;
  private nextCoinId = 0;
  private readonly onGoldChanged: (gold: number) => void;

  constructor(onGoldChanged: (gold: number) => void = () => {}) {
    super('prototype');
    this.onGoldChanged = onGoldChanged;
  }

  create(): void {
    this.movementVector = { x: 0, y: 0 };
    this.attackController.reset();
    this.slimeHealth = { current: SLIME_MAX_HEALTH, max: SLIME_MAX_HEALTH, dead: false };
    this.slimeDead = false;
    this.gold = 0;
    this.nextCoinId = 0;
    this.clearCoins();
    this.onGoldChanged(this.gold);

    this.floor = this.add.graphics().setDepth(0);
    this.roomDetails = this.add.graphics().setDepth(1);
    this.goblin = this.createGoblin().setDepth(10);
    this.slime = this.createSlime().setDepth(9);

    const layout = getWorldLayout(this.scale.gameSize.width, this.scale.gameSize.height);
    this.goblin.setPosition(layout.goblin.x, layout.goblin.y);
    this.slime.setPosition(layout.slime.x, layout.slime.y);
    this.layoutRoom();

    this.scale.on('resize', this.layoutRoom, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
  }

  update(_time: number, delta: number): void {
    const bounds = this.getActorBounds();
    const moving = Math.hypot(this.movementVector.x, this.movementVector.y) > 0.01;
    const nextPosition = moveWithinBounds(
      { x: this.goblin.x, y: this.goblin.y },
      this.movementVector,
      delta,
      MOVEMENT_SPEED,
      bounds,
    );
    this.goblin.setPosition(nextPosition.x, nextPosition.y);

    const goblinPoint = { x: this.goblin.x, y: this.goblin.y };
    const targets = [{ id: 'slime', x: this.slime.x, y: this.slime.y, alive: !this.slimeDead }];
    for (const event of this.attackController.update(delta, moving, goblinPoint, targets)) {
      if (event.type === 'windup-start') this.beginHammerWindup();
      if (event.type === 'windup-cancel') this.cancelHammerWindup();
      if (event.type === 'impact') this.applySlimeImpact(event.damage);
    }

    for (const coinState of [...this.coins]) {
      if (coinState.popping) continue;

      const result = advanceMagnetCoin(
        coinState.model,
        goblinPoint,
        delta,
        COIN_MAGNET_SPEED,
        COIN_PICKUP_RADIUS,
      );
      coinState.model = result.coin;
      coinState.visual.setPosition(result.coin.x, result.coin.y);

      if (!result.collectedNow) continue;

      this.coins = this.coins.filter((candidate) => candidate !== coinState);
      coinState.visual.destroy();
      this.gold += result.coin.value;
      this.onGoldChanged(this.gold);
    }
  }

  setMovementVector(vector: Vector2): void {
    this.movementVector = { x: vector.x, y: vector.y };
  }

  private handleShutdown(): void {
    this.movementVector = { x: 0, y: 0 };
    this.attackController.reset();
    this.tweens.killAll();
    this.clearCoins();
    this.scale.off('resize', this.layoutRoom, this);
  }

  private clearCoins(): void {
    for (const coin of this.coins) coin.visual.destroy();
    this.coins = [];
  }

  private getActorBounds(width = this.scale.gameSize.width, height = this.scale.gameSize.height): WorldBounds {
    const safeWidth = Math.max(1, width);
    const safeHeight = Math.max(1, height);
    return {
      left: safeWidth * ACTOR_INSET,
      top: safeHeight * ACTOR_INSET,
      right: safeWidth * (1 - ACTOR_INSET),
      bottom: safeHeight * (1 - ACTOR_INSET),
    };
  }

  private layoutRoom(): void {
    const width = this.scale.gameSize.width;
    const height = this.scale.gameSize.height;
    const bounds = this.getActorBounds(width, height);

    this.drawFloor(width, height);
    this.drawRoomDetails(width, height);
    const goblin = moveWithinBounds({ x: this.goblin.x, y: this.goblin.y }, { x: 0, y: 0 }, 0, 0, bounds);
    const slime = moveWithinBounds({ x: this.slime.x, y: this.slime.y }, { x: 0, y: 0 }, 0, 0, bounds);
    this.goblin.setPosition(goblin.x, goblin.y);
    this.slime.setPosition(slime.x, slime.y);
  }

  private drawFloor(width: number, height: number): void {
    this.floor.clear();
    this.floor.fillStyle(0x181a17).fillRect(0, 0, width, height);

    for (let row = 0, y = 0; y < height + FLOOR_TILE_SIZE; row += 1, y += FLOOR_TILE_SIZE) {
      const offset = row % 2 === 0 ? 0 : FLOOR_TILE_SIZE / 2;
      for (let x = -FLOOR_TILE_SIZE + offset; x < width + FLOOR_TILE_SIZE; x += FLOOR_TILE_SIZE) {
        const shade = (Math.floor((x + row * 19) / FLOOR_TILE_SIZE) + row) % 3;
        const color = shade === 0 ? 0x34332d : shade === 1 ? 0x302f29 : 0x38362e;
        this.floor.fillStyle(color).fillRect(x + 2, y + 2, FLOOR_TILE_SIZE - 4, FLOOR_TILE_SIZE - 4);
        this.floor.lineStyle(2, 0x22231f, 0.8).strokeRect(x + 2, y + 2, FLOOR_TILE_SIZE - 4, FLOOR_TILE_SIZE - 4);
      }
    }

    this.floor.fillStyle(0x11130f, 0.22).fillRect(0, 0, width, height);
  }

  private drawRoomDetails(width: number, height: number): void {
    this.roomDetails.clear();

    this.roomDetails.fillStyle(0x22211d, 0.95).fillRect(0, 0, width, 34);
    this.roomDetails.fillStyle(0x22211d, 0.95).fillRect(0, height - 34, width, 34);
    this.roomDetails.lineStyle(3, 0x51483a, 0.9);
    this.roomDetails.lineBetween(0, 35, width, 35);
    this.roomDetails.lineBetween(0, height - 35, width, height - 35);

    this.drawTorch(width * 0.2, height * 0.12);
    this.drawTorch(width * 0.8, height * 0.12);
    this.drawCrate(width * 0.2, height * 0.73);
    this.drawChest(width * 0.82, height * 0.72);
  }

  private drawTorch(x: number, y: number): void {
    this.roomDetails.fillStyle(0x161511).fillRect(x - 11, y - 8, 22, 34);
    this.roomDetails.fillStyle(0x9e632f).fillRect(x - 4, y - 14, 8, 24);
    this.roomDetails.fillStyle(0xffc45c, 0.8).fillCircle(x, y - 19, 8);
    this.roomDetails.fillStyle(0xf9e5a5, 0.9).fillCircle(x, y - 21, 3);
  }

  private drawCrate(x: number, y: number): void {
    this.roomDetails.fillStyle(0x403324).fillRoundedRect(x - 31, y - 27, 62, 54, 5);
    this.roomDetails.lineStyle(4, 0x86653f, 0.9).strokeRect(x - 28, y - 24, 56, 48);
    this.roomDetails.lineBetween(x - 24, y - 20, x + 24, y + 20);
    this.roomDetails.lineBetween(x + 24, y - 20, x - 24, y + 20);
  }

  private drawChest(x: number, y: number): void {
    this.roomDetails.fillStyle(0x3e2a1e).fillRoundedRect(x - 35, y - 23, 70, 46, 7);
    this.roomDetails.fillStyle(0x9c6c31).fillRoundedRect(x - 35, y - 23, 70, 18, 7);
    this.roomDetails.fillStyle(0xcda45b).fillRect(x - 3, y - 7, 6, 30);
    this.roomDetails.fillStyle(0x171611).fillCircle(x, y + 1, 4);
  }

  private createGoblin(): Phaser.GameObjects.Container {
    const bodyArt = this.add.graphics();
    bodyArt.fillStyle(0x10120f, 0.42).fillEllipse(0, 34, 88, 26);
    bodyArt.fillStyle(0x8e6438).fillEllipse(-25, 7, 44, 39);
    bodyArt.lineStyle(3, 0xc19658).strokeEllipse(-25, 7, 44, 39);
    bodyArt.fillStyle(0x58a84c).fillCircle(0, 2, 25);
    bodyArt.lineStyle(3, 0x9cd66e).strokeCircle(0, 2, 25);
    bodyArt.fillStyle(0x6fbe59).fillCircle(0, -24, 17);
    bodyArt.fillStyle(0xede9da).fillCircle(6, -27, 3);
    bodyArt.fillStyle(0x24251f).fillCircle(7, -27, 1.5);

    const hammerArt = this.add.graphics();
    hammerArt.fillStyle(0xaaaead).fillRoundedRect(0, -3, 41, 7, 3);
    hammerArt.fillStyle(0x787d7d).fillRoundedRect(31, -12, 15, 22, 3);
    hammerArt.fillStyle(0xd0d3ce).fillRect(34, -10, 4, 18);
    this.hammerPivot = this.add.container(22, -14, [hammerArt]);

    return this.add.container(0, 0, [bodyArt, this.hammerPivot]);
  }

  private createSlime(): Phaser.GameObjects.Container {
    const art = this.add.graphics();
    art.fillStyle(0x10120f, 0.38).fillEllipse(0, 24, 74, 21);
    art.fillStyle(0x65b75f).fillEllipse(0, 0, 58, 47);
    art.lineStyle(3, 0xa0df73).strokeEllipse(0, 0, 58, 47);
    art.fillStyle(0xe9efcf).fillCircle(-9, -3, 4);
    art.fillStyle(0xe9efcf).fillCircle(8, -3, 4);
    art.fillStyle(0x273123).fillCircle(-8, -2, 1.8);
    art.fillStyle(0x273123).fillCircle(9, -2, 1.8);

    return this.add.container(0, 0, [art]);
  }

  private beginHammerWindup(): void {
    const angle = Math.atan2(this.slime.y - this.goblin.y, this.slime.x - this.goblin.x);
    this.goblin.rotation = angle;
    this.tweens.add({
      targets: this.hammerPivot,
      rotation: -1.1,
      duration: ATTACK_WINDUP_MS,
      ease: 'Sine.Out',
    });
  }

  private cancelHammerWindup(): void {
    this.tweens.killTweensOf(this.hammerPivot);
    this.tweens.add({
      targets: this.hammerPivot,
      rotation: 0,
      duration: 70,
      ease: 'Sine.Out',
    });
  }

  private applySlimeImpact(damage: number): void {
    if (this.slimeDead) return;

    this.tweens.add({
      targets: this.hammerPivot,
      rotation: 0.75,
      duration: 70,
      ease: 'Sine.In',
      onComplete: () => {
        this.tweens.add({
          targets: this.hammerPivot,
          rotation: 0,
          duration: 100,
          ease: 'Sine.Out',
        });
      },
    });

    const flash = this.add.ellipse(this.slime.x, this.slime.y, 66, 54, 0xdaf5b5, 0.58)
      .setDepth(this.slime.depth + 1);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 90,
      onComplete: () => flash.destroy(),
    });

    const result = applySlimeDamage(this.slimeHealth, damage);
    this.slimeHealth = result.state;
    if (!result.applied) return;

    if (result.killed) this.slimeDead = true;
    const origin = { x: this.slime.x, y: this.slime.y };
    const recoil = this.getSlimeRecoil(origin);
    this.tweens.add({
      targets: this.slime,
      x: origin.x + recoil.x,
      y: origin.y + recoil.y,
      duration: 60,
      yoyo: true,
      ease: 'Sine.Out',
      onComplete: () => {
        if (result.killed) this.finishSlimeDeath();
      },
    });
  }

  private getSlimeRecoil(origin: WorldPoint): WorldPoint {
    const dx = origin.x - this.goblin.x;
    const dy = origin.y - this.goblin.y;
    const distance = Math.hypot(dx, dy) || 1;
    return { x: (dx / distance) * 10, y: (dy / distance) * 10 };
  }

  private finishSlimeDeath(): void {
    this.tweens.killTweensOf(this.slime);
    this.tweens.add({
      targets: this.slime,
      scaleX: 1.4,
      scaleY: 0.08,
      alpha: 0,
      duration: 180,
      ease: 'Sine.In',
      onComplete: () => this.slime.setVisible(false),
    });
    this.dropCoins();
  }

  private dropCoins(): void {
    for (let coinIndex = 0; coinIndex < LOOT_COUNT; coinIndex += 1) {
      const angle = (Math.PI * 2 * coinIndex) / LOOT_COUNT;
      const landing = {
        x: this.slime.x + Math.cos(angle) * 64,
        y: this.slime.y + Math.sin(angle) * 64,
      };
      const visual = this.add.circle(this.slime.x, this.slime.y, 8, 0xf4c94e, 1)
        .setStrokeStyle(2, 0xffed9a)
        .setDepth(this.slime.depth + 2);
      const coinState: CoinState = {
        model: {
          id: this.nextCoinId,
          value: COIN_VALUE,
          x: this.slime.x,
          y: this.slime.y,
          collected: false,
        },
        visual,
        popping: true,
      };
      this.nextCoinId += 1;
      this.coins.push(coinState);

      this.tweens.add({
        targets: coinState.visual,
        x: landing.x,
        y: landing.y - 18,
        duration: COIN_POP_DURATION_MS * 0.6,
        ease: 'Cubic.Out',
        onComplete: () => {
          this.tweens.add({
            targets: coinState.visual,
            y: landing.y,
            duration: COIN_POP_DURATION_MS * 0.4,
            ease: 'Bounce.Out',
            onComplete: () => {
              coinState.model = { ...coinState.model, ...landing };
              coinState.popping = false;
            },
          });
        },
      });
    }
  }
}
