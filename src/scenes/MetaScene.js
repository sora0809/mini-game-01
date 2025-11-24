import * as Phaser from 'phaser';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../config.js';
import SaveManager from '../save/SaveManager.js';
import MetaProgressionSystem from '../systems/MetaProgressionSystem.js';
import { loadJSON } from '../utils/jsonLoader.js';
import LocalizationSystem from '../systems/LocalizationSystem.js';
const metaUpgradeDefs = await loadJSON('./src/data/meta_upgrades.json');

export default class MetaScene extends Phaser.Scene {
  constructor() {
    super('MetaScene');
    this.nodeViews = [];
    this.selectedNodeId = null;
    this.currencyText = null;
    this.detailPanel = null;
  }

  create() {
    this.saveManager = new SaveManager();
    this.saveData = this.saveManager.load();
    this.metaSystem = new MetaProgressionSystem(this.saveData);
    this.createBackground();
    this.createHeader();
    this.createNodesGrid();
    this.createDetailPanel();
    this.registerInput();
    this.updateCurrencyText();
    this.selectNode(metaUpgradeDefs[0]?.id ?? null);
  }

  createBackground() {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x050b18, 1);
    graphics.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    graphics.lineStyle(1, 0x0f1b31, 0.7);
    for (let x = 0; x <= LOGICAL_WIDTH; x += 40) {
      graphics.lineBetween(x, 0, x, LOGICAL_HEIGHT);
    }
    for (let y = 0; y <= LOGICAL_HEIGHT; y += 40) {
      graphics.lineBetween(0, y, LOGICAL_WIDTH, y);
    }
    this.add.text(LOGICAL_WIDTH / 2, 40, LocalizationSystem.t('ui.meta.title'), {
      fontFamily: 'Press Start 2P, sans-serif',
      fontSize: '24px',
      color: '#3DFFEC'
    }).setOrigin(0.5);
  }

  createHeader() {
    this.currencyText = this.add.text(32, 80, '', {
      fontFamily: 'Press Start 2P, sans-serif',
      fontSize: '14px',
      color: '#FFFFFF'
    });
    this.backHint = this.add.text(LOGICAL_WIDTH - 32, 80, 'ESC / [タイトルへ]', {
      fontFamily: 'Press Start 2P, sans-serif',
      fontSize: '12px',
      color: '#FFFFFF'
    }).setOrigin(1, 0);
  }

  createNodesGrid() {
    const cols = 3;
    const spacingX = 260;
    const spacingY = 120;
    const startX = LOGICAL_WIDTH / 2 - spacingX;
    const startY = 140;
    this.nodeViews = [];

    metaUpgradeDefs.forEach((def, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * spacingX;
      const y = startY + row * spacingY;
      const container = this.add.container(x, y);
      const bg = this.add.rectangle(0, 0, 220, 90, 0x101d33, 0.9).setStrokeStyle(2, 0x3dffec, 0.3);
      bg.setInteractive({ useHandCursor: true });
      const nameText = this.add.text(0, -28, this.getMetaName(def), {
        fontFamily: 'Press Start 2P, sans-serif',
        fontSize: '14px',
        color: '#FFFFFF'
      }).setOrigin(0.5);
      const levelText = this.add.text(0, 4, '', {
        fontFamily: 'Press Start 2P, sans-serif',
        fontSize: '12px',
        color: '#FFFFFF'
      }).setOrigin(0.5);
      const costText = this.add.text(0, 28, '', {
        fontFamily: 'Press Start 2P, sans-serif',
        fontSize: '10px',
        color: '#9AD8FF'
      }).setOrigin(0.5);
      container.add([bg, nameText, levelText, costText]);
      bg.on('pointerover', () => this.highlightNode(def.id));
      bg.on('pointerdown', () => this.selectNode(def.id));
      this.nodeViews.push({ id: def.id, container, bg, nameText, levelText, costText });
    });
    this.refreshNodes();
  }

  createDetailPanel() {
    const panelX = LOGICAL_WIDTH - 240;
    const panelY = LOGICAL_HEIGHT / 2;
    const container = this.add.container(panelX, panelY);
    const bg = this.add.rectangle(0, 0, 220, 320, 0x081225, 0.95).setStrokeStyle(2, 0x3dffec, 0.5);
    const title = this.add.text(0, -130, LocalizationSystem.t('ui.meta.title'), {
      fontFamily: 'Press Start 2P, sans-serif',
      fontSize: '16px',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    this.detailName = this.add.text(0, -90, '', {
      fontFamily: 'Press Start 2P, sans-serif',
      fontSize: '14px',
      color: '#3DFFEC'
    }).setOrigin(0.5);
    this.detailLevel = this.add.text(0, -60, '', {
      fontFamily: 'Press Start 2P, sans-serif',
      fontSize: '12px',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    this.detailCost = this.add.text(0, -30, '', {
      fontFamily: 'Press Start 2P, sans-serif',
      fontSize: '12px',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    this.detailDesc = this.add.text(0, 10, '', {
      fontFamily: 'Press Start 2P, sans-serif',
      fontSize: '12px',
      color: '#9AD8FF',
      wordWrap: { width: 190 }
    }).setOrigin(0.5, 0);
    this.detailMessage = this.add.text(0, 90, '', {
      fontFamily: 'Press Start 2P, sans-serif',
      fontSize: '12px',
      color: '#FF6C6C'
    }).setOrigin(0.5);
    const buttonBg = this.add.rectangle(0, 140, 160, 36, 0x1e2b45, 1).setStrokeStyle(2, 0x3dffec, 0.6);
    buttonBg.setInteractive({ useHandCursor: true });
    const buttonText = this.add.text(0, 140, LocalizationSystem.t('ui.meta.purchase'), {
      fontFamily: 'Press Start 2P, sans-serif',
      fontSize: '14px',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    buttonBg.on('pointerdown', () => this.attemptPurchase());
    container.add([bg, title, this.detailName, this.detailLevel, this.detailCost, this.detailDesc, this.detailMessage, buttonBg, buttonText]);
    this.detailPanel = { container, buttonBg, buttonText };
  }

  registerInput() {
    this.input.keyboard.on('keydown-ESC', () => {
      this.scene.start('TitleScene');
    });
  }

  updateCurrencyText() {
    if (!this.currencyText) return;
    this.currencyText.setText(
      `${LocalizationSystem.t('ui.meta.currency')}: ${this.metaSystem.getMetaCurrency()}`
    );
  }

  refreshNodes() {
    this.nodeViews.forEach((view) => {
      const status = this.metaSystem.getUpgradeStatus(view.id);
      if (!status) return;
      const { level, def, requirementsMet, atMax } = status;
      view.levelText.setText(`${LocalizationSystem.t('ui.meta.level')} ${level} / ${def.maxLevel}`);
      view.costText.setText(
        atMax ? 'MAX' : `${LocalizationSystem.t('ui.meta.cost')}: ${def.cost}`
      );
      const locked = !requirementsMet;
      const color = locked ? 0x444444 : 0x101d33;
      const strokeAlpha = locked ? 0.2 : 0.5;
      view.bg.setFillStyle(color, locked ? 0.4 : 0.9);
      view.bg.setStrokeStyle(2, 0x3dffec, atMax ? 0.2 : strokeAlpha);
      view.nameText.setColor(atMax ? '#9AD8FF' : locked ? '#777777' : '#FFFFFF');
    });
  }

  highlightNode(id) {
    if (!id || this.selectedNodeId === id) return;
    this.selectNode(id);
  }

  selectNode(id) {
    if (!id) return;
    this.selectedNodeId = id;
    this.nodeViews.forEach((view) => {
      const selected = view.id === id;
      view.bg.setStrokeStyle(2, 0x3dffec, selected ? 1 : 0.3);
    });
    this.updateDetailPanel();
  }

  updateDetailPanel(message = '') {
    if (!this.selectedNodeId) return;
    const status = this.metaSystem.getUpgradeStatus(this.selectedNodeId);
    if (!status) return;
    const { def, level, atMax, canUpgrade } = status;
    this.detailName.setText(this.getMetaName(def));
    this.detailLevel.setText(`${LocalizationSystem.t('ui.meta.level')} ${level} / ${def.maxLevel}`);
    this.detailCost.setText(
      atMax ? 'MAX' : `${LocalizationSystem.t('ui.meta.cost')}: ${def.cost}`
    );
    this.detailDesc.setText(this.getMetaDescription(def));
    this.detailMessage.setText(message);
    const enabled = !atMax && canUpgrade;
    this.detailPanel.buttonBg.setFillStyle(enabled ? 0x2f4369 : 0x222a3e, 1);
    this.detailPanel.buttonText.setColor(enabled ? '#FFFFFF' : '#777777');
  }

  attemptPurchase() {
    if (!this.selectedNodeId) return;
    const status = this.metaSystem.getUpgradeStatus(this.selectedNodeId);
    if (!status) return;
    if (status.atMax) {
      this.updateDetailPanel(LocalizationSystem.t('ui.meta.message.max'));
      return;
    }
    if (!status.requirementsMet) {
      this.updateDetailPanel(LocalizationSystem.t('ui.meta.message.locked'));
      return;
    }
    if (this.metaSystem.getMetaCurrency() < status.def.cost) {
      this.updateDetailPanel(LocalizationSystem.t('ui.meta.message.noCurrency'));
      return;
    }
    const success = this.metaSystem.purchaseUpgrade(this.selectedNodeId);
    if (!success) {
      this.updateDetailPanel(LocalizationSystem.t('ui.meta.message.noCurrency'));
      return;
    }
    this.saveManager.save(this.metaSystem.getSaveData());
    this.updateCurrencyText();
    this.refreshNodes();
    this.updateDetailPanel(LocalizationSystem.t('ui.meta.message.bought'));
  }

  getMetaName(def) {
    if (def?.nameKey) {
      return LocalizationSystem.t(def.nameKey);
    }
    return def?.name ?? def?.id ?? '';
  }

  getMetaDescription(def) {
    if (def?.descKey) {
      return LocalizationSystem.t(def.descKey);
    }
    return def?.description ?? '';
  }
}
