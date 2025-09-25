import {
  GameData,
  ChaptersData,
  ShipsData,
  EventsData,
  GameState,
  GamePhase,
  Chapter,
  ChapterMap,
  MapNode,
  GameEvent,
  EventType,
  EventTypeConfig,
  Ship,
  Weapon,
  Relic,
  Weather,
  PlayerParameters,
  SaveData,
  CombatState,
  Enemy,
} from './types.js';
import { MapManager } from './MapManager.js';
import { DisplayManager } from './DisplayManager.js';
import { SaveManager } from './SaveManager.js';
import { BattleManager } from './BattleManager.js';
import { NavigationManager } from './NavigationManager.js';
import { CombatSystem } from './CombatSystem.js';
import { RelicManager } from './RelicManager.js';
import { WeaponManager } from './WeaponManager.js';
import { WeatherManager } from './WeatherManager.js';
import { DebugManager } from './DebugManager.js';
import { PortManager } from './PortManager.js';

export class MistvoyageGame {
  private gameData: GameData | null = null;
  private chaptersData: ChaptersData | null = null;
  private shipsData: ShipsData | null = null;
  private eventsData: EventsData | null = null;
  // eventConfig is now integrated into chaptersData
  private gameState: GameState;
  private isMapVisible: boolean = false;
  // Vue mode is now always enabled

  // Manager instances
  private mapManager: MapManager;
  private displayManager: DisplayManager;
  private saveManager: SaveManager;
  private battleManager: BattleManager;
  private navigationManager: NavigationManager;
  private combatSystem: CombatSystem;
  private relicManager: RelicManager;
  private weaponManager: WeaponManager;
  private weatherManager: WeatherManager;
  private debugManager: DebugManager;
  private portManager!: PortManager;
  private pendingScrollInfo: any = null;

  constructor() {
    // Initialize WeatherManager first since it's needed during initialization
    this.weatherManager = WeatherManager.getInstance();

    // Initialize game state after WeatherManager is ready
    this.gameState = this.initializeGameState();

    this.mapManager = new MapManager();
    this.displayManager = new DisplayManager(this.mapManager);
    this.saveManager = new SaveManager();
    this.battleManager = new BattleManager();
    this.relicManager = new RelicManager();
    this.debugManager = new DebugManager(this);
    // PortManager will be initialized after WeaponManager is ready
    this.navigationManager = new NavigationManager(
      this.gameState,
      this.displayManager
    );
    this.combatSystem = new CombatSystem(
      this.gameState,
      () => this.updateDisplay(),
      () => this.navigationManager.updateNodeVisibility()
    );
    this.init();
  }

  private initializeGameState(): GameState {
    return {
      currentChapter: 1,
      currentMap: this.generateEmptyMap(),
      currentNodeId: 'start',
      eventsCompleted: 0,
      playerParameters: this.initializePlayerParameters(),
      variables: {},
      visitedNodes: new Set(),
      activeSequentialEvents: [],
      gamePhase: 'ship_selection',
    };
  }

  private generateEmptyMap(): ChapterMap {
    return {
      chapterId: 1,
      nodes: {},
      startNodeId: 'start',
      bossNodeId: 'boss',
      totalLayers: 0,
      eventTypeConfig: {
        monster: { weight: 40, fixedCount: 0 },
        elite_monster: { weight: 15, fixedCount: 0 },
        port: { weight: 20, fixedCount: 0 },
        treasure: { weight: 10, fixedCount: 0 },
        unknown: { weight: 15, fixedCount: 0 },
      },
    };
  }

  private initializePlayerParameters(): PlayerParameters {
    // Default ship until player selects one
    const defaultShip: Ship = {
      id: 'starter_ship',
      name: '初期の船',
      hullMax: 100,
      crewMax: 10,
      baseSpeed: 8,
      storage: 8,
      weaponSlots: 2,
      initialWeapons: ['harpoon'],
      specialRules: [],
    };

    const defaultWeapon: Weapon = {
      id: 'harpoon',
      name: 'ハープーン',
      description: '基本的な漁船用の武器',
      damage: {
        min: 2,
        max: 6,
      },
      handlingReq: 1,
      accuracy: 85,
      cooldown: {
        min: 1500,
        max: 1500,
      },
      critRate: 10,
      critMultiplier: 2.0,
      price: 25,
      rarity: 'common',
      type: 'projectile',
      weaponType: 'piercing',
    };

    return {
      // Public parameters
      ship: defaultShip,
      hull: defaultShip.hullMax,
      maxHull: defaultShip.hullMax,
      food: 20,
      money: 50,
      crew: defaultShip.crewMax,
      sight: 15,
      weather: { value: 0, type: '', displayName: '快晴' }, // Will be properly initialized in init()
      relics: [],
      weapons: [defaultWeapon],
      maxStorage: defaultShip.storage,
      relicManager: undefined, // Will be set during initialization

      // Private parameters
      speed: defaultShip.baseSpeed,
      karma: 0,

      // RPG Combat parameters
      level: 1,
      health: 100,
      maxHealth: 100,
      attack: 20,
      defense: 5,
      experience: 0,
      gold: 50,
    };
  }

  public async initialize(): Promise<void> {
    return this.init();
  }

  private async init(): Promise<void> {
    try {
      await this.loadGameData();
      await this.weatherManager.initialize();

      // Properly initialize weather after WeatherManager is ready
      this.gameState.playerParameters.weather =
        this.weatherManager.initializeWeather();

      await this.battleManager.initialize();
      await this.relicManager.initialize();
      await WeaponManager.initialize();
      this.weaponManager = WeaponManager.getInstance();

      // Set relicManager reference in player parameters
      this.gameState.playerParameters.relicManager = this.relicManager;

      // Initialize PortManager after WeaponManager is ready
      this.portManager = new PortManager(
        this.gameState,
        this.relicManager,
        this.getWeaponManager(),
        () => {
          // Skip updateDisplay to prevent infinite recursion in Vue mode
        },
        () => this.completeEvent()
      );
      if (this.chaptersData) {
        this.portManager.setChaptersData(this.chaptersData);
      }

      this.setupEventListeners();
      this.startGame();
    } catch (error) {
      console.error('ゲーム初期化エラー:', error);
      this.showError('ゲームデータの読み込みに失敗しました');
    }
  }

