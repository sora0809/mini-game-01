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
    this.card = this.scene.add.rectangle(
      LOGICAL_WIDTH / 2,
      LOGICAL_HEIGHT / 2,
      560,
      420,
      0x0b1524,
      0.98
    ).setStrokeStyle(3, 0x3dffec, 0.8);
    this.titleText = this.scene.add
      .text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 - 180, 'オプション', {
        fontFamily: 'Press Start 2P, sans-serif',
        fontSize: '18px',
        color: '#FFFFFF'
      })
      .setOrigin(0.5);

    this.add([this.overlay, this.card, this.titleText]);

    const startY = LOGICAL_HEIGHT / 2 - 110;
    this.entries = [];
    this.entries.push(this.createSliderEntry('ui.options.bgm', 'bgmVolume', startY));
    this.entries.push(this.createSliderEntry('ui.options.se', 'seVolume', startY + 60));
    this.entries.push(this.createToggleEntry('ui.options.flash', 'flashEffects', startY + 120));
    this.entries.push(this.createLanguageEntry('ui.options.language', 'language', startY + 180));
    this.entries.push(this.createButtonEntry('ui.common.ok', 'apply', LOGICAL_HEIGHT / 2 + 150, -90));
    this.entries.push(this.createButtonEntry('ui.common.cancel', 'cancel', LOGICAL_HEIGHT / 2 + 150, 90));
  }

  createSliderEntry(labelKey, key, posY) {
    const trackWidth = 240;
    const xCenter = LOGICAL_WIDTH / 2;
    const labelX = xCenter - 220;
    const labelText = this.scene.add
      .text(labelX, posY, LocalizationSystem.t(labelKey), {
        fontFamily: 'Press Start 2P, sans-serif',
        fontSize: '14px',
        color: '#FFFFFF'
      })
      .setOrigin(0, 0.5);

    const track = this.scene.add.rectangle(xCenter, posY, trackWidth, 10, 0x172236, 1);
    track.setStrokeStyle(1, 0x3dffec, 0.5);
    track.setInteractive();
    const fill = this.scene.add.rectangle(xCenter - trackWidth / 2, posY, 0, 10, 0x3dffec, 1).setOrigin(0, 0.5);
    const valueText = this.scene.add
      .text(xCenter + trackWidth / 2 + 20, posY, '0%', {
        fontFamily: 'Press Start 2P, sans-serif',
        fontSize: '12px',
        color: '#FFFFFF'
      })
      .setOrigin(0, 0.5);

    track.on('pointerdown', (pointer) => {
      const localX = Phaser.Math.Clamp(pointer.x - (xCenter - trackWidth / 2), 0, trackWidth);
      const ratio = Phaser.Math.Clamp(localX / trackWidth, 0, 1);
      this.setSetting(key, ratio);
      this.updateSlider(key);
      this.notifyChange();
      this.setSelectionById(key);
    });

    this.add([labelText, track, fill, valueText]);

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

  createToggleEntry(labelKey, key, posY) {
    const xCenter = LOGICAL_WIDTH / 2;
    const labelX = xCenter - 220;
    const labelText = this.scene.add
      .text(labelX, posY, LocalizationSystem.t(labelKey), {
        fontFamily: 'Press Start 2P, sans-serif',
        fontSize: '14px',
        color: '#FFFFFF'
      })
      .setOrigin(0, 0.5);
    const box = this.scene.add.rectangle(xCenter + 10, posY, 180, 36, 0x1a2538, 0.9).setStrokeStyle(1, 0x3dffec, 0.6);
    box.setInteractive({ useHandCursor: true });
    const valueText = this.scene.add
      .text(xCenter + 10, posY, 'ON', {
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
    this.add([labelText, box, valueText]);
    return { id: key, type: ENTRY_TYPES.TOGGLE, box, valueText, labelKey, labelText };
  }

  createLanguageEntry(labelKey, key, posY) {
    const xCenter = LOGICAL_WIDTH / 2;
    const labelX = xCenter - 220;
    const labelText = this.scene.add
      .text(labelX, posY, LocalizationSystem.t(labelKey), {
        fontFamily: 'Press Start 2P, sans-serif',
        fontSize: '14px',
        color: '#FFFFFF'
      })
      .setOrigin(0, 0.5);
    const jaBtn = this.scene.add.rectangle(xCenter - 70, posY + 30, 130, 32, 0x1f2a3f, 0.9).setStrokeStyle(1, 0x3dffec, 0.4);
    const enBtn = this.scene.add.rectangle(xCenter + 60, posY + 30, 130, 32, 0x1f2a3f, 0.9).setStrokeStyle(1, 0x3dffec, 0.4);
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
    this.add([labelText, jaBtn, enBtn, jaLabel, enLabel]);
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

  createButtonEntry(labelKey, id, posY, offsetX) {
    const x = LOGICAL_WIDTH / 2 + offsetX;
    const bg = this.scene.add.rectangle(x, posY, 160, 36, 0x1a2538, 0.9).setStrokeStyle(2, 0x3dffec, 0.6);
    bg.setInteractive({ useHandCursor: true });
    const text = this.scene.add
      .text(x, posY, LocalizationSystem.t(labelKey), {
        fontFamily: 'Press Start 2P, sans-serif',
        fontSize: '14px',
        color: '#FFFFFF'
      })
      .setOrigin(0.5);
    bg.on('pointerdown', () => {
      if (id === 'apply') {
        this.emitApply();
      } else {
        this.emitCancel();
      }
    });
    this.add([bg, text]);
    return { id, type: ENTRY_TYPES.BUTTON, labelKey, bg, text };
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
