const SAVE_KEY = 'bulletcore_labyrinth_save';

export default class SaveManager {
  constructor(storage) {
    if (storage) {
      this.storage = storage;
    } else if (typeof window !== 'undefined' && window.localStorage) {
      this.storage = window.localStorage;
    } else {
      this.storage = null;
    }
  }

  load() {
    if (!this.storage) return this.getDefaultData();
    try {
      const raw = this.storage.getItem(SAVE_KEY);
      if (!raw) {
        return this.getDefaultData();
      }
      const data = JSON.parse(raw);
      return this.mergeWithDefaults(data);
    } catch (err) {
      console.warn('[SaveManager] Failed to load save data:', err);
      return this.getDefaultData();
    }
  }

  save(data) {
    if (!this.storage) return;
    try {
      const payload = JSON.stringify(data);
      this.storage.setItem(SAVE_KEY, payload);
    } catch (err) {
      console.warn('[SaveManager] Failed to save data:', err);
    }
  }

  getDefaultData() {
    return {
      metaCurrency: 0,
      metaUpgrades: {},
      settings: {
        language: 'ja',
        bgmVolume: 0.7,
        seVolume: 0.8,
        flashEffects: true
      },
      stats: {
        runsPlayed: 0,
        bestWave: 0,
        boss1Defeated: false,
        boss2Defeated: false
      }
    };
  }

  mergeWithDefaults(data) {
    const defaults = this.getDefaultData();
    return {
      ...defaults,
      ...data,
      settings: { ...defaults.settings, ...(data.settings ?? {}) },
      stats: { ...defaults.stats, ...(data.stats ?? {}) },
      metaUpgrades: { ...(data.metaUpgrades ?? {}) }
    };
  }
}