  private async loadGameData(): Promise<void> {
    const gameResponse = await fetch('data/game.json');
    if (!gameResponse.ok) {
      throw new Error(
        `HTTP ${gameResponse.status}: ${gameResponse.statusText}`
      );
    }
    this.gameData = await gameResponse.json();

    const chaptersResponse = await fetch('data/chapters.json');
    if (!chaptersResponse.ok) {
      throw new Error(
        `HTTP ${chaptersResponse.status}: ${chaptersResponse.statusText}`
      );
    }
    this.chaptersData = await chaptersResponse.json();

    const shipsResponse = await fetch('data/ships.json');
    if (!shipsResponse.ok) {
      throw new Error(
        `HTTP ${shipsResponse.status}: ${shipsResponse.statusText}`
      );
    }
    this.shipsData = await shipsResponse.json();

    const eventsResponse = await fetch('data/events.json');
    if (!eventsResponse.ok) {
      throw new Error(
        `HTTP ${eventsResponse.status}: ${eventsResponse.statusText}`
      );
    }
    this.eventsData = await eventsResponse.json();

    // event_config.json data is now integrated into chapters.json
  }

  private setupEventListeners(): void {
    const saveBtn = document.getElementById('save-btn');
    const loadBtn = document.getElementById('load-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const debugBtn = document.getElementById('debug-btn');

    if (saveBtn) saveBtn.addEventListener('click', () => this.saveGame());
    if (loadBtn) loadBtn.addEventListener('click', () => this.loadGame());
    if (settingsBtn)
      settingsBtn.addEventListener('click', () => this.showSettings());
    if (debugBtn)
      debugBtn.addEventListener('click', () => {
        const debugModal = document.getElementById('debug-modal');
        if (debugModal) {
          debugModal.style.display = 'block';
        }
      });

    // Modal close buttons
    const closeDebugBtn = document.getElementById('close-debug');
    const closeSettingsBtn = document.getElementById('close-settings');

    if (closeDebugBtn) {
      closeDebugBtn.addEventListener('click', () => {
        const debugModal = document.getElementById('debug-modal');
        if (debugModal) {
          debugModal.style.display = 'none';
        }
      });
    }

    if (closeSettingsBtn) {
      closeSettingsBtn.addEventListener('click', () => {
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) {
          settingsModal.style.display = 'none';
        }
      });
    }

    // Close modal when clicking outside of it
    window.addEventListener('click', event => {
      const debugModal = document.getElementById('debug-modal');
      const settingsModal = document.getElementById('settings-modal');

      if (event.target === debugModal) {
        debugModal.style.display = 'none';
      }
      if (event.target === settingsModal) {
        settingsModal.style.display = 'none';
      }
    });

    // Debug panel button event listeners
    this.setupDebugButtonListeners();
  }

