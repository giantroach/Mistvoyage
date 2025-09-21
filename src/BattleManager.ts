import {
  GameState,
  Monster,
  Weapon,
  MonsterWeapon,
  BattleState,
  BattleAction,
  BattleEffect,
  BattleLogEntry,
} from './types.js';
import { WeaponManager } from './WeaponManager.js';
import { WeatherManager } from './WeatherManager.js';

export class BattleManager {
  private weaponsData: any = null;
  private monstersData: any = null;
  private battleConfig: any = null;
  private weatherManager: WeatherManager;

  constructor() {
    this.weatherManager = WeatherManager.getInstance();
  }

  async initialize(): Promise<void> {
    try {
      const [weaponsResponse, monstersResponse, battleConfigResponse] =
        await Promise.all([
          fetch('./data/weapons.json'),
          fetch('./data/monsters.json'),
          fetch('./data/battle_config.json'),
        ]);

      this.weaponsData = await weaponsResponse.json();
      this.monstersData = await monstersResponse.json();
      this.battleConfig = await battleConfigResponse.json();
    } catch (error) {
      console.error('Failed to load battle data:', error);
      throw error;
    }
  }

  initiateBattle(gameState: GameState, chaptersData?: any): void {
    const encounter = this.selectEncounter(
      gameState.currentChapter,
      chaptersData
    );
    const monsters = this.createMonstersFromEncounter(encounter);

    gameState.battleState = {
      isActive: true,
      phase: 'preparation',
      monsters,
      playerWeapons: gameState.playerParameters.weapons.map(weapon => ({
        weapon,
        lastUsed: Date.now() - weapon.cooldown.max, // Allow immediate attack
      })),
      battleLog: [],
      startTime: Date.now(),
      playerEffects: [],
      playerTurn: true,
      turnCount: 1,
    };

    gameState.gamePhase = 'combat';
  }

  initiateBossBattle(gameState: GameState, chaptersData?: any): void {
    if (!chaptersData?.chapters) {
      throw new Error('Chapters data required for boss battle');
    }

    const chapterData = chaptersData.chapters.find(
      (c: any) => c.id === gameState.currentChapter
    );
    if (!chapterData?.bossMonster) {
      throw new Error(
        `No boss monster defined for chapter ${gameState.currentChapter}`
      );
    }

    const bossMonster = this.createBossMonster(chapterData.bossMonster);

    gameState.battleState = {
      isActive: true,
      phase: 'preparation',
      monsters: [bossMonster],
      playerWeapons: gameState.playerParameters.weapons.map(weapon => ({
        weapon,
        lastUsed: Date.now() - weapon.cooldown.max,
      })),
      battleLog: [],
      startTime: Date.now(),
      playerEffects: [],
      playerTurn: true,
      turnCount: 1,
    };

    gameState.gamePhase = 'combat';
  }

  initiateDebugBattle(gameState: GameState, enemyId: string): void {
    if (!this.monstersData) {
      throw new Error('Monsters data not initialized');
    }

    const monsterData = this.monstersData.monsters[enemyId];
    if (!monsterData) {
      throw new Error(`Monster ${enemyId} not found`);
    }

    // Create a single monster using the same logic as createMonstersFromEncounter
    const monster = {
      ...monsterData,
      maxHp: monsterData.hp,
      effects: [],
    };

    gameState.battleState = {
      isActive: true,
      phase: 'preparation',
      monsters: [monster],
      playerWeapons: gameState.playerParameters.weapons.map(weapon => ({
        weapon,
        lastUsed: Date.now() - weapon.cooldown.max, // Allow immediate attack
      })),
      battleLog: [],
      startTime: Date.now(),
      playerEffects: [],
      playerTurn: true,
      turnCount: 1,
    };

    gameState.gamePhase = 'combat';
  }

  private createBossMonster(bossId: string): Monster {
    const monsterData = this.monstersData.monsters[bossId];
    if (!monsterData) {
      throw new Error(`Boss monster ${bossId} not found`);
    }

    return {
      ...monsterData,
      maxHp: monsterData.hp,
      effects: [],
      attack: monsterData.attack || 10,
      defense: monsterData.defense || 5,
    };
  }

  private selectEncounter(chapter: number, chaptersData?: any): any {
    let encounters;

    if (chaptersData?.chapters) {
      const chapterData = chaptersData.chapters.find(
        (c: any) => c.id === chapter
      );
      encounters = chapterData?.encounters;
    } else {
      encounters = this.monstersData.encounters?.[`chapter_${chapter}`];
    }

    if (!encounters || encounters.length === 0) {
      console.error('No encounters found for chapter:', chapter);
      throw new Error(`No encounters found for chapter ${chapter}`);
    }

    const totalWeight = encounters.reduce(
      (sum: number, enc: any) => sum + enc.weight,
      0
    );
    let random = Math.random() * totalWeight;

    for (const encounter of encounters) {
      random -= encounter.weight;
      if (random <= 0) {
        return encounter;
      }
    }

    return encounters[0]; // Fallback
  }

