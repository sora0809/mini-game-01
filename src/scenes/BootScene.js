import * as Phaser from 'phaser';
import SaveManager from '../save/SaveManager.js';
import LocalizationSystem from '../systems/LocalizationSystem.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
    this.saveManager = null;
    this.saveData = null;
  }

  create() {
    this.saveManager = new SaveManager();
    this.saveData = this.saveManager.load();
    const savedLang = this.saveData.settings?.language || 'ja';
    this.loadLocalizationData()
      .catch((err) => {
        console.warn('[BootScene] Failed to load localization data:', err);
        return {};
      })
      .then((localizationData) => {
        LocalizationSystem.init(localizationData, savedLang);
        LocalizationSystem.setLanguage(savedLang);
        this.scene.start('TitleScene');
      });
  }

  async loadLocalizationData() {
    const url = new URL('../data/localization.json', import.meta.url);
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
    return response.json();
  }
}
