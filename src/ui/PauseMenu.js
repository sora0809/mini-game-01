import * as Phaser from 'phaser';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../config.js';
import LocalizationSystem from '../systems/LocalizationSystem.js';

export default class PauseMenu extends Phaser.GameObjects.Container {
  constructor(scene) {
    super(scene, LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2);
    this.scene = scene;
    this.setDepth(1050);
    this.setScrollFactor(0);
    scene.add.existing(this);

    this.callbacks = { resume: null, title: null, options: null };

    this.background = scene.add.rectangle(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT, 0x000000, 0.6);
    this.panel = scene.add.rectangle(0, 0, 360, 220, 0x111a2c, 0.95);
    this.panel.setStrokeStyle(2, 0x3dffec, 0.8);
    this.titleText = scene.add.text(0, -80, LocalizationSystem.t('ui.pause.title'), {
      fontFamily: 'Press Start 2P, sans-serif',
      fontSize: '20px',
      color: '#FFFFFF'
    }).setOrigin(0.5);

    this.buttons = [];
    const buttonData = [
      { key: 'ui.pause.resume', action: 'resume' },
      { key: 'ui.pause.toTitle', action: 'title' },
      { key: 'ui.pause.options', action: 'options' }
    ];
    buttonData.forEach((btn, index) => {
      const button = this.createButton(LocalizationSystem.t(btn.key), btn.action, -10 + index * 40);
      this.buttons.push(button);
    });

    this.add([this.background, this.panel, this.titleText, ...this.buttons.map((b) => b.container)]);
    this.setVisible(false);
  }

  createButton(text, action, offsetY) {
    const container = this.scene.add.container(0, offsetY);
    const bg = this.scene.add.rectangle(0, 0, 240, 32, 0x1f2a3f, 0.9);
    bg.setStrokeStyle(1, 0x3dffec, 0.6);
    bg.setInteractive({ useHandCursor: true });
    const label = this.scene.add.text(0, 0, text, {
      fontFamily: 'Press Start 2P, sans-serif',
      fontSize: '14px',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    container.add([bg, label]);
    bg.on('pointerover', () => bg.setFillStyle(0x263652, 1));
    bg.on('pointerout', () => bg.setFillStyle(0x1f2a3f, 0.9));
    bg.on('pointerdown', () => this.handleAction(action));
    return { container, bg, label };
  }

  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  handleAction(action) {
    const cb = this.callbacks[action];
    if (typeof cb === 'function') {
      cb();
    }
  }

  show() {
    this.setVisible(true);
  }

  hide() {
    this.setVisible(false);
  }
}
