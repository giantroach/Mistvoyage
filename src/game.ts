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
  WeatherType,
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
import { DebugManager } from './DebugManager.js';

export class MistvoyageGame {
  private gameData: GameData | null = null;
  private chaptersData: ChaptersData | null = null;
  private shipsData: ShipsData | null = null;
  private eventsData: EventsData | null = null;
  // eventConfig is now integrated into chaptersData
  private gameState: GameState = this.initializeGameState();
  private isMapVisible: boolean = false;

  // Manager instances
  private mapManager: MapManager;
  private displayManager: DisplayManager;
  private saveManager: SaveManager;
  private battleManager: BattleManager;
  private navigationManager: NavigationManager;
  private combatSystem: CombatSystem;
  private relicManager: RelicManager;
  private debugManager: DebugManager;
  private pendingScrollInfo: any = null;

  constructor() {
    this.mapManager = new MapManager();
    this.displayManager = new DisplayManager(this.mapManager);
    this.saveManager = new SaveManager();
    this.battleManager = new BattleManager();
    this.relicManager = new RelicManager();
    this.debugManager = new DebugManager(this);
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
      weather: '晴れ' as WeatherType,
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

  private async init(): Promise<void> {
    try {
      await this.loadGameData();
      await this.battleManager.initialize();
      await this.relicManager.initialize();
      await WeaponManager.initialize();
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
      debugBtn.addEventListener('click', () =>
        this.getDebugManager().toggleDebugMode()
      );
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

    console.log('updateDisplay: current gamePhase:', this.gameState.gamePhase);
    console.log(
      'updateDisplay: battleState exists:',
      !!this.gameState.battleState
    );

    switch (this.gameState.gamePhase) {
      case 'ship_selection':
        this.showShipSelection();
        break;
      case 'chapter_start':
        this.showChapterStart();
        break;
      case 'navigation':
        console.log('updateDisplay: showing navigation');
        this.showNavigation();
        break;
      case 'event':
        this.showEvent();
        break;
      case 'combat':
        console.log('updateDisplay: showing combat');
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
          const result = entry.hit ? `${entry.damage}ダメージ` : 'ミス';
          const backgroundColor =
            entry.actorType === 'player' ? '#2a4a2a' : '#4a2a2a'; // Green for player, red for enemy
          return `<p style="background-color: ${backgroundColor}; padding: 0.5rem; margin: 0.2rem 0; border-radius: 4px; border-left: 4px solid ${
            entry.actorType === 'player' ? '#66ff66' : '#ff6666'
          };">${actor}の${entry.weaponName}: ${result}</p>`;
        }
        return `<p style="background-color: #333; padding: 0.5rem; margin: 0.2rem 0; border-radius: 4px;">${JSON.stringify(
          entry
        )}</p>`;
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
    console.log('generateChapterMap: Reset map scroll position to 0');

    this.gameState.currentMap = this.mapManager.generateChapterMap(
      chapter,
      chapter, // Use chapter data which now includes eventTypes
      this.gameState.currentChapter
    );

    console.log(
      'generateChapterMap: New map generated for chapter',
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
      console.error('Error details:', error);
      console.error('Current chapter:', this.gameState.currentChapter);
      console.error('Chapters data available:', !!this.chaptersData);
      if (this.chaptersData) {
        console.error('Chapters:', this.chaptersData.chapters);
      }
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
    console.log(`Processing ${eventType} event`);

    switch (eventType) {
      case 'treasure':
        this.handleTreasureEvent();
        break;
      case 'port':
        this.handlePortEvent();
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

  private handlePortEvent(): void {
    const storyElement = document.getElementById('story-text');
    const choicesContainer = document.getElementById('choices-container');

    if (!storyElement || !choicesContainer) return;

    // Get current chapter for port pricing configuration
    const chapter = this.chaptersData?.chapters.find(
      c => c.id === this.gameState.currentChapter
    );

    storyElement.innerHTML = `
      <h2>港町への寄港</h2>
      <p>小さな港町に到着しました。どのサービスを利用しますか？</p>
      <p><strong>現在の状況:</strong></p>
      <p>船体: ${this.gameState.playerParameters.hull}/${this.gameState.playerParameters.ship.hullMax} | 
         所持金: ${this.gameState.playerParameters.money}金 | 
         武器スロット: ${this.gameState.playerParameters.weapons.length}/${this.gameState.playerParameters.ship.weaponSlots} |
         ストレージ: ${this.gameState.playerParameters.relics.length}/${this.gameState.playerParameters.ship.storage}</p>
    `;

    const repairCost = 10;
    const canRepair =
      this.gameState.playerParameters.money >= repairCost &&
      this.gameState.playerParameters.hull <
        this.gameState.playerParameters.ship.hullMax;

    choicesContainer.innerHTML = `
      <button class="choice-btn" onclick="window.gameInstance.repairShip()" ${
        !canRepair ? 'disabled' : ''
      }>
        🔧 船体を修復 (10金)
      </button>
      <button class="choice-btn" onclick="window.gameInstance.showPortWeapons()">
        ⚔️ 武器を購入
      </button>
      <button class="choice-btn" onclick="window.gameInstance.showPortRelics()">
        🏺 レリックを購入
      </button>
      <button class="choice-btn" onclick="window.gameInstance.leavePort()">
        ⛵ 港を出発する
      </button>
    `;
  }


  public repairShip(): void {
    const repairCost = 10;
    const repairAmount = 10;

    if (
      this.gameState.playerParameters.money >= repairCost &&
      this.gameState.playerParameters.hull <
        this.gameState.playerParameters.ship.hullMax
    ) {
      this.gameState.playerParameters.money -= repairCost;
      const oldHull = this.gameState.playerParameters.hull;
      this.gameState.playerParameters.hull = Math.min(
        this.gameState.playerParameters.hull + repairAmount,
        this.gameState.playerParameters.ship.hullMax
      );
      const actualRepair = this.gameState.playerParameters.hull - oldHull;

      const storyElement = document.getElementById('story-text');
      if (storyElement) {
        storyElement.innerHTML = `
          <h2>船体修復完了</h2>
          <p>船体を${actualRepair}ポイント修復しました。${repairCost}金を支払いました。</p>
          <p><strong>現在の船体:</strong> ${this.gameState.playerParameters.hull}/${this.gameState.playerParameters.ship.hullMax}</p>
          <p><strong>残り所持金:</strong> ${this.gameState.playerParameters.money}金</p>
        `;
      }
    }

    // Return to port after delay
    setTimeout(() => this.returnToPort(), 1500);
  }

  public showPortWeapons(): void {
    const storyElement = document.getElementById('story-text');
    const choicesContainer = document.getElementById('choices-container');

    if (!storyElement || !choicesContainer) return;

    // Generate 3 random weapons based on chapter rarity weights
    const chapter = this.chaptersData?.chapters.find(
      c => c.id === this.gameState.currentChapter
    );

    const portWeapons = this.getWeaponManager().generatePortWeapons(3);

    storyElement.innerHTML = `
      <h2>武器商人</h2>
      <p>以下の武器が販売されています：</p>
      <div class="port-weapons">
        ${portWeapons
          .map(
            (weapon: any, index: number) => `
          <div class="weapon-item">
            <h4>${weapon.name} (${weapon.rarity})</h4>
            <p>ダメージ: ${weapon.damage.min}-${weapon.damage.max} | 精度: ${
              weapon.accuracy
            }% | クールダウン: ${weapon.cooldown.min}-${
              weapon.cooldown.max
            }ms</p>
            <p>価格: ${weapon.price}金</p>
            <button class="choice-btn" onclick="window.gameInstance.buyWeapon(${index})" 
                    ${
                      this.gameState.playerParameters.money < weapon.price ||
                      this.gameState.playerParameters.weapons.length >=
                        this.gameState.playerParameters.ship.weaponSlots
                        ? 'disabled'
                        : ''
                    }>
              購入
            </button>
          </div>
        `
          )
          .join('')}
      </div>
      <p><strong>現在の状況:</strong></p>
      <p>所持金: ${this.gameState.playerParameters.money}金 | 
         武器スロット: ${this.gameState.playerParameters.weapons.length}/${
      this.gameState.playerParameters.ship.weaponSlots
    }</p>
    `;

    // Store weapons for purchase
    (this as any).currentPortWeapons = portWeapons;

    choicesContainer.innerHTML = `
      <button class="choice-btn" onclick="window.gameInstance.returnToPort()">
        ⬅️ 港に戻る
      </button>
    `;
  }

  public buyWeapon(index: number): void {
    const portWeapons = (this as any).currentPortWeapons;
    if (!portWeapons || !portWeapons[index]) return;

    const weapon = portWeapons[index];

    if (
      this.gameState.playerParameters.money >= weapon.price &&
      this.gameState.playerParameters.weapons.length <
        this.gameState.playerParameters.ship.weaponSlots
    ) {
      this.gameState.playerParameters.money -= weapon.price;
      this.gameState.playerParameters.weapons.push(weapon);

      const storyElement = document.getElementById('story-text');
      if (storyElement) {
        storyElement.innerHTML = `
          <h2>武器購入完了</h2>
          <p><strong>${weapon.name}</strong>を${weapon.price}金で購入しました！</p>
          <p>武器スロット: ${this.gameState.playerParameters.weapons.length}/${this.gameState.playerParameters.ship.weaponSlots}</p>
          <p>残り所持金: ${this.gameState.playerParameters.money}金</p>
        `;
      }

      // Return to port after delay
      setTimeout(() => this.returnToPort(), 1500);
    }
  }

  public showPortRelics(): void {
    const storyElement = document.getElementById('story-text');
    const choicesContainer = document.getElementById('choices-container');

    if (!storyElement || !choicesContainer) return;

    // Generate 3 random relics based on chapter rarity weights
    const chapter = this.chaptersData?.chapters.find(
      c => c.id === this.gameState.currentChapter
    );

    const portRelics = this.getRelicManager().generateMultipleRelics(3);

    storyElement.innerHTML = `
      <h2>レリック商人</h2>
      <p>以下のレリックが販売されています：</p>
      <div class="port-relics">
        ${portRelics
          .map(
            (relic, index) => `
          <div class="relic-item">
            <h4>${relic.name} (${relic.rarity})</h4>
            <p>効果: ${relic.effects
              .map((effect: any) => effect.description)
              .join(', ')}</p>
            <p>価格: ${relic.price || 50}金</p>
            <button class="choice-btn" onclick="window.gameInstance.buyRelic(${index})" 
                    ${
                      this.gameState.playerParameters.money <
                        (relic.price || 50) ||
                      this.gameState.playerParameters.relics.length >=
                        this.gameState.playerParameters.ship.storage
                        ? 'disabled'
                        : ''
                    }>
              購入
            </button>
          </div>
        `
          )
          .join('')}
      </div>
      <p><strong>現在の状況:</strong></p>
      <p>所持金: ${this.gameState.playerParameters.money}金 | 
         ストレージ: ${this.gameState.playerParameters.relics.length}/${
      this.gameState.playerParameters.ship.storage
    }</p>
    `;

    // Store relics for purchase
    (this as any).currentPortRelics = portRelics;

    choicesContainer.innerHTML = `
      <button class="choice-btn" onclick="window.gameInstance.returnToPort()">
        ⬅️ 港に戻る
      </button>
    `;
  }

  public buyRelic(index: number): void {
    const portRelics = (this as any).currentPortRelics;
    if (!portRelics || !portRelics[index]) return;

    const relic = portRelics[index];
    const price = relic.price || 50;

    if (
      this.gameState.playerParameters.money >= price &&
      this.gameState.playerParameters.relics.length <
        this.gameState.playerParameters.ship.storage
    ) {
      this.gameState.playerParameters.money -= price;
      this.gameState.playerParameters.relics.push(relic);

      const storyElement = document.getElementById('story-text');
      if (storyElement) {
        storyElement.innerHTML = `
          <h2>レリック購入完了</h2>
          <p><strong>${relic.name}</strong>を${price}金で購入しました！</p>
          <p>効果: ${relic.effects
            .map((effect: any) => effect.description)
            .join(', ')}</p>
          <p>ストレージ: ${this.gameState.playerParameters.relics.length}/${
          this.gameState.playerParameters.ship.storage
        }</p>
          <p>残り所持金: ${this.gameState.playerParameters.money}金</p>
        `;
      }

      // Return to port after delay
      setTimeout(() => this.returnToPort(), 1500);
    }
  }

  public returnToPort(): void {
    // Return to the main port screen
    this.handlePortEvent();
  }

  public leavePort(): void {
    // Complete the port event
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

    // Return to navigation
    this.gameState.gamePhase = 'navigation';
    this.updateDisplay();
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
          console.log(`Unknown relic effect type: ${effect.type}`);
          break;
      }
    });
  }

  // Battle loop moved to CombatSystem

  private handleBattleVictory(): void {
    console.log(
      'handleBattleVictory called, gamePhase before:',
      this.gameState.gamePhase
    );

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
    console.log(
      'handleBattleVictory: after completeBattle, gamePhase:',
      this.gameState.gamePhase
    );
    this.updateDisplay();
  }

  private handleBattleDefeat(): void {
    // Game over
    this.gameState.gamePhase = 'game_over';
    this.updateDisplay();
  }

  // Battle display methods moved to CombatSystem

  public continueBattle(): void {
    console.log('continueBattle called');
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
    alert('設定画面（未実装）');
  }

  private showError(message: string): void {
    this.displayManager.showError(message);
  }

  // Public getter for debug manager
  public getDebugManager(): DebugManager {
    return this.debugManager;
  }

  // Public getters for managers (for debug access)
  public getRelicManager(): RelicManager {
    return this.relicManager;
  }

  public getWeaponManager(): WeaponManager {
    return WeaponManager.getInstance();
  }

  public getBattleManager(): BattleManager {
    return this.battleManager;
  }

  public getShipsData(): any {
    return this.shipsData;
  }

  private showBossReward(): void {
    console.log('showBossReward called');
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
    console.log('selectBossReward called');
    console.log('Current chapter before:', this.gameState.currentChapter);

    // Add selected relic to player inventory
    if (
      this.gameState.playerParameters.relics.length <
      this.gameState.playerParameters.ship.storage
    ) {
      this.gameState.playerParameters.relics.push(selectedRelic);
      console.log('Added relic to inventory:', selectedRelic.name);
    }

    // Progress to next chapter or end game
    this.gameState.currentChapter++;
    console.log(
      'Current chapter after increment:',
      this.gameState.currentChapter
    );

    if (this.gameState.currentChapter > 3) {
      // Game completed
      console.log('Game completed - setting victory phase');
      this.gameState.gamePhase = 'victory';
    } else {
      // Move to next chapter
      console.log('Moving to next chapter - going directly to navigation');

      // Reset chapter progress
      console.log('Resetting chapter progress...');
      this.gameState.eventsCompleted = 0;
      this.gameState.visitedNodes.clear();

      // Reset map scroll position for new chapter
      this.gameState.mapScrollPosition = 0;
      console.log('Reset map scroll position to 0');

      console.log('Generating new chapter map...');
      this.generateChapterMap();

      // Set starting node for new chapter
      this.gameState.currentNodeId = this.gameState.currentMap.startNodeId;
      console.log('Set starting node to:', this.gameState.currentNodeId);
      console.log('New map generated, current map:', this.gameState.currentMap);

      // Go directly to navigation phase (skip chapter_start screen)
      this.gameState.gamePhase = 'navigation';
      console.log('Set game phase to navigation');
    }

    // Clean up battle state
    this.gameState.battleState = undefined;
    console.log('Cleaned up battle state');

    console.log('Calling updateDisplay...');
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
          console.log('Additional scroll position reset to 0');
          mapContainer.scrollLeft = 0;
          this.gameState.mapScrollPosition = 0;
        }
      }
    }, 100);
  }
}

// ゲーム開始
document.addEventListener('DOMContentLoaded', () => {
  const game = new MistvoyageGame();
  // Make game instance globally accessible for onclick handlers
  (window as any).gameInstance = game;
  (window as any).debugManager = game.getDebugManager();
});