  private createMonstersFromEncounter(encounter: any): Monster[] {
    return encounter.monsters.map((monsterId: string) => {
      const monsterData = this.monstersData.monsters[monsterId];
      if (!monsterData) {
        throw new Error(`Monster ${monsterId} not found`);
      }

      return {
        ...monsterData,
        maxHp: monsterData.hp,
        effects: [],
      };
    });
  }

  updateBattle(gameState: GameState, chaptersData?: any): void {
    if (!gameState.battleState || !gameState.battleState.isActive) return;

    const battleState = gameState.battleState;
    const currentTime = Date.now();

    // Check if battle is over
    if (this.isBattleOver(gameState)) {
      this.endBattle(gameState, chaptersData);
      return;
    }

    // Process player weapon cooldowns
    this.processPlayerWeapons(gameState, currentTime);

    // Process monster actions
    this.processMonsterActions(gameState, currentTime);

    // Update effects
    this.updateEffects(gameState, currentTime);

    // Update cooldown information in battle state
    this.updateCooldownInfo(gameState, currentTime);
  }

  private processPlayerWeapons(
    gameState: GameState,
    currentTime: number
  ): void {
    const battleState = gameState.battleState!;
    const playerParams = gameState.playerParameters;

    battleState.playerWeapons.forEach(weaponState => {
      const timeSinceLastUse = currentTime - weaponState.lastUsed;
      const effectiveCooldown = this.calculateEffectiveCooldown(
        weaponState.weapon,
        playerParams,
        battleState.playerEffects
      );

      if (timeSinceLastUse >= effectiveCooldown) {
        // Find target monster (alive monster with lowest HP)
        const target = battleState.monsters
          .filter(m => m.hp > 0)
          .reduce((lowest, current) =>
            current.hp < lowest.hp ? current : lowest
          );

        if (target) {
          this.executePlayerAttack(
            gameState,
            weaponState.weapon,
            target,
            currentTime
          );
          weaponState.lastUsed = currentTime;
        }
      }
    });
  }

  private processMonsterActions(
    gameState: GameState,
    currentTime: number
  ): void {
    const battleState = gameState.battleState!;

    battleState.monsters.forEach(monster => {
      if (monster.hp <= 0) return;

      // Check each monster weapon
      monster.weapons.forEach(weaponId => {
        const weaponData = this.monstersData.monsterWeapons[weaponId];
        if (!weaponData) return;

        // Simple cooldown check (monsters don't have complex weapon state tracking)
        const shouldAttack = Math.random() < 0.05; // 5% chance per update cycle for slower combat
        if (shouldAttack) {
          this.executeMonsterAttack(
            gameState,
            monster,
            weaponData,
            currentTime
          );
        }
      });
    });
  }

  private executePlayerAttack(
    gameState: GameState,
    weapon: Weapon,
    target: Monster,
    currentTime: number
  ): void {
    const playerParams = gameState.playerParameters;
    const battleState = gameState.battleState!;

    // Calculate hit chance
    const baseAccuracy = weapon.accuracy;
    const speedModifier = this.calculateSpeedModifier(
      playerParams.speed,
      target.speed,
      true
    );
    const sightModifier = this.calculateSightModifier(playerParams.sight);
    const weatherModifier = this.getWeatherModifier(playerParams.weather);

    const finalAccuracy =
      baseAccuracy *
      speedModifier *
      sightModifier *
      weatherModifier.sightMultiplier;
    const hit = Math.random() * 100 < finalAccuracy;

    // Debug logging for player attacks removed

    let damage = 0;
    if (hit) {
      damage = this.rollDamage(weapon.damage.min, weapon.damage.max);

      // Apply weapon effectiveness based on armor types
      if (weapon.weaponType && target.armorTypes) {
        const effectiveness = this.calculateWeaponEffectiveness(
          weapon.weaponType,
          target.armorTypes
        );
        damage = Math.floor(damage * effectiveness);
      }

      target.hp = Math.max(0, target.hp - damage);
    }

    const action: BattleAction = {
      actorType: 'player',
      actorId: 'player',
      weaponName: weapon.name,
      targetType: 'monster',
      targetId: target.id,
      damage,
      hit,
      timestamp: currentTime,
    };

    if (weapon.effect) {
      this.applyEffect(target, weapon.effect, currentTime);
      action.effect = weapon.effect;
    }

    battleState.battleLog.push(action);
  }

