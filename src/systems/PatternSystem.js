import * as Phaser from 'phaser';
import { LOGICAL_WIDTH } from '../config.js';
import { loadJSON } from '../utils/jsonLoader.js';
const patternDefs = await loadJSON('./src/data/patterns.json');

export default class PatternSystem {
  constructor(scene, bulletSystem) {
    this.scene = scene;
    this.bulletSystem = bulletSystem;
    this.spiralOffsets = {};
  }

  firePattern(patternId, origin, options = {}) {
    const def = patternDefs[patternId];
    if (!def) {
      console.warn(`[PatternSystem] Pattern ${patternId} not found.`);
      return;
    }
    const ctx = {
      origin,
      modifiers: options.modifiers ?? [],
      target: options.target ?? null,
      baseAngle: options.baseAngle ?? -90,
      randomOffset: options.randomOffset ?? 0,
      speedMultiplier: options.speedMultiplier ?? 1,
      speedCapFactor: options.speedCapFactor ?? null,
      speedCap: options.speedCap ?? null,
      tint: options.tint ?? null
    };

    switch (def.type) {
      case 'ring':
        this.fireRing(def, ctx);
        break;
      case 'fan':
        this.fireFan(def, ctx);
        break;
      case 'aimed_single':
        this.fireAimedSingle(def, ctx);
        break;
      case 'aimed_burst':
        this.fireAimedBurst(def, ctx);
        break;
      case 'spiral':
        this.fireSpiral(def, ctx);
        break;
      case 'rain':
        this.fireRain(def, ctx);
        break;
      default:
        console.warn(`[PatternSystem] Unsupported pattern type ${def.type}`);
        break;
    }
  }

  fireRing(def, ctx) {
    const count = def.bulletCount || 1;
    for (let i = 0; i < count; i += 1) {
      const angle = (360 / count) * i;
      this.spawnBullet(ctx.origin.x, ctx.origin.y, angle, def, ctx);
    }
  }

  fireFan(def, ctx) {
    const count = def.bulletCount || 1;
    const halfSpread = (def.spreadAngle ?? 0) / 2;
    const step = count > 1 ? (def.spreadAngle ?? 0) / (count - 1) : 0;

    let startAngle = ctx.baseAngle - halfSpread;
    if (def.aimAtPlayer && ctx.target) {
      const aimAngle = Phaser.Math.RadToDeg(
        Phaser.Math.Angle.Between(ctx.origin.x, ctx.origin.y, ctx.target.x, ctx.target.y)
      );
      startAngle = aimAngle - halfSpread;
    }

    const jitter = def.randomOffset ?? 0;

    for (let i = 0; i < count; i += 1) {
      const angle = startAngle + step * i + Phaser.Math.Between(-jitter, jitter);
      this.spawnBullet(ctx.origin.x, ctx.origin.y, angle, def, ctx);
    }
  }

  fireAimedSingle(def, ctx) {
    const angleDeg = ctx.target
      ? Phaser.Math.RadToDeg(
          Phaser.Math.Angle.Between(ctx.origin.x, ctx.origin.y, ctx.target.x, ctx.target.y)
        )
      : ctx.baseAngle;
    this.spawnBullet(ctx.origin.x, ctx.origin.y, angleDeg, def, ctx);
  }

  fireAimedBurst(def, ctx) {
    const shots = def.bulletCount || 1;
    const interval = def.burstInterval ?? 80;
    const targetAngle = ctx.target
      ? Phaser.Math.RadToDeg(
          Phaser.Math.Angle.Between(ctx.origin.x, ctx.origin.y, ctx.target.x, ctx.target.y)
        )
      : ctx.baseAngle;

    for (let i = 0; i < shots; i += 1) {
      this.scene.time.delayedCall(interval * i, () => {
        this.spawnBullet(ctx.origin.x, ctx.origin.y, targetAngle, def, ctx);
      });
    }
  }

  fireSpiral(def, ctx) {
    const count = def.bulletCount || 1;
    const step = def.angleStep ?? 15;
    const key = def.id;
    const prev = this.spiralOffsets[key] ?? 0;
    let angle = prev;
    for (let i = 0; i < count; i += 1) {
      const worldAngle = angle + ctx.baseAngle;
      this.spawnBullet(ctx.origin.x, ctx.origin.y, worldAngle, def, ctx);
      angle += step;
    }
    this.spiralOffsets[key] = angle % 360;
  }

  fireRain(def, ctx) {
    const count = def.bulletCount || 1;
    for (let i = 0; i < count; i += 1) {
      const x = Phaser.Math.Between(0, LOGICAL_WIDTH);
      const angle = 90;
      this.spawnBullet(x, ctx.origin.y, angle, def, ctx);
    }
  }

  spawnBullet(x, y, angleDeg, def, ctx) {
    const baseSpeed = def.baseSpeed ?? 200;
    let speed = baseSpeed * (ctx.speedMultiplier ?? 1);
    if (ctx.speedCapFactor) {
      speed = Math.min(speed, baseSpeed * ctx.speedCapFactor);
    }
    if (ctx.speedCap) {
      speed = Math.min(speed, ctx.speedCap);
    }
    this.bulletSystem.spawnPlayerShot(x, y, angleDeg, {
      speed,
      modifiers: ctx.modifiers,
      tint: ctx.tint ?? undefined
    });
  }
}
