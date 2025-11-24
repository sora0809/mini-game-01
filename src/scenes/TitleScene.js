import * as Phaser from 'phaser';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../config.js';
import SaveManager from '../save/SaveManager.js';
import OptionsView from '../ui/OptionsView.js';
import LocalizationSystem from '../systems/LocalizationSystem.js';

const MENU_ITEMS = [
  { key: 'ui.menu.start', action: 'start' },
  { key: 'ui.menu.meta', action: 'meta' },
  { key: 'ui.menu.options', action: 'options' }
];

const RUN_OPTIONS = [
  { id: 'normal', label: 'Normal', description: '標準難易度' },
  { id: 'hard', label: 'Hard', description: '弾速 +15%' }
];

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
    this.menuButtons = [];
    this.runOptionButtons = [];
    this.selectedMenuIndex = 0;
    this.runSetupIndex = 0;
    this.isRunSetupOpen = false;
    this.isOptionsOpen = false;
    this.runSetupContainer = null;
    this.toastTimer = null;
    this.saveManager = null;
    this.saveData = null;
    this.currentSettings = {
      bgmVolume: 0.7,
      seVolume: 0.8,
      flashEffects: true,
      language: 'ja'
    };
    this.optionsView = null;
    this.previousLanguageBeforeOptions = null;
    this.titleText = null;
    this.subtitleText = null;
    this.toastText = null;
    this.keyboardListeners = [];
  }

  create() {
    this.saveManager = new SaveManager();
    this.saveData = this.saveManager.load();
    this.currentSettings = {
      ...this.currentSettings,
      ...(this.saveData.settings ?? {})
    };
    this.currentSettings.language = LocalizationSystem.getLanguage();
    this.cleanupUI();
    this.menuButtons = [];
    this.runOptionButtons = [];
    this.isRunSetupOpen = false;
    this.isOptionsOpen = false;
    this.runSetupContainer = null;
    this.optionsView = null;
    this.createBackground();
    this.createMenu();
    this.createRunSetupPanel();
    this.createToast();
    this.createOptionsView();
    this.registerInput();
    this.setMenuSelection(0);
    this.refreshLocalizedTexts();
    this.applyAudioSettings(this.currentSettings);
  }

  cleanupUI() {
    if (this.menuButtons?.length) {
      this.menuButtons.forEach((btn) => {
        btn?.bg?.destroy();
        btn?.label?.destroy();
        btn?.container?.destroy();
      });
    }
    if (this.runOptionButtons?.length) {
      this.runOptionButtons.forEach((btn) => {
        btn?.bg?.destroy();
        btn?.label?.destroy();
        btn?.desc?.destroy();
        btn?.container?.destroy();
      });
    }
    this.menuButtons = [];
    this.runOptionButtons = [];
    this.runSetupContainer?.destroy();
    this.runSetupContainer = null;
    this.optionsView?.destroy();
    this.optionsView = null;
    this.titleText?.destroy();
    this.titleText = null;
    this.subtitleText?.destroy();
    this.subtitleText = null;
    this.toastText?.destroy();
    this.toastText = null;
    if (this.keyboardListeners?.length) {
      this.keyboardListeners.forEach(({ event, handler }) => {
        this.input?.keyboard?.off(event, handler);
      });
    }
    this.keyboardListeners = [];
  }

  createBackground() {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x08111f, 1);
    graphics.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    graphics.lineStyle(1, 0x12304a, 0.5);
    for (let x = 0; x <= LOGICAL_WIDTH; x += 40) {
      graphics.lineBetween(x, 0, x, LOGICAL_HEIGHT);
    }
    for (let y = 0; y <= LOGICAL_HEIGHT; y += 40) {
      graphics.lineBetween(0, y, LOGICAL_WIDTH, y);
    }

    this.titleText = this.add.text(LOGICAL_WIDTH / 2, 120, LocalizationSystem.t('ui.title'), {
      fontFamily: 'Press Start 2P, sans-serif',
      fontSize: '28px',
      color: '#3DFFEC'
    }).setOrigin(0.5);
    this.subtitleText = this.add.text(LOGICAL_WIDTH / 2, 170, LocalizationSystem.t('ui.menu.subtitle'), {
      fontFamily: 'Press Start 2P, sans-serif',
      fontSize: '12px',
      color: '#FFFFFF'
    }).setOrigin(0.5);
  }

  createMenu() {
    const startY = 240;
    MENU_ITEMS.forEach((item, index) => {
      const container = this.add.container(LOGICAL_WIDTH / 2, startY + index * 60);
      const bg = this.add.rectangle(0, 0, 260, 40, 0x162238, 0.85).setStrokeStyle(2, 0x3dffec, 0.4);
      bg.setInteractive({ useHandCursor: true });
      const label = this.add.text(0, 0, LocalizationSystem.t(item.key), {
        fontFamily: 'Press Start 2P, sans-serif',
        fontSize: '16px',
        color: '#FFFFFF'
      }).setOrigin(0.5);
      container.add([bg, label]);
      bg.on('pointerover', () => {
        if (!this.isRunSetupOpen && !this.isOptionsOpen) {
          this.setMenuSelection(index);
        }
      });
      bg.on('pointerdown', () => {
        if (!this.isRunSetupOpen && !this.isOptionsOpen) {
          this.activateMenuSelection(index);
        }
      });
      this.menuButtons.push({ container, bg, label, data: item });
    });
  }

  createRunSetupPanel() {
    const panel = this.add.container(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2);
    const overlay = this.add.rectangle(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT, 0x000000, 0.7).setOrigin(0.5);
    overlay.setInteractive();
    const card = this.add.rectangle(0, 0, 420, 260, 0x10192b, 0.95).setStrokeStyle(3, 0x3dffec, 0.7);
    const title = this.add.text(0, -100, 'ランセットアップ', {
      fontFamily: 'Press Start 2P, sans-serif',
      fontSize: '18px',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    panel.add([overlay, card, title]);

    this.runOptionButtons = [];
    RUN_OPTIONS.forEach((opt, index) => {
      const btn = this.add.container(0, -20 + index * 70);
      const bg = this.add.rectangle(0, 0, 320, 56, 0x1b2940, 0.9).setStrokeStyle(2, 0xffffff, 0.3);
      bg.setInteractive({ useHandCursor: true });
      const label = this.add.text(-130, -10, opt.label, {
        fontFamily: 'Press Start 2P, sans-serif',
        fontSize: '16px',
        color: '#FFFFFF'
      }).setOrigin(0, 0.5);
      const desc = this.add.text(-130, 18, opt.description, {
        fontFamily: 'Press Start 2P, sans-serif',
        fontSize: '12px',
        color: '#9ad8ff'
      }).setOrigin(0, 0.5);
      btn.add([bg, label, desc]);
      bg.on('pointerover', () => this.updateRunSetupSelection(index));
      bg.on('pointerdown', () => this.confirmRunSetup(index));
      panel.add(btn);
      this.runOptionButtons.push({ container: btn, bg, label, desc });
    });

    const cancelText = this.add.text(0, 100, 'ESCで戻る / Enterで決定', {
      fontFamily: 'Press Start 2P, sans-serif',
      fontSize: '12px',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    panel.add(cancelText);

    panel.setVisible(false);
    this.runSetupContainer = panel;
  }

  createToast() {
    this.toastText = this.add.text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT - 40, '', {
      fontFamily: 'Press Start 2P, sans-serif',
      fontSize: '12px',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    this.toastText.setAlpha(0);
  }

  registerInput() {
    this.addKeyboardListener('keydown-UP', () => {
      if (this.isOptionsOpen) {
        return;
      }
      if (this.isRunSetupOpen) {
        this.updateRunSetupSelection(this.runSetupIndex - 1);
      } else {
        this.setMenuSelection(this.selectedMenuIndex - 1);
      }
    });
    this.addKeyboardListener('keydown-DOWN', () => {
      if (this.isOptionsOpen) {
        return;
      }
      if (this.isRunSetupOpen) {
        this.updateRunSetupSelection(this.runSetupIndex + 1);
      } else {
        this.setMenuSelection(this.selectedMenuIndex + 1);
      }
    });
    this.addKeyboardListener('keydown-ENTER', () => {
      if (this.isOptionsOpen) {
        return;
      }
      if (this.isRunSetupOpen) {
        this.confirmRunSetup(this.runSetupIndex);
      } else {
        this.activateMenuSelection(this.selectedMenuIndex);
      }
    });
    this.addKeyboardListener('keydown-ESC', () => {
      if (this.isOptionsOpen) {
        this.handleOptionsCancel();
        return;
      }
      if (this.isRunSetupOpen) {
        this.closeRunSetup();
      }
    });
  }

  addKeyboardListener(event, handler) {
    if (!this.keyboardListeners) {
      this.keyboardListeners = [];
    }
    const bound = handler.bind(this);
    this.input.keyboard.on(event, bound);
    this.keyboardListeners.push({ event, handler: bound });
  }

  setMenuSelection(index) {
    const clamped = Phaser.Math.Clamp(index, 0, this.menuButtons.length - 1);
    this.selectedMenuIndex = clamped;
    this.menuButtons.forEach((btn, idx) => {
      const isSel = idx === clamped;
      if (
        !btn?.bg ||
        !btn?.label ||
        !btn.label.active ||
        !btn.label.texture ||
        !btn.label.frame
      ) {
        return;
      }
      btn.bg.setFillStyle(isSel ? 0x24324f : 0x162238, 1);
      btn.bg.setStrokeStyle(2, isSel ? 0x3dffec : 0x3dffec, isSel ? 0.9 : 0.4);
      btn.label.setColor(isSel ? '#3DFFEC' : '#FFFFFF');
    });
  }

  activateMenuSelection(index) {
    const item = this.menuButtons[index]?.data;
    if (!item) return;
    switch (item.action) {
      case 'start':
        this.openRunSetup();
        break;
      case 'meta':
        this.scene.start('MetaScene');
        break;
      case 'options':
        this.openOptionsPanel();
        break;
      default:
        break;
    }
  }

  openRunSetup() {
    this.isRunSetupOpen = true;
    this.runSetupIndex = 0;
    this.runSetupContainer.setVisible(true);
    this.updateRunSetupSelection(0);
  }

  closeRunSetup() {
    this.isRunSetupOpen = false;
    this.runSetupContainer.setVisible(false);
  }

  updateRunSetupSelection(index) {
    if (!this.isRunSetupOpen) return;
    if (index < 0) index = RUN_OPTIONS.length - 1;
    if (index >= RUN_OPTIONS.length) index = 0;
    this.runSetupIndex = index;
    this.runOptionButtons.forEach((btn, idx) => {
      const selected = idx === index;
      if (
        !btn?.bg ||
        !btn?.label ||
        !btn.label.active ||
        !btn.label.texture ||
        !btn.label.frame
      ) {
        return;
      }
      btn.bg.setFillStyle(selected ? 0x2b3e60 : 0x1b2940, selected ? 1 : 0.9);
      btn.bg.setStrokeStyle(2, selected ? 0x3dffec : 0xffffff, selected ? 0.9 : 0.3);
      btn.label.setColor(selected ? '#3DFFEC' : '#FFFFFF');
    });
  }

  confirmRunSetup(index) {
    const option = RUN_OPTIONS[index];
    if (!option) return;
    this.closeRunSetup();
    this.scene.start('GameScene', { difficulty: option.id });
  }

  createComingSoonDialog(message) {
    this.showToast(message);
  }

  showToast(message) {
    if (!this.toastText) return;
    this.toastText.setText(message);
    this.toastText.setAlpha(1);
    if (this.toastTimer) {
      this.toastTimer.remove(false);
      this.toastTimer = null;
    }
    this.toastTimer = this.tweens.add({
      targets: this.toastText,
      alpha: 0,
      delay: 1200,
      duration: 400,
      ease: 'Sine.easeOut'
    });
  }

  createOptionsView() {
    this.optionsView = new OptionsView(this, {
      onApply: (settings) => this.handleOptionsApply(settings),
      onCancel: () => this.handleOptionsCancel(),
      onChange: (settings) => this.handleOptionsPreview(settings)
    });
    this.optionsView.close();
  }

  openOptionsPanel() {
    if (this.isOptionsOpen) return;
    if (!this.optionsView) {
      this.createOptionsView();
    }
    if (this.isRunSetupOpen) {
      this.closeRunSetup();
    }
    this.previousLanguageBeforeOptions = LocalizationSystem.getLanguage();
    this.isOptionsOpen = true;
    this.optionsView.open(this.currentSettings);
  }

  handleOptionsApply(newSettings) {
    this.currentSettings = { ...this.currentSettings, ...newSettings };
    this.saveData = { ...this.saveData, settings: { ...this.currentSettings } };
    LocalizationSystem.setLanguage(this.currentSettings.language || 'ja');
    this.saveManager.save(this.saveData);
    this.applyAudioSettings(this.currentSettings);
    this.isOptionsOpen = false;
    this.optionsView.close();
    this.refreshLocalizedTexts();
    const msg = LocalizationSystem.getLanguage() === 'ja' ? '設定を保存しました' : 'Settings saved';
    this.showToast(msg);
  }

  handleOptionsCancel() {
    if (!this.isOptionsOpen) return;
    this.isOptionsOpen = false;
    this.optionsView?.close();
    LocalizationSystem.setLanguage(this.previousLanguageBeforeOptions || 'ja');
    this.applyAudioSettings(this.currentSettings);
    this.refreshLocalizedTexts();
  }

  applyAudioSettings(settings) {
    if (!settings) return;
    const seVolume = Phaser.Math.Clamp(settings.seVolume ?? 1, 0, 1);
    this.sound.volume = seVolume;
    this.bgmVolume = settings.bgmVolume ?? 0.7;
  }

  handleOptionsPreview(settings) {
    if (!settings) return;
    this.applyAudioSettings(settings);
    if (settings.language) {
      LocalizationSystem.setLanguage(settings.language);
    }
    this.optionsView?.updateLocalizedTexts();
  }

  refreshLocalizedTexts() {
    if (this.titleText) {
      this.titleText.setText(LocalizationSystem.t('ui.title'));
    }
    if (this.subtitleText) {
      this.subtitleText.setText(LocalizationSystem.t('ui.menu.subtitle'));
    }
    this.menuButtons.forEach((btn) => {
      const key = btn.data?.key;
      if (key) {
        btn.label.setText(LocalizationSystem.t(key));
      }
    });
    this.optionsView?.updateLocalizedTexts();
  }
}
