import * as Phaser from 'phaser';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../config.js';
import LocalizationSystem from '../systems/LocalizationSystem.js';

const DEFAULT_SETTINGS = {
  bgmVolume: 0.7,
  seVolume: 0.8,
  flashEffects: true,
  language: 'ja'
};

const ENTRY_TYPES = {
  SLIDER: 'slider',
  TOGGLE: 'toggle',
  CHOICE: 'choice',
  BUTTON: 'button'
};

const PANEL_WIDTH = 600;
const PANEL_HEIGHT = 460;
const PANEL_PADDING = 32;
const LABEL_WIDTH = 190;
const CONTROL_GAP = 24;
const ROW_GAP = 24;
const ROW_HEIGHTS = {
  [ENTRY_TYPES.SLIDER]: 52,
  [ENTRY_TYPES.TOGGLE]: 60,
  [ENTRY_TYPES.CHOICE]: 90,
  buttons: 70
};

export default class OptionsView extends Phaser.GameObjects.Container {
  constructor(scene, callbacks = {}) {
    super(scene, 0, 0);
    this.scene = scene;
    this.callbacks = callbacks;
    this.currentSettings = { ...DEFAULT_SETTINGS };
    this.selectionIndex = 0;
    this.entries = [];
    this.keyboardHandlers = [];
    this.setScrollFactor(0);
    this.setDepth(1500);

    this.createElements();
    this.setVisible(false);
    scene.add.existing(this);
  }

  createElements() {
    this.overlay = this.scene.add.rectangle(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT, 0x000000, 0.7).setOrigin(0, 0);
    this.panel = this.scene.add.container(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2);
    this.card = this.scene.add
      .rectangle(0, 0, PANEL_WIDTH, PANEL_HEIGHT, 0x0b1524, 0.98)
      .setStrokeStyle(3, 0x3dffec, 0.8);
    this.titleText = this.scene.add
      .text(0, -PANEL_HEIGHT / 2 + PANEL_PADDING, 'オプション', {
        fontFamily: 'Press Start 2P, sans-serif',
        fontSize: '18px',
        color: '#FFFFFF'
      })
      .setOrigin(0.5, 0);

    this.panel.add([this.card, this.titleText]);
    this.add([this.overlay, this.panel]);

    const layout = [
      { type: ENTRY_TYPES.SLIDER, labelKey: 'ui.options.bgm', id: 'bgmVolume' },
      { type: ENTRY_TYPES.SLIDER, labelKey: 'ui.options.se', id: 'seVolume' },
      { type: ENTRY_TYPES.TOGGLE, labelKey: 'ui.options.flash', id: 'flashEffects' },
      { type: ENTRY_TYPES.CHOICE, labelKey: 'ui.options.language', id: 'language' },
      { type: 'buttons' }
    ];

    const availableHeight = PANEL_HEIGHT - PANEL_PADDING * 2 - 80;
    const totalContentHeight =
      layout.reduce((sum, row) => sum + ROW_HEIGHTS[row.type], 0) + ROW_GAP * (layout.length - 1);
    const startOffset = -availableHeight / 2 + (availableHeight - totalContentHeight) / 2;

    let currentY = startOffset;
    this.entries = [];
    layout.forEach((row) => {
      const centerY = currentY + ROW_HEIGHTS[row.type] / 2;
      switch (row.type) {
        case ENTRY_TYPES.SLIDER:
          this.entries.push(this.createSliderEntry(row.labelKey, row.id, centerY));
          break;
        case ENTRY_TYPES.TOGGLE:
          this.entries.push(this.createToggleEntry(row.labelKey, row.id, centerY));
          break;
        case ENTRY_TYPES.CHOICE:
          this.entries.push(this.createLanguageEntry(row.labelKey, row.id, centerY));
          break;
        case 'buttons':
          this.entries.push(
            ...this.createButtonRow(centerY, [
              { labelKey: 'ui.common.ok', id: 'apply' },
              { labelKey: 'ui.common.cancel', id: 'cancel' }
            ])
          );
          break;
        default:
          break;
      }
      currentY += ROW_HEIGHTS[row.type] + ROW_GAP;
    });
  }