  private executeMonsterAttack(
    gameState: GameState,
    monster: Monster,
    weapon: MonsterWeapon,
    currentTime: number
  ): void {
    const playerParams = gameState.playerParameters;
    const battleState = gameState.battleState!;

    // Calculate monster accuracy with berserk modifier
    const hpRatio = monster.hp / monster.maxHp;
    const berserkModifier = this.getBerserkModifier(hpRatio);
    const speedModifier = this.calculateSpeedModifier(
      monster.speed,
      playerParams.speed,
      false
    );

    const finalAccuracy =
      weapon.accuracy * berserkModifier.accuracy * speedModifier;
    const hit = Math.random() * 100 < finalAccuracy;

    let damage = 0;
    if (hit) {
      damage = this.rollDamage(weapon.damage.min, weapon.damage.max);

      // Apply weapon effectiveness based on ship armor types (if ship has armor)
      if (weapon.weaponType && playerParams.ship.armorTypes) {
        const effectiveness = this.calculateWeaponEffectiveness(
          weapon.weaponType,
          playerParams.ship.armorTypes
        );
        damage = Math.floor(damage * effectiveness);
      }

      playerParams.hull = Math.max(0, playerParams.hull - damage);
    }

    const action: BattleAction = {
      actorType: 'monster',
      actorId: monster.id,
      weaponName: weapon.name,
      targetType: 'player',
      targetId: 'player',
      damage,
      hit,
      timestamp: currentTime,
    };

    if (weapon.effect) {
      this.applyEffectToPlayer(gameState, weapon.effect, currentTime);
      action.effect = weapon.effect;
    }

    battleState.battleLog.push(action);
  }

  private calculateEffectiveCooldown(
    weapon: Weapon,
    playerParams: any,
    effects: BattleEffect[]
  ): number {
    // Get base cooldown (random between min and max)
    const baseCooldown =
      weapon.cooldown.min +
      Math.random() * (weapon.cooldown.max - weapon.cooldown.min);
    let cooldown = baseCooldown;

    // Apply crew requirement penalty
    const weaponManager = WeaponManager.getInstance();
    const crewPenalty = weaponManager.calculateCrewPenalty(
      playerParams.weapons,
      playerParams.crew
    );
    cooldown *= 1 + crewPenalty;

    // Apply general crew modifier (for insufficient crew overall)
    const crewRatio = playerParams.crew / playerParams.ship.crewMax;
    if (
      crewRatio <
      this.battleConfig.battleConfig.crewModifiers.cooldownPenalty.threshold
    ) {
      const penalty =
        this.battleConfig.battleConfig.crewModifiers.cooldownPenalty.maxPenalty;
      cooldown *= 1 + (1 - crewRatio) * penalty;
    }

    // Apply effect modifiers
    effects.forEach(effect => {
      if (effect.type === 'fear') {
        cooldown *=
          this.battleConfig.battleConfig.effects.fear.cooldownMultiplier;
      }
    });

    return cooldown;
  }

  private calculateSpeedModifier(
    attackerSpeed: number,
    defenderSpeed: number,
    isPlayer: boolean
  ): number {
    const config = this.battleConfig.battleConfig.speedModifiers.accuracy;
    if (attackerSpeed > defenderSpeed) {
      return config.playerFaster;
    } else if (attackerSpeed < defenderSpeed) {
      return config.playerSlower;
    }
    return 1.0;
  }

  private calculateSightModifier(sight: number): number {
    const config = this.battleConfig.battleConfig.sightModifiers.accuracy;
    return sight < config.threshold ? config.penalty : 1.0;
  }

  private getWeatherModifier(weather: any): any {
    // Use WeatherManager for accurate weather effects
    const weatherEffects = this.weatherManager.getWeatherEffects(weather);

    // Convert to multiplier format for compatibility
    const accuracyMultiplier = 1 + weatherEffects.accuracy / 100; // Convert percentage to multiplier

    return {
      sightMultiplier: accuracyMultiplier,
      speedMultiplier: weather.value >= 10 ? 0.9 : 1.0, // Reduced speed in bad weather
      cooldownReduction: 1.0,
    };
  }

  private getWeatherKey(weather: string): string {
    const weatherMap: { [key: string]: string } = {
      晴れ: 'clear',
      曇り: 'fog',
      雨: 'storm',
      嵐: 'storm',
      霧: 'fog',
    };
    return weatherMap[weather] || 'clear';
  }

