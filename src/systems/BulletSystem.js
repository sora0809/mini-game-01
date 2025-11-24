import Phaser from 'phaser';
import Bullet from '../entities/Bullet.js';

const PLAYER_BULLET_LIMIT = 700;

export default class BulletSystem {
  constructor(scene, modifierSystem = null) {
    this.scene = scene;
    this.modifierSystem = modifierSystem;
    this.baseBulletCap = PLAYER_BULLET_LIMIT;
    this.bulletCapScale = 1;
    this.currentBulletCap = this.baseBulletCap;
    this.bulletQueue = [];
    this.playerBullets = scene.physics.add.group({
      classType: Bullet,
      maxSize: PLAYER_BULLET_LIMIT,
      runChildUpdate: true
    });
  }

  spawnPlayerShot(x, y, angleDeg, options = {}) {
    const bullet = this.playerBullets.get(x, y);
    if (!bullet) {
      return null;
    }
    bullet.setOwnerSystem(this);
    bullet.fire(x, y, angleDeg, options);
    if (this.modifierSystem && options.modifiers?.length) {
      this.modifierSystem.attachModifiers(bullet, options.modifiers);
    } else {
      bullet.modifierIds = options.modifiers ? [...options.modifiers] : [];
      bullet.modifierRuntime = {};
    }
    this.trackBullet(bullet);
    return bullet;
  }

  trackBullet(bullet) {
    this.pruneBulletQueue();
    this.bulletQueue.push(bullet);
    this.enforceBulletCap();
  }

  pruneBulletQueue() {
    while (this.bulletQueue.length > 0 && !this.bulletQueue[0].active) {
      this.bulletQueue.shift();
    }
  }

  enforceBulletCap() {
    const cap = this.currentBulletCap;
    while (this.bulletQueue.length > cap) {
      const oldest = this.bulletQueue.shift();
      if (oldest && oldest.active) {
        oldest.recycle();
      }
    }
  }

  setBulletCapScale(scale) {
    this.bulletCapScale = Phaser.Math.Clamp(scale, 0.1, 1);
    this.currentBulletCap = Math.round(this.baseBulletCap * this.bulletCapScale);
    this.enforceBulletCap();
  }

  resetBulletCap() {
    this.bulletCapScale = 1;
    this.currentBulletCap = this.baseBulletCap;
  }

  update(delta) {
    if (!this.modifierSystem) {
      return;
    }
    this.playerBullets.children.each((bullet) => {
      if (!bullet || !bullet.active) return;
      this.modifierSystem.updateBullet(bullet, delta);
    });
  }

  getPlayerBullets() {
    return this.playerBullets;
  }
}