  getLabelX() {
    return -PANEL_WIDTH / 2 + PANEL_PADDING;
  }

  getControlMetrics() {
    const controlLeft = this.getLabelX() + LABEL_WIDTH + CONTROL_GAP;
    const controlWidth = PANEL_WIDTH - PANEL_PADDING * 2 - LABEL_WIDTH - CONTROL_GAP;
    return { controlLeft, controlWidth };
  }

  createSliderEntry(labelKey, key, centerY) {
    const { controlLeft, controlWidth } = this.getControlMetrics();
    const labelText = this.scene.add
      .text(this.getLabelX(), centerY, LocalizationSystem.t(labelKey), {
        fontFamily: 'Press Start 2P, sans-serif',
        fontSize: '14px',
        color: '#FFFFFF'
      })
      .setOrigin(0, 0.5);

    const track = this.scene.add.rectangle(
      controlLeft + controlWidth / 2,
      centerY,
      controlWidth,
      10,
      0x172236,
      1
    );
    track.setStrokeStyle(1, 0x3dffec, 0.5);
    track.setInteractive();
    const fill = this.scene.add
      .rectangle(controlLeft, centerY, 0, 10, 0x3dffec, 1)
      .setOrigin(0, 0.5);
    const valueText = this.scene.add
      .text(controlLeft + controlWidth + 16, centerY, '0%', {
        fontFamily: 'Press Start 2P, sans-serif',
        fontSize: '12px',
        color: '#FFFFFF'
      })
      .setOrigin(0, 0.5);

    track.on('pointerdown', (pointer) => {
      const localX = Phaser.Math.Clamp(pointer.x - (track.x - controlWidth / 2), 0, controlWidth);
      const ratio = Phaser.Math.Clamp(localX / controlWidth, 0, 1);
      this.setSetting(key, ratio);
      this.updateSlider(key);
      this.notifyChange();
      this.setSelectionById(key);
    });

    this.panel.add([labelText, track, fill, valueText]);

    return {
      id: key,
      type: ENTRY_TYPES.SLIDER,
      labelKey,
      labelText,
      track,
      fill,
      valueText,
      trackWidth
    };
  }

  createToggleEntry(labelKey, key, centerY) {
    const { controlLeft, controlWidth } = this.getControlMetrics();
    const labelText = this.scene.add
      .text(this.getLabelX(), centerY, LocalizationSystem.t(labelKey), {
        fontFamily: 'Press Start 2P, sans-serif',
        fontSize: '14px',
        color: '#FFFFFF'
      })
      .setOrigin(0, 0.5);
    const box = this.scene.add
      .rectangle(controlLeft + controlWidth / 2, centerY, controlWidth, 40, 0x1a2538, 0.9)
      .setStrokeStyle(1, 0x3dffec, 0.6);
    box.setInteractive({ useHandCursor: true });
    const valueText = this.scene.add
      .text(controlLeft + controlWidth / 2, centerY, 'ON', {
        fontFamily: 'Press Start 2P, sans-serif',
        fontSize: '14px',
        color: '#FFFFFF'
      })
      .setOrigin(0.5);
    box.on('pointerdown', () => {
      this.toggleSetting(key);
      this.updateToggle(key);
      this.notifyChange();
      this.setSelectionById(key);
    });
    this.panel.add([labelText, box, valueText]);
    return { id: key, type: ENTRY_TYPES.TOGGLE, box, valueText, labelKey, labelText };
  }

