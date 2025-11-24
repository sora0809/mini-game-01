import Phaser from 'phaser';
import { PLAYER_RADIUS } from '../entities/Player.js';

export const PlayerState = Object.freeze({
  NORMAL: 'NORMAL',
  DASH: 'DASH',
  HIT_STUN: 'HIT_STUN',
  DEAD: 'DEAD'
});

export default class PlayerController {
  constructor(scene, player, bulletSystem) {
    this.scene = scene;
    this.player = player;
    this.body = /** @type {Phaser.Physics.Arcade.Body} */ (player.body);
    this.bulletSystem = bulletSystem;

    this.state = PlayerState.NORMAL;
    this.baseSpeed = 160;
    this.moveSpeedMultiplier = 1;
    this.slowMultiplier = 0.4;
    this.autoShotInterval = 180;
    this.autoShotSpreadBase = 45;
    this.autoShotSpreadBonus = 0;
    this.shotTimer = 0;
    this.shotDamageBase = 1;
    this.shotDamageMultiplier = 1;
    this.inputEnabled = true;

    this.maxHp = 3;
    this.hp = this.maxHp;

    this.dashDistance = 120;
    this.dashDuration = 120;
    this.dashInvulDuration = 160;
    this.dashCooldown = 1500;
    this.dashMaxStock = 1;
    this.dashStock = this.dashMaxStock;
    this.dashRechargeTimer = 0;
    this.dashTimer = 0;
    this.dashSpeed = this.dashDistance / (this.dashDuration / 1000);
    this.dashDirection = new Phaser.Math.Vector2(0, -1);
    this.dashOnHit = false;

    this.hitStunDuration = 1000;
    this.hitStunTimer = 0;
    this.invincibleTimer = 0;

    this.slowHitboxScale = 1;
    this.currentHitboxScale = 1;
    this.onDeathCallback = null;

    this.moveVector = new Phaser.Math.Vector2();

    const { KeyCodes } = Phaser.Input.Keyboard;
    this.keys = scene.input.keyboard.addKeys({
      up: KeyCodes.W,
      down: KeyCodes.S,
      left: KeyCodes.A,
      right: KeyCodes.D,
      shift: KeyCodes.SHIFT,
      dash: KeyCodes.SPACE
    });
    this.cursor = scene.input.keyboard.createCursorKeys();
  }

  update(delta) {
    if (this.state === PlayerState.DEAD) {
      return;
    }

    if (!this.inputEnabled && this.state === PlayerState.NORMAL) {
      this.stopPlayerBody();
    }

    this.updateInvincibility(delta);
    this.updateDashRecharge(delta);

    switch (this.state) {
      case PlayerState.NORMAL:
        this.handleNormalMovement();
        this.handleAutoShot(delta);
        this.tryDash();
        break;
      case PlayerState.DASH:
        this.updateDashState(delta);
        this.handleAutoShot(delta);
        break;
      case PlayerState.HIT_STUN:
        this.updateHitStun(delta);
        this.handleNormalMovement();
        this.handleAutoShot(delta);
        this.tryDash();
        break;
      default:
        break;
    }
  }

  handleNormalMovement() {
    const body = this.body;
    if (!body) return;
    if (!this.inputEnabled) {
      this.stopPlayerBody();
      return;
    }

    const inputVec = this.readMovementInput();
    if (inputVec.lengthSq() === 0) {
      this.stopPlayerBody();
      this.updateHitboxForSlow(false);
      return;
    }

    inputVec.normalize();
    const slowActive = this.isSlowActive();
    const speed = this.getMoveSpeed() * (slowActive ? this.slowMultiplier : 1);
    this.updateHitboxForSlow(slowActive);
    body.setVelocity(inputVec.x * speed, inputVec.y * speed);
  }

  handleAutoShot(delta) {
    if (!this.bulletSystem || !this.inputEnabled) {
      return;
    }

    this.shotTimer += delta;
    while (this.shotTimer >= this.autoShotInterval) {
      this.shotTimer -= this.autoShotInterval;
      this.fireAutoShot();
    }
  }

  fireAutoShot() {
    const spread = Phaser.Math.FloatBetween(-this.getShotSpread(), this.getShotSpread());
    const angle = -90 + spread;
    this.bulletSystem.spawnPlayerShot(
      this.player.x,
      this.player.y - PLAYER_RADIUS,
      angle
    );
  }

  readMovementInput() {
    const vec = this.moveVector;
    vec.set(0, 0);

    if (this.isLeftDown()) vec.x -= 1;
    if (this.isRightDown()) vec.x += 1;
    if (this.isUpDown()) vec.y -= 1;
    if (this.isDownDown()) vec.y += 1;
    return vec;
  }

  isLeftDown() {
    return this.keys.left.isDown || this.cursor.left.isDown;
  }

  isRightDown() {
    return this.keys.right.isDown || this.cursor.right.isDown;
  }

  isUpDown() {
    return this.keys.up.isDown || this.cursor.up.isDown;
  }

  isDownDown() {
    return this.keys.down.isDown || this.cursor.down.isDown;
  }

  isSlowActive() {
    return this.keys.shift.isDown || this.cursor.shift?.isDown;
  }

  tryDash() {
    if (!this.inputEnabled) {
      return;
    }
    if (!this.canDash()) {
      return;
    }
    if (!this.isDashInputTriggered()) {
      return;
    }

    const dir = this.readMovementInput();
    if (dir.lengthSq() === 0) {
      dir.set(0, -1);
    } else {
      dir.normalize();
    }

    this.consumeDash();
    this.startDash(dir);
  }

  canDash() {
    return this.dashStock > 0 && this.state !== PlayerState.DASH;
  }

