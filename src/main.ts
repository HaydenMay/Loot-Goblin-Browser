import Phaser from 'phaser';
import './style.css';

class PrototypeScene extends Phaser.Scene {
  constructor() {
    super('prototype');
  }

  create(): void {
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'Loot Goblin Web Prototype', {
        color: '#f2e8c5',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '32px',
      })
      .setOrigin(0.5);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 540,
  backgroundColor: '#171a12',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [PrototypeScene],
});