  private setupDebugButtonListeners(): void {
    // Basic operations
    const debugGainExp = document.getElementById('debug-gain-exp');
    const debugGainMoney = document.getElementById('debug-gain-money');
    const debugHeal = document.getElementById('debug-heal');
    const debugRestoreFood = document.getElementById('debug-restore-food');

    if (debugGainExp) {
      debugGainExp.replaceWith(debugGainExp.cloneNode(true)); // Remove existing event listeners
      const newDebugGainExp = document.getElementById('debug-gain-exp');
      newDebugGainExp?.addEventListener('click', () => {
        this.gameState.playerParameters.experience += 100;
        this.updateDisplay();
        this.showSaveStatus('経験値+100を追加しました');
      });
    }

    if (debugGainMoney) {
      debugGainMoney.replaceWith(debugGainMoney.cloneNode(true));
      const newDebugGainMoney = document.getElementById('debug-gain-money');
      newDebugGainMoney?.addEventListener('click', () => {
        this.gameState.playerParameters.money += 1000;
        this.updateDisplay();
        this.showSaveStatus('資金+1000を追加しました');
      });
    }

    if (debugHeal) {
      debugHeal.replaceWith(debugHeal.cloneNode(true));
      const newDebugHeal = document.getElementById('debug-heal');
      newDebugHeal?.addEventListener('click', () => {
        this.gameState.playerParameters.hull =
          this.gameState.playerParameters.maxHull;
        this.updateDisplay();
        this.showSaveStatus('船体を完全回復しました');
      });
    }

    if (debugRestoreFood) {
      debugRestoreFood.replaceWith(debugRestoreFood.cloneNode(true));
      const newDebugRestoreFood = document.getElementById('debug-restore-food');
      newDebugRestoreFood?.addEventListener('click', () => {
        this.gameState.playerParameters.food = 100;
        this.updateDisplay();
        this.showSaveStatus('食料を満タンにしました');
      });
    }

    const debugLoseCrew = document.getElementById('debug-lose-crew');
    if (debugLoseCrew) {
      debugLoseCrew.replaceWith(debugLoseCrew.cloneNode(true));
      const newDebugLoseCrew = document.getElementById('debug-lose-crew');
      newDebugLoseCrew?.addEventListener('click', () => {
        this.gameState.playerParameters.crew = 0;
        this.gameState.gamePhase = 'game_over';
        this.gameState.gameOverReason = 'crew_lost';
        this.updateDisplay();
        this.showSaveStatus('乗組員全滅 - ゲームオーバー');
      });
    }

    const debugSetLowFood = document.getElementById('debug-set-low-food');
    if (debugSetLowFood) {
      debugSetLowFood.replaceWith(debugSetLowFood.cloneNode(true));
      const newDebugSetLowFood = document.getElementById('debug-set-low-food');
      newDebugSetLowFood?.addEventListener('click', () => {
        this.gameState.playerParameters.food = 0.5;
        this.updateDisplay();
        this.showSaveStatus('食料を0.5に設定しました（移動で食料不足発生）');
      });
    }

    // Weapons & Items
    const debugAddWeapon = document.getElementById('debug-add-weapon');
    const debugAddRelic = document.getElementById('debug-add-relic');
    const debugClearWeapons = document.getElementById('debug-clear-weapons');
    const debugClearRelics = document.getElementById('debug-clear-relics');

    if (debugAddWeapon) {
      debugAddWeapon.replaceWith(debugAddWeapon.cloneNode(true)); // Remove existing event listeners
      const newDebugAddWeapon = document.getElementById('debug-add-weapon');
      newDebugAddWeapon?.addEventListener('click', () => {
        const weaponTypeSelect = document.getElementById(
          'weapon-type-select'
        ) as HTMLSelectElement;
        const weaponRaritySelect = document.getElementById(
          'weapon-rarity-select'
        ) as HTMLSelectElement;

        if (weaponTypeSelect && weaponRaritySelect) {
          const selectedType = weaponTypeSelect.value;
          const selectedRarity = weaponRaritySelect.value as any; // WeaponRarity type

          try {
            const newWeapon = this.weaponManager.generateWeapon(
              selectedType,
              selectedRarity
            );
            this.gameState.playerParameters.weapons.push(newWeapon);
            this.updateDisplay();
            this.showSaveStatus(
              `武器「${newWeapon.name}」(${selectedRarity})を追加しました`
            );
          } catch (error) {
            this.showSaveStatus(`武器生成エラー: ${error}`, true);
          }
        } else {
          this.showSaveStatus('武器選択UIが見つかりません', true);
        }
      });
    }

    if (debugAddRelic) {
      debugAddRelic.replaceWith(debugAddRelic.cloneNode(true));
      const newDebugAddRelic = document.getElementById('debug-add-relic');
      newDebugAddRelic?.addEventListener('click', () => {
        const relicRaritySelect = document.getElementById(
          'relic-rarity-select'
        ) as HTMLSelectElement;

        if (relicRaritySelect) {
          const selectedRarity = relicRaritySelect.value as any; // RelicRarity type

          try {
            const newRelic = this.relicManager.generateRelic(selectedRarity);
            this.gameState.playerParameters.relics.push(newRelic);
            this.updateDisplay();
            this.showSaveStatus(
              `レリック「${newRelic.name}」(${selectedRarity})を追加しました`
            );
          } catch (error) {
            this.showSaveStatus(`レリック生成エラー: ${error}`, true);
          }
        } else {
          this.showSaveStatus('レリック選択UIが見つかりません', true);
        }
      });
    }

    if (debugClearWeapons) {
      debugClearWeapons.replaceWith(debugClearWeapons.cloneNode(true));
      const newDebugClearWeapons = document.getElementById(
        'debug-clear-weapons'
      );
      newDebugClearWeapons?.addEventListener('click', () => {
        this.gameState.playerParameters.weapons = [];
        this.updateDisplay();
        this.showSaveStatus('すべての武器を削除しました');
      });
    }

    if (debugClearRelics) {
      debugClearRelics.replaceWith(debugClearRelics.cloneNode(true));
      const newDebugClearRelics = document.getElementById('debug-clear-relics');
      newDebugClearRelics?.addEventListener('click', () => {
        this.gameState.playerParameters.relics = [];
        this.updateDisplay();
        this.showSaveStatus('すべてのレリックを削除しました');
      });
    }

    // Combat related
    const debugStartBattle = document.getElementById('debug-start-battle');
    const debugWinBattle = document.getElementById('debug-win-battle');
    const debugToggleGodMode = document.getElementById('debug-toggle-god-mode');

    if (debugStartBattle) {
      debugStartBattle.replaceWith(debugStartBattle.cloneNode(true));
      const newDebugStartBattle = document.getElementById('debug-start-battle');
      newDebugStartBattle?.addEventListener('click', () => {
        const enemySelect = document.getElementById(
          'enemy-select'
        ) as HTMLSelectElement;

        if (enemySelect) {
          const selectedEnemy = enemySelect.value;
          try {
            this.startDebugBattle(selectedEnemy);
            this.showSaveStatus(
              `「${enemySelect.options[enemySelect.selectedIndex].text}」との戦闘を開始しました`
            );
          } catch (error) {
            this.showSaveStatus(`戦闘開始エラー: ${error}`, true);
          }
        } else {
          this.showSaveStatus('敵選択UIが見つかりません', true);
        }
      });
    }

    if (debugWinBattle) {
      debugWinBattle.replaceWith(debugWinBattle.cloneNode(true));
      const newDebugWinBattle = document.getElementById('debug-win-battle');
      newDebugWinBattle?.addEventListener('click', () => {
        if (this.gameState.battleState?.isActive) {
          this.gameState.battleState.isActive = false;
          this.gameState.battleState.result = 'victory';
          this.gameState.gamePhase = 'battle_result';
          this.updateDisplay();
          this.showSaveStatus('戦闘に勝利しました');
        } else {
          this.showSaveStatus('現在戦闘中ではありません', true);
        }
      });
    }

    if (debugToggleGodMode) {
      debugToggleGodMode.replaceWith(debugToggleGodMode.cloneNode(true));
      const newDebugToggleGodMode = document.getElementById(
        'debug-toggle-god-mode'
      );
      newDebugToggleGodMode?.addEventListener('click', () => {
        // Toggle god mode (implement as needed)
        this.showSaveStatus('無敵モード機能は未実装です');
      });
    }

    // Information display
    const debugShowState = document.getElementById('debug-show-state');
    const debugShowWeapons = document.getElementById('debug-show-weapons');
    const debugShowRelics = document.getElementById('debug-show-relics');

    if (debugShowState) {
      debugShowState.replaceWith(debugShowState.cloneNode(true));
      const newDebugShowState = document.getElementById('debug-show-state');
      newDebugShowState?.addEventListener('click', () => {
        this.showSaveStatus('ゲーム状態をコンソールに出力しました');
      });
    }

    if (debugShowWeapons) {
      debugShowWeapons.replaceWith(debugShowWeapons.cloneNode(true));
      const newDebugShowWeapons = document.getElementById('debug-show-weapons');
      newDebugShowWeapons?.addEventListener('click', () => {
        this.showSaveStatus('武器一覧をコンソールに出力しました');
      });
    }

    if (debugShowRelics) {
      debugShowRelics.replaceWith(debugShowRelics.cloneNode(true));
      const newDebugShowRelics = document.getElementById('debug-show-relics');
      newDebugShowRelics?.addEventListener('click', () => {
        this.showSaveStatus('レリック一覧をコンソールに出力しました');
      });
    }

    // Chapter & Progress
    const debugNextChapter = document.getElementById('debug-next-chapter');
    const debugCompleteChapter = document.getElementById(
      'debug-complete-chapter'
    );

    if (debugNextChapter) {
      debugNextChapter.replaceWith(debugNextChapter.cloneNode(true));
      const newDebugNextChapter = document.getElementById('debug-next-chapter');
      newDebugNextChapter?.addEventListener('click', () => {
        if (this.gameState.currentChapter < 3) {
          this.gameState.currentChapter++;
          this.gameState.eventsCompleted = 0;
          this.gameState.visitedNodes.clear();
          this.gameState.currentNodeId = 'start';
          this.gameState.gamePhase = 'chapter_start';
          this.updateDisplay();
          this.showSaveStatus(
            `第${this.gameState.currentChapter}章に進みました`
          );
        } else {
          this.showSaveStatus('最終章です', true);
        }
      });
    }

    if (debugCompleteChapter) {
      debugCompleteChapter.replaceWith(debugCompleteChapter.cloneNode(true));
      const newDebugCompleteChapter = document.getElementById(
        'debug-complete-chapter'
      );
      newDebugCompleteChapter?.addEventListener('click', () => {
        const requiredEvents =
          this.chaptersData.chapters.find(
            c => c.id === this.gameState.currentChapter
          )?.requiredEvents || 3;
        this.gameState.eventsCompleted = requiredEvents;
        this.updateDisplay();
        this.showSaveStatus('現在章を完了状態にしました');
      });
    }
  }