  isDashInputTriggered() {
    const cursorDash = this.cursor.space
      ? Phaser.Input.Keyboard.JustDown(this.cursor.space)
      : false;
    return Phaser.Input.Keyboard.JustDown(this.keys.dash) || cursorDash;
  }

  consumeDash() {
    this.dashStock = Math.max(0, this.dashStock - 1);
    this.dashRechargeTimer = 0;
  }

  startDash(direction) {
    this.dashDirection.copy(direction);
    this.dashTimer = 0;
    this.setState(PlayerState.DASH);
    this.setInvincible(this.dashInvulDuration);

    if (this.body) {
      this.body.setVelocity(
        this.dashDirection.x * this.dashSpeed,
        this.dashDirection.y * this.dashSpeed
      );
    }
  }

  updateDashState(delta) {
    this.dashTimer += delta;
    if (this.dashTimer >= this.dashDuration) {
      this.endDash();
    }
  }

  endDash() {
    this.stopPlayerBody();
    if (this.state === PlayerState.DASH) {
      this.setState(PlayerState.NORMAL);
    }
  }

  stopPlayerBody() {
    if (this.body) {
      this.body.setVelocity(0, 0);
    }
  }

  updateDashRecharge(delta) {
    if (this.dashStock >= this.dashMaxStock) {
      this.dashRechargeTimer = 0;
      return;
    }

    this.dashRechargeTimer += delta;
    if (this.dashRechargeTimer >= this.dashCooldown) {
      this.dashRechargeTimer -= this.dashCooldown;
      this.dashStock = Math.min(this.dashMaxStock, this.dashStock + 1);
      console.log('[Player] Dash stock recovered:', this.dashStock);
    }
  }

  setInvincible(durationMs) {
    this.invincibleTimer = Math.max(this.invincibleTimer, durationMs);
  }

  updateInvincibility(delta) {
    if (this.invincibleTimer > 0) {
      this.invincibleTimer = Math.max(0, this.invincibleTimer - delta);
    }
  }

  isInvincible() {
    return this.invincibleTimer > 0;
  }

  updateHitStun(delta) {
    if (this.hitStunTimer <= 0) {
      return;
    }
    this.hitStunTimer = Math.max(0, this.hitStunTimer - delta);
    if (this.hitStunTimer === 0 && this.state === PlayerState.HIT_STUN) {
      this.setState(PlayerState.NORMAL);
    }
  }

  takeHit(source = 'unknown') {
    if (this.isInvincible() || this.state === PlayerState.DEAD) {
      console.log('[Player] Hit ignored (invincible/dead).');
      return;
    }

    this.hp = Math.max(0, this.hp - 1);
    console.log(`[Player] Took hit from ${source}. HP -> ${this.hp}`);
    this.setInvincible(this.hitStunDuration);
    this.scene?.events?.emit('player-hit', { hp: this.hp });
    if (this.dashOnHit) {
      this.restoreDashStock(1);
    }

    if (this.hp <= 0) {
      this.setState(PlayerState.DEAD);
      this.stopPlayerBody();
      console.log('[Player] DEAD');
      if (typeof this.onDeathCallback === 'function') {
        this.onDeathCallback();
      }
      return;
    }

    this.hitStunTimer = this.hitStunDuration;
    this.setState(PlayerState.HIT_STUN);
  }

  setState(nextState) {
    if (this.state === nextState) {
      return;
    }
    console.log(`[Player] State ${this.state} -> ${nextState}`);
    this.state = nextState;
  }

  setInputEnabled(enabled) {
    this.inputEnabled = enabled;
    if (!enabled) {
      this.stopPlayerBody();
    }
  }

  getMoveSpeed() {
    return this.baseSpeed * this.moveSpeedMultiplier;
  }

  modifyMoveSpeed(multiplier) {
    this.moveSpeedMultiplier *= multiplier;
  }

  modifyDashCooldown(multiplier) {
    this.dashCooldown *= multiplier;
  }

  increaseDashMaxStock(delta) {
    this.dashMaxStock += delta;
    this.dashStock = Math.min(this.dashMaxStock, this.dashStock + delta);
  }

  restoreDashStock(amount) {
    this.dashStock = Math.min(this.dashMaxStock, this.dashStock + amount);
  }

  setSlowHitboxScale(scale) {
    this.slowHitboxScale = scale;
    this.updateHitboxForSlow(this.isSlowActive());
  }

  updateHitboxForSlow(isSlow) {
    const targetScale = isSlow ? this.slowHitboxScale : 1;
    if (this.currentHitboxScale === targetScale) {
      return;
    }
    this.currentHitboxScale = targetScale;
    const radius = PLAYER_RADIUS * targetScale;
    if (typeof this.player.setRadius === 'function') {
      this.player.setRadius(radius);
    } else {
      this.player.radius = radius;
    }
    if (this.body) {
      this.body.setCircle(radius, -radius, -radius);
    }
  }

  setDashOnHit(enabled) {
    this.dashOnHit = enabled;
  }

  increaseMaxHp(amount) {
    this.maxHp += amount;
    this.hp += amount;
  }

  modifyAttackMultiplier(multiplier) {
    this.shotDamageMultiplier *= multiplier;
  }

  addShotSpreadBonus(value) {
    this.autoShotSpreadBonus += value;
  }

  getShotSpread() {
    return this.autoShotSpreadBase + this.autoShotSpreadBonus;
  }

  getShotDamage() {
    return this.shotDamageBase * this.shotDamageMultiplier;
  }

  setOnDeathCallback(cb) {
    this.onDeathCallback = cb;
  }
}
