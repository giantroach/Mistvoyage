import {
  GameState,
  Ship,
  Weapon,
  Relic,
  WeaponRarity,
  RelicRarity,
} from './types.js';
import { WeaponManager } from './WeaponManager.js';
import { RelicManager } from './RelicManager.js';
import { BattleManager } from './BattleManager.js';

interface DebugState {
  selectedShip: Ship | null;
  debugWeapons: Weapon[];
  debugRelics: Relic[];
  selectedMonsterEncounter: string | null;
}

export class DebugManager {
  private debugState: DebugState = {
    selectedShip: null,
    debugWeapons: [],
    debugRelics: [],
    selectedMonsterEncounter: 'single_slime', // Default selection
  };

  private isDebugMode: boolean = false;
  private gameInstance: any;

  constructor(gameInstance: any) {
    this.gameInstance = gameInstance;
  }

  public toggleDebugMode(): void {
    this.isDebugMode = !this.isDebugMode;
    if (this.isDebugMode) {
      this.showDebugScreen();
    } else {
      this.hideDebugScreen();
    }
  }

  private showDebugScreen(): void {
    const content = document.getElementById('story-text');
    const choicesContainer = document.getElementById('choices-container');

    if (!content || !choicesContainer) return;

    content.innerHTML = `
      <div class="debug-screen">
        <h2>🔧 デバッグモード</h2>
        <p>船、武器、レリック、モンスターを選択して戦闘シミュレーションを行えます。</p>
        
        <div class="debug-sections">
          <div class="debug-section">
            <h3>🚢 船選択</h3>
            <div id="debug-ship-selection" class="debug-ship-container">
              ${this.renderShipSelection()}
            </div>
          </div>
          
          <div class="debug-section">
            <h3>⚔️ 武器管理</h3>
            <div id="debug-weapon-controls" class="debug-controls">
              ${this.renderWeaponControls()}
            </div>
            <div id="debug-weapons-list" class="debug-items-list">
              ${this.renderWeaponsList()}
            </div>
          </div>
          
          <div class="debug-section">
            <h3>🏺 レリック管理</h3>
            <div id="debug-relic-controls" class="debug-controls">
              ${this.renderRelicControls()}
            </div>
            <div id="debug-relics-list" class="debug-items-list">
              ${this.renderRelicsList()}
            </div>
          </div>
          
          <div class="debug-section">
            <h3>👹 モンスター選択</h3>
            <div id="debug-monster-selection" class="debug-monster-container">
              ${this.renderMonsterSelection()}
            </div>
          </div>
        </div>
      </div>
    `;

    choicesContainer.innerHTML = `
      <button class="choice-btn debug-battle-btn" onclick="window.debugManager.startDebugBattle()">
        ⚔️ 戦闘開始
      </button>
      <button class="choice-btn" onclick="window.debugManager.toggleDebugMode()">
        ⬅️ デバッグモード終了
      </button>
    `;

    this.setupDebugEventListeners();
  }

  private hideDebugScreen(): void {
    // Return to normal game display
    this.gameInstance.updateDisplay();
  }

  private renderShipSelection(): string {
    // This would need access to ships data
    const shipsData = this.gameInstance.getShipsData();
    const ships = shipsData?.ships || {};

    // Auto-select first ship if none selected
    if (!this.debugState.selectedShip && Object.keys(ships).length > 0) {
      const firstShipId = Object.keys(ships)[0];
      this.debugState.selectedShip = ships[firstShipId];
    }

    return Object.values(ships)
      .map(
        (ship: any) => `
      <div class="debug-ship-option ${
        this.debugState.selectedShip?.id === ship.id ? 'selected' : ''
      }">
        <button class="debug-ship-btn" onclick="window.debugManager.selectShip('${
          ship.id
        }')">
          <strong>${ship.name}</strong><br>
          Hull: ${ship.hullMax} | Crew: ${ship.crewMax} | Speed: ${
            ship.baseSpeed
          }<br>
          Storage: ${ship.storage} | Weapon Slots: ${ship.weaponSlots}
        </button>
      </div>
    `
      )
      .join('');
  }