  private startDebugBattle(enemyId: string): void {
    try {
      // Close debug modal if open
      const debugModal = document.getElementById('debug-modal');
      if (debugModal) {
        debugModal.style.display = 'none';
      }

      // Use BattleManager for proper auto-battle system
      this.battleManager.initiateDebugBattle(this.gameState, enemyId);

      // Start the battle loop
      this.startBattleUpdateLoop();

      // Update display to show battle screen
      this.updateDisplay();
    } catch (error) {
      throw error;
    }
  }

  private showSaveStatus(message: string, isError: boolean = false): void {
    // Display status message to user
    if ((window as any).gameInstance?.showVueStatus) {
      (window as any).gameInstance.showVueStatus(message, isError);
    } else {
      // Fallback to DisplayManager if Vue status not available
      if (this.displayManager) {
        this.displayManager.showSaveStatus(message, isError);
      } else {
        // Fallback message display - no console logging needed
      }
    }
  }

  private startGame(): void {
    this.updateDisplay();
  }

  // ==================== GAME FLOW METHODS ====================

  private updateDisplay(): void {
    // Check for crew-based game over before updating display
    if (
      this.gameState.playerParameters.crew === 0 &&
      this.gameState.gamePhase !== 'game_over'
    ) {
      this.gameState.gamePhase = 'game_over';
      this.gameState.gameOverReason = 'crew_lost';
    }

    this.updateParameterDisplay();

    // Update cooldown display during combat
    if (
      this.gameState.gamePhase === 'combat' &&
      this.gameState.battleState?.isActive
    ) {
      const cooldownData = this.battleManager.getCooldownData(this.gameState);
      this.displayManager.updateCooldownDisplay(cooldownData);
    } else {
      this.displayManager.hideCooldownDisplay();
    }

    switch (this.gameState.gamePhase) {
      case 'ship_selection':
        this.showShipSelection();
        break;
      case 'chapter_start':
        this.showChapterStart();
        break;
      case 'navigation':
        this.showNavigation();
        break;
      case 'event':
        this.showEvent();
        break;
      case 'combat':
        this.showCombat();
        break;
      case 'game_over':
        this.showGameOver();
        break;
      case 'victory':
        this.showVictory();
        break;
      case 'battle_result':
        this.showBattleResult();
        break;
      case 'boss_reward':
        this.showBossReward();
        break;
      default:
        console.error('Unknown game phase:', this.gameState.gamePhase);
    }
  }

  private showShipSelection(): void {
    // Ship selection is handled by Vue component
    return;
  }

  private selectShip(ship: Ship): void {
    this.gameState.playerParameters.ship = ship;
    this.gameState.playerParameters.hull = ship.hullMax;
    this.gameState.playerParameters.maxHull = ship.hullMax;
    this.gameState.playerParameters.crew = ship.crewMax;
    this.gameState.playerParameters.speed = ship.baseSpeed;
    this.gameState.playerParameters.maxStorage = ship.storage;

    // Initialize weapons with random generation
    const weaponManager = WeaponManager.getInstance();
    this.gameState.playerParameters.weapons = ship.initialWeapons.map(
      weaponId => {
        return weaponManager.generateWeapon(weaponId, 'common');
      }
    );

    this.gameState.gamePhase = 'chapter_start';
    this.generateChapterMap();
    this.updateDisplay();
  }

  private showChapterStart(): void {
    // Chapter start is handled by Vue component
    return;
  }

  private showNavigation(): void {
    // Navigation is handled by Vue components
    return;
  }

  private generateMapDisplay(sightRange: number): string {
    return this.displayManager.generateMapDisplay(this.gameState, sightRange);
  }

  private showEvent(): void {
    // Get current node and display appropriate event
    const currentNode =
      this.gameState.currentMap.nodes[this.gameState.currentNodeId];
    if (currentNode && currentNode.eventType) {
      // Handle events with Vue components
      switch (currentNode.eventType) {
        case 'treasure':
          this.handleTreasureEvent();
          break;
        case 'unknown':
          this.handleUnknownEvent();
          break;
        // Port and temple events are handled by Vue components
        // Other events should also be handled by Vue or skipped
        default:
          break;
      }
      return;
    }
  }

  private showCompletedTreasureEvent(): void {
    // Completed treasure events are handled by Vue components
    return;
  }

  private showCombat(): void {
    // Combat is handled by BattleScreen Vue component
    return;
  }

  private displayBattleScreen(
    content: HTMLElement,
    choicesContainer: HTMLElement
  ): void {
    // Battle screen is now handled by Vue components
    // This method is kept for backward compatibility but should not be used
    console.warn(
      'displayBattleScreen called - battle display should be handled by Vue components'
    );
  }

  // formatBattleLog method removed - battle log formatting is now handled by Vue components

  private showBattleResult(): void {
    // Battle result is now handled by BattleResultScreen.vue component
    // This method is kept for compatibility but does nothing
    return;
  }

  private displayBattleResultScreen(
    content: HTMLElement,
    choicesContainer: HTMLElement
  ): void {
    // Battle result screen is now handled by Vue components
    // This method is kept for backward compatibility but should not be used
    console.warn(
      'displayBattleResultScreen called - battle result display should be handled by Vue components'
    );
  }

  // calculateDisplayGoldReward method removed - gold calculations are now handled by Vue components

  private completeBattleAndContinue(): void {
    // Use BattleManager to complete battle
    this.battleManager.completeBattle(this.gameState);

    // Complete the event
    this.gameState.eventsCompleted++;

    // Update node visibility
    this.navigationManager.updateNodeVisibility();

    // Update display
    this.updateDisplay();
  }

