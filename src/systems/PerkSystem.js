import Phaser from 'phaser';
import { loadJSON } from '../utils/jsonLoader.js';
const perksData = await loadJSON('./src/data/perks.json');

export default class PerkSystem {
  constructor(scene, metaProgressionSystem, playerController, bulletSystem) {
    this.scene = scene;
    this.meta = metaProgressionSystem;
    this.playerController = playerController;
    this.bulletSystem = bulletSystem;
    this.perkMap = new Map(perksData.map((perk) => [perk.id, perk]));
    this.acquired = new Map();
    this.acquiredOrder = [];
  }

  getPerkData(perkId) {
    return this.perkMap.get(perkId);
  }

  getAvailablePerks() {
    const pool = this.meta?.getAvailablePerkPool?.() ?? perksData.map((p) => p.id);
    return pool.filter((id) => this.isPerkSelectable(id));
  }

  isPerkSelectable(perkId) {
    const perk = this.perkMap.get(perkId);
    if (!perk) return false;
    if (!this.meta?.isPerkUnlocked(perkId)) return false;
    const currentStack = this.acquired.get(perkId) ?? 0;
    if (currentStack >= (perk.maxStack ?? 1)) {
      return false;
    }
    if (Array.isArray(perk.requires) && perk.requires.length > 0) {
      const meets = perk.requires.every((req) => (this.acquired.get(req) ?? 0) > 0);
      if (!meets) return false;
    }
    return true;
  }

  rollPerkOptions(count = 3) {
    const available = this.getAvailablePerks();
    if (available.length === 0) {
      return [];
    }
    const shuffled = Phaser.Utils.Array.Shuffle(available.slice());
    const options = shuffled.slice(0, Math.min(count, shuffled.length));
    return options.map((id) => this.perkMap.get(id));
  }

  applyPerk(perkId) {
    const perk = this.perkMap.get(perkId);
    if (!perk) {
      console.warn('[PerkSystem] Unknown perk', perkId);
      return false;
    }
    if (!this.isPerkSelectable(perkId)) {
      console.warn('[PerkSystem] Perk not selectable', perkId);
      return false;
    }
    const current = this.acquired.get(perkId) ?? 0;
    this.acquired.set(perkId, current + 1);
    this.acquiredOrder.push(perkId);
    this.applyPerkEffects(perk);
    return true;
  }

  applyPerkEffects(perk) {
    const effects = perk.effects || {};
    if (effects.moveSpeedMultiplier) {
      this.playerController?.modifyMoveSpeed(effects.moveSpeedMultiplier);
    }
    if (effects.dashCooldownMultiplier) {
      this.playerController?.modifyDashCooldown(effects.dashCooldownMultiplier);
    }
    if (effects.dashMaxStockDelta) {
      this.playerController?.increaseDashMaxStock(effects.dashMaxStockDelta);
    }
    if (effects.slowHitboxScale) {
      this.playerController?.setSlowHitboxScale(effects.slowHitboxScale);
    }
    if (effects.dashOnHit) {
      this.playerController?.setDashOnHit(effects.dashOnHit);
    }
    if (effects.hpIncrease) {
      this.playerController?.increaseMaxHp(effects.hpIncrease);
    }
    if (effects.attackMultiplier) {
      this.playerController?.modifyAttackMultiplier(effects.attackMultiplier);
    }
    if (effects.shotSpreadBonus) {
      this.playerController?.addShotSpreadBonus(effects.shotSpreadBonus);
    }
    if (effects.expMultiplier) {
      this.scene?.adjustExpMultiplier?.(effects.expMultiplier);
    }
    if (effects.bulletCapScale) {
      this.bulletSystem?.setBulletCapScale(effects.bulletCapScale);
    }
    if (effects.modifierCandidateBonus) {
      this.scene?.addModifierCandidateBonus?.(effects.modifierCandidateBonus);
    }
    if (effects.enemyBulletSpeedMultiplier) {
      this.scene?.updateGlobalPerkEffect?.('enemyBulletSpeedMultiplier', effects.enemyBulletSpeedMultiplier);
    }
    if (effects.enemyBulletLifeDelta) {
      this.scene?.updateGlobalPerkEffect?.('enemyBulletLifeDelta', effects.enemyBulletLifeDelta);
    }
    if (effects.homingWeakening) {
      this.scene?.updateGlobalPerkEffect?.('homingWeakening', effects.homingWeakening);
    }
    if (effects.splitChildDelta) {
      this.scene?.updateGlobalPerkEffect?.('splitChildDelta', effects.splitChildDelta);
    }
    if (effects.rainSpeedMultiplier) {
      this.scene?.updateGlobalPerkEffect?.('rainSpeedMultiplier', effects.rainSpeedMultiplier);
    }
    if (effects.coreBonus) {
      this.scene?.adjustCoreBonusMultiplier?.(effects.coreBonus);
    }
  }

  getAcquiredList() {
    return this.acquiredOrder.slice();
  }
}
