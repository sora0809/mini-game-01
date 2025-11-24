import { loadJSON } from '../utils/jsonLoader.js';
const modifierDefs = await loadJSON('./src/data/modifiers.json');
const perksData = await loadJSON('./src/data/perks.json');
const metaUpgradeDefs = await loadJSON('./src/data/meta_upgrades.json');

const UPGRADE_MAP = new Map(metaUpgradeDefs.map((entry) => [entry.id, entry]));

export default class MetaProgressionSystem {
  constructor(saveData = {}) {
    this.META_DEFAULTS = {
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
    this.load(saveData);
  }

  load(saveData = {}) {
    const merged = {
      ...this.META_DEFAULTS,
      ...saveData,
      settings: { ...this.META_DEFAULTS.settings, ...(saveData.settings ?? {}) },
      stats: { ...this.META_DEFAULTS.stats, ...(saveData.stats ?? {}) },
      metaUpgrades: { ...(saveData.metaUpgrades ?? {}) }
    };
    this.metaCurrency = merged.metaCurrency ?? 0;
    this.metaUpgrades = merged.metaUpgrades;
    this.settings = merged.settings;
    this.stats = merged.stats;
    this.perkPoolOverride = merged.perkPoolOverride || null;
    this.modifierPoolOverride = merged.modifierPoolOverride || null;
    this.recalculateUnlocks();
  }

  recalculateUnlocks() {
    this.unlockPerkSetA = this.getUpgradeLevel('META_UNLOCK_PERK_A') > 0;
    this.unlockAdvancedModifiers = this.getUpgradeLevel('META_UNLOCK_MOD_A') > 0;
  }

  getSaveData() {
    return {
      metaCurrency: Math.round(this.metaCurrency),
      metaUpgrades: { ...this.metaUpgrades },
      settings: { ...this.settings },
      stats: { ...this.stats }
    };
  }

  getUpgradeLevel(id) {
    return this.metaUpgrades[id] ?? 0;
  }

  getUpgradeDef(id) {
    return UPGRADE_MAP.get(id);
  }

  getMetaCurrency() {
    return this.metaCurrency;
  }

  getUpgradeList() {
    return metaUpgradeDefs.slice();
  }

  canPurchaseUpgrade(id) {
    const def = this.getUpgradeDef(id);
    if (!def) return false;
    const level = this.getUpgradeLevel(id);
    if (level >= def.maxLevel) {
      return false;
    }
    if (this.metaCurrency < def.cost) {
      return false;
    }
    if (Array.isArray(def.requires) && def.requires.length > 0) {
      const ok = def.requires.every((reqId) => this.getUpgradeLevel(reqId) > 0);
      if (!ok) return false;
    }
    return true;
  }

  purchaseUpgrade(id) {
    if (!this.canPurchaseUpgrade(id)) {
      return false;
    }
    const def = this.getUpgradeDef(id);
    const level = this.getUpgradeLevel(id);
    this.metaCurrency -= def.cost;
    this.metaUpgrades[id] = level + 1;
    this.recalculateUnlocks();
    return true;
  }

  areRequirementsMet(id) {
    const def = this.getUpgradeDef(id);
    if (!def || !Array.isArray(def.requires) || def.requires.length === 0) {
      return true;
    }
    return def.requires.every((reqId) => this.getUpgradeLevel(reqId) > 0);
  }

  getUpgradeStatus(id) {
    const def = this.getUpgradeDef(id);
    if (!def) {
      return null;
    }
    const level = this.getUpgradeLevel(id);
    const requirementsMet = this.areRequirementsMet(id);
    const canUpgrade = this.canPurchaseUpgrade(id);
    return {
      id,
      def,
      level,
      requirementsMet,
      canUpgrade,
      atMax: level >= def.maxLevel
    };
  }

  addMetaCurrency(amount) {
    if (!amount) return;
    this.metaCurrency = Math.max(0, this.metaCurrency + amount);
  }

  spendMetaCurrency(amount) {
    if (this.metaCurrency < amount) return false;
    this.metaCurrency -= amount;
    return true;
  }

  getInitialHpIncrease() {
    return this.getUpgradeLevel('META_HP_MAX_I') + this.getUpgradeLevel('META_HP_MAX_II');
  }

  getDashCooldownMultiplier() {
    const level = this.getUpgradeLevel('META_DASH_CD_I');
    return Math.pow(0.9, level);
  }

  getDashMaxStockBonus() {
    return this.getUpgradeLevel('META_DASH_STOCK');
  }

  getExpMultiplier() {
    const level = this.getUpgradeLevel('META_EXP_GAIN');
    return Math.pow(1.05, level);
  }

  getCoreMultiplier() {
    const level = this.getUpgradeLevel('META_CORE_GAIN');
    return Math.pow(1.05, level);
  }

  getStartLevel() {
    return this.getUpgradeLevel('META_START_LEVEL') > 0 ? 2 : 1;
  }

  getPerkRarityBonus() {
    const level = this.getUpgradeLevel('META_PERK_RARITY');
    return level * 0.1;
  }

  hasSafeSettingsDefault() {
    return this.getUpgradeLevel('META_SAFE_OPTION') > 0;
  }

  shouldSkipTutorial() {
    return this.getUpgradeLevel('META_TUTORIAL_SKIP') > 0;
  }

  isModifierUnlocked(modId) {
    if (this.modifierPoolOverride) {
      return this.modifierPoolOverride.includes(modId);
    }
    if (this.unlockAdvancedModifiers) {
      return true;
    }
    const baseIds = ['MOD_SLOW_START', 'MOD_ACCELERATE', 'MOD_WAVE', 'MOD_DECAY'];
    return baseIds.includes(modId);
  }

  getActiveModifiersPool() {
    if (Array.isArray(this.modifierPoolOverride) && this.modifierPoolOverride.length > 0) {
      return this.modifierPoolOverride.slice();
    }
    return Object.keys(modifierDefs).filter((id) => this.isModifierUnlocked(id));
  }

  getModifierCandidateCountBase() {
    return 3;
  }

  getExtraModifierCandidates() {
    return 0;
  }

  isPerkUnlocked(perkId) {
    const perk = perksData.find((p) => p.id === perkId);
    if (!perk) return false;
    if (Array.isArray(this.perkPoolOverride) && this.perkPoolOverride.length > 0) {
      return this.perkPoolOverride.includes(perkId);
    }
    if (perk.requiresMeta === 'A') {
      return this.unlockPerkSetA;
    }
    return true;
  }

  getAvailablePerkPool() {
    if (Array.isArray(this.perkPoolOverride) && this.perkPoolOverride.length > 0) {
      return this.perkPoolOverride.slice();
    }
    return perksData.filter((perk) => this.isPerkUnlocked(perk.id)).map((perk) => perk.id);
  }

  updateSettings(partial) {
    this.settings = { ...this.settings, ...partial };
  }

  recordRunResult({ reachedWave = 0, boss1Defeated = false, boss2Defeated = false } = {}) {
    this.stats.runsPlayed = (this.stats.runsPlayed ?? 0) + 1;
    this.stats.bestWave = Math.max(this.stats.bestWave ?? 0, reachedWave);
    if (boss1Defeated) {
      this.stats.boss1Defeated = true;
    }
    if (boss2Defeated) {
      this.stats.boss2Defeated = true;
    }
  }
}