  public showWeaponDetail(weapon: Weapon): void {
    // Weapon details are now handled by Vue modal components
    // Emit a custom event for Vue components to handle
    const event = new CustomEvent('showWeaponDetail', {
      detail: { weapon },
    });
    window.dispatchEvent(event);
  }

  public showRelicDetail(relic: Relic): void {
    // Relic details are now handled by Vue modal components
    // Emit a custom event for Vue components to handle
    const event = new CustomEvent('showRelicDetail', {
      detail: { relic },
    });
    window.dispatchEvent(event);
  }

  public closeDetailView(): void {
    // Return to previous display
    this.updateDisplay();
  }

  private showGameOver(): void {
    // Game over is handled by Vue component
    return;
  }

  private showVictory(): void {
    // Victory is handled by Vue component
    return;
  }

  // ==================== MAP GENERATION ====================

  private generateChapterMap(): void {
    const chapter = this.chaptersData?.chapters.find(
      c => c.id === this.gameState.currentChapter
    );
    if (!chapter) return;

    // Reset map scroll position before generating new map
    this.gameState.mapScrollPosition = 0;

    this.gameState.currentMap = this.mapManager.generateChapterMap(
      chapter,
      chapter, // Use chapter data which now includes eventTypes
      this.gameState.currentChapter
    );

    // Update node visibility using NavigationManager
    this.navigationManager.updateNodeVisibility();
  }

  // Node visibility methods moved to NavigationManager

  // Event type naming moved to NavigationManager

  public navigateToNode(nodeId: string): void {
    const success = this.navigationManager.navigateToNode(nodeId, () =>
      this.updateDisplay()
    );

    if (success) {
      // Process food consumption before other effects
      this.processFoodConsumption();

      // Progress weather when moving to a new node
      this.gameState.playerParameters.weather =
        this.weatherManager.progressWeather(
          this.gameState.playerParameters.weather
        );

      const node = this.gameState.currentMap.nodes[nodeId];
      if (node && node.eventType) {
        // Process event based on type
        if (
          node.eventType === 'monster' ||
          node.eventType === 'elite_monster'
        ) {
          this.handleMonsterEvent();
          return; // Return early as battle will handle state changes
        } else if (node.eventType === 'boss') {
          this.handleBossEvent();
          return; // Return early as boss battle will handle state changes
        } else if (node.eventType === 'treasure') {
          // Treasure events need special handling with event phase
          this.gameState.gamePhase = 'event';
          this.processEvent(node.eventType);
          // Don't complete the event immediately - let player make choice
        } else if (node.eventType === 'port') {
          // Port events need special handling like treasure events
          this.gameState.gamePhase = 'event';
          this.processEvent(node.eventType);
          // Don't complete the event immediately - let player use services
        } else if (node.eventType === 'temple') {
          // Temple events need special handling like treasure and port events
          this.gameState.gamePhase = 'event';
          this.processEvent(node.eventType);
          // Don't complete the event immediately - let player use temple
        } else if (node.eventType === 'unknown') {
          // Unknown events need special handling like treasure, port, and temple events
          this.gameState.gamePhase = 'event';
          this.processEvent(node.eventType);
          // Don't complete the event immediately - let player see what it becomes
        } else {
          // Process other event types here
          this.processEvent(node.eventType);

          // Complete the event and return to navigation
          this.gameState.eventsCompleted++;

          // Check if chapter is complete
          const chapter = this.chaptersData?.chapters.find(
            c => c.id === this.gameState.currentChapter
          );
          if (
            chapter &&
            this.gameState.eventsCompleted >= chapter.requiredEvents
          ) {
            // Enable boss node
            const bossNode = this.gameState.currentMap.nodes['boss'];
            if (bossNode) {
              bossNode.isAccessible = true;
              bossNode.isVisible = true;
            }
          }

          // Return to navigation phase after processing non-combat event
          this.gameState.gamePhase = 'navigation';

          // Update node visibility after event completion
          this.navigationManager.updateNodeVisibility();

          this.updateDisplay();
        }
      } else {
        // No event - just update display
        this.updateDisplay();
      }
    }
  }

  private scrollToNode(nodeId: string): void {
    this.displayManager.scrollToNode(nodeId, this.gameState);
  }

  // ==================== EVENT PROCESSING ====================

  private handleMonsterEvent(): void {
    try {
      // Use BattleManager for proper auto-battle system
      this.battleManager.initiateBattle(this.gameState, this.chaptersData);

      // Start the battle loop
      this.startBattleUpdateLoop();

      // Update display to show battle screen
      this.updateDisplay();
    } catch (error) {
      console.error('Failed to start battle:', error);
      // Fallback to normal event processing
      this.processEvent('monster');
    }
  }

  private startBattleUpdateLoop(): void {
    const battleUpdate = () => {
      if (this.gameState.battleState?.isActive) {
        this.battleManager.updateBattle(this.gameState, this.chaptersData);
        this.updateDisplay();
        setTimeout(battleUpdate, 100); // Update every 100ms for smooth auto-battle
      }
    };
    battleUpdate();
  }

  private processEvent(eventType: EventType): void {
    console.log(`Processing event: ${eventType}`);
    switch (eventType) {
      case 'treasure':
        this.handleTreasureEvent();
        break;
      case 'port':
        this.portManager.handlePortEvent();
        break;
      case 'temple':
        this.handleTempleEvent();
        break;
      case 'boss':
        this.handleBossEvent();
        break;
      case 'unknown':
        this.handleUnknownEvent();
        break;
      default:
        this.handleGenericEvent(eventType);
        break;
    }
  }

  private handleTreasureEvent(): void {
    this.setupTreasureEventForVue();
    return;
  }

  private selectRelic(relic: Relic): void {
    // Check if player has storage space
    const currentRelics = this.gameState.playerParameters.relics.length;
    const maxStorage = this.gameState.playerParameters.maxStorage;

    if (currentRelics >= maxStorage) {
      // Storage is full - trigger inventory management
      this.gameState.inventoryManagement = {
        type: 'relic',
        newItem: relic,
        context: 'treasure',
      };
      this.updateDisplay();
      return;
    }

    // Add relic to player inventory
    this.gameState.playerParameters.relics.push(relic);

    // Apply relic effects
    this.applyRelicEffects(relic);

    // Mark the current node's event as completed to prevent re-triggering
    const currentNode =
      this.gameState.currentMap.nodes[this.gameState.currentNodeId];
    if (currentNode) {
      currentNode.eventType = 'completed_treasure';
    }

    // Complete the event directly and return to navigation
    this.completeEvent();
    return;
  }

