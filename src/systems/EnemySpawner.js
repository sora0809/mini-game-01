import Phaser from 'phaser';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../config.js';
import Enemy from '../entities/Enemy.js';
import Boss from '../entities/Boss.js';
import { loadJSON } from '../utils/jsonLoader.js';
const enemyData = await loadJSON('./src/data/enemies.json');

export default class EnemySpawner {
  constructor(scene, player, rogueLikeSystem = null) {
    this.scene = scene;
    this.player = player;
    this.rogueLikeSystem = rogueLikeSystem;
    this.enemyGroup = this.scene.physics.add.group();
    this.activeEnemies = [];
    this.spawnEvents = [];
    this.pendingSpawnEvents = 0;
  }

  spawnEnemy(enemyId, spawnArea = 'random', overrides = {}) {
    const config = enemyData[enemyId];
    if (!config) {
      console.warn(`[EnemySpawner] Enemy ID ${enemyId} not found.`);
      return null;
    }

    const { customPosition, ...configOverrides } = overrides;
    const position = customPosition ?? this.getSpawnPosition(spawnArea);
    const mergedConfig = {
      ...config,
      ...configOverrides
    };
    const enemyClass = mergedConfig.type === 'boss' ? Boss : Enemy;
    const enemy = new enemyClass(this.scene, position.x, position.y, mergedConfig);
    enemy.setTarget(this.player);
    this.enemyGroup.add(enemy);
    this.activeEnemies.push(enemy);
    enemy.once('destroy', () => {
      const idx = this.activeEnemies.indexOf(enemy);
      if (idx >= 0) {
        this.activeEnemies.splice(idx, 1);
      }
    });
    this.scene.events.emit('enemy-spawned', enemy);
    return enemy;
  }

  spawnWaveFromConfig(waveConfig, waveNumber) {
    this.clearScheduledSpawns();
    if (!waveConfig || !Array.isArray(waveConfig.spawns)) {
      return;
    }
    const spawnMultiplier = this.rogueLikeSystem?.getSpawnMultiplier(waveNumber) ?? 1;
    waveConfig.spawns.forEach((spawnEntry) => {
      this.scheduleSpawnEntry(spawnEntry, waveNumber, spawnMultiplier);
    });
  }

  scheduleSpawnEntry(spawnEntry, waveNumber, spawnMultiplier) {
    const delayMs = (spawnEntry.delay ?? 0) * 1000;
    this.pendingSpawnEvents += 1;
    const event = this.scene.time.delayedCall(
      delayMs,
      () => {
        this.executeSpawnEntry(spawnEntry, waveNumber, spawnMultiplier);
        this.pendingSpawnEvents = Math.max(0, this.pendingSpawnEvents - 1);
        this.removeSpawnEvent(event);
      },
      undefined,
      this
    );
    this.spawnEvents.push(event);
  }

  removeSpawnEvent(event) {
    const idx = this.spawnEvents.indexOf(event);
    if (idx >= 0) {
      this.spawnEvents.splice(idx, 1);
    }
  }

  executeSpawnEntry(spawnEntry, waveNumber, spawnMultiplier) {
    const baseCount = spawnEntry.count ?? 1;
    const isBoss = enemyData[spawnEntry.enemyId]?.type === 'boss';
    const totalCount = isBoss ? baseCount : Math.max(1, Math.round(baseCount * spawnMultiplier));
    for (let i = 0; i < totalCount; i += 1) {
      const area = this.resolveSpawnArea(spawnEntry.spawnArea);
      const overrides =
        this.rogueLikeSystem?.getEnemySpawnConfig(spawnEntry.enemyId, waveNumber) ?? {};
      this.spawnEnemy(spawnEntry.enemyId, area, overrides);
    }
  }

  resolveSpawnArea(spawnArea) {
    if (typeof spawnArea !== 'string' || spawnArea.length === 0) {
      return 'random';
    }
    if (spawnArea.includes('/')) {
      const parts = spawnArea.split('/').map((part) => part.trim());
      return Phaser.Utils.Array.GetRandom(parts.filter(Boolean)) || 'random';
    }
    return spawnArea;
  }

  getSpawnPosition(area) {
    const margin = 30;
    switch (area) {
      case 'top':
        return {
          x: Phaser.Math.Between(margin, LOGICAL_WIDTH - margin),
          y: margin
        };
      case 'center':
        return {
          x: LOGICAL_WIDTH / 2,
          y: LOGICAL_HEIGHT / 2
        };
      case 'bottom':
        return {
          x: Phaser.Math.Between(margin, LOGICAL_WIDTH - margin),
          y: LOGICAL_HEIGHT - margin
        };
      case 'left':
        return {
          x: margin,
          y: Phaser.Math.Between(margin, LOGICAL_HEIGHT - margin)
        };
      case 'right':
        return {
          x: LOGICAL_WIDTH - margin,
          y: Phaser.Math.Between(margin, LOGICAL_HEIGHT - margin)
        };
      case 'left_right':
        return this.getSpawnPosition(Math.random() < 0.5 ? 'left' : 'right');
      case 'random':
      default:
        return {
          x: Phaser.Math.Between(margin, LOGICAL_WIDTH - margin),
          y: Phaser.Math.Between(margin, LOGICAL_HEIGHT - margin)
        };
    }
  }

  clearScheduledSpawns() {
    this.spawnEvents.forEach((event) => event?.remove(false));
    this.spawnEvents = [];
    this.pendingSpawnEvents = 0;
  }

  hasPendingSpawnEvents() {
    return this.pendingSpawnEvents > 0;
  }

  clearAllEnemies() {
    this.enemyGroup.children.each((enemy) => {
      enemy.destroy();
    });
    this.activeEnemies = [];
  }

  getGroup() {
    return this.enemyGroup;
  }

  getAliveEnemies() {
    return this.activeEnemies.filter((enemy) => enemy.active);
  }

  getAliveEnemyCount() {
    return this.getAliveEnemies().length;
  }
}
