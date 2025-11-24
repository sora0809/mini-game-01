import Phaser from 'phaser';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../config.js';
import LocalizationSystem from '../systems/LocalizationSystem.js';

const HEART_SPACING = 24;
const EXP_BAR_WIDTH = 260;
const EXP_BAR_HEIGHT = 12;
const MAX_PERK_ICONS = 10;

export default class HudView extends Phaser.GameObjects.Container {
  constructor(scene) {
    super(scene, 0, 0);
    this.scene = scene;
    this.setDepth(800);
    this.setScrollFactor(0);
    scene.add.existing(this);

    this.heartsContainer = scene.add.container(16, 16);
    this.add(this.heartsContainer);
    this.hearts = [];

    this.waveText = scene.add.text(LOGICAL_WIDTH - 16, 16, '', {
      fontFamily: 'Press Start 2P, sans-serif',
      fontSize: '16px',
      color: '#FFFFFF'
    }).setOrigin(1, 0);
    this.add(this.waveText);

    this.levelText = scene.add.text(16, LOGICAL_HEIGHT - 54, '', {
      fontFamily: 'Press Start 2P, sans-serif',
      fontSize: '14px',
      color: '#FFFFFF'
    }).setOrigin(0, 0);
    this.add(this.levelText);

    this.expBarBg = scene.add.rectangle(16, LOGICAL_HEIGHT - 26, EXP_BAR_WIDTH, EXP_BAR_HEIGHT, 0x1f2a3f, 0.8).setOrigin(0, 0.5);
    this.expBarFill = scene.add.rectangle(16, LOGICAL_HEIGHT - 26, EXP_BAR_WIDTH, EXP_BAR_HEIGHT, 0x3dffec, 1).setOrigin(0, 0.5);
    this.add(this.expBarBg);
    this.add(this.expBarFill);

    this.perkIconContainer = scene.add.container(LOGICAL_WIDTH - 16, LOGICAL_HEIGHT - 32);
    this.perkIconContainer.setName('perk-icons');
    this.add(this.perkIconContainer);
    this.perkIcons = [];
    for (let i = 0; i < MAX_PERK_ICONS; i += 1) {
      const icon = this.createPerkIcon();
      icon.container.setPosition(-i * 36, 0);
      icon.container.setVisible(false);
      this.perkIconContainer.add(icon.container);
      this.perkIcons.push(icon);
    }
  }

  createPerkIcon() {
    const container = this.scene.add.container(0, 0);
    const bg = this.scene.add.rectangle(0, 0, 32, 32, 0x1f2a3f, 0.9);
    bg.setStrokeStyle(1, 0x3dffec, 0.6);
    const label = this.scene.add.text(0, 0, '', {
      fontFamily: 'Press Start 2P, sans-serif',
      fontSize: '10px',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    container.add([bg, label]);
    return { container, bg, label };
  }

  updateState({ hp = 0, maxHp = 0, waveNumber = 1, waveTotal = 9, level = 1, currentExp = 0, neededExp = 1, perkIds = [] }) {
    this.updateHp(hp, maxHp);
    this.updateWave(waveNumber, waveTotal);
    this.updateExp(level, currentExp, neededExp);
    this.updatePerkIcons(perkIds);
  }

  updateHp(current, max) {
    for (let i = this.hearts.length; i < max; i += 1) {
      const text = this.scene.add.text(i * HEART_SPACING, 0, '♥', {
        fontFamily: 'Press Start 2P, sans-serif',
        fontSize: '18px',
        color: '#FF5C6B'
      }).setOrigin(0, 0);
      this.heartsContainer.add(text);
      this.hearts.push(text);
    }
    this.hearts.forEach((text, index) => {
      if (index < max) {
        text.setVisible(true);
        text.setAlpha(index < current ? 1 : 0.3);
      } else {
        text.setVisible(false);
      }
    });
  }

  updateWave(number, total) {
    const label = LocalizationSystem.t('ui.hud.wave');
    this.waveText.setText(`${label} ${number} / ${total}`);
  }

  updateExp(level, currentExp, neededExp) {
    const levelLabel = LocalizationSystem.t('ui.hud.level');
    this.levelText.setText(`${levelLabel} ${level}`);
    const clampedNeeded = Math.max(1, neededExp);
    const ratio = Phaser.Math.Clamp(currentExp / clampedNeeded, 0, 1);
    this.expBarFill.displayWidth = EXP_BAR_WIDTH * ratio;
    this.expBarFill.visible = ratio > 0;
  }

  updatePerkIcons(perkIds) {
    const displayed = perkIds.slice(-MAX_PERK_ICONS);
    this.perkIcons.forEach((icon, index) => {
      const perkId = displayed[index];
      if (!perkId) {
        icon.container.setVisible(false);
        return;
      }
      icon.container.setVisible(true);
      icon.label.setText(perkId.replace('PERK_', '').slice(0, 4));
    });
  }
}