  private getBerserkModifier(hpRatio: number): any {
    const config = this.battleConfig.battleConfig.monsterBerserkModifiers;
    if (hpRatio <= config.hpThreshold) {
      return {
        cooldown: config.cooldownReduction,
        accuracy: config.accuracyPenalty,
      };
    }
    return { cooldown: 1.0, accuracy: 1.0 };
  }

  private rollDamage(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private calculateWeaponEffectiveness(
    weaponType: string,
    armorTypes: string[]
  ): number {
    if (!weaponType || !armorTypes || armorTypes.length === 0) {
      return 1.0; // No effectiveness modifier if types are missing
    }

    const effectiveness =
      this.battleConfig?.battleConfig?.weaponEffectiveness?.[weaponType];
    if (!effectiveness) {
      return 1.0; // No effectiveness data for this weapon type
    }

    // Calculate combined effectiveness by multiplying all armor type multipliers
    let totalMultiplier = 1.0;
    armorTypes.forEach(armorType => {
      const multiplier = effectiveness[armorType];
      if (multiplier !== undefined) {
        totalMultiplier *= multiplier;
      }
    });

    return totalMultiplier;
  }

  private applyEffect(
    target: Monster,
    effectType: string,
    currentTime: number
  ): void {
    const effectConfig = this.battleConfig.battleConfig.effects[effectType];
    if (effectConfig) {
      target.effects.push({
        type: effectType,
        duration: effectConfig.duration,
        startTime: currentTime,
      });
    }
  }

  private applyEffectToPlayer(
    gameState: GameState,
    effectType: string,
    currentTime: number
  ): void {
    const effectConfig = this.battleConfig.battleConfig.effects[effectType];
    if (effectConfig) {
      gameState.battleState!.playerEffects.push({
        type: effectType,
        duration: effectConfig.duration,
        startTime: currentTime,
      });
    }
  }

  private updateEffects(gameState: GameState, currentTime: number): void {
    const battleState = gameState.battleState!;

    // Update player effects
    battleState.playerEffects = battleState.playerEffects.filter(
      effect => currentTime - effect.startTime < effect.duration
    );

    // Update monster effects
    battleState.monsters.forEach(monster => {
      monster.effects = monster.effects.filter(
        effect => currentTime - effect.startTime < effect.duration
      );
    });
  }

  private isBattleOver(gameState: GameState): boolean {
    const playerHull = gameState.playerParameters.hull;
    const monstersAlive = gameState.battleState!.monsters.some(m => m.hp > 0);

    return playerHull <= 0 || !monstersAlive;
  }

  private endBattle(gameState: GameState, chaptersData?: any): void {
    const battleState = gameState.battleState!;
    const playerAlive = gameState.playerParameters.hull > 0;

    if (playerAlive) {
      // Check if this was a boss battle
      const isBossBattle = this.isBossBattle(gameState, chaptersData);

      if (isBossBattle) {
        // Boss victory - special rewards
        battleState.phase = 'victory';
        gameState.gamePhase = 'boss_reward'; // Special phase for relic selection
      } else {
        // Normal victory - award gold
        const goldReward = this.calculateGoldReward(battleState.monsters);
        gameState.playerParameters.money += goldReward;
        battleState.phase = 'victory';
        gameState.gamePhase = 'battle_result';
      }

      // Add victory log entry
      battleState.battleLog.push({
        type: 'battle_end',
        message: '戦闘終了',
        timestamp: Date.now(),
      });
    } else {
      // Defeat
      battleState.phase = 'defeat';
      gameState.gamePhase = 'game_over';
    }

    battleState.isActive = false;
  }

  private isBossBattle(gameState: GameState, chaptersData?: any): boolean {
    if (!chaptersData?.chapters || !gameState.battleState?.monsters) {
      return false;
    }

    const chapterData = chaptersData.chapters.find(
      (c: any) => c.id === gameState.currentChapter
    );
    if (!chapterData?.bossMonster) {
      return false;
    }

    // Check if any of the defeated monsters was the boss
    return gameState.battleState.monsters.some(
      monster => monster.id === chapterData.bossMonster
    );
  }

  generateBossRewards(gameState: GameState, chaptersData?: any): any[] {
    if (!chaptersData?.chapters) {
      return [];
    }

    const chapterData = chaptersData.chapters.find(
      (c: any) => c.id === gameState.currentChapter
    );
    if (!chapterData?.bossRewardRarities) {
      return [];
    }

    // Return placeholder data that will be replaced by RelicManager in the UI
    return chapterData.bossRewardRarities.map((rarity: string) => ({
      rarity: rarity,
    }));
  }

  private calculateGoldReward(monsters: Monster[]): number {
    return monsters.reduce((total, monster) => {
      const reward = this.rollDamage(
        monster.goldReward.min,
        monster.goldReward.max
      );
      return total + reward;
    }, 0);
  }

  completeBattle(gameState: GameState): void {
    if (
      gameState.battleState?.phase === 'victory' ||
      gameState.battleState?.phase === 'result_screen'
    ) {
      gameState.battleState = undefined;
      gameState.gamePhase = 'navigation';
    }
  }

  getBattleLog(
    gameState: GameState
  ): (BattleAction | BattleLogEntry | string)[] {
    return gameState.battleState?.battleLog || [];
  }

  private createLogEntry(
    battleState: BattleState,
    message: string,
    type?: 'status' | 'victory' | 'defeat'
  ): BattleLogEntry {
    return {
      message,
      timestamp: Date.now(),
      type,
    };
  }

  getCooldownData(gameState: GameState): {
    playerWeapons: Array<{
      name: string;
      cooldownPercent: number;
      remainingTime: number;
      isReady: boolean;
    }>;
    monsters: Array<{
      id: string;
      name: string;
      weapons: Array<{
        name: string;
        isActive: boolean;
      }>;
    }>;
  } {
    if (!gameState.battleState) {
      return { playerWeapons: [], monsters: [] };
    }

    const currentTime = Date.now();
    const battleState = gameState.battleState;
    const playerParams = gameState.playerParameters;

    const playerWeapons = battleState.playerWeapons.map(weaponState => {
      const timeSinceLastUse = currentTime - weaponState.lastUsed;
      const effectiveCooldown = this.calculateEffectiveCooldown(
        weaponState.weapon,
        playerParams,
        battleState.playerEffects
      );

      const remainingTime = Math.max(0, effectiveCooldown - timeSinceLastUse);
      const cooldownPercent =
        effectiveCooldown > 0
          ? Math.max(0, 100 - (timeSinceLastUse / effectiveCooldown) * 100)
          : 0;
      const isReady = remainingTime <= 0;

      return {
        name: weaponState.weapon.name,
        cooldownPercent,
        remainingTime,
        isReady,
      };
    });

    const monsters = battleState.monsters
      .filter(monster => monster.hp > 0)
      .map(monster => ({
        id: monster.id,
        name: monster.name,
        weapons: monster.weapons.map(weaponId => {
          const weaponData = this.monstersData?.monsterWeapons[weaponId];
          return {
            name: weaponData?.name || weaponId,
            isActive: Math.random() < 0.3,
          };
        }),
      }));

    return { playerWeapons, monsters };
  }

  private updateCooldownInfo(gameState: GameState, currentTime: number): void {
    if (!gameState.battleState) return;

    const battleState = gameState.battleState;
    const playerParams = gameState.playerParameters;

    // Initialize cooldown data if not exists
    if (!battleState.weaponCooldowns) {
      battleState.weaponCooldowns = { player: {}, monsters: {} };
    }

    // Update player weapon cooldowns
    battleState.playerWeapons.forEach(weaponState => {
      const timeSinceLastUse = currentTime - weaponState.lastUsed;
      const effectiveCooldown = this.calculateEffectiveCooldown(
        weaponState.weapon,
        playerParams,
        battleState.playerEffects
      );
      const remainingTime = Math.max(0, effectiveCooldown - timeSinceLastUse);
      const cooldownPercent =
        effectiveCooldown > 0
          ? Math.max(0, 100 - (timeSinceLastUse / effectiveCooldown) * 100)
          : 0;
      const isReady = remainingTime <= 0;

      if (!battleState.weaponCooldowns.player) {
        battleState.weaponCooldowns.player = {};
      }

      battleState.weaponCooldowns.player[weaponState.weapon.id] = {
        cooldownPercent,
        remainingTime,
        isReady,
        lastFired: weaponState.lastUsed,
      };
    });

    // Update monster weapon cooldowns (simplified version)
    battleState.monsters.forEach(monster => {
      if (monster.hp > 0) {
        if (!battleState.weaponCooldowns.monsters) {
          battleState.weaponCooldowns.monsters = {};
        }

        if (!battleState.weaponCooldowns.monsters[monster.id]) {
          battleState.weaponCooldowns.monsters[monster.id] = {};
        }

        // For monsters, we'll track weapon activity status
        monster.weapons.forEach(weapon => {
          battleState.weaponCooldowns.monsters![monster.id][weapon.name] = {
            cooldownPercent: 0, // Simplified for monsters
            remainingTime: 0,
            isReady: true, // Monsters are always ready for simplicity
            lastFired: currentTime,
          };
        });
      }
    });
  }
}
