import * as Phaser from 'phaser';

export default class Enemy extends Phaser.GameObjects.Arc {
  constructor(scene, x, y, config) {
    const radius = config.collisionRadius ?? 12;
    const color = config.color ?? 0xff4b4b;
    super(scene, x, y, radius, 0, 360, false, color, 1);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.config = config;
    this.maxHp = config.maxHp ?? 10;
    this.hp = this.maxHp;
    this.speed = config.speed ?? 50;
    this.expReward = config.expReward ?? 1;
    this.basePatternId = config.basePatternId ?? null;
    this.subPatternId = config.subPatternId ?? null;
    this.bulletSpeedMultiplier = config.bulletSpeedMultiplier ?? 1;
    this.moveDirection = new Phaser.Math.Vector2();
    this.target = null;

    const body = /** @type {Phaser.Physics.Arcade.Body} */ (this.body);
    body.setCircle(radius, -radius, -radius);
    body.setAllowGravity(false);
    body.setImmovable(false);
    body.setCollideWorldBounds(true);
  }

  setTarget(target) {
    this.target = target;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.active || !this.body) {
      return;
    }
    this.updateMovement();
  }

  updateMovement() {
    if (!this.target || !this.body) {
      this.body.setVelocity(0, 0);
      return;
    }

    this.moveDirection.set(
      this.target.x - this.x,
      this.target.y - this.y
    );
    if (this.moveDirection.lengthSq() === 0) {
      this.body.setVelocity(0, 0);
      return;
    }
    this.moveDirection.normalize();
    this.body.setVelocity(
      this.moveDirection.x * this.speed,
      this.moveDirection.y * this.speed
    );
  }

  takeDamage(amount) {
    if (!this.active) {
      return false;
    }
    this.hp -= amount;
    if (this.hp <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  die() {
    const body = /** @type {Phaser.Physics.Arcade.Body} */ (this.body);
    if (body) {
      body.stop();
      body.enable = false;
    }
    this.setActive(false);
    this.setVisible(false);
    this.emit('enemy-killed', this);
    this.destroy();
  }

  setSubPatternId(patternId) {
    this.subPatternId = patternId;
  }

  getNextPatternId() {
    if (this.basePatternId && this.subPatternId) {
      return Math.random() < 0.5 ? this.basePatternId : this.subPatternId;
    }
    return this.basePatternId || this.subPatternId;
  }
}
