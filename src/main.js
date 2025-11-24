import Phaser from 'phaser';
import {
  LOGICAL_WIDTH,
  LOGICAL_HEIGHT,
  DISPLAY_WIDTH,
  DISPLAY_HEIGHT,
  BACKGROUND_COLOR,
  PHYSICS_CONFIG
} from './config.js';
import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import MetaScene from './scenes/MetaScene.js';
import GameScene from './scenes/GameScene.js';
import ResultScene from './scenes/ResultScene.js';

const config = {
  type: Phaser.AUTO,
  backgroundColor: BACKGROUND_COLOR,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: LOGICAL_WIDTH,
    height: LOGICAL_HEIGHT,
    parent: 'game-container',
    canvasStyle: `width: ${DISPLAY_WIDTH}px; height: ${DISPLAY_HEIGHT}px;`
  },
  physics: PHYSICS_CONFIG,
  scene: [BootScene, TitleScene, MetaScene, GameScene, ResultScene]
};

export default new Phaser.Game(config);
