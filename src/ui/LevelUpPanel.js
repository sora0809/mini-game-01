import Phaser from 'phaser';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../config.js';
import LocalizationSystem from '../systems/LocalizationSystem.js';

const PANEL_WIDTH = 520;
const PANEL_HEIGHT = 280;

export default class LevelUpPanel extends Phaser.GameObjects.Container {
  constructor(scene) {
    super(scene, LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2);
    this.setDepth(1000);

    this.background = scene.add.rectangle(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT, 0x000000, 0.55);
    this.panel = scene.add.rectangle(0, 0, PANEL_WIDTH, PANEL_HEIGHT, 0x111a2c, 0.95);
    this.panel.setStrokeStyle(2, 0x3dffec, 0.8);
    this.titleText = scene.add.text(0, -PANEL_HEIGHT / 2 + 24, LocalizationSystem.t('ui.levelup.title'), {
      fontSize: '24px',
      color: '#FFFFFF',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5, 0.5);
    this.subtitleText = scene.add.text(0, -PANEL_HEIGHT / 2 + 60, LocalizationSystem.t('ui.levelup.subtitle'), {
      fontSize: '14px',
      color: '#9AD8FF',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5, 0.5);

    this.optionSlots = [];
    const slotCount = 3;
    const slotWidth = PANEL_WIDTH - 60;
    const slotHeight = 60;
    const startY = -40;

    for (let i = 0; i < slotCount; i += 1) {
      const slotContainer = scene.add.container(0, startY + i * (slotHeight + 10));
      const slotBg = scene.add.rectangle(0, 0, slotWidth, slotHeight, 0x1f2a3f, 0.9);
      slotBg.setStrokeStyle(1, 0x3dffec, 0.4);
      slotBg.setInteractive({ useHandCursor: true });
      const nameText = scene.add.text(-slotWidth / 2 + 12, -12, '', {
        fontSize: '18px',
        color: '#3DFFEC',
        fontFamily: 'sans-serif'
      }).setOrigin(0, 0.5);
      const descText = scene.add.text(-slotWidth / 2 + 12, 12, '', {
        fontSize: '14px',
        color: '#FFFFFF',
        fontFamily: 'sans-serif'
      }).setOrigin(0, 0.5);
      slotContainer.add([slotBg, nameText, descText]);
      this.optionSlots.push({ container: slotContainer, bg: slotBg, nameText, descText });
      slotBg.on('pointerover', () => slotBg.setFillStyle(0x263652, 1));
      slotBg.on('pointerout', () => slotBg.setFillStyle(0x1f2a3f, 0.9));
    }

    this.add([
      this.background,
      this.panel,
      this.titleText,
      this.subtitleText,
      ...this.optionSlots.map((s) => s.container)
    ]);
    this.setVisible(false);
    scene.add.existing(this);

    this.selectionCallback = null;
  }

  show(options, onSelect) {
    this.setVisible(true);
    this.selectionCallback = onSelect;
    this.optionSlots.forEach((slot, index) => {
      const perk = options[index];
      if (perk) {
        slot.container.setVisible(true);
        slot.bg.removeAllListeners('pointerdown');
        slot.bg.on('pointerdown', () => this.handleSelect(perk.id));
        slot.nameText.setText(this.getPerkName(perk));
        slot.descText.setText(this.getPerkDescription(perk));
      } else {
        slot.container.setVisible(false);
      }
    });
  }

  hide() {
    this.setVisible(false);
    this.selectionCallback = null;
  }

  handleSelect(perkId) {
    if (typeof this.selectionCallback === 'function') {
      this.selectionCallback(perkId);
    }
  }

  getPerkName(perk) {
    if (perk?.nameKey) {
      return LocalizationSystem.t(perk.nameKey);
    }
    return perk?.name ?? '';
  }

  getPerkDescription(perk) {
    if (perk?.descKey) {
      return LocalizationSystem.t(perk.descKey);
    }
    return perk?.description ?? '';
  }
}
