import Phaser from 'phaser';
import SaveManager from '../save/SaveManager.js';
import LocalizationSystem from '../systems/LocalizationSystem.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
    this.saveManager = null;
    this.saveData = null;
  }

  preload() {
    this.load.json('localization', 'data/localization.json');
  }

  create() {
    const localizationData = this.cache.json.get('localization') || {};
    this.saveManager = new SaveManager();
    this.saveData = this.saveManager.load();
    const savedLang = this.saveData.settings?.language || 'ja';
    LocalizationSystem.init(localizationData, savedLang);
    LocalizationSystem.setLanguage(savedLang);
    this.scene.start('TitleScene');
  }
}
