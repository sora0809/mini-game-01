import Phaser from 'phaser';
import { loadJSON } from '../utils/jsonLoader.js';
const enemyData = await loadJSON('./src/data/enemies.json');
const modifierDefs = await loadJSON('./src/data/modifiers.json');
const patternDefs = await loadJSON('./src/data/patterns.json');

const DEFAULT_MODIFIER_CANDIDATES = 3;

export default class RogueLikeSystem {
  constructor(scene, metaProgressionSystem) {
    this.scene = scene;
    this.meta = metaProgressionSystem;
    this.currentWave = 1;
    this.modifierCandidates = [];
    this.enemySubPatterns = {};
    this.availablePatternIds = Object.keys(patternDefs);
    this.dynamicModifierBonus = 0;
    this.difficultyConfig = { bulletSpeedBonus: 0 };
  }

  initializeRun(enemyIds = Object.keys(enemyData)) {
    this.dynamicModifierBonus = 0;
    this.rollModifierCandidates();
    this.assignSubPatterns(enemyIds);
    console.log('[RogueLike] Modifiers:', this.modifierCandidates);
    console.log('[RogueLike] Enemy sub patterns:', this.enemySubPatterns);
  }

  rollModifierCandidates() {
    const pool = this.meta?.getActiveModifiersPool?.() ?? Object.keys(modifierDefs);
    const baseCount = this.meta?.getModifierCandidateCountBase?.() ?? DEFAULT_MODIFIER_CANDIDATES;
    const candidateCount = Math.min(
      baseCount + this.dynamicModifierBonus,
      pool.length
    );
    const shuffled = Phaser.Utils.Array.Shuffle([...pool]);
    this.modifierCandidates = shuffled.slice(0, candidateCount);
  }

  assignSubPatterns(enemyIds) {
    this.enemySubPatterns = {};
    const patternIds = this.availablePatternIds;
    enemyIds.forEach((enemyId) => {
      if (!enemyData[enemyId]) return;
      const subPattern = Phaser.Utils.Array.GetRandom(patternIds);
      this.enemySubPatterns[enemyId] = subPattern;
    });
  }

  setCurrentWave(waveNumber) {
    this.currentWave = Phaser.Math.Clamp(waveNumber, 1, 9);
  }

  setDifficultyConfig(config = {}) {
    this.difficultyConfig = {
      bulletSpeedBonus: config.bulletSpeedBonus ?? 0
    };
  }

  getDifficultyIndex(wave = this.currentWave) {
    return Phaser.Math.Clamp((wave - 1) / 8, 0, 1);
  }

  getDifficultyInfo(wave = this.currentWave) {
    const index = this.getDifficultyIndex(wave);
    return {
      difficultyIndex: index,
      enemyHpMultiplier: 1 + 0.9 * index,
      bulletSpeedMultiplier: 1 + 0.6 * index,
      spawnMultiplier: 1 + 0.7 * index
    };
  }

  getEnemySpawnConfig(enemyId, wave = this.currentWave) {
    const baseConfig = enemyData[enemyId];
    if (!baseConfig) {
      console.warn(`[RogueLike] Enemy config not found for ${enemyId}`);
      return null;
    }
    const difficulty = this.getDifficultyInfo(wave);
    const scaledHp = Math.round(baseConfig.maxHp * difficulty.enemyHpMultiplier);
    return {
      maxHp: scaledHp,
      speed: baseConfig.speed,
      collisionRadius: baseConfig.collisionRadius,
      expReward: baseConfig.expReward,
      color: baseConfig.color,
      basePatternId: baseConfig.basePatternId,
      subPatternId: this.getSubPatternForEnemy(enemyId),
      bulletSpeedMultiplier:
        difficulty.bulletSpeedMultiplier * (1 + (this.difficultyConfig?.bulletSpeedBonus ?? 0))
    };
  }

  getSubPatternForEnemy(enemyId) {
    return this.enemySubPatterns[enemyId] ?? null;
  }

  getModifierPoolForWave(wave = this.currentWave) {
    if (wave <= 3) {
      return [];
    }
    if (wave <= 6) {
      return this.modifierCandidates.slice(0, Math.min(2, this.modifierCandidates.length));
    }
    return this.modifierCandidates.slice(0, Math.min(3, this.modifierCandidates.length));
  }

  getModifierCountForWave(wave = this.currentWave, poolSize = this.getModifierPoolForWave(wave).length) {
    if (wave <= 3 || poolSize === 0) return 0;
    if (wave <= 6) return 1;
    const maxCount = Math.min(2, poolSize);
    return Phaser.Math.Between(1, maxCount);
  }

  getModifiersForWave(wave = this.currentWave) {
    const pool = this.getModifierPoolForWave(wave);
    const count = this.getModifierCountForWave(wave, pool.length);
    if (count === 0) {
      return [];
    }
    const shuffled = Phaser.Utils.Array.Shuffle([...pool]);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  getSpawnMultiplier(wave = this.currentWave) {
    const info = this.getDifficultyInfo(wave);
    return info.spawnMultiplier;
  }

  addModifierCandidateBonus(amount) {
    this.dynamicModifierBonus += amount;
    this.rollModifierCandidates();
    console.log('[RogueLike] Modifier candidates increased, new pool:', this.modifierCandidates);
  }
}