  createLanguageEntry(labelKey, key, centerY) {
    const { controlLeft, controlWidth } = this.getControlMetrics();
    const labelText = this.scene.add
      .text(this.getLabelX(), centerY, LocalizationSystem.t(labelKey), {
        fontFamily: 'Press Start 2P, sans-serif',
        fontSize: '14px',
        color: '#FFFFFF'
      })
      .setOrigin(0, 0.5);
    const buttonWidth = (controlWidth - CONTROL_GAP) / 2;
    const jaCenter = controlLeft + buttonWidth / 2;
    const enCenter = controlLeft + buttonWidth + CONTROL_GAP + buttonWidth / 2;
    const jaBtn = this.scene.add
      .rectangle(jaCenter, centerY + 30, buttonWidth, 40, 0x1f2a3f, 0.9)
      .setStrokeStyle(1, 0x3dffec, 0.4);
    const enBtn = this.scene.add
      .rectangle(enCenter, centerY + 30, buttonWidth, 40, 0x1f2a3f, 0.9)
      .setStrokeStyle(1, 0x3dffec, 0.4);
    jaBtn.setInteractive({ useHandCursor: true });
    enBtn.setInteractive({ useHandCursor: true });
    const jaLabel = this.scene.add
      .text(jaBtn.x, jaBtn.y, '日本語', {
        fontFamily: 'Press Start 2P, sans-serif',
        fontSize: '12px',
        color: '#FFFFFF'
      })
      .setOrigin(0.5);
    const enLabel = this.scene.add
      .text(enBtn.x, enBtn.y, 'English', {
        fontFamily: 'Press Start 2P, sans-serif',
        fontSize: '12px',
        color: '#FFFFFF'
      })
      .setOrigin(0.5);
    jaBtn.on('pointerdown', () => {
      this.setSetting(key, 'ja');
      this.updateLanguage();
      this.notifyChange();
      this.setSelectionById(key);
    });
    enBtn.on('pointerdown', () => {
      this.setSetting(key, 'en');
      this.updateLanguage();
      this.notifyChange();
      this.setSelectionById(key);
    });
    this.panel.add([labelText, jaBtn, enBtn, jaLabel, enLabel]);
    return {
      id: key,
      type: ENTRY_TYPES.CHOICE,
      labelKey,
      labelText,
      jaBtn,
      enBtn,
      jaLabel,
      enLabel
    };
  }

  createButtonRow(centerY, buttons) {
    const buttonWidth = 200;
    const spacing = 30;
    const totalWidth = buttons.length * buttonWidth + (buttons.length - 1) * spacing;
    const startX = -totalWidth / 2 + buttonWidth / 2;
    return buttons.map((btn, idx) => {
      const x = startX + idx * (buttonWidth + spacing);
      const bg = this.scene.add.rectangle(x, centerY, buttonWidth, 40, 0x1a2538, 0.9).setStrokeStyle(2, 0x3dffec, 0.6);
      bg.setInteractive({ useHandCursor: true });
      const text = this.scene.add
        .text(x, centerY, LocalizationSystem.t(btn.labelKey), {
          fontFamily: 'Press Start 2P, sans-serif',
          fontSize: '14px',
          color: '#FFFFFF'
        })
        .setOrigin(0.5);
      bg.on('pointerdown', () => {
        if (btn.id === 'apply') {
          this.emitApply();
        } else {
          this.emitCancel();
        }
      });
      this.panel.add([bg, text]);
      return { id: btn.id, type: ENTRY_TYPES.BUTTON, labelKey: btn.labelKey, bg, text };
    });
  }

  open(settings = {}) {
    this.currentSettings = { ...DEFAULT_SETTINGS, ...settings };
    this.updateAllEntries();
    this.updateLocalizedTexts();
    this.selectionIndex = 0;
    this.overlay.setInteractive({ useHandCursor: false });
    this.setVisible(true);
    this.registerKeyboard();
  }

  close() {
    this.setVisible(false);
    this.overlay.disableInteractive();
    this.removeKeyboard();
  }