  private setupTreasureEventForVue(): void {
    // Get chapter-specific rarity weights
    const chapter = this.chaptersData?.chapters.find(
      c => c.id === this.gameState.currentChapter
    );
    const treasureConfig = chapter?.eventTypes?.treasure;
    const customRarityWeights = treasureConfig?.rarityWeights;

    // Generate 3 random relics using chapter-specific weights
    const relics = this.relicManager.generateMultipleRelics(
      3,
      customRarityWeights
    );

    // Set the treasureRelics state for Vue
    this.gameState.treasureRelics = relics;
  }

  public selectTreasureRelicFromVue(relicIndex: number): void {
    if (
      !this.gameState.treasureRelics ||
      relicIndex < 0 ||
      relicIndex >= this.gameState.treasureRelics.length
    ) {
      return;
    }

    const relic = this.gameState.treasureRelics[relicIndex];
    this.selectRelic(relic);

    // Clear treasure relics
    this.gameState.treasureRelics = null;
  }

  public skipTreasureFromVue(): void {
    this.completeEvent();
    this.gameState.treasureRelics = null;
  }

  private setupUnknownEventForVue(): void {
    const currentNode =
      this.gameState.currentMap.nodes[this.gameState.currentNodeId];

    // Check if we already determined what this unknown event is
    let selectedEventType: EventType;
    if (currentNode.resolvedEventType) {
      selectedEventType = currentNode.resolvedEventType;
    } else {
      // First time determining what this unknown event is
      // Get chapter-specific configuration for ??? event probabilities
      const chapter = this.chaptersData?.chapters.find(
        c => c.id === this.gameState.currentChapter
      );
      const unknownConfig = chapter?.eventTypes?.unknown;

      // Define default probabilities if not specified in chapter config
      const defaultProbabilities = {
        treasure: 20,
        port: 20,
        temple: 20,
        monster: 40, // monster appears twice in the spec, so double weight
      };

      // Use chapter-specific probabilities if available, otherwise use defaults
      const probabilities =
        unknownConfig?.eventProbabilities || defaultProbabilities;

      // Create weighted array for random selection
      const weightedEvents: EventType[] = [];
      Object.entries(probabilities).forEach(([eventType, weight]) => {
        for (let i = 0; i < weight; i++) {
          weightedEvents.push(eventType as EventType);
        }
      });

      // Randomly select an event type
      const randomIndex = Math.floor(Math.random() * weightedEvents.length);
      selectedEventType = weightedEvents[randomIndex];

      // Store the resolved event type so it doesn't change on subsequent calls
      currentNode.resolvedEventType = selectedEventType;
    }

    // Set the unknown event state for Vue
    this.gameState.unknownEvent = {
      resolvedEventType: selectedEventType,
      eventTypeName: this.getSelectedEventTypeName(selectedEventType),
    };
  }

  public continueUnknownEventFromVue(eventType: EventType): void {
    // Change the node's eventType to the resolved type to prevent re-triggering unknown event
    const currentNode =
      this.gameState.currentMap.nodes[this.gameState.currentNodeId];
    if (currentNode) {
      currentNode.eventType = eventType;
    }

    // Clear unknown event state
    this.gameState.unknownEvent = null;

    // Update display to reflect the new event type on the map
    this.updateDisplay();

    // For treasure, port, and temple events, we need to keep the event phase
    // For monster events, they handle their own transitions
    if (eventType === 'monster' || eventType === 'elite_monster') {
      this.handleMonsterEvent();
    } else if (eventType === 'boss') {
      this.handleBossEvent();
    } else {
      // For treasure, port, temple - stay in event phase
      this.processEvent(eventType);
    }
  }

  private calculateMaxStorage(): number {
    let maxStorage = this.gameState.playerParameters.ship.storage;

    // Add storage bonuses from relics
    this.gameState.playerParameters.relics.forEach(relic => {
      relic.effects.forEach(effect => {
        if (effect.type === 'storage_increase') {
          maxStorage += effect.value;
        }
      });
    });

    return maxStorage;
  }

  private getRarityDisplayName(rarity: string): string {
    const rarityNames: { [key: string]: string } = {
      common: 'コモン',
      uncommon: 'アンコモン',
      rare: 'レア',
      epic: 'エピック',
      legendary: 'レジェンダリ',
    };
    return rarityNames[rarity] || rarity;
  }

  // Port management is now handled by PortManager
  public getPortManager(): PortManager {
    return this.portManager;
  }

  public getWeatherManager(): WeatherManager {
    return this.weatherManager;
  }

  // Temple event methods
  public offerPrayer(): void {
    // Reset weather to clear state
    this.gameState.playerParameters.weather =
      this.weatherManager.initializeWeather();
  }

  private handleTempleEvent(): void {
    // Temple events are handled by Vue components, just set the phase
    this.gameState.gamePhase = 'event';
    // Temple events are handled by Vue components
  }

  private handleBossEvent(): void {
    const storyElement = document.getElementById('story-text');
    if (storyElement) {
      storyElement.textContent = 'ボスとの戦闘が始まります！';
    }

    try {
      // Use BattleManager for boss battle system
      this.battleManager.initiateBossBattle(this.gameState, this.chaptersData);
      // Start the battle loop
      this.startBattleUpdateLoop();
      // Update display to show battle screen
      this.updateDisplay();
    } catch (error) {
      console.error('Failed to start boss battle:', error);
      // Fallback to generic event processing
      this.handleGenericEvent('boss');
    }
  }

  private handleUnknownEvent(): void {
    this.setupUnknownEventForVue();
    return;
  }

  private getSelectedEventTypeName(eventType: EventType): string {
    switch (eventType) {
      case 'treasure':
        return '宝箱';
      case 'port':
        return '港';
      case 'temple':
        return '寺院';
      case 'monster':
        return 'モンスター遭遇';
      default:
        return 'イベント';
    }
  }

  private handleGenericEvent(eventType: EventType): void {
    const storyElement = document.getElementById('story-text');
    if (storyElement) {
      const eventMessages: { [key: string]: string } = {
        unknown: '何かが起こりました...',
      };
      storyElement.textContent =
        eventMessages[eventType] || '謎のイベントが発生しました。';
    }
  }

