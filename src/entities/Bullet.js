import * as Phaser from 'phaser';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../config.js';

const BULLET_RADIUS = 3;
const BULLET_COLOR = 0x3dffec;
const BULLET_SPEED = 360;
const BULLET_LIFESPAN = 6000;

export default class Bullet extends Phaser.GameObjects.Arc {
  constructor(scene, x = 0, y = 0) {
    super(scene, x, y, BULLET_RADIUS, 0, 360, false, BULLET_COLOR, 1);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setCircle(BULLET_RADIUS, -BULLET_RADIUS, -BULLET_RADIUS);
    this.body.setAllowGravity(false);
    this.body.enable = false;

    this.ownerSystem = null;
    this.baseSpeed = BULLET_SPEED;
    this.currentSpeed = BULLET_SPEED;
    this.baseDirectionAngle = -Math.PI / 2;
    this.directionAngle = this.baseDirectionAngle;
    this.angleOffsets = {};
    this.speedFactors = {};
    this.lifespan = 0;
    this.elapsed = 0;
    this.modifierIds = [];
    this.modifierRuntime = null;

    this.setActive(false);
    this.setVisible(false);
  }

  setOwnerSystem(system) {
    this.ownerSystem = system;
  }

  fire(x, y, angleDeg, options = {}) {
    const {
      speed = BULLET_SPEED,
      lifespan = BULLET_LIFESPAN,
      modifiers = [],
      metadata = {},
      tint = BULLET_COLOR
    } = options;

    this.setPosition(x, y);
    this.setActive(true);
    this.setVisible(true);
    this.body.enable = true;

    this.baseSpeed = speed;
    this.currentSpeed = speed;
    this.lifespan = lifespan;
    this.elapsed = 0;
    this.modifierIds = Array.isArray(modifiers) ? [...modifiers] : [];
    this.modifierRuntime = {};
    this.metadata = metadata;
    this.speedFactors = {};
    this.angleOffsets = {};

    this.setFillStyle(tint, 1);

    const angleRad = Phaser.Math.DegToRad(angleDeg);
    this.baseDirectionAngle = angleRad;
    this.directionAngle = angleRad;
    this.updateDirectionFromBase();
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.active) return;

    this.elapsed += delta;
    this.lifespan -= delta;
    if (this.lifespan <= 0 || this.isOutOfBounds()) {
      this.recycle();
    }
  }

  isOutOfBounds() {
    const margin = 16;
    return (
      this.x < -margin ||
      this.x > LOGICAL_WIDTH + margin ||
      this.y < -margin ||
      this.y > LOGICAL_HEIGHT + margin
    );
  }

  recycle() {
    this.setActive(false);
    this.setVisible(false);
    this.body.stop();
    this.body.enable = false;
    this.modifierIds = [];
    this.modifierRuntime = null;
    this.speedFactors = {};
    this.angleOffsets = {};
    this.setFillStyle(BULLET_COLOR, 1);
  }

  setBaseDirectionAngle(angleRad) {
    this.baseDirectionAngle = angleRad;
    this.updateDirectionFromBase();
  }

  rotateBaseAngle(deltaRad) {
    this.setBaseDirectionAngle(this.baseDirectionAngle + deltaRad);
  }

  rotateBaseAngleTowards(targetAngle, maxDeltaRad) {
    const diff = Phaser.Math.Angle.Wrap(targetAngle - this.baseDirectionAngle);
    const clamped = Phaser.Math.Clamp(diff, -maxDeltaRad, maxDeltaRad);
    this.setBaseDirectionAngle(this.baseDirectionAngle + clamped);
  }

  setAngleOffset(key, offsetRad) {
    this.angleOffsets[key] = offsetRad;
    this.updateDirectionFromBase();
  }

  clearAngleOffset(key) {
    delete this.angleOffsets[key];
    this.updateDirectionFromBase();
  }

  updateDirectionFromBase() {
    const totalOffset = Object.values(this.angleOffsets).reduce((acc, val) => acc + val, 0);
    this.directionAngle = this.baseDirectionAngle + totalOffset;
    this.syncVelocity();
  }

  setSpeedFactor(key, scale) {
    this.speedFactors[key] = scale;
    this.updateSpeedFromFactors();
  }

  clearSpeedFactor(key) {
    delete this.speedFactors[key];
    this.updateSpeedFromFactors();
  }

  updateSpeedFromFactors() {
    const combined = Object.values(this.speedFactors).reduce((acc, val) => acc * val, 1);
    const safeCombined = combined === 0 ? 0.0001 : combined;
    this.currentSpeed = this.baseSpeed * safeCombined;
    this.syncVelocity();
  }

  syncVelocity() {
    if (!this.body) return;
    const vx = Math.cos(this.directionAngle) * this.currentSpeed;
    const vy = Math.sin(this.directionAngle) * this.currentSpeed;
    this.body.setVelocity(vx, vy);
  }
}
