import { Weapon, WeaponRarity } from './types.js';

interface WeaponTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  weaponType?: string;
  effect?: string;
  raritySettings: Record<WeaponRarity, RaritySettings>;
}

interface RaritySettings {
  damage: { min: number; max: number };
  handlingReq: { min: number; max: number };
  accuracy: { min: number; max: number };
  cooldown: { min: number; max: number };
  critRate: { min: number; max: number };
  critMultiplier: { min: number; max: number };
  price: number;
}

interface WeaponData {
  weaponTemplates: Record<string, WeaponTemplate>;
  weapons: Record<string, Weapon>;
}

export class WeaponManager {
  private weaponData: WeaponData;
  private static instance: WeaponManager;

  constructor(weaponData: WeaponData) {
    this.weaponData = weaponData;
  }

  static async initialize(): Promise<WeaponManager> {
    if (!WeaponManager.instance) {
      const response = await fetch('data/weapons.json');
      const weaponData = await response.json();
      WeaponManager.instance = new WeaponManager(weaponData);
    }
    return WeaponManager.instance;
  }

  static getInstance(): WeaponManager {
    if (!WeaponManager.instance) {
      throw new Error(
        'WeaponManager not initialized. Call initialize() first.'
      );
    }
    return WeaponManager.instance;
  }

  /**
   * Generate a random weapon based on template and rarity
   */
  generateWeapon(templateId: string, rarity: WeaponRarity): Weapon {
    const template = this.weaponData.weaponTemplates[templateId];
    if (!template) {
      throw new Error(`Weapon template ${templateId} not found`);
    }

    const raritySettings = template.raritySettings[rarity];
    if (!raritySettings) {
      throw new Error(
        `Rarity settings for ${rarity} not found in template ${templateId}`
      );
    }

    // Generate random stats within rarity ranges
    const damage = {
      min: this.randomBetween(
        raritySettings.damage.min,
        raritySettings.damage.max
      ),
      max: this.randomBetween(
        raritySettings.damage.min,
        raritySettings.damage.max
      ),
    };
    // Ensure max >= min
    if (damage.max < damage.min) {
      [damage.min, damage.max] = [damage.max, damage.min];
    }

    const handlingReq = this.randomBetween(
      raritySettings.handlingReq.min,
      raritySettings.handlingReq.max
    );
    const accuracy = this.randomBetween(
      raritySettings.accuracy.min,
      raritySettings.accuracy.max
    );

    const cooldownMin = this.randomBetween(
      raritySettings.cooldown.min,
      raritySettings.cooldown.max
    );
    const cooldownMax = this.randomBetween(
      cooldownMin,
      raritySettings.cooldown.max
    );

    const critRate = this.randomBetween(
      raritySettings.critRate.min,
      raritySettings.critRate.max
    );
    const critMultiplier = this.randomFloat(
      raritySettings.critMultiplier.min,
      raritySettings.critMultiplier.max
    );

    // Calculate price based on how close stats are to upper limits
    const priceMultiplier = this.calculatePriceMultiplier(
      { damage, accuracy, critRate, critMultiplier },
      raritySettings
    );
    const price = Math.floor(raritySettings.price * priceMultiplier);

    // Generate unique ID
    const weaponId = `${templateId}_${rarity}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    return {
      id: weaponId,
      name: template.name,
      description: template.description,
      damage,
      handlingReq,
      accuracy,
      cooldown: {
        min: cooldownMin,
        max: cooldownMax,
      },
      critRate,
      critMultiplier: Math.round(critMultiplier * 100) / 100, // Round to 2 decimals
      price,
      rarity,
      type: template.type,
      weaponType: template.weaponType,
      effect: template.effect,
    };
  }

  /**
   * Get a weapon by ID (for initial weapons)
   */
  getWeapon(id: string): Weapon | null {
    return this.weaponData.weapons[id] || null;
  }

  /**
   * Get weapon templates for debugging
   */
  getWeaponTemplates(): Record<string, any> {
    return this.weaponData.weaponTemplates;
  }

  /**
   * Generate random weapons for port shopping
   */
  generatePortWeapons(count: number = 3): Weapon[] {
    const weapons: Weapon[] = [];
    const templateIds = Object.keys(this.weaponData.weaponTemplates);

    for (let i = 0; i < count; i++) {
      const templateId =
        templateIds[Math.floor(Math.random() * templateIds.length)];
      const rarity = this.selectRandomRarity();
      weapons.push(this.generateWeapon(templateId, rarity));
    }

    return weapons;
  }

  /**
   * Calculate crew requirement penalty
   */
  calculateCrewPenalty(weapons: Weapon[], currentCrew: number): number {
    const totalHandlingReq = weapons.reduce(
      (sum, weapon) => sum + weapon.handlingReq,
      0
    );

    if (totalHandlingReq <= currentCrew) {
      return 0; // No penalty
    }

    const shortage = totalHandlingReq - currentCrew;
    return shortage * 0.1; // 10% penalty per missing crew member
  }

  /**
   * Apply crew penalty to weapon cooldowns
   */
  applyCrewPenalty(
    weapon: Weapon,
    penaltyMultiplier: number
  ): { min: number; max: number } {
    return {
      min: Math.floor(weapon.cooldown.min * (1 + penaltyMultiplier)),
      max: Math.floor(weapon.cooldown.max * (1 + penaltyMultiplier)),
    };
  }

  private randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private randomFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  private calculatePriceMultiplier(
    stats: {
      damage: { min: number; max: number };
      accuracy: number;
      critRate: number;
      critMultiplier: number;
    },
    raritySettings: RaritySettings
  ): number {
    // Calculate how close each stat is to its maximum
    const damageScore =
      (stats.damage.min + stats.damage.max) / 2 / raritySettings.damage.max;
    const accuracyScore = stats.accuracy / raritySettings.accuracy.max;
    const critRateScore = stats.critRate / raritySettings.critRate.max;
    const critMultScore =
      stats.critMultiplier / raritySettings.critMultiplier.max;

    const averageScore =
      (damageScore + accuracyScore + critRateScore + critMultScore) / 4;

    // Price ranges from 50% to 100% of base price
    return 0.5 + averageScore * 0.5;
  }

  generateRandomWeapon(): Weapon {
    // Select random template
    const templateIds = Object.keys(this.weaponData.weaponTemplates);
    const randomTemplateId =
      templateIds[Math.floor(Math.random() * templateIds.length)];

    // Select random rarity
    const randomRarity = this.selectRandomRarity();

    return this.generateWeapon(randomTemplateId, randomRarity);
  }

  private selectRandomRarity(): WeaponRarity {
    const rarities: WeaponRarity[] = [
      'common',
      'uncommon',
      'rare',
      'epic',
      'legendary',
    ];
    const weights = [50, 30, 15, 4, 1]; // Weighted probability for each rarity

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < rarities.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return rarities[i];
      }
    }

    return 'common'; // Fallback
  }
}