  private completeEvent(): void {
    this.gameState.eventsCompleted++;

    // Check if chapter is complete
    const chapter = this.chaptersData?.chapters.find(
      c => c.id === this.gameState.currentChapter
    );
    if (chapter && this.gameState.eventsCompleted >= chapter.requiredEvents) {
      // Enable boss node
      const bossNode = this.gameState.currentMap.nodes['boss'];
      if (bossNode) {
        bossNode.isAccessible = true;
        bossNode.isVisible = true;
      }
    }

    // Return to navigation phase
    this.gameState.gamePhase = 'navigation';

    // Update node visibility after event completion
    this.navigationManager.updateNodeVisibility();

    this.updateDisplay();
  }

  private applyRelicEffects(relic: Relic): void {
    relic.effects.forEach(effect => {
      switch (effect.type) {
        case 'hull_increase':
          this.gameState.playerParameters.hull += effect.value;
          this.gameState.playerParameters.maxHull += effect.value;
          this.gameState.playerParameters.ship.hullMax += effect.value;
          break;
        case 'speed_increase':
          this.gameState.playerParameters.speed += effect.value;
          break;
        case 'sight_increase':
          this.gameState.playerParameters.sight += effect.value;
          break;
        case 'crew_increase':
          this.gameState.playerParameters.crew += effect.value;
          this.gameState.playerParameters.ship.crewMax += effect.value;
          break;
        case 'weapon_slot_increase':
          this.gameState.playerParameters.ship.weaponSlots += effect.value;
          break;
        case 'weapon_relic':
          if (effect.weapon) {
            this.gameState.playerParameters.weapons.push(effect.weapon);
          }
          break;
        case 'storage_increase':
          this.gameState.playerParameters.maxStorage += effect.value;
          break;
        case 'gold_bonus':
          // Applied when calculating gold rewards
          break;
        default:
          break;
      }
    });
  }

  // Battle loop moved to CombatSystem

  private handleBattleVictory(): void {
    // Complete the event
    this.gameState.eventsCompleted++;

    // Check if chapter is complete
    const chapter = this.chaptersData?.chapters.find(
      c => c.id === this.gameState.currentChapter
    );
    if (chapter && this.gameState.eventsCompleted >= chapter.requiredEvents) {
      // Enable boss node
      const bossNode = this.gameState.currentMap.nodes['boss'];
      if (bossNode) {
        bossNode.isAccessible = true;
        bossNode.isVisible = true;
      }
    }

    // Clean up battle and return to navigation
    this.battleManager.completeBattle(this.gameState);
    this.updateDisplay();
  }

  private handleBattleDefeat(): void {
    // Game over
    this.gameState.gamePhase = 'game_over';
    this.updateDisplay();
  }

  // Battle display methods moved to CombatSystem

  public continueBattle(): void {
    this.combatSystem.continueBattle();
  }

  public restart(): void {
    // Reset game state to initial state
    this.gameState = this.initializeGameState();
    this.startGame();
  }

  // ==================== PARAMETER DISPLAY ====================

  private updateParameterDisplay(): void {
    this.displayManager.updateParameterDisplay(
      this.gameState,
      this.gameData,
      this.chaptersData
    );
  }

  // ==================== SAVE/LOAD SYSTEM ====================

  private saveGame(): void {
    const result = this.saveManager.saveGame(this.gameState);
    this.displayManager.showSaveStatus(result.message, !result.success);
  }

  private loadGame(): void {
    const result = this.saveManager.loadGame();
    if (result.success && result.gameState) {
      this.gameState = result.gameState;
      this.updateDisplay();
    }
    this.displayManager.showSaveStatus(result.message, !result.success);
  }

