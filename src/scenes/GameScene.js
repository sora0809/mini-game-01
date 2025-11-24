import * as Phaser from 'phaser';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../config.js';
import Player from '../entities/Player.js';
import PlayerController from '../systems/PlayerController.js';
import BulletSystem from '../systems/BulletSystem.js';
import EnemySpawner from '../systems/EnemySpawner.js';
import ModifierSystem from '../systems/ModifierSystem.js';
import PatternSystem from '../systems/PatternSystem.js';
import RogueLikeSystem from '../systems/RogueLikeSystem.js';
import MetaProgressionSystem from '../systems/MetaProgressionSystem.js';
import PerkSystem from '../systems/PerkSystem.js';
import LevelUpPanel from '../ui/LevelUpPanel.js';
import HudView from '../ui/HudView.js';
import PauseMenu from '../ui/PauseMenu.js';
import OptionsView from '../ui/OptionsView.js';
import LocalizationSystem from '../systems/LocalizationSystem.js';
import SaveManager from '../save/SaveManager.js';
import { loadJSON } from '../utils/jsonLoader.js';
const wavesData = await loadJSON('./src/data/waves.json');
const enemyData = await loadJSON('./src/data/enemies.json');

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.player = null;
    this.playerController = null;
    this.bulletSystem = null;
    this.enemySpawner = null;
    this.metaProgressionSystem = null;
    this.rogueLikeSystem = null;
    this.modifierSystem = null;
    this.patternSystem = null;
    this.waves = wavesData;
    this.currentWaveIndex = 0;
    this.currentWaveNumber = 1;
    this.waveState = 'idle';
    this.waveElapsedMs = 0;
    this.waveRemainingMs = 0;
    this.waveIntervalDuration = 2000;
    this.waveIntervalTimer = 0;
    this.runCompleted = false;
    this.currentWaveConfig = null;
    this.perkSystem = null;
    this.levelUpPanel = null;
    this.pauseMenu = null;
    this.hudView = null;
    this.finalPhaseOverlay = null;
    this.finalPhaseTint = 0x9b3dff;
    this.activeBossPhase = null;
    this.playerLevel = 1;
    this.playerXp = 0;
    this.expMultiplier = 1;
    this.coreBonusMultiplier = 1;
    this.isLevelUpActive = false;
    this.isManualPause = false;
    this.pendingLevelUps = 0;
    this.savedTimeScale = 1;
    this.pauseLocks = 0;
    this.globalPerkEffects = {};
    this.surviveXpRate = 0.2;
    this.saveManager = null;
    this.saveData = null;
    this.coreCurrencyEarned = 0;
    this.boss1DefeatedThisRun = false;
    this.boss2DefeatedThisRun = false;
    this.runDifficulty = 'normal';
    this.runDifficultyConfig = { id: 'normal', bulletSpeedBonus: 0 };
    this.runStartTime = 0;
    this.playerHitCount = 0;
    this.runFinished = false;
    this.optionsView = null;
    this.isOptionsMenuOpen = false;
    this.bgmVolume = 0.7;
    this.prevOptionsLanguage = null;
  }

  create() {
    this.physics.world.setBounds(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    this.drawArenaBackground();
    this.saveManager = new SaveManager();
    this.saveData = this.saveManager.load();
    this.metaProgressionSystem = new MetaProgressionSystem(this.saveData);
    this.playerLevel = this.metaProgressionSystem.getStartLevel();
    this.pendingLevelUps = Math.max(0, this.playerLevel - 1);
    this.expMultiplier = this.metaProgressionSystem.getExpMultiplier();
    this.coreBonusMultiplier = this.metaProgressionSystem.getCoreMultiplier();
    const initData = this.scene.settings?.data ?? {};
    this.setRunDifficulty(initData.difficulty ?? 'normal');
    this.applyAudioSettings(this.metaProgressionSystem.settings);
    this.player = new Player(this, LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2);
    this.rogueLikeSystem = new RogueLikeSystem(this, this.metaProgressionSystem);
    this.rogueLikeSystem.setDifficultyConfig(this.runDifficultyConfig);
    this.rogueLikeSystem.initializeRun(Object.keys(enemyData));
    this.rogueLikeSystem.setCurrentWave(this.currentWaveNumber);
    this.modifierSystem = new ModifierSystem(this);
    this.bulletSystem = new BulletSystem(this, this.modifierSystem);
    this.patternSystem = new PatternSystem(this, this.bulletSystem);
    this.enemySpawner = new EnemySpawner(this, this.player, this.rogueLikeSystem);
    this.playerController = new PlayerController(this, this.player, this.bulletSystem);
    this.applyMetaProgressionToPlayer();
    this.playerController.setOnDeathCallback(() => this.handlePlayerDeath());
    this.modifierSystem.setPlayerTarget(this.player);
    this.perkSystem = new PerkSystem(
      this,
      this.metaProgressionSystem,
      this.playerController,
      this.bulletSystem
    );
    this.levelUpPanel = new LevelUpPanel(this);
    this.hudView = new HudView(this);
    this.pauseMenu = new PauseMenu(this);
    this.pauseMenu.setCallbacks({
      resume: () => this.exitPause(),
      title: () => this.returnToTitle(),
      options: () => this.openOptionsMenu()
    });
    this.optionsView = new OptionsView(this, {
      onApply: (settings) => this.handleOptionsApply(settings),
      onCancel: () => this.handleOptionsCancel(),
      onChange: (settings) => this.handleOptionsPreview(settings)
    });
    this.optionsView.close();
    this.setupCollisions();
    this.registerDebugHitKey();
    this.registerModifierDemoKeys();
    this.registerPauseKey();
    this.events.on('enemy-spawned', this.onEnemySpawned, this);
    this.events.on('player-hit', this.onPlayerHit, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.runStartTime = this.time.now;
    this.playerHitCount = 0;
    this.coreCurrencyEarned = 0;
    this.runFinished = false;
    this.startWave(0);
    this.updateHud();
    if (this.pendingLevelUps > 0) {
      this.time.delayedCall(400, () => {
        if (this.pendingLevelUps > 0 && !this.isLevelUpActive && !this.isManualPause) {
          this.triggerLevelUpPanel();
        }
      });
    }
  }

  update(time, delta) {
    this.updateHud();
    if (this.isLevelUpActive || this.isManualPause) {
      return;
    }
    if (this.playerController) {
      this.playerController.update(delta);
    }
    this.bulletSystem?.update(delta);
    this.updateWaveState(delta);
  }

  drawArenaBackground() {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x101522, 1);
    graphics.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    const gridSize = 40;
    graphics.lineStyle(1, 0x1c2234, 0.6);

    for (let x = 0; x <= LOGICAL_WIDTH; x += gridSize) {
      graphics.lineBetween(x, 0, x, LOGICAL_HEIGHT);
    }

    for (let y = 0; y <= LOGICAL_HEIGHT; y += gridSize) {
      graphics.lineBetween(0, y, LOGICAL_WIDTH, y);
    }
  }

  registerDebugHitKey() {
    this.input.keyboard.on('keydown-H', () => {
      this.playerController?.takeHit('debug_key');
    });
  }

  setupCollisions() {
    if (!this.enemySpawner) {
      return;
    }

    this.physics.add.overlap(
      this.bulletSystem.getPlayerBullets(),
      this.enemySpawner.getGroup(),
      this.onPlayerBulletHitsEnemy,
      undefined,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.enemySpawner.getGroup(),
      this.onEnemyTouchesPlayer,
      undefined,
      this
    );
  }

  onPlayerBulletHitsEnemy(bullet, enemy) {
    if (!enemy || !enemy.takeDamage) {
      return;
    }
    const damage = this.playerController?.getShotDamage?.() ?? 1;
    enemy.takeDamage(damage);
    bullet?.recycle?.();
  }

  onEnemyTouchesPlayer(player, enemy) {
    if (!enemy || !player) {
      return;
    }
    this.playerController?.takeHit('enemy_contact');
  }

  onEnemySpawned(enemy) {
    enemy.once('enemy-killed', () => {
      this.handleEnemyKilled(enemy);
    });
    if (enemy.config?.type === 'boss') {
      this.configureBoss(enemy);
    }
  }

  handleEnemyKilled(enemy) {
    const exp = enemy?.expReward ?? 1;
    this.addExperience(exp);
    if (enemy?.config?.type === 'boss') {
      this.onBossDefeated(enemy);
    }
  }

  configureBoss(boss) {
    boss.setBattleContext({
      patternSystem: this.patternSystem,
      enemySpawner: this.enemySpawner,
      player: this.player
    });
    if (boss.config?.id === 'BOSS_CORE_GUARD') {
      this.setupBossCoreGuard(boss);
    }
    if (boss.config?.id === 'BOSS_CORE_HEART') {
      this.setupBossCoreHeart(boss);
    }
  }

  setupBossCoreGuard(boss) {
    boss.setPhaseDefinitions([
      {
        id: 'BOSS_CORE_GUARD_PHASE1',
        minRatio: 0.5,
        maxRatio: 1,
        onEnter: (bossInstance) => this.configureBossCoreGuardPhase1(bossInstance)
      },
      {
        id: 'BOSS_CORE_GUARD_PHASE2',
        minRatio: 0,
        maxRatio: 0.5,
        onEnter: (bossInstance) => this.configureBossCoreGuardPhase2(bossInstance)
      }
    ]);
  }

  configureBossCoreGuardPhase1(boss) {
    let toggle = false;
    boss.schedulePhaseEvent(2000, () => {
      toggle = !toggle;
      if (toggle) {
        boss.firePattern('PAT_RING_SMALL', ['MOD_SLOW_START']);
      } else {
        const randomAngle = Phaser.Math.Between(0, 360);
        boss.firePattern('PAT_FAN_WIDE', ['MOD_DECAY'], { baseAngle: randomAngle });
      }
    }, true);

    boss.schedulePhaseEvent(10000, () => {
      boss.spawnAdds('EN_MINE', 2, 160);
    }, true);
  }

  configureBossCoreGuardPhase2(boss) {
    boss.spawnAdds('EN_SWARMER', 4, 200);
    boss.schedulePhaseEvent(1500, () => {
      boss.firePattern('PAT_SPIRAL', ['MOD_SLOW_START']);
    }, true);
    boss.schedulePhaseEvent(5000, () => {
      boss.firePattern('PAT_AIMED_BURST', ['MOD_WAVE']);
    }, true);
  }

  activateBossFinalPhaseEffects() {
    if (!this.finalPhaseOverlay) {
      this.finalPhaseOverlay = this.add.rectangle(
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT / 2,
        LOGICAL_WIDTH,
        LOGICAL_HEIGHT,
        0x000022,
        0.5
      );
      this.finalPhaseOverlay.setDepth(900);
    }
    this.finalPhaseOverlay.setVisible(true);
    this.finalPhaseOverlay.setAlpha(0);
    this.tweens.add({
      targets: this.finalPhaseOverlay,
      alpha: 0.45,
      duration: 600,
      ease: 'Sine.easeOut'
    });
  }

  deactivateBossFinalPhaseEffects() {
    if (this.finalPhaseOverlay) {
      this.finalPhaseOverlay.setVisible(false);
    }
  }

  onBossDefeated(enemy) {
    if (!enemy?.config) {
      return;
    }
    if (enemy.config.id === 'BOSS_CORE_GUARD') {
      this.boss1DefeatedThisRun = true;
      this.awardCoreAmount(5);
    }
    if (enemy.config.id === 'BOSS_CORE_HEART') {
      this.boss2DefeatedThisRun = true;
      this.awardCoreAmount(10);
      this.deactivateBossFinalPhaseEffects();
    }
  }

  setupBossCoreHeart(boss) {
    boss.phase3Angle = 0;
    boss.setPhaseDefinitions([
      {
        id: 'BOSS_CORE_HEART_PHASE1',
        minRatio: 0.7,
        maxRatio: 1,
        onEnter: (instance) => this.configureBossCoreHeartPhase1(instance)
      },
      {
        id: 'BOSS_CORE_HEART_PHASE2',
        minRatio: 0.35,
        maxRatio: 0.7,
        onEnter: (instance) => this.configureBossCoreHeartPhase2(instance)
      },
      {
        id: 'BOSS_CORE_HEART_PHASE3',
        minRatio: 0,
        maxRatio: 0.35,
        onEnter: (instance) => this.configureBossCoreHeartPhase3(instance)
      }
    ]);
  }

  configureBossCoreHeartPhase1(boss) {
    boss.spawnAdds('EN_GRUNT', 4, 220);
    boss.schedulePhaseEvent(1800, () => {
      boss.firePattern('PAT_RING_LARGE', ['MOD_SLOW_START']);
    }, true);
    boss.schedulePhaseEvent(3000, () => {
      boss.firePattern('PAT_RAIN', ['MOD_DECAY'], { baseAngle: 90 });
    }, true);
  }

  configureBossCoreHeartPhase2(boss) {
    boss.schedulePhaseEvent(1300, () => {
      boss.firePattern('PAT_FAN_WIDE', ['MOD_WAVE'], {
        target: this.player
      });
    }, true);
    boss.schedulePhaseEvent(2500, () => {
      boss.firePattern('PAT_AIMED_BURST', ['MOD_HOMING_LIGHT'], {
        target: this.player
      });
    }, true);
    boss.spawnAdds('EN_SWARMER', 4, 220);
    this.time.delayedCall(1500, () => {
      boss.spawnAdds('EN_SWARMER', 4, 220);
    });
  }

  configureBossCoreHeartPhase3(boss) {
    this.activateBossFinalPhaseEffects();
    boss.phase3Angle = boss.phase3Angle ?? 0;
    boss.schedulePhaseEvent(1000, () => {
      boss.firePattern('PAT_SPIRAL', ['MOD_ACCELERATE'], {
        baseAngle: boss.phase3Angle,
        speedCapFactor: 1.6,
        tint: this.finalPhaseTint
      });
      boss.phase3Angle = (boss.phase3Angle + 20) % 360;
    }, true);
    boss.schedulePhaseEvent(3000, () => {
      boss.firePattern('PAT_RAIN', ['MOD_SPLIT'], {
        baseAngle: 90,
        speedCapFactor: 1.6,
        tint: this.finalPhaseTint
      });
    }, true);
  }

  registerModifierDemoKeys() {
    if (!this.patternSystem || !this.rogueLikeSystem) {
      return;
    }
    const origin = { x: LOGICAL_WIDTH / 2, y: 60 };
    this.input.keyboard.on('keydown-M', () => {
      const mods = this.rogueLikeSystem.getModifiersForWave(this.currentWaveNumber);
      console.log(`[Demo] Wave ${this.currentWaveNumber} modifiers:`, mods);
      this.patternSystem.firePattern('PAT_RING_SMALL', origin, {
        baseAngle: 90,
        modifiers: mods,
        target: this.player
      });
    });
  }

  registerPauseKey() {
    this.input.keyboard.on('keydown-ESC', this.handlePauseToggle, this);
  }

  setRunDifficulty(difficultyId = 'normal') {
    const normalized = difficultyId === 'hard' ? 'hard' : 'normal';
    const configs = {
      normal: { id: 'normal', bulletSpeedBonus: 0 },
      hard: { id: 'hard', bulletSpeedBonus: 0.15 }
    };
    this.runDifficulty = normalized;
    this.runDifficultyConfig = configs[normalized];
  }

  applyMetaProgressionToPlayer() {
    if (!this.playerController || !this.metaProgressionSystem) return;
    const hpBonus = this.metaProgressionSystem.getInitialHpIncrease();
    if (hpBonus > 0) {
      this.playerController.increaseMaxHp(hpBonus);
    }
    const dashCdMul = this.metaProgressionSystem.getDashCooldownMultiplier();
    if (dashCdMul !== 1) {
      this.playerController.modifyDashCooldown(dashCdMul);
    }
    const dashStockBonus = this.metaProgressionSystem.getDashMaxStockBonus();
    if (dashStockBonus > 0) {
      this.playerController.increaseDashMaxStock(dashStockBonus);
    }
  }

  applyAudioSettings(settings) {
    if (!settings) return;
    const seVolume = Phaser.Math.Clamp(settings.seVolume ?? 1, 0, 1);
    this.sound.volume = seVolume;
    this.bgmVolume = settings.bgmVolume ?? 0.7;
    if (this.currentBgm && this.currentBgm.setVolume) {
      this.currentBgm.setVolume(this.bgmVolume);
    }
  }

  handleOptionsPreview(settings) {
    if (!settings) return;
    this.applyAudioSettings(settings);
    if (settings.language) {
      LocalizationSystem.setLanguage(settings.language);
    }
  }

  openOptionsMenu() {
    if (this.isOptionsMenuOpen) return;
    this.isOptionsMenuOpen = true;
    this.pauseMenu?.hide();
    this.prevOptionsLanguage = LocalizationSystem.getLanguage();
    const initial = { ...(this.metaProgressionSystem?.settings ?? {}) };
    this.optionsView?.open(initial);
  }

  handleOptionsApply(settings) {
    if (!this.metaProgressionSystem) {
      this.handleOptionsCancel();
      return;
    }
    this.metaProgressionSystem.updateSettings(settings);
    this.saveProgression();
    LocalizationSystem.setLanguage(settings.language || 'ja');
    this.applyAudioSettings(settings);
    this.isOptionsMenuOpen = false;
    this.optionsView?.close();
    if (this.isManualPause) {
      this.pauseMenu?.show();
    }
  }

  handleOptionsCancel() {
    if (!this.isOptionsMenuOpen) return;
    this.isOptionsMenuOpen = false;
    this.optionsView?.close();
    LocalizationSystem.setLanguage(this.prevOptionsLanguage || LocalizationSystem.getLanguage());
    this.applyAudioSettings(this.metaProgressionSystem?.settings);
    if (this.isManualPause) {
      this.pauseMenu?.show();
    }
  }

  updateHud() {
    if (!this.hudView) return;
    const playerCtrl = this.playerController;
    this.hudView.updateState({
      hp: playerCtrl?.hp ?? 0,
      maxHp: playerCtrl?.maxHp ?? 0,
      waveNumber: this.currentWaveNumber,
      waveTotal: this.waves.length,
      level: this.playerLevel,
      currentExp: this.playerXp,
      neededExp: this.getExpForLevel(this.playerLevel),
      perkIds: this.perkSystem?.getAcquiredList?.() ?? []
    });
  }

  addExperience(amount) {
    const finalAmount = amount * this.expMultiplier;
    this.playerXp += finalAmount;
    this.checkLevelUp();
  }

  onPlayerHit() {
    this.playerHitCount = (this.playerHitCount ?? 0) + 1;
  }

  awardCoreForWave(waveNumber) {
    this.awardCoreAmount(waveNumber);
  }

  awardCoreAmount(baseAmount) {
    if (!this.metaProgressionSystem || baseAmount <= 0) return 0;
    const amount = Math.round(baseAmount * this.coreBonusMultiplier);
    this.metaProgressionSystem.addMetaCurrency(amount);
    this.coreCurrencyEarned = (this.coreCurrencyEarned ?? 0) + amount;
    return amount;
  }

  handlePlayerDeath() {
    this.finishRun('defeat');
  }

  checkLevelUp() {
    let needed = this.getExpForLevel(this.playerLevel);
    while (this.playerXp >= needed) {
      this.playerXp -= needed;
      this.playerLevel += 1;
      this.pendingLevelUps += 1;
      needed = this.getExpForLevel(this.playerLevel);
    }
    if (this.pendingLevelUps > 0 && !this.isLevelUpActive) {
      this.triggerLevelUpPanel();
    }
  }

  getExpForLevel(level) {
    return 10 + (level - 1) * 6;
  }

  triggerLevelUpPanel() {
    const options = this.perkSystem?.rollPerkOptions(3) ?? [];
    if (options.length === 0) {
      this.pendingLevelUps = 0;
      return;
    }
    this.pauseForLevelUp();
    this.levelUpPanel?.show(options, (perkId) => this.onPerkSelected(perkId));
  }

  onPerkSelected(perkId) {
    if (!this.perkSystem?.applyPerk(perkId)) {
      return;
    }
    this.pendingLevelUps = Math.max(0, this.pendingLevelUps - 1);
    this.resumeAfterLevelUp();
    if (this.pendingLevelUps > 0) {
      this.triggerLevelUpPanel();
    }
  }

  pauseForLevelUp() {
    if (this.isLevelUpActive) return;
    this.isLevelUpActive = true;
    this.pauseSimulation();
  }

  resumeAfterLevelUp() {
    if (!this.isLevelUpActive) return;
    this.isLevelUpActive = false;
    this.levelUpPanel?.hide();
    this.resumeSimulation();
  }

  adjustExpMultiplier(multiplier) {
    this.expMultiplier *= multiplier;
  }

  adjustCoreBonusMultiplier(multiplier) {
    this.coreBonusMultiplier *= multiplier;
  }

  addModifierCandidateBonus(amount) {
    this.rogueLikeSystem?.addModifierCandidateBonus(amount);
  }

  updateGlobalPerkEffect(key, value) {
    this.globalPerkEffects[key] = value;
  }

  handlePauseToggle() {
    if (this.isLevelUpActive) {
      return;
    }
    if (this.isManualPause) {
      this.exitPause();
    } else {
      this.enterPause();
    }
  }

  enterPause() {
    if (this.isManualPause || this.isLevelUpActive) return;
    this.isManualPause = true;
    this.pauseSimulation();
    this.pauseMenu?.show();
  }

  exitPause() {
    if (!this.isManualPause) return;
    this.isManualPause = false;
    this.pauseMenu?.hide();
    this.resumeSimulation();
  }

  returnToTitle() {
    this.exitPause();
    this.pendingLevelUps = 0;
    this.isLevelUpActive = false;
    this.levelUpPanel?.hide();
    this.pauseLocks = 0;
    this.time.timeScale = 1;
    this.physics.world.resume();
    this.playerController?.setInputEnabled(true);
    this.saveProgression();
    if (this.scene.get('TitleScene')) {
      this.scene.start('TitleScene');
    } else {
      console.log('[PauseMenu] TitleScene not available.');
    }
  }

  openOptionsMenu() {
    console.log('[PauseMenu] Options menu is not implemented yet.');
  }

  pauseSimulation() {
    if (this.pauseLocks === 0) {
      this.savedTimeScale = this.time.timeScale ?? 1;
      this.time.timeScale = 0;
      this.physics.world.pause();
      this.playerController?.setInputEnabled(false);
    }
    this.pauseLocks += 1;
  }

  resumeSimulation() {
    if (this.pauseLocks === 0) {
      return;
    }
    this.pauseLocks -= 1;
    if (this.pauseLocks === 0) {
      this.time.timeScale = this.savedTimeScale ?? 1;
      this.physics.world.resume();
      if (!this.isManualPause && !this.isLevelUpActive) {
        this.playerController?.setInputEnabled(true);
      }
    }
  }

  finishRun(resultType = 'victory') {
    if (this.runFinished) {
      return;
    }
    this.runFinished = true;
    this.waveState = 'finished';
    this.deactivateBossFinalPhaseEffects();
    this.pauseMenu?.hide();
    if (this.isOptionsMenuOpen) {
      this.optionsView?.close();
      this.isOptionsMenuOpen = false;
    }
    this.enemySpawner?.clearScheduledSpawns();
    this.enemySpawner?.clearAllEnemies();
    this.events.off('player-hit', this.onPlayerHit, this);
    const playTimeMs = Math.max(0, this.time.now - (this.runStartTime ?? 0));
    const reachedWave = this.currentWaveNumber;
    const payload = {
      result: resultType,
      difficulty: this.runDifficulty,
      reachedWave,
      playTimeMs,
      hitCount: this.playerHitCount ?? 0,
      perkIds: this.perkSystem?.getAcquiredList?.() ?? [],
      coreEarned: this.coreCurrencyEarned ?? 0,
      totalCore: this.metaProgressionSystem?.getMetaCurrency?.() ?? 0,
      boss1Defeated: this.boss1DefeatedThisRun,
      boss2Defeated: this.boss2DefeatedThisRun,
      difficultyConfig: this.runDifficultyConfig,
      playerLevel: this.playerLevel
    };
    this.metaProgressionSystem?.recordRunResult({
      reachedWave,
      boss1Defeated: this.boss1DefeatedThisRun,
      boss2Defeated: this.boss2DefeatedThisRun
    });
    this.saveProgression();
    this.physics.world.pause();
    this.playerController?.setInputEnabled(false);
    if (this.scene.get('ResultScene')) {
      this.scene.start('ResultScene', payload);
    } else {
      console.log('[Result]', payload);
    }
  }

  onShutdown() {
    this.events.off('enemy-spawned', this.onEnemySpawned, this);
    this.input.keyboard?.off('keydown-ESC', this.handlePauseToggle, this);
    this.pauseMenu?.hide();
    this.finalPhaseOverlay?.destroy();
    this.finalPhaseOverlay = null;
    this.events.off('player-hit', this.onPlayerHit, this);
    this.optionsView?.destroy();
    this.optionsView = null;
  }

  startWave(index) {
    if (this.runCompleted) {
      return;
    }
    if (index >= this.waves.length) {
      this.onRunCompleted();
      return;
    }
    this.currentWaveIndex = index;
    this.currentWaveConfig = this.waves[index];
    this.currentWaveNumber = this.currentWaveConfig.number;
    console.log(`[Wave] Start Wave ${this.currentWaveNumber} (${this.currentWaveConfig.type})`);
    this.waveState = 'running';
    this.waveElapsedMs = 0;
    this.waveRemainingMs = (this.currentWaveConfig.timeLimit ?? 0) * 1000;
    this.waveIntervalTimer = 0;
    this.enemySpawner.clearAllEnemies();
    this.enemySpawner.clearScheduledSpawns();
    this.rogueLikeSystem.setCurrentWave(this.currentWaveNumber);
    this.enemySpawner.spawnWaveFromConfig(this.currentWaveConfig, this.currentWaveNumber);
  }

  updateWaveState(delta) {
    if (!this.currentWaveConfig || !this.enemySpawner) {
      return;
    }
    if (this.waveState === 'running') {
      this.waveElapsedMs += delta;
      if (this.currentWaveConfig?.type === 'survive') {
        this.waveRemainingMs = Math.max(0, this.waveRemainingMs - delta);
        this.addExperience(this.surviveXpRate * (delta / 1000));
        if (this.waveRemainingMs <= 0) {
          this.completeWave();
        }
      } else if (this.currentWaveConfig?.type === 'kill_all') {
        const pending = this.enemySpawner.hasPendingSpawnEvents();
        const alive = this.enemySpawner.getAliveEnemyCount();
        if (!pending && alive === 0) {
          this.completeWave();
        }
      }
    } else if (this.waveState === 'interval') {
      this.waveIntervalTimer -= delta;
      if (this.waveIntervalTimer <= 0) {
        this.startWave(this.currentWaveIndex + 1);
      }
    }
  }

  completeWave() {
    if (this.waveState !== 'running') {
      return;
    }
    console.log(`[Wave] Complete Wave ${this.currentWaveNumber}`);
    this.awardCoreForWave(this.currentWaveNumber);
    this.enemySpawner.clearScheduledSpawns();
    this.enemySpawner.clearAllEnemies();
    if (this.currentWaveNumber >= this.waves.length) {
      this.waveState = 'finished';
      this.onRunCompleted();
    } else {
      this.waveState = 'interval';
      this.waveIntervalTimer = this.waveIntervalDuration;
    }
  }

  onRunCompleted() {
    this.finishRun('victory');
  }

  saveProgression() {
    if (!this.saveManager || !this.metaProgressionSystem) return;
    this.saveManager.save(this.metaProgressionSystem.getSaveData());
  }
}
