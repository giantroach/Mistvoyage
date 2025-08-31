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
    };

    return {
      // Public parameters
      ship: defaultShip,
      hull: defaultShip.hullMax,
      food: 20,
      money: 50,
      crew: defaultShip.crewMax,
      sight: 15,
      weather: { value: 0, type: '', displayName: '快晴' }, // Will be properly initialized in init()
      relics: [],
      weapons: [defaultWeapon],

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

      // Initialize PortManager after WeaponManager is ready
      this.portManager = new PortManager(
        this.gameState,
        this.relicManager,
        this.getWeaponManager(),
        () => this.updateDisplay(),
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
        this.gameState.playerParameters.hull = this.gameState.playerParameters.maxHull;
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

    // Weapons & Items
    const debugAddWeapon = document.getElementById('debug-add-weapon');
    const debugAddRelic = document.getElementById('debug-add-relic');
    const debugClearWeapons = document.getElementById('debug-clear-weapons');
    const debugClearRelics = document.getElementById('debug-clear-relics');

    if (debugAddWeapon) {
      debugAddWeapon.replaceWith(debugAddWeapon.cloneNode(true)); // Remove existing event listeners
      const newDebugAddWeapon = document.getElementById('debug-add-weapon');
      newDebugAddWeapon?.addEventListener('click', () => {
        const weaponTypeSelect = document.getElementById('weapon-type-select') as HTMLSelectElement;
        const weaponRaritySelect = document.getElementById('weapon-rarity-select') as HTMLSelectElement;
        
        if (weaponTypeSelect && weaponRaritySelect) {
          const selectedType = weaponTypeSelect.value;
          const selectedRarity = weaponRaritySelect.value as any; // WeaponRarity type
          
          try {
            const newWeapon = this.weaponManager.generateWeapon(selectedType, selectedRarity);
            this.gameState.playerParameters.weapons.push(newWeapon);
            this.updateDisplay();
            this.showSaveStatus(`武器「${newWeapon.name}」(${selectedRarity})を追加しました`);
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
        const relicRaritySelect = document.getElementById('relic-rarity-select') as HTMLSelectElement;
        
        if (relicRaritySelect) {
          const selectedRarity = relicRaritySelect.value as any; // RelicRarity type
          
          try {
            const newRelic = this.relicManager.generateRelic(selectedRarity);
            this.gameState.playerParameters.relics.push(newRelic);
            this.updateDisplay();
            this.showSaveStatus(`レリック「${newRelic.name}」(${selectedRarity})を追加しました`);
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
      const newDebugClearWeapons = document.getElementById('debug-clear-weapons');
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
        const enemySelect = document.getElementById('enemy-select') as HTMLSelectElement;
        
        if (enemySelect) {
          const selectedEnemy = enemySelect.value;
          try {
            this.startDebugBattle(selectedEnemy);
            this.showSaveStatus(`「${enemySelect.options[enemySelect.selectedIndex].text}」との戦闘を開始しました`);
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
      const newDebugToggleGodMode = document.getElementById('debug-toggle-god-mode');
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
    const debugCompleteChapter = document.getElementById('debug-complete-chapter');

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
          this.showSaveStatus(`第${this.gameState.currentChapter}章に進みました`);
        } else {
          this.showSaveStatus('最終章です', true);
        }
      });
    }

    if (debugCompleteChapter) {
      debugCompleteChapter.replaceWith(debugCompleteChapter.cloneNode(true));
      const newDebugCompleteChapter = document.getElementById('debug-complete-chapter');
      newDebugCompleteChapter?.addEventListener('click', () => {
        const requiredEvents = this.chaptersData.chapters.find(
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
    if (!this.gameData) return;

    const content = document.getElementById('story-text');
    const choicesContainer = document.getElementById('choices-container');

    if (!content || !choicesContainer) return;

    content.innerHTML = `
      <h2>船を選択してください</h2>
      <p>あなたの冒険の相棒となる船を選んでください。それぞれ異なる特徴を持っています。</p>
    `;

    choicesContainer.innerHTML = '';

    // Display available ships
    Object.values(this.shipsData!.ships).forEach(ship => {
      const shipBtn = document.createElement('button');
      shipBtn.className = 'choice-btn';
      shipBtn.innerHTML = `
        <strong>${ship.name}</strong><br>
        船体: ${ship.hullMax} | 乗員: ${ship.crewMax} | 速度: ${ship.baseSpeed}<br>
        保管庫: ${ship.storage} | 武器スロット: ${ship.weaponSlots}
      `;
      shipBtn.addEventListener('click', () => this.selectShip(ship));
      choicesContainer.appendChild(shipBtn);
    });
  }

  private selectShip(ship: Ship): void {
    this.gameState.playerParameters.ship = ship;
    this.gameState.playerParameters.hull = ship.hullMax;
    this.gameState.playerParameters.crew = ship.crewMax;
    this.gameState.playerParameters.speed = ship.baseSpeed;

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
    if (!this.chaptersData) return;

    const chapter = this.chaptersData.chapters.find(
      c => c.id === this.gameState.currentChapter
    );
    if (!chapter) return;

    const content = document.getElementById('story-text');
    const choicesContainer = document.getElementById('choices-container');

    if (!content || !choicesContainer) return;

    content.innerHTML = `
      <h2>${chapter.name}</h2>
      <p>${chapter.description}</p>
      <p>必要イベント数: ${chapter.requiredEvents}</p>
      <p>現在の進行: ${this.gameState.eventsCompleted}/${chapter.requiredEvents}</p>
    `;

    choicesContainer.innerHTML = '';

    const startBtn = document.createElement('button');
    startBtn.className = 'choice-btn';
    startBtn.textContent = '航海を開始する';
    startBtn.addEventListener('click', () => {
      this.gameState.gamePhase = 'navigation';
      this.updateDisplay();
    });
    choicesContainer.appendChild(startBtn);
  }

  private showNavigation(): void {
    const content = document.getElementById('story-text');
    const choicesContainer = document.getElementById('choices-container');

    if (!content || !choicesContainer) return;

    // Auto-show map when in navigation mode
    this.isMapVisible = true;

    this.navigationManager.showNavigation(
      content,
      choicesContainer,
      this.isMapVisible
    );
  }

  private generateMapDisplay(sightRange: number): string {
    return this.displayManager.generateMapDisplay(this.gameState, sightRange);
  }

  private showEvent(): void {
    // Get current node and display appropriate event
    const currentNode =
      this.gameState.currentMap.nodes[this.gameState.currentNodeId];
    if (currentNode && currentNode.eventType) {
      switch (currentNode.eventType) {
        case 'treasure':
          this.handleTreasureEvent();
          break;
        default:
          // For other events, show generic message
          const content = document.getElementById('story-text');
          if (content) {
            content.innerHTML = '<h2>イベント処理中...</h2>';
          }
          break;
      }
    }
  }

  private showCombat(): void {
    const content = document.getElementById('story-text');
    const choicesContainer = document.getElementById('choices-container');

    if (content && choicesContainer && this.gameState.battleState) {
      this.displayBattleScreen(content, choicesContainer);
    }
  }

  private displayBattleScreen(
    content: HTMLElement,
    choicesContainer: HTMLElement
  ): void {
    const battleState = this.gameState.battleState!;
    const playerParams = this.gameState.playerParameters;

    // Display battle status
    content.innerHTML = `
      <div class="battle-screen">
        <h2>⚔️ 戦闘中 - オートバトル</h2>
        
        <div class="player-status">
          <h3>🛡️ あなたのステータス</h3>
          <div class="status-bars">
            <div class="health-bar">
              <span>Hull: ${playerParams.hull}/${
                playerParams.ship.hullMax
              }</span>
              <div class="bar">
                <div class="fill" style="width: ${
                  (playerParams.hull / playerParams.ship.hullMax) * 100
                }%"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="enemies-status">
          <h3>👹 敵のステータス</h3>
          ${battleState.monsters
            .map(
              monster => `
            <div class="enemy ${monster.hp <= 0 ? 'defeated' : ''}">
              <span>${monster.name} - HP: ${
                monster.hp > 0
                  ? '██████████'.slice(
                      0,
                      Math.max(1, Math.floor((monster.hp / monster.maxHp) * 10))
                    )
                  : '💀'
              }</span>
              <div class="bar">
                <div class="fill" style="width: ${
                  (monster.hp / monster.maxHp) * 100
                }%"></div>
              </div>
            </div>
          `
            )
            .join('')}
        </div>

        <div class="battle-log">
          <h3>📜 戦闘ログ</h3>
          <div class="log-content">
            ${this.formatBattleLog(
              this.battleManager.getBattleLog(this.gameState)
            )}
          </div>
        </div>
      </div>
    `;

    // Clear choices during combat
    choicesContainer.innerHTML = '';
  }

  private formatBattleLog(battleLog: any[]): string {
    return battleLog
      .slice(-5)
      .map(entry => {
        if (typeof entry === 'string') {
          return `<p style="background-color: #444; padding: 0.5rem; margin: 0.2rem 0; border-radius: 4px;">${entry}</p>`;
        } else if (entry.actorType && entry.weaponName) {
          const actor = entry.actorType === 'player' ? 'あなた' : entry.actorId;
          const result = entry.hit
            ? entry.critical
              ? `${entry.damage}ダメージ (クリティカル!)`
              : `${entry.damage}ダメージ`
            : 'ミス';
          const backgroundColor =
            entry.actorType === 'player' ? '#2a4a2a' : '#4a2a2a'; // Green for player, red for enemy
          return `<p style="background-color: ${backgroundColor}; padding: 0.5rem; margin: 0.2rem 0; border-radius: 4px; border-left: 4px solid ${
            entry.actorType === 'player' ? '#66ff66' : '#ff6666'
          };">${actor}の${entry.weaponName}: ${result}</p>`;
        } else if (entry.type === 'status') {
          // Handle status messages
          return `<p style="background-color: #444; padding: 0.5rem; margin: 0.2rem 0; border-radius: 4px; color: #ffcc00;">${entry.message}</p>`;
        } else if (entry.type === 'victory') {
          // Handle victory messages
          return `<p style="background-color: #2a4a2a; padding: 0.5rem; margin: 0.2rem 0; border-radius: 4px; color: #66ff66; font-weight: bold;">${entry.message}</p>`;
        } else if (entry.type === 'defeat') {
          // Handle defeat messages
          return `<p style="background-color: #4a2a2a; padding: 0.5rem; margin: 0.2rem 0; border-radius: 4px; color: #ff6666; font-weight: bold;">${entry.message}</p>`;
        }
        // For unknown entries, try to extract useful information instead of raw JSON
        let message = 'Unknown event';
        if (entry.message) {
          message = entry.message;
        } else if (entry.description) {
          message = entry.description;
        } else if (entry.text) {
          message = entry.text;
        }
        return `<p style="background-color: #333; padding: 0.5rem; margin: 0.2rem 0; border-radius: 4px; color: #ccc;">${message}</p>`;
      })
      .join('');
  }

  private showBattleResult(): void {
    const content = document.getElementById('story-text');
    const choicesContainer = document.getElementById('choices-container');

    if (content && choicesContainer && this.gameState.battleState) {
      this.displayBattleResultScreen(content, choicesContainer);
    }
  }

  private displayBattleResultScreen(
    content: HTMLElement,
    choicesContainer: HTMLElement
  ): void {
    const battleState = this.gameState.battleState!;
    const playerParams = this.gameState.playerParameters;

    content.innerHTML = `
      <div class="battle-result">
        <h2>🎉 戦闘勝利！</h2>
        
        <div class="victory-summary">
          <h3>戦闘結果</h3>
          <ul>
            ${battleState.monsters
              .map(monster => `<li>✓ ${monster.name}を撃破</li>`)
              .join('')}
          </ul>
        </div>

        <div class="rewards">
          <h3>🎁 獲得報酬</h3>
          <ul>
            <li>💰 ゴールド: +${this.calculateDisplayGoldReward(
              battleState.monsters
            )}</li>
          </ul>
        </div>

        <div class="current-status">
          <h3>📊 現在のステータス</h3>
          <p><strong>Hull:</strong> ${playerParams.hull}/${
            playerParams.ship.hullMax
          }</p>
          <p><strong>ゴールド:</strong> ${playerParams.money}</p>
        </div>
      </div>
    `;

    choicesContainer.innerHTML = '';
    const continueBtn = document.createElement('button');
    continueBtn.textContent = '⛵ 航海を続ける';
    continueBtn.className = 'choice-btn';
    continueBtn.addEventListener('click', () => {
      this.completeBattleAndContinue();
    });
    choicesContainer.appendChild(continueBtn);
  }

  private calculateDisplayGoldReward(monsters: any[]): number {
    return monsters.reduce((total, monster) => {
      const midReward = Math.floor(
        (monster.goldReward.min + monster.goldReward.max) / 2
      );
      return total + midReward;
    }, 0);
  }

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
    const content = document.getElementById('story-text');
    const choicesContainer = document.getElementById('choices-container');

    if (content && choicesContainer) {
      const rarityColors: Record<string, string> = {
        common: '#888',
        uncommon: '#4CAF50',
        rare: '#2196F3',
        epic: '#9C27B0',
        legendary: '#FF9800',
      };

      const cooldownText =
        weapon.cooldown.min === weapon.cooldown.max
          ? `${weapon.cooldown.min}ms`
          : `${weapon.cooldown.min}-${weapon.cooldown.max}ms`;

      content.innerHTML = `
        <div class="weapon-detail">
          <h3 style="color: ${rarityColors[weapon.rarity] || '#fff'}">
            ${weapon.name} (${weapon.rarity.toUpperCase()})
          </h3>
          <p class="weapon-description">${weapon.description}</p>
          <div class="weapon-stats">
            <div class="stat-row">
              <span class="stat-label">ダメージ:</span>
              <span class="stat-value">${weapon.damage.min}-${
                weapon.damage.max
              }</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">必要クルー:</span>
              <span class="stat-value">${weapon.handlingReq}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">命中精度:</span>
              <span class="stat-value">${weapon.accuracy}%</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">クールダウン:</span>
              <span class="stat-value">${cooldownText}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">クリティカル率:</span>
              <span class="stat-value">${weapon.critRate}%</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">クリティカル倍率:</span>
              <span class="stat-value">${weapon.critMultiplier}x</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">価格:</span>
              <span class="stat-value">${weapon.price}金</span>
            </div>
          </div>
        </div>`;

      choicesContainer.innerHTML = '';
      const backBtn = document.createElement('button');
      backBtn.textContent = '⬅️ 戻る';
      backBtn.className = 'choice-button';
      backBtn.addEventListener('click', () => {
        this.closeDetailView();
      });
      choicesContainer.appendChild(backBtn);
    }
  }

  public showRelicDetail(relic: Relic): void {
    const content = document.getElementById('story-text');
    const choicesContainer = document.getElementById('choices-container');

    if (content && choicesContainer) {
      content.innerHTML = `
        <div class="relic-detail">
          <div class="detail-header">
            <h2>🏺 ${relic.name}</h2>
            <button class="close-detail-btn" onclick="window.gameInstance.closeDetailView()">✕</button>
          </div>
          <p class="relic-description">${relic.description}</p>
          
          <div class="relic-rarity-display">
            <span class="relic-rarity rarity-${
              relic.rarity
            }">${this.getRarityDisplayName(relic.rarity)}</span>
          </div>
          
          <div class="relic-effects">
            <h3>✨ 効果</h3>
            <ul class="effects-list">
              ${relic.effects
                .map(effect => `<li>• ${effect.description}</li>`)
                .join('')}
            </ul>
          </div>
        </div>
      `;

      choicesContainer.innerHTML = '';
      const backBtn = document.createElement('button');
      backBtn.textContent = '⬅️ 戻る';
      backBtn.className = 'choice-btn';
      backBtn.addEventListener('click', () => {
        this.closeDetailView();
      });
      choicesContainer.appendChild(backBtn);
    }
  }

  public closeDetailView(): void {
    // Return to previous display
    this.updateDisplay();
  }

  private showGameOver(): void {
    const content = document.getElementById('story-text');
    if (content) {
      content.innerHTML = `
        <h2>ゲームオーバー</h2>
        <p>あなたの冒険は終わりを告げました...</p>
      `;
    }
  }

  private showVictory(): void {
    const content = document.getElementById('story-text');
    if (content) {
      content.innerHTML = `
        <h2>勝利！</h2>
        <p>すべてのチャプターを制覇しました！</p>
      `;
    }
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
      default:
        this.handleGenericEvent(eventType);
        break;
    }
  }

  private handleTreasureEvent(): void {
    const storyElement = document.getElementById('story-text');
    const choicesContainer = document.getElementById('choices-container');

    if (!storyElement || !choicesContainer) return;

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

    storyElement.innerHTML = `
      <h2>🏺 宝箱発見！</h2>
      <p>古い宝箱を発見しました。中から3つのレリックが現れています。</p>
      <p>どれか一つを選んで持ち帰ることができます。</p>
    `;

    choicesContainer.innerHTML = '';

    relics.forEach((relic, index) => {
      const relicButton = document.createElement('button');
      relicButton.className = 'choice-btn relic-choice';
      relicButton.innerHTML = `
        <div class="relic-choice-content">
          <div class="relic-header">
            <span class="relic-name">${relic.name}</span>
            <span class="relic-rarity rarity-${
              relic.rarity
            }">${this.getRarityDisplayName(relic.rarity)}</span>
          </div>
          <div class="relic-effects">
            ${relic.effects
              .map(
                effect =>
                  `<div class="effect-line">• ${effect.description}</div>`
              )
              .join('')}
          </div>
        </div>
      `;

      relicButton.addEventListener('click', () => {
        this.selectRelic(relic);
      });

      choicesContainer.appendChild(relicButton);
    });

    // Add skip option
    const skipButton = document.createElement('button');
    skipButton.className = 'choice-btn';
    skipButton.textContent = '何も取らずに立ち去る';
    skipButton.addEventListener('click', () => {
      this.completeEvent();
    });
    choicesContainer.appendChild(skipButton);
  }

  private selectRelic(relic: Relic): void {
    // Check if player has storage space
    const currentRelics = this.gameState.playerParameters.relics.length;
    const maxStorage = this.calculateMaxStorage();

    if (currentRelics >= maxStorage) {
      alert(`保管庫が満杯です！(最大${maxStorage}個)`);
      return;
    }

    // Add relic to player inventory
    this.gameState.playerParameters.relics.push(relic);

    // Apply relic effects
    this.applyRelicEffects(relic);

    // Show confirmation
    const storyElement = document.getElementById('story-text');
    if (storyElement) {
      storyElement.innerHTML = `
        <h2>📿 レリック獲得！</h2>
        <p><strong>${relic.name}</strong>を獲得しました！</p>
        <div class="relic-effects">
          ${relic.effects
            .map(
              effect => `<div class="effect-line">• ${effect.description}</div>`
            )
            .join('')}
        </div>
      `;
    }

    const choicesContainer = document.getElementById('choices-container');
    if (choicesContainer) {
      choicesContainer.innerHTML = '';
      const continueButton = document.createElement('button');
      continueButton.className = 'choice-btn';
      continueButton.textContent = '続ける';
      continueButton.addEventListener('click', () => {
        this.completeEvent();
      });
      choicesContainer.appendChild(continueButton);
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
        // storage_increase and gold_bonus are handled dynamically when needed
        case 'storage_increase':
          // Applied in calculateMaxStorage()
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

  // Public getters
  public getDebugManager(): DebugManager {
    return this.debugManager;
  }

  public getGameState(): GameState {
    return this.gameState;
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
    const content = document.getElementById('story-text');
    const choicesContainer = document.getElementById('choices-container');

    if (!content || !choicesContainer) return;

    content.innerHTML =
      '<p>ボスを撃破しました！<br>報酬として以下のレリックから一つを選択してください：</p>';

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

    let choicesHtml = '';
    actualRelics.forEach((relic, index) => {
      const effectsText = relic.effects
        .map(effect => effect.description)
        .join('<br>');
      choicesHtml += `
        <div class="boss-reward-option">
          <button id="select-relic-${index}" class="boss-reward-btn">
            <div class="relic-name">${relic.name} (${relic.rarity})</div>
            <div class="relic-description">${relic.description}</div>
            <div class="relic-effects">${effectsText}</div>
          </button>
        </div>
      `;
    });

    choicesContainer.innerHTML = choicesHtml;

    // Add event listeners for relic selection
    actualRelics.forEach((relic, index) => {
      const selectBtn = document.getElementById(`select-relic-${index}`);
      if (selectBtn) {
        selectBtn.addEventListener('click', () => {
          this.selectBossReward(relic);
        });
      }
    });
  }

  private selectBossReward(selectedRelic: any): void {
    // Add selected relic to player inventory
    if (
      this.gameState.playerParameters.relics.length <
      this.gameState.playerParameters.ship.storage
    ) {
      this.gameState.playerParameters.relics.push(selectedRelic);
    }

    // Progress to next chapter or end game
    this.gameState.currentChapter++;

    if (this.gameState.currentChapter > 3) {
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

    // Clean up battle state
    this.gameState.battleState = undefined;

    this.updateDisplay();

    // Additional scroll position reset after display update
    setTimeout(() => {
      if (this.gameState.gamePhase === 'navigation') {
        const mapContainer = document.querySelector(
          '.map-container.scrollable'
        ) as HTMLElement;
        if (
          mapContainer &&
          this.gameState.currentNodeId === 'start' &&
          this.gameState.eventsCompleted === 0
        ) {
          mapContainer.scrollLeft = 0;
          this.gameState.mapScrollPosition = 0;
        }
      }
    }, 100);
  }
}

// Vue環境ではApp.vueでゲームを初期化するため、このコードは不要
