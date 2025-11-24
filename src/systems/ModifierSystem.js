import * as Phaser from 'phaser';
import { loadJSON } from '../utils/jsonLoader.js';
const modifierDefs = await loadJSON('./src/data/modifiers.json');

export default class ModifierSystem {
  constructor(scene) {
    this.scene = scene;
    this.modifiers = modifierDefs;
    this.playerTarget = null;
  }

  setPlayerTarget(player) {
    this.playerTarget = player;
  }

  attachModifiers(bullet, modifierIds = []) {
    bullet.modifierIds = modifierIds;
    bullet.modifierRuntime = {};

    modifierIds.forEach((id) => {
      const mod = this.modifiers[id];
      if (!mod) return;
      this.initializeModifierState(bullet, mod);
    });
  }

  initializeModifierState(bullet, mod) {
    const state = bullet.modifierRuntime;
    switch (mod.id) {
      case 'MOD_SLOW_START':
        bullet.setSpeedFactor(mod.id, mod.params.startScale ?? 0.4);
        state[mod.id] = { elapsed: 0 };
        break;
      case 'MOD_ACCELERATE':
        bullet.setSpeedFactor(mod.id, mod.params.startScale ?? 1.0);
        state[mod.id] = { elapsed: 0 };
        break;
      case 'MOD_WAVE':
        state[mod.id] = { elapsed: 0 };
        break;
      case 'MOD_SPLIT':
        state[mod.id] = { elapsed: 0, triggered: false };
        break;
      case 'MOD_DECAY': {
        const maxLife = mod.params.lifespan ?? 3000;
        bullet.lifespan = Math.min(bullet.lifespan, maxLife);
        break;
      }
      case 'MOD_HOMING_LIGHT':
        state[mod.id] = { elapsed: 0, turnTimer: 0 };
        break;
      default:
        break;
    }
  }

  updateBullet(bullet, delta) {
    if (!bullet.active || !bullet.modifierIds || bullet.modifierIds.length === 0) {
      return;
    }

    bullet.modifierIds.forEach((id) => {
      const mod = this.modifiers[id];
      if (!mod) return;
      const state = bullet.modifierRuntime?.[id] ?? null;
      switch (id) {
        case 'MOD_SLOW_START':
          this.updateSlowStart(bullet, mod, state, delta);
          break;
        case 'MOD_ACCELERATE':
          this.updateAccelerate(bullet, mod, state, delta);
          break;
        case 'MOD_WAVE':
          this.updateWave(bullet, mod, state, delta);
          break;
        case 'MOD_SPLIT':
          this.updateSplit(bullet, mod, state, delta);
          break;
        case 'MOD_DECAY':
          break;
        case 'MOD_HOMING_LIGHT':
          this.updateHomingLight(bullet, mod, state, delta);
          break;
        default:
          break;
      }
    });
  }

  updateSlowStart(bullet, mod, state, delta) {
    if (!state) return;
    state.elapsed += delta;
    const duration = mod.params.duration ?? 500;
    const t = Phaser.Math.Clamp(state.elapsed / duration, 0, 1);
    const start = mod.params.startScale ?? 0.4;
    const end = mod.params.endScale ?? 1.0;
    const scale = Phaser.Math.Linear(start, end, t);
    bullet.setSpeedFactor(mod.id, scale);
    if (t >= 1) {
      bullet.clearSpeedFactor(mod.id);
      delete bullet.modifierRuntime[mod.id];
    }
  }

  updateAccelerate(bullet, mod, state, delta) {
    if (!state) return;
    state.elapsed += delta;
    const duration = mod.params.duration ?? 3000;
    const t = Phaser.Math.Clamp(state.elapsed / duration, 0, 1);
    const start = mod.params.startScale ?? 1.0;
    const end = mod.params.endScale ?? 1.4;
    const scale = Phaser.Math.Linear(start, end, t);
    bullet.setSpeedFactor(mod.id, scale);
    if (t >= 1) {
      delete bullet.modifierRuntime[mod.id];
    }
  }

  updateWave(bullet, mod, state, delta) {
    if (!state) return;
    state.elapsed += delta;
    const amplitudeRad = Phaser.Math.DegToRad(mod.params.amplitudeDeg ?? 20);
    const period = Math.max(1, mod.params.period ?? 800);
    const cycle = (state.elapsed % period) / period;
    const offset = amplitudeRad * Math.sin(cycle * Math.PI * 2);
    bullet.setAngleOffset(mod.id, offset);
  }

  updateSplit(bullet, mod, state, delta) {
    if (!state || state.triggered) return;
    state.elapsed += delta;
    const delay = mod.params.delay ?? 1200;
    if (state.elapsed < delay) {
      return;
    }
    state.triggered = true;
    const angleOffset = mod.params.angleOffsetDeg ?? 15;
    this.spawnSplitBullets(bullet, angleOffset);
  }

  spawnSplitBullets(bullet, angleOffsetDeg) {
    if (!bullet.ownerSystem) {
      bullet.recycle();
      return;
    }
    const modifiers = (bullet.modifierIds || []).filter((id) => id !== 'MOD_SPLIT');
    const baseAngle = bullet.directionAngle;
    const offsets = [-angleOffsetDeg, angleOffsetDeg];
    offsets.forEach((offset) => {
      bullet.ownerSystem.spawnPlayerShot(bullet.x, bullet.y, Phaser.Math.RadToDeg(baseAngle) + offset, {
        speed: bullet.baseSpeed,
        lifespan: bullet.lifespan,
        modifiers
      });
    });
    bullet.recycle();
  }

  updateHomingLight(bullet, mod, state, delta) {
    if (!state || !this.playerTarget || !this.playerTarget.active) {
      return;
    }
    state.elapsed += delta;
    state.turnTimer += delta;
    const duration = mod.params.duration ?? 1500;
    if (state.elapsed > duration) {
      delete bullet.modifierRuntime[mod.id];
      return;
    }
    const interval = mod.params.turnInterval ?? 300;
    if (state.turnTimer < interval) {
      return;
    }
    state.turnTimer -= interval;
    const targetAngle = Phaser.Math.Angle.Between(
      bullet.x,
      bullet.y,
      this.playerTarget.x,
      this.playerTarget.y
    );
    const maxDelta = Phaser.Math.DegToRad(mod.params.turnAmountDeg ?? 3);
    bullet.rotateBaseAngleTowards(targetAngle, maxDelta);
  }
}
