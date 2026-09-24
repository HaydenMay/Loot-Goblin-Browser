import Phaser from 'phaser';
import { PrototypeScene } from './game/PrototypeScene.ts';
import { VirtualJoystick } from './input/VirtualJoystick.ts';
import './style.css';
import { GameHud } from './ui/GameHud.ts';

const playSurface = document.querySelector<HTMLElement>('#game');
const joystickElement = document.querySelector<HTMLElement>('#virtual-joystick');
const joystickKnob = document.querySelector<HTMLElement>('#virtual-joystick-knob');

if (!playSurface || !joystickElement || !joystickKnob) {
  throw new Error('Loot Goblin game surface is missing required HUD elements.');
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 720,
  height: 1280,
  backgroundColor: '#25231e',
  scale: {
    mode: Phaser.Scale.EXPAND,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [PrototypeScene],
});

new GameHud(playSurface);
new VirtualJoystick(playSurface, joystickElement, joystickKnob);
