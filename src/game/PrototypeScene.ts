import Phaser from 'phaser';
import { getWorldLayout } from './world-layout.ts';

const FLOOR_TILE_SIZE = 96;

export class PrototypeScene extends Phaser.Scene {
  private floor!: Phaser.GameObjects.Graphics;
  private roomDetails!: Phaser.GameObjects.Graphics;
  private goblin!: Phaser.GameObjects.Container;
  private slime!: Phaser.GameObjects.Container;

  constructor() {
    super('prototype');
  }

  create(): void {
    this.floor = this.add.graphics().setDepth(0);
    this.roomDetails = this.add.graphics().setDepth(1);
    this.goblin = this.createGoblin().setDepth(10);
    this.slime = this.createSlime().setDepth(9);

    this.scale.on('resize', this.layoutRoom, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.layoutRoom, this);
    });
    this.layoutRoom();
  }

  private layoutRoom(): void {
    const width = this.scale.gameSize.width;
    const height = this.scale.gameSize.height;
    const layout = getWorldLayout(width, height);

    this.drawFloor(width, height);
    this.drawRoomDetails(width, height);
    this.goblin.setPosition(layout.goblin.x, layout.goblin.y);
    this.slime.setPosition(layout.slime.x, layout.slime.y);
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
    const art = this.add.graphics();
    art.fillStyle(0x10120f, 0.42).fillEllipse(0, 34, 88, 26);
    art.fillStyle(0x8e6438).fillEllipse(-25, 7, 44, 39);
    art.lineStyle(3, 0xc19658).strokeEllipse(-25, 7, 44, 39);
    art.fillStyle(0x58a84c).fillCircle(0, 2, 25);
    art.lineStyle(3, 0x9cd66e).strokeCircle(0, 2, 25);
    art.fillStyle(0x6fbe59).fillCircle(0, -24, 17);
    art.fillStyle(0xede9da).fillCircle(6, -27, 3);
    art.fillStyle(0x24251f).fillCircle(7, -27, 1.5);
    art.fillStyle(0xaaaead).fillRoundedRect(18, -16, 41, 7, 3);
    art.fillStyle(0x787d7d).fillRoundedRect(49, -24, 15, 22, 3);
    art.fillStyle(0xd0d3ce).fillRect(52, -22, 4, 18);

    return this.add.container(0, 0, [art]);
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
}
