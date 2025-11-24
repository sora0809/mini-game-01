import * as Phaser from 'phaser';

export const PLAYER_RADIUS = 6;
export const PLAYER_COLOR = 0x3dffec;

export default class Player extends Phaser.GameObjects.Arc {
  constructor(scene, x, y) {
    super(scene, x, y, PLAYER_RADIUS, 0, 360, false, PLAYER_COLOR, 1);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 0.5);
    const body = /** @type {Phaser.Physics.Arcade.Body} */ (this.body);
    body.setCircle(PLAYER_RADIUS, -PLAYER_RADIUS, -PLAYER_RADIUS);
    body.setAllowGravity(false);
    body.setCollideWorldBounds(true);
    body.setBounce(0, 0);
    body.setImmovable(false);
    body.setDrag(0, 0);
    body.setMaxSpeed(1200);
  }
}
