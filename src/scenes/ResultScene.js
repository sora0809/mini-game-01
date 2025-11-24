import Phaser from 'phaser';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../config.js';
import perksData from '../data/perks.json' assert { type: 'json' };
import LocalizationSystem from '../systems/LocalizationSystem.js';

export default class ResultScene extends Phaser.Scene {
  constructor() {
    super('ResultScene');
    this.dataPayload = {};
  }

  create() {
    this.dataPayload = this.scene.settings?.data ?? {};
    this.createBackground();
    this.createSummary();
    this.createStats();
    this.createPerkList();
    this.createButtons();
    this.registerInput();
  }

  createBackground() {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x070c16, 1);
    graphics.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    graphics.lineStyle(1, 0x112239, 0.6);
    for (let y = 0; y <= LOGICAL_HEIGHT; y += 32) {
      graphics.lineBetween(0, y, LOGICAL_WIDTH, y);
    }
    const titleKey = this.dataPayload.result ?? 'victory';
    const title =
      titleKey === 'victory'
        ? LocalizationSystem.t('ui.result.clear')
        : LocalizationSystem.t('ui.result.gameover');
    this.add.text(LOGICAL_WIDTH / 2, 60, title, {
      fontFamily: 'Press Start 2P, sans-serif',
      fontSize: '26px',
      color: titleKey === 'victory' ? '#3DFFEC' : '#FF6C6C'
    }).setOrigin(0.5);
  }

  createSummary() {
    const wave = this.dataPayload.reachedWave ?? 1;
    const timeText = this.formatPlayTime(this.dataPayload.playTimeMs ?? 0);
    const coreEarned = this.dataPayload.coreEarned ?? 0;
    const totalCore = this.dataPayload.totalCore ?? 0;
    const difficulty = (this.dataPayload.difficulty ?? 'normal').toUpperCase();
    const summary = [
      `${LocalizationSystem.t('ui.result.difficulty')}: ${difficulty}`,
      `${LocalizationSystem.t('ui.result.reachedWave')}: ${wave} / 9`,
      `${LocalizationSystem.t('ui.result.playtime')}: ${timeText}`,
      `${LocalizationSystem.t('ui.result.hits')}: ${this.dataPayload.hitCount ?? 0}`,
      `${LocalizationSystem.t('ui.result.core')}: +${coreEarned} (Total ${totalCore})`
    ].join('\n');
    this.add.text(60, 110, summary, {
      fontFamily: 'Press Start 2P, sans-serif',
      fontSize: '14px',
      color: '#FFFFFF',
      lineSpacing: 10
    });
  }

  createStats() {
    // Extra area reserved for future stats if needed
  }

  createPerkList() {
    const perks = this.dataPayload.perkIds ?? [];
    const mapped = perks.map((id, idx) => {
      const perk = perksData.find((p) => p.id === id);
      const name = perk?.nameKey ? LocalizationSystem.t(perk.nameKey) : perk?.name ?? id;
      return `${idx + 1}. ${name}`;
    });
    const text = mapped.length > 0 ? mapped.join('\n') : '未取得';
    const boxX = LOGICAL_WIDTH - 280;
    const boxY = 120;
    const bg = this.add.rectangle(boxX, boxY + 160, 240, 320, 0x0e1a2b, 0.9).setStrokeStyle(2, 0x3dffec, 0.4);
    this.add.text(boxX, boxY - 10, LocalizationSystem.t('ui.levelup.title'), {
      fontFamily: 'Press Start 2P, sans-serif',
      fontSize: '14px',
      color: '#FFFFFF'
    }).setOrigin(0.5, 0);
    const perksText = this.add.text(boxX - 110, boxY + 20, text, {
      fontFamily: 'Press Start 2P, sans-serif',
      fontSize: '12px',
      color: '#9AD8FF',
      wordWrap: { width: 220 }
    }).setOrigin(0, 0);
    perksText.setInteractive();
  }

  createButtons() {
    const buttons = [
      { label: LocalizationSystem.t('ui.result.again'), action: 'retry' },
      { label: LocalizationSystem.t('ui.result.toMeta'), action: 'meta' },
      { label: LocalizationSystem.t('ui.result.toTitle'), action: 'title' }
    ];
    const startY = LOGICAL_HEIGHT - 120;
    buttons.forEach((btn, index) => {
      const container = this.add.container(LOGICAL_WIDTH / 2, startY + index * 50);
      const bg = this.add.rectangle(0, 0, 260, 40, 0x1a2538, 0.9).setStrokeStyle(2, 0x3dffec, 0.5);
      bg.setInteractive({ useHandCursor: true });
      const label = this.add.text(0, 0, btn.label, {
        fontFamily: 'Press Start 2P, sans-serif',
        fontSize: '14px',
        color: '#FFFFFF'
      }).setOrigin(0.5);
      container.add([bg, label]);
      bg.on('pointerover', () => bg.setFillStyle(0x253756, 1));
      bg.on('pointerout', () => bg.setFillStyle(0x1a2538, 0.9));
      bg.on('pointerdown', () => this.handleButtonAction(btn.action));
    });
  }

  registerInput() {
    this.input.keyboard.on('keydown-ENTER', () => this.handleButtonAction('retry'));
    this.input.keyboard.on('keydown-M', () => this.handleButtonAction('meta'));
    this.input.keyboard.on('keydown-T', () => this.handleButtonAction('title'));
  }

  handleButtonAction(action) {
    switch (action) {
      case 'retry':
        this.scene.start('GameScene', { difficulty: this.dataPayload.difficulty ?? 'normal' });
        break;
      case 'meta':
        this.scene.start('MetaScene');
        break;
      case 'title':
      default:
        this.scene.start('TitleScene');
        break;
    }
  }

  formatPlayTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }
}