  registerKeyboard() {
    this.removeKeyboard();
    const inputs = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'ENTER', 'ESC'];
    inputs.forEach((code) => {
      const eventName = `keydown-${code}`;
      const handler = (event) => {
        event.stopPropagation();
        this.handleKey(code);
      };
      this.scene.input.keyboard.on(eventName, handler, this);
      this.keyboardHandlers.push({ eventName, handler });
    });
  }

  removeKeyboard() {
    this.keyboardHandlers.forEach(({ eventName, handler }) => {
      this.scene.input.keyboard.off(eventName, handler, this);
    });
    this.keyboardHandlers = [];
  }

  handleKey(code) {
    switch (code) {
      case 'UP':
        this.changeSelection(-1);
        break;
      case 'DOWN':
        this.changeSelection(1);
        break;
      case 'LEFT':
        this.adjustSelection(-1);
        break;
      case 'RIGHT':
        this.adjustSelection(1);
        break;
      case 'ENTER':
        this.activateSelection();
        break;
      case 'ESC':
        this.emitCancel();
        break;
      default:
        break;
    }
  }

  changeSelection(delta) {
    const max = this.entries.length - 1;
    this.selectionIndex = Phaser.Math.Wrap(this.selectionIndex + delta, 0, max + 1);
    this.refreshSelectionHighlight();
  }

  setSelectionById(id) {
    const idx = this.entries.findIndex((entry) => entry.id === id);
    if (idx >= 0) {
      this.selectionIndex = idx;
      this.refreshSelectionHighlight();
    }
  }

  refreshSelectionHighlight() {
    this.entries.forEach((entry, idx) => {
      const selected = idx === this.selectionIndex;
      switch (entry.type) {
        case ENTRY_TYPES.SLIDER:
          entry.labelText.setColor(selected ? '#3DFFEC' : '#FFFFFF');
          entry.track.setStrokeStyle(1, 0x3dffec, selected ? 0.9 : 0.5);
          break;
        case ENTRY_TYPES.TOGGLE:
          entry.box.setStrokeStyle(1, 0x3dffec, selected ? 0.9 : 0.6);
          entry.valueText.setColor(selected ? '#3DFFEC' : '#FFFFFF');
          break;
        case ENTRY_TYPES.CHOICE:
          entry.jaBtn.setStrokeStyle(1, 0x3dffec, selected ? 0.9 : 0.4);
          entry.enBtn.setStrokeStyle(1, 0x3dffec, selected ? 0.9 : 0.4);
          break;
        case ENTRY_TYPES.BUTTON:
          entry.bg.setStrokeStyle(2, 0x3dffec, selected ? 1 : 0.6);
          entry.text.setColor(selected ? '#3DFFEC' : '#FFFFFF');
          break;
        default:
          break;
      }
    });
  }

  adjustSelection(direction) {
    const entry = this.entries[this.selectionIndex];
    if (!entry) return;
    switch (entry.type) {
      case ENTRY_TYPES.SLIDER:
        this.adjustSlider(entry.id, direction * 0.05);
        break;
      case ENTRY_TYPES.TOGGLE:
        if (direction !== 0) {
          this.toggleSetting(entry.id);
          this.updateToggle(entry.id);
          this.notifyChange();
        }
        break;
      case ENTRY_TYPES.CHOICE:
        this.setSetting(
          entry.id,
          direction < 0 ? 'ja' : direction > 0 ? 'en' : this.currentSettings[entry.id]
        );
        this.updateLanguage();
        this.notifyChange();
        break;
      default:
        break;
    }
  }

  adjustSlider(id, delta) {
    const value = Phaser.Math.Clamp((this.currentSettings[id] ?? 0) + delta, 0, 1);
    this.setSetting(id, value);
    this.updateSlider(id);
    this.notifyChange();
  }

  activateSelection() {
    const entry = this.entries[this.selectionIndex];
    if (!entry) return;
    if (entry.type === ENTRY_TYPES.BUTTON) {
      if (entry.id === 'apply') {
        this.emitApply();
      } else {
        this.emitCancel();
      }
    } else if (entry.type === ENTRY_TYPES.TOGGLE) {
      this.toggleSetting(entry.id);
      this.updateToggle(entry.id);
      this.notifyChange();
    } else if (entry.type === ENTRY_TYPES.CHOICE) {
      this.setSetting(entry.id, this.currentSettings.language === 'ja' ? 'en' : 'ja');
      this.updateLanguage();
      this.notifyChange();
    }
  }

  emitApply() {
    if (typeof this.callbacks.onApply === 'function') {
      this.callbacks.onApply({ ...this.currentSettings });
    }
  }

  emitCancel() {
    if (typeof this.callbacks.onCancel === 'function') {
      this.callbacks.onCancel();
    }
  }

  notifyChange() {
    if (typeof this.callbacks.onChange === 'function') {
      this.callbacks.onChange({ ...this.currentSettings });
    }
  }

  setSetting(id, value) {
    this.currentSettings[id] = value;
  }

  toggleSetting(id) {
    this.currentSettings[id] = !this.currentSettings[id];
  }

  updateAllEntries() {
    this.entries.forEach((entry) => {
      switch (entry.type) {
        case ENTRY_TYPES.SLIDER:
          this.updateSlider(entry.id);
          break;
        case ENTRY_TYPES.TOGGLE:
          this.updateToggle(entry.id);
          break;
        case ENTRY_TYPES.CHOICE:
          this.updateLanguage();
          break;
        default:
          break;
      }
    });
    this.refreshSelectionHighlight();
  }

  updateSlider(id) {
    const entry = this.entries.find((e) => e.id === id);
    if (!entry) return;
    const value = Phaser.Math.Clamp(this.currentSettings[id] ?? 0, 0, 1);
    entry.fill.displayWidth = entry.trackWidth * value;
    entry.valueText.setText(`${Math.round(value * 100)}%`);
  }

  updateToggle(id) {
    const entry = this.entries.find((e) => e.id === id);
    if (!entry) return;
    const enabled = !!this.currentSettings[id];
    entry.valueText.setText(enabled ? 'ON' : 'OFF');
    entry.valueText.setColor(enabled ? '#3DFFEC' : '#FF6C6C');
  }

  updateLanguage() {
    const entry = this.entries.find((e) => e.id === 'language');
    if (!entry) return;
    const lang = this.currentSettings.language === 'en' ? 'en' : 'ja';
    entry.jaBtn.setFillStyle(lang === 'ja' ? 0x2a3b5a : 0x1f2a3f, 0.95);
    entry.enBtn.setFillStyle(lang === 'en' ? 0x2a3b5a : 0x1f2a3f, 0.95);
    entry.jaLabel.setColor(lang === 'ja' ? '#3DFFEC' : '#FFFFFF');
    entry.enLabel.setColor(lang === 'en' ? '#3DFFEC' : '#FFFFFF');
    entry.jaLabel.setText(LocalizationSystem.t('ui.options.language.ja'));
    entry.enLabel.setText(LocalizationSystem.t('ui.options.language.en'));
    entry.labelText.setText(LocalizationSystem.t(entry.labelKey));
  }

  updateLocalizedTexts() {
    if (this.titleText) {
      this.titleText.setText(LocalizationSystem.t('ui.options.title'));
    }
    this.entries.forEach((entry) => {
      if (!entry) return;
      switch (entry.type) {
        case ENTRY_TYPES.SLIDER:
          entry.labelText.setText(LocalizationSystem.t(entry.labelKey));
          break;
        case ENTRY_TYPES.TOGGLE:
          entry.labelText.setText(LocalizationSystem.t(entry.labelKey));
          break;
        case ENTRY_TYPES.CHOICE:
          entry.labelText.setText(LocalizationSystem.t(entry.labelKey));
          entry.jaLabel.setText(LocalizationSystem.t('ui.options.language.ja'));
          entry.enLabel.setText(LocalizationSystem.t('ui.options.language.en'));
          break;
        case ENTRY_TYPES.BUTTON:
          entry.text.setText(LocalizationSystem.t(entry.labelKey));
          break;
        default:
          break;
      }
    });
  }

  destroy(fromScene) {
    this.removeKeyboard();
    super.destroy(fromScene);
  }
}
