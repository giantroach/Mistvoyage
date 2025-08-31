import {
  Relic,
  RelicData,
  RelicRarity,
  RelicEffect,
  Weapon,
  RelicEffectTemplate,
  LegendaryEffectTemplate,
} from './types.js';

export class RelicManager {
  private relicData: RelicData | null = null;
  private static instance: RelicManager;

  constructor() {}

  static getInstance(): RelicManager {
    if (!RelicManager.instance) {
      RelicManager.instance = new RelicManager();
    }
    return RelicManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      const response = await fetch('./data/relics.json');
      this.relicData = await response.json();
    } catch (error) {
      console.error('Failed to load relic data:', error);
      throw error;
    }
  }

  generateRelic(rarityOrWeights?: RelicRarity | Record<string, number>): Relic {
    if (!this.relicData) {
      throw new Error('Relic data not initialized');
    }

    // Choose rarity based on input
    let rarity: RelicRarity;
    if (typeof rarityOrWeights === 'string') {
      // Direct rarity specification
      rarity = rarityOrWeights;
    } else {
      // Use weights
      rarity = this.selectRarity(rarityOrWeights);
    }

    // Generate unique ID
    const id = `relic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Generate effects based on rarity
    const effects = this.generateEffects(rarity);

    // Generate name based on effects
    const name = this.generateRelicName(effects, rarity);

    // Generate description
    const description = this.generateRelicDescription(effects);

    return {
      id,
      name,
      description,
      rarity,
      effects,
      isLegendary: rarity === 'legendary',
      price: this.calculateRelicPrice(rarity, effects),
    };
  }

  generateRandomRelic(): Relic {
    return this.generateRelic();
  }

  generateMultipleRelics(
    count: number,
    customRarityWeights?: Record<string, number>
  ): Relic[] {
    const relics: Relic[] = [];
    for (let i = 0; i < count; i++) {
      relics.push(this.generateRelic(customRarityWeights));
    }
    return relics;
  }

  private selectRarity(
    customRarityWeights?: Record<string, number>
  ): RelicRarity {
    if (!this.relicData) throw new Error('Relic data not initialized');

    const weights = customRarityWeights || this.relicData.rarityWeights;
    const totalWeight = Object.values(weights).reduce(
      (sum, weight) => sum + weight,
      0
    );
    let random = Math.random() * totalWeight;

    for (const [rarity, weight] of Object.entries(weights)) {
      random -= weight;
      if (random <= 0) {
        return rarity as RelicRarity;
      }
    }

    return 'common'; // Fallback
  }

  private generateEffects(rarity: RelicRarity): RelicEffect[] {
    if (!this.relicData) throw new Error('Relic data not initialized');

    const effectCount = this.getEffectCount(rarity);
    const effects: RelicEffect[] = [];

    // For legendary relics, always include one legendary effect
    if (rarity === 'legendary') {
      effects.push(this.generateLegendaryEffect());
    }

    // Generate remaining effects
    const remainingCount = effectCount - effects.length;
    const availableEffects = Object.keys(this.relicData.effects);

    for (let i = 0; i < remainingCount; i++) {
      const effectType = this.selectRandomEffect(availableEffects, effects);
      const effect = this.generateNormalEffect(effectType, rarity);
      effects.push(effect);
    }

    return effects;
  }

  private getEffectCount(rarity: RelicRarity): number {
    if (!this.relicData) throw new Error('Relic data not initialized');

    const countRange = this.relicData.effectCounts[rarity];
    return (
      Math.floor(Math.random() * (countRange.max - countRange.min + 1)) +
      countRange.min
    );
  }

  private generateLegendaryEffect(): RelicEffect {
    if (!this.relicData) throw new Error('Relic data not initialized');

    const legendaryEffects = Object.keys(this.relicData.legendaryEffects);
    const effectType =
      legendaryEffects[Math.floor(Math.random() * legendaryEffects.length)];
    const template = this.relicData.legendaryEffects[effectType];

    if (effectType === 'berserker') {
      const duration = this.randomBetween(
        template.durationRange!.min,
        template.durationRange!.max
      );
      return {
        type: effectType,
        name: template.name,
        description: template.description.replace(
          '{duration}',
          duration.toString()
        ),
        value: 0,
        isLegendary: true,
        duration,
      };
    } else if (effectType === 'weapon_relic') {
      const weaponStats = template.weaponStats!;
      const weapon: Weapon = {
        id: `legendary_weapon_${Date.now()}`,
        name: '魔法の武器',
        description: 'レリックから生まれた魔法の武器',
        damage: {
          min: this.randomBetween(
            weaponStats.damage.min,
            weaponStats.damage.max
          ),
          max: this.randomBetween(
            weaponStats.damage.min,
            weaponStats.damage.max
          ),
        },
        handlingReq: 1,
        accuracy: this.randomBetween(
          weaponStats.accuracy.min,
          weaponStats.accuracy.max
        ),
        cooldown: {
          min: this.randomBetween(
            weaponStats.cooldown.min,
            weaponStats.cooldown.max
          ),
          max: this.randomBetween(
            weaponStats.cooldown.min,
            weaponStats.cooldown.max
          ),
        },
        critRate: 25,
        critMultiplier: 3.0,
        price: 0, // Relics don't have prices
        rarity: 'legendary',
        type: 'legendary',
      };

      // Ensure min <= max for damage
      if (weapon.damage.min > weapon.damage.max) {
        [weapon.damage.min, weapon.damage.max] = [
          weapon.damage.max,
          weapon.damage.min,
        ];
      }

      return {
        type: effectType,
        name: template.name,
        description: template.description,
        value: 0,
        isLegendary: true,
        weapon,
      };
    }

    // Fallback
    return {
      type: effectType,
      name: template.name,
      description: template.description,
      value: 0,
      isLegendary: true,
    };
  }

  private generateNormalEffect(
    effectType: string,
    rarity: RelicRarity
  ): RelicEffect {
    if (!this.relicData) throw new Error('Relic data not initialized');

    const template = this.relicData.effects[effectType];
    const valueRange = template.rarityRanges[rarity];
    const value = this.randomBetween(valueRange.min, valueRange.max);

    return {
      type: effectType,
      name: template.name,
      description: template.description.replace('{value}', value.toString()),
      value,
      isLegendary: false,
    };
  }

  private selectRandomEffect(
    availableEffects: string[],
    existingEffects: RelicEffect[]
  ): string {
    // Avoid duplicate effect types
    const usedTypes = existingEffects.map(effect => effect.type);
    const unusedEffects = availableEffects.filter(
      type => !usedTypes.includes(type)
    );

    if (unusedEffects.length > 0) {
      return unusedEffects[Math.floor(Math.random() * unusedEffects.length)];
    }

    // If all effects are used, allow duplicates
    return availableEffects[
      Math.floor(Math.random() * availableEffects.length)
    ];
  }

  private generateRelicName(
    effects: RelicEffect[],
    rarity: RelicRarity
  ): string {
    const rarityPrefixes = {
      common: ['古い', 'やや', '小さな'],
      uncommon: ['不思議な', '光る', '美しい'],
      rare: ['魔法の', '輝く', '神秘的な'],
      epic: ['伝説の', '古代の', '強力な'],
      legendary: ['至高の', '神の', '究極の'],
    };

    const baseName =
      effects.length > 0 ? this.getEffectBaseName(effects[0].type) : 'レリック';
    const prefix =
      rarityPrefixes[rarity][
        Math.floor(Math.random() * rarityPrefixes[rarity].length)
      ];

    return `${prefix}${baseName}`;
  }

  private getEffectBaseName(effectType: string): string {
    const baseNames: Record<string, string> = {
      storage_increase: '袋',
      weapon_slot_increase: '武器架',
      hull_increase: '船体板',
      speed_increase: '帆',
      sight_increase: '望遠鏡',
      crew_increase: '指揮旗',
      gold_bonus: '金貨',
      berserker: '狂戦士の魂',
      weapon_relic: '武器',
    };

    return baseNames[effectType] || 'レリック';
  }

  private generateRelicDescription(effects: RelicEffect[]): string {
    const descriptions = effects.map(effect => effect.description);
    return descriptions.join('\\n');
  }

  private calculateRelicPrice(
    rarity: RelicRarity,
    effects: RelicEffect[]
  ): number {
    // Base prices by rarity
    const basePrices = {
      common: 25,
      uncommon: 50,
      rare: 100,
      epic: 200,
      legendary: 400,
    };

    let price = basePrices[rarity] || 50;

    // Add price based on number of effects
    const effectBonus = effects.length * 15;
    price += effectBonus;

    // Add randomness (-20% to +20%)
    const variation = price * 0.2;
    const randomVariation = (Math.random() - 0.5) * 2 * variation;
    price = Math.floor(price + randomVariation);

    return Math.max(10, price); // Minimum 10 gold
  }

  private randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