  private renderWeaponControls(): string {
    const weaponManager = this.gameInstance.getWeaponManager();
    const weaponTemplates = Object.keys(weaponManager.getWeaponTemplates());
    const rarities: WeaponRarity[] = [
      'common',
      'uncommon',
      'rare',
      'epic',
      'legendary',
    ];

    return `
      <div class="debug-weapon-generator">
        <select id="debug-weapon-template">
          <option value="">武器を選択...</option>
          ${weaponTemplates
            .map(id => `<option value="${id}">${id}</option>`)
            .join('')}
        </select>
        <select id="debug-weapon-rarity">
          <option value="">レアリティを選択...</option>
          ${rarities
            .map(rarity => `<option value="${rarity}">${rarity}</option>`)
            .join('')}
        </select>
        <button onclick="window.debugManager.generateWeapon()">武器生成</button>
      </div>
    `;
  }

  private renderWeaponsList(): string {
    return `
      <div class="debug-weapons">
        ${this.debugState.debugWeapons
          .map(
            (weapon, index) => `
          <div class="debug-weapon-item">
            <div class="weapon-info">
              <strong>${weapon.name}</strong> (${weapon.rarity})
              <br>ダメージ: ${weapon.damage.min}-${weapon.damage.max}
              <br>精度: ${weapon.accuracy}%
            </div>
            <button onclick="window.debugManager.removeWeapon(${index})" class="remove-btn">削除</button>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  private renderRelicControls(): string {
    const rarities: RelicRarity[] = [
      'common',
      'uncommon',
      'rare',
      'epic',
      'legendary',
    ];

    return `
      <div class="debug-relic-generator">
        <select id="debug-relic-rarity">
          <option value="">レアリティを選択...</option>
          ${rarities
            .map(rarity => `<option value="${rarity}">${rarity}</option>`)
            .join('')}
        </select>
        <button onclick="window.debugManager.generateRelic()">レリック生成</button>
      </div>
    `;
  }

  private renderRelicsList(): string {
    return `
      <div class="debug-relics">
        ${this.debugState.debugRelics
          .map(
            (relic, index) => `
          <div class="debug-relic-item">
            <div class="relic-info">
              <strong>${relic.name}</strong> (${relic.rarity})
              <br>${relic.effects.map(effect => effect.description).join(', ')}
            </div>
            <button onclick="window.debugManager.removeRelic(${index})" class="remove-btn">削除</button>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  private renderMonsterSelection(): string {
    // Generate encounters dynamically from monsters.json data
    const encounters = this.generateEncounterOptions();

    return encounters
      .map(
        encounter => `
      <div class="debug-monster-option ${
        this.debugState.selectedMonsterEncounter === encounter.id
          ? 'selected'
          : ''
      }">
        <button class="debug-monster-btn" onclick="window.debugManager.selectMonsterEncounter('${
          encounter.id
        }')">
          <strong>${encounter.name}</strong><br>
          ${encounter.monsters.join(', ')}
        </button>
      </div>
    `
      )
      .join('');
  }

  private setupDebugEventListeners(): void {
    // Event listeners are handled via onclick attributes in the HTML for simplicity
  }

  public selectShip(shipId: string): void {
    const shipsData = this.gameInstance.getShipsData();
    const ships = shipsData?.ships || {};
    this.debugState.selectedShip = ships[shipId] || null;
    this.refreshDebugScreen();
  }

  public generateWeapon(): void {
    const templateSelect = document.getElementById(
      'debug-weapon-template'
    ) as HTMLSelectElement;
    const raritySelect = document.getElementById(
      'debug-weapon-rarity'
    ) as HTMLSelectElement;

    if (!templateSelect?.value || !raritySelect?.value) {
      alert('武器テンプレートとレアリティを選択してください');
      return;
    }

    try {
      const weaponManager = this.gameInstance.getWeaponManager();
      const weapon = weaponManager.generateWeapon(
        templateSelect.value,
        raritySelect.value as WeaponRarity
      );
      this.debugState.debugWeapons.push(weapon);
      this.refreshDebugScreen();
    } catch (error) {
      alert(`武器生成エラー: ${error}`);
    }
  }

  public removeWeapon(index: number): void {
    this.debugState.debugWeapons.splice(index, 1);
    this.refreshDebugScreen();
  }

  public generateRelic(): void {
    const raritySelect = document.getElementById(
      'debug-relic-rarity'
    ) as HTMLSelectElement;

    if (!raritySelect?.value) {
      alert('レアリティを選択してください');
      return;
    }

    try {
      const relicManager = this.gameInstance.getRelicManager();
      const relic = relicManager.generateRelic(
        raritySelect.value as RelicRarity
      );
      this.debugState.debugRelics.push(relic);
      this.refreshDebugScreen();
    } catch (error) {
      alert(`レリック生成エラー: ${error}`);
    }
  }

  public removeRelic(index: number): void {
    this.debugState.debugRelics.splice(index, 1);
    this.refreshDebugScreen();
  }

  public selectMonsterEncounter(encounter: string): void {
    this.debugState.selectedMonsterEncounter = encounter;
    this.refreshDebugScreen();
  }

  public startDebugBattle(): void {
    if (!this.debugState.selectedShip) {
      alert('船を選択してください');
      return;
    }

    if (this.debugState.debugWeapons.length === 0) {
      alert('少なくとも1つの武器を生成してください');
      return;
    }

    if (!this.debugState.selectedMonsterEncounter) {
      alert('モンスターを選択してください');
      return;
    }

    // Create a temporary debug game state for battle
    const debugGameState: GameState = {
      currentChapter: 1,
      currentMap: this.gameInstance.gameState.currentMap,
      currentNodeId: 'debug',
      eventsCompleted: 0,
      playerParameters: {
        ship: this.debugState.selectedShip,
        hull: this.debugState.selectedShip.hullMax,
        food: 20,
        money: 50,
        crew: this.debugState.selectedShip.crewMax,
        sight: 15,
        weather: '晴れ',
        relics: this.debugState.debugRelics,
        weapons: this.debugState.debugWeapons,
        speed: this.debugState.selectedShip.baseSpeed,
        karma: 0,
        level: 1,
        health: 100,
        maxHealth: 100,
        attack: 20,
        defense: 5,
        experience: 0,
        gold: 50,
      },
      variables: {},
      visitedNodes: new Set(),
      activeSequentialEvents: [],
      gamePhase: 'combat',
      battleState: undefined,
    };

    // Create debug monsters based on selection
    const debugMonsters = this.createDebugMonsters();
    if (!debugMonsters || debugMonsters.length === 0) {
      alert('モンスターの作成に失敗しました');
      return;
    }

    // Set up battle state manually for debug
    debugGameState.battleState = {
      isActive: true,
      phase: 'preparation',
      monsters: debugMonsters,
      playerWeapons: debugGameState.playerParameters.weapons.map(weapon => ({
        weapon,
        lastUsed: Date.now() - weapon.cooldown.max, // Allow immediate attack
      })),
      battleLog: ['🔧 デバッグ戦闘開始'],
      startTime: Date.now(),
      playerEffects: [],
      playerTurn: true,
      turnCount: 1,
    };

    // Start debug battle
    try {
      // Switch to battle display temporarily
      this.gameInstance.gameState = debugGameState;
      this.gameInstance.updateDisplay();
      this.isDebugMode = false; // Exit debug mode during battle

      // Start the battle update loop
      this.startDebugBattleLoop();
    } catch (error) {
      alert(`戦闘開始エラー: ${error}`);
    }
  }

  private createDebugMonsters(): any[] {
    const encounters = this.generateEncounterOptions();

    console.log(
      'Debug: Selected monster encounter:',
      this.debugState.selectedMonsterEncounter
    );

    const selectedEncounter = encounters.find(
      e => e.id === this.debugState.selectedMonsterEncounter
    );

    if (!selectedEncounter) {
      console.error(
        'Debug: Encounter not found:',
        this.debugState.selectedMonsterEncounter
      );
      return [];
    }

    console.log('Debug: Found encounter:', selectedEncounter);

    // Create debug monsters manually
    const debugMonsters = selectedEncounter.monsters.map((monsterId, index) => {
      const baseStats = this.getMonsterStats(monsterId);
      return {
        id: `${monsterId}_${index}`,
        name: baseStats.name,
        description: baseStats.description,
        hp: baseStats.hp,
        maxHp: baseStats.hp,
        speed: baseStats.speed,
        weapons: baseStats.weapons,
        goldReward: baseStats.goldReward,
        difficulty: baseStats.difficulty,
        chapters: baseStats.chapters,
        effects: [], // Initialize empty effects array
        attack: baseStats.attack,
        defense: baseStats.defense,
      };
    });

    return debugMonsters;
  }

  private getMonsterStats(monsterId: string): any {
    // Get monster data from BattleManager's loaded monsters.json data
    const battleManager = this.gameInstance.getBattleManager();

    // Access the monsters data through the private property (this is for debug purposes)
    const monstersData = (battleManager as any).monstersData;

    if (!monstersData || !monstersData.monsters) {
      console.error('Debug: Monster data not loaded in BattleManager');
      // Fallback to basic sea slime
      return {
        name: '海のスライム',
        description: '弱い海洋生物',
        hp: 8,
        speed: 3,
        weapons: ['tentacle_slap'],
        goldReward: { min: 3, max: 8 },
        difficulty: 1,
        chapters: [1],
        attack: 5,
        defense: 2,
      };
    }

    const monsterData = monstersData.monsters[monsterId];
    if (!monsterData) {
      console.error(
        `Debug: Monster stats not found for: ${monsterId}, using sea_slime as fallback`
      );
      return (
        monstersData.monsters.sea_slime || {
          name: '海のスライム',
          description: '弱い海洋生物',
          hp: 8,
          speed: 3,
          weapons: ['tentacle_slap'],
          goldReward: { min: 3, max: 8 },
          difficulty: 1,
          chapters: [1],
          attack: 5,
          defense: 2,
        }
      );
    }

    console.log(
      `Debug: Using monster stats from JSON for ${monsterId}:`,
      monsterData
    );

    // Add default attack/defense if not present in JSON
    return {
      ...monsterData,
      attack: monsterData.attack || Math.floor(monsterData.hp * 0.6),
      defense: monsterData.defense || Math.floor(monsterData.hp * 0.3),
    };
  }

  private startDebugBattleLoop(): void {
    const battleManager = this.gameInstance.getBattleManager();

    const battleUpdate = () => {
      const gameState = this.gameInstance.gameState;
      if (gameState.battleState?.isActive) {
        battleManager.updateBattle(gameState);
        this.gameInstance.updateDisplay();
        setTimeout(battleUpdate, 100); // Update every 100ms
      }
    };

    battleUpdate();
  }

  private generateEncounterOptions(): Array<{
    id: string;
    name?: string;
    monsters: string[];
  }> {
    const battleManager = this.gameInstance.getBattleManager();
    const monstersData = (battleManager as any).monstersData;

    if (!monstersData || !monstersData.monsters) {
      console.error(
        'Debug: Monster data not loaded, using fallback encounters'
      );
      return [
        { id: 'single_slime', name: 'スライム単体', monsters: ['sea_slime'] },
      ];
    }

    const encounters: Array<{ id: string; name?: string; monsters: string[] }> =
      [];

    // Generate single monster encounters for each available monster
    Object.keys(monstersData.monsters).forEach(monsterId => {
      const monster = monstersData.monsters[monsterId];
      const isBoss = ['kraken_young', 'ghost_ship'].includes(monsterId);
      const prefix = isBoss ? 'ボス：' : '';

      encounters.push({
        id: `single_${monsterId}`,
        name: `${prefix}${monster.name}単体`,
        monsters: [monsterId],
      });
    });

    // Add some multi-monster encounters
    encounters.push(
      {
        id: 'double_slime',
        name: 'スライム複数',
        monsters: ['sea_slime', 'sea_slime'],
      },
      {
        id: 'mixed_basic',
        name: '基本混合',
        monsters: ['sea_slime', 'giant_crab'],
      },
      {
        id: 'mixed_advanced',
        name: '上級混合',
        monsters: ['storm_shark', 'kraken_spawn'],
      }
    );

    console.log('Debug: Generated encounters:', encounters);
    return encounters;
  }

  private refreshDebugScreen(): void {
    if (this.isDebugMode) {
      this.showDebugScreen();
    }
  }

  public isActive(): boolean {
    return this.isDebugMode;
  }
}
