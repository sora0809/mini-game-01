import * as Phaser from 'phaser';
import Enemy from './Enemy.js';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../config.js';

const HP_BAR_WIDTH = 220;
const HP_BAR_HEIGHT = 10;

export default class Boss extends Enemy {
  constructor(scene, x, y, config) {
    super(scene, x, y, config);
    this.isBoss = true;
    this.phaseDefinitions = [];
    this.currentPhaseIndex = -1;
    this.phaseTimers = [];
    this.battleContext = null;
    this.pauseLocks = 0;

    this.hpBarBg = scene.add.rectangle(this.x, this.y - this.config.collisionRadius - 18, HP_BAR_WIDTH, HP_BAR_HEIGHT, 0x222222, 0.9).setDepth(600);
    this.hpBarFill = scene.add.rectangle(this.x, this.y - this.config.collisionRadius - 18, HP_BAR_WIDTH, HP_BAR_HEIGHT, 0xff5c6b, 1).setDepth(601);
    this.hpBarFill.setOrigin(0, 0.5);
    this.hpBarBg.setOrigin(0, 0.5);
    this.hpBarBg.x -= HP_BAR_WIDTH / 2;
    this.hpBarFill.x = this.hpBarBg.x;
    this.updateHpBar();
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    this.updateHpBarPosition();
  }

  setBattleContext(context) {
    this.battleContext = context;
  }

  setPhaseDefinitions(definitions = []) {
    this.phaseDefinitions = definitions.map((phase) => ({
      id: phase.id,
      minRatio: phase.minRatio ?? 0,
      maxRatio: phase.maxRatio ?? 1,
      onEnter: phase.onEnter
    }));
    this.currentPhaseIndex = -1;
    this.evaluatePhaseTransition(true);
  }

  evaluatePhaseTransition(force = false) {
    if (this.phaseDefinitions.length === 0) return;
    const ratio = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    let newIndex = this.currentPhaseIndex;
    for (let i = 0; i < this.phaseDefinitions.length; i += 1) {
      const phase = this.phaseDefinitions[i];
      const withinRange =
        ratio <= phase.maxRatio &&
        (ratio > phase.minRatio || (ratio === 0 && phase.minRatio === 0));
      if (withinRange) {
        newIndex = i;
        break;
      }
    }
    if (newIndex !== this.currentPhaseIndex || force) {
      this.startPhase(newIndex);
    }
  }

  startPhase(index) {
    if (index < 0 || index >= this.phaseDefinitions.length) {
      return;
    }
    this.clearPhaseTimers();
    this.currentPhaseIndex = index;
    const phase = this.phaseDefinitions[index];
    phase.onEnter?.(this, phase);
  }

  schedulePhaseEvent(delayMs, callback, loop = true) {
    const event = this.scene.time.addEvent({
      delay: delayMs,
      loop,
      callback,
      callbackScope: this
    });
    this.phaseTimers.push(event);
    return event;
  }

  clearPhaseTimers() {
    this.phaseTimers.forEach((event) => event?.remove(false));
    this.phaseTimers = [];
  }

  firePattern(patternId, modifiers = [], options = {}) {
    const ctx = this.battleContext;
    if (!ctx?.patternSystem) return;
    ctx.patternSystem.firePattern(
      patternId,
      { x: this.x, y: this.y },
      {
        modifiers,
        target: options.target ?? ctx.player ?? null,
        baseAngle: options.baseAngle ?? -90,
        speedMultiplier: options.speedMultiplier,
        speedCapFactor: options.speedCapFactor,
        tint: options.tint
      }
    );
  }

  spawnAdds(enemyId, count, radius = 140) {
    const spawner = this.battleContext?.enemySpawner;
    if (!spawner) return;
    for (let i = 0; i < count; i += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = radius + Phaser.Math.FloatBetween(-20, 20);
      const targetX = Phaser.Math.Clamp(this.x + Math.cos(angle) * distance, 32, LOGICAL_WIDTH - 32);
      const targetY = Phaser.Math.Clamp(this.y + Math.sin(angle) * distance, 32, LOGICAL_HEIGHT - 32);
      spawner.spawnEnemy(enemyId, 'random', {
        customPosition: { x: targetX, y: targetY }
      });
    }
  }

  takeDamage(amount) {
    if (!this.active) {
      return false;
    }
    this.hp -= amount;
    this.updateHpBar();
    if (this.hp <= 0) {
      this.clearPhaseTimers();
      super.die();
      return true;
    }
    this.evaluatePhaseTransition();
    return false;
  }

  updateHpBar() {
    if (!this.hpBarFill) return;
    const ratio = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    this.hpBarFill.displayWidth = HP_BAR_WIDTH * ratio;
  }

  updateHpBarPosition() {
    if (!this.hpBarBg || !this.hpBarFill) return;
    const offsetY = this.config.collisionRadius + 18;
    const originX = this.x - HP_BAR_WIDTH / 2;
    const posY = this.y - offsetY;
    this.hpBarBg.setPosition(originX, posY);
    this.hpBarFill.setPosition(originX, posY);
  }

  clearResources() {
    this.clearPhaseTimers();
    this.hpBarBg?.destroy();
    this.hpBarFill?.destroy();
    this.hpBarBg = null;
    this.hpBarFill = null;
  }

  destroy(fromScene) {
    this.clearResources();
    super.destroy(fromScene);
  }
}