  private showSettings(): void {
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) {
      settingsModal.style.display = 'block';
    }
  }

  private showError(message: string): void {
    this.displayManager.showError(message);
  }

  private processFoodConsumption(): void {
    const crew = this.gameState.playerParameters.crew;
    const requiredFood = Math.round((crew * 0.1 + 0.5) * 10) / 10; // Round to 1 decimal place

    if (this.gameState.playerParameters.food >= requiredFood) {
      // Sufficient food - consume normally
      this.gameState.playerParameters.food -= requiredFood;
      this.gameState.playerParameters.food =
        Math.round(this.gameState.playerParameters.food * 10) / 10;
    } else {
      // Insufficient food - risk crew loss
      const shortfall = requiredFood - this.gameState.playerParameters.food;
      const crewLossChance = shortfall * 10; // 10% per missing food unit

      // Consume all remaining food
      this.gameState.playerParameters.food = 0;

      // Check for crew loss
      if (Math.random() * 100 < crewLossChance && crew > 0) {
        this.gameState.playerParameters.crew--;

        // Show crew loss notification
        this.showCrewLossModal(shortfall, crewLossChance);

        // Check for game over due to crew loss
        if (this.gameState.playerParameters.crew === 0) {
          this.gameState.gamePhase = 'game_over';
          this.gameState.gameOverReason = 'crew_lost';
          return;
        }
      }
    }
  }

  private showCrewLossModal(shortfall: number, chance: number): void {
    const message = `食料不足により乗組員を1人失いました。\n不足した食料: ${shortfall.toFixed(1)}\n乗組員損失確率: ${chance.toFixed(1)}%`;

    // Use Vue status display if available
    if ((window as any).gameInstance?.showVueStatus) {
      (window as any).gameInstance.showVueStatus(message, true);
    } else {
      // Fallback to DisplayManager
      this.displayManager.showSaveStatus(message, true);
    }
  }

  // Public getters
  public getDebugManager(): DebugManager {
    return this.debugManager;
  }

  public getGameState(): GameState {
    return this.gameState;
  }

  // Vue mode is now always enabled - method removed

  public selectShipFromVue(ship: Ship): void {
    this.selectShip(ship);
  }

  public startVoyageFromVue(): void {
    this.gameState.gamePhase = 'navigation';
    this.updateDisplay();
  }

  public getCombatSystem(): CombatSystem {
    return this.combatSystem;
  }

  public continueBattleFromUI(): void {
    this.combatSystem.continueBattle();
  }

  // Public getters for managers (for debug access)
  public getRelicManager(): RelicManager {
    return this.relicManager;
  }

  public getWeaponManager(): WeaponManager {
    return this.weaponManager;
  }

  public getBattleManager(): BattleManager {
    return this.battleManager;
  }

  public getShipsData(): any {
    return this.shipsData;
  }

  private showBossReward(): void {
    // Generate boss rewards using BattleManager
    const rewards = this.battleManager.generateBossRewards(
      this.gameState,
      this.chaptersData
    );

    // Generate actual relics using RelicManager
    const relicManager = this.getRelicManager();
    const actualRelics = rewards.map(reward =>
      relicManager.generateRelic(reward.rarity)
    );

    // Set boss reward relics for Vue component to display
    this.gameState.bossRewardRelics = actualRelics;
  }

  public selectBossRewardFromVue(relicIndex: number): void {
    if (
      !this.gameState.bossRewardRelics ||
      relicIndex < 0 ||
      relicIndex >= this.gameState.bossRewardRelics.length
    ) {
      return;
    }

    const selectedRelic = this.gameState.bossRewardRelics[relicIndex];

    // Check if player has storage space
    const currentRelics = this.gameState.playerParameters.relics.length;
    const maxStorage = this.gameState.playerParameters.maxStorage;

    if (currentRelics >= maxStorage) {
      // Storage is full - trigger inventory management
      this.gameState.inventoryManagement = {
        type: 'relic',
        newItem: selectedRelic,
        context: 'boss_reward',
      };
      // Don't clear bossRewardRelics here - let acquireNewItem handle the progression
      this.updateDisplay();
      return;
    }

    // Add selected relic to player inventory
    this.gameState.playerParameters.relics.push(selectedRelic);

    // Progress to next chapter or end game
    this.gameState.currentChapter++;

    if (this.gameState.currentChapter > this.chaptersData!.chapters.length) {
      // Game completed
      this.gameState.gamePhase = 'victory';
    } else {
      // Move to next chapter

      // Reset chapter progress
      this.gameState.eventsCompleted = 0;
      this.gameState.visitedNodes.clear();

      // Reset map scroll position for new chapter
      this.gameState.mapScrollPosition = 0;

      this.generateChapterMap();

      // Set starting node for new chapter
      this.gameState.currentNodeId = this.gameState.currentMap.startNodeId;

      // Update node visibility for new chapter
      this.navigationManager.updateNodeVisibility();

      // Go directly to navigation phase (skip chapter_start screen)
      this.gameState.gamePhase = 'navigation';
    }

    // Clean up battle state and boss reward state
    this.gameState.battleState = undefined;
    this.gameState.bossRewardRelics = null;

    this.updateDisplay();

    // Additional scroll position reset is handled by Vue components
  }

  // Inventory Management Methods
  public discardItemFromInventory(index: number): void {
    if (!this.gameState.inventoryManagement) return;

    const { type } = this.gameState.inventoryManagement;

    if (type === 'weapon') {
      this.gameState.playerParameters.weapons.splice(index, 1);
    } else if (type === 'relic') {
      this.gameState.playerParameters.relics.splice(index, 1);
    }

    this.updateDisplay();
  }

  public acquireNewItem(): void {
    if (!this.gameState.inventoryManagement) return;

    const { type, newItem, context, shopIndex } =
      this.gameState.inventoryManagement;

    if (type === 'weapon') {
      const weapon = newItem as Weapon;

      if (context === 'shop') {
        // Purchase weapon from shop
        this.gameState.playerParameters.money -= weapon.price;
      }

      this.gameState.playerParameters.weapons.push(weapon);
    } else if (type === 'relic') {
      const relic = newItem as Relic;

      if (context === 'shop') {
        // Purchase relic from shop
        const price = relic.price || 50;
        this.gameState.playerParameters.money -= price;
      }

      this.gameState.playerParameters.relics.push(relic);

      // Apply relic effects
      this.applyRelicEffects(relic);

      if (context === 'treasure') {
        // Complete treasure event
        const currentNode =
          this.gameState.currentMap.nodes[this.gameState.currentNodeId];
        if (currentNode) {
          currentNode.eventType = 'completed_treasure';
        }
        this.completeEvent();
      } else if (context === 'boss_reward') {
        // Complete boss reward handling
        this.gameState.currentChapter++;

        if (
          this.gameState.currentChapter > this.chaptersData!.chapters.length
        ) {
          this.gameState.gamePhase = 'victory';
        } else {
          // Move to next chapter
          // Reset chapter progress
          this.gameState.eventsCompleted = 0;
          this.gameState.visitedNodes.clear();

          // Reset map scroll position for new chapter
          this.gameState.mapScrollPosition = 0;

          this.generateChapterMap();

          // Set starting node for new chapter
          this.gameState.currentNodeId = this.gameState.currentMap.startNodeId;

          // Update node visibility for new chapter
          this.navigationManager.updateNodeVisibility();

          // Go directly to navigation phase (skip chapter_start screen)
          this.gameState.gamePhase = 'navigation';
        }

        this.gameState.battleState = undefined;
        this.gameState.bossRewardRelics = null;
      }
    }

    // Clear inventory management state
    this.gameState.inventoryManagement = null;
    this.updateDisplay();
  }

  public cancelInventoryManagement(): void {
    if (!this.gameState.inventoryManagement) return;

    const { context } = this.gameState.inventoryManagement;

    if (context === 'treasure') {
      // Complete treasure event without taking item
      const currentNode =
        this.gameState.currentMap.nodes[this.gameState.currentNodeId];
      if (currentNode) {
        currentNode.eventType = 'completed_treasure';
      }
      this.completeEvent();
    } else if (context === 'boss_reward') {
      // Complete boss reward without taking item
      this.gameState.currentChapter++;

      if (this.gameState.currentChapter > this.chaptersData!.chapters.length) {
        this.gameState.gamePhase = 'victory';
      } else {
        // Move to next chapter
        // Reset chapter progress
        this.gameState.eventsCompleted = 0;
        this.gameState.visitedNodes.clear();

        // Reset map scroll position for new chapter
        this.gameState.mapScrollPosition = 0;

        this.generateChapterMap();

        // Set starting node for new chapter
        this.gameState.currentNodeId = this.gameState.currentMap.startNodeId;

        // Update node visibility for new chapter
        this.navigationManager.updateNodeVisibility();

        // Go directly to navigation phase (skip chapter_start screen)
        this.gameState.gamePhase = 'navigation';
      }

      this.gameState.battleState = undefined;
      this.gameState.bossRewardRelics = null;
    }

    // Clear inventory management state
    this.gameState.inventoryManagement = null;
    this.updateDisplay();
  }

  private selectBossReward(selectedRelic: any): void {
    // Legacy method - now redirects to Vue method
    const relicIndex =
      this.gameState.bossRewardRelics?.findIndex(r => r === selectedRelic) ??
      -1;
    if (relicIndex >= 0) {
      this.selectBossRewardFromVue(relicIndex);
    }
  }
}

// Vue環境ではApp.vueでゲームを初期化するため、このコードは不要
