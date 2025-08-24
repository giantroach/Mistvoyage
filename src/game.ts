import {
  GameData,
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

export class MistvoyageGame {
  private gameData: GameData | null = null;
  private eventConfig: any = null;
  private gameState: GameState = this.initializeGameState();
  private isMapVisible: boolean = false;

  // Manager instances
  private mapManager: MapManager;
  private displayManager: DisplayManager;
  private saveManager: SaveManager;

  constructor() {
    this.mapManager = new MapManager();
    this.displayManager = new DisplayManager(this.mapManager);
    this.saveManager = new SaveManager();
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
        monster: { weight: 40 },
        elite_monster: { weight: 15 },
        port: { weight: 20 },
        treasure: { weight: 10 },
        unknown: { weight: 15 },
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
      baseSpeed: 5,
      storage: 8,
      weaponSlots: 2,
      initialWeapons: ['harpoon'],
      specialRules: [],
    };

    const defaultWeapon: Weapon = {
      id: 'harpoon',
      name: 'モリ',
      damage: 15,
      accuracy: 80,
      range: '近距離',
      specialEffects: [],
    };

    return {
      // Public parameters
      ship: defaultShip,
      hull: defaultShip.hullMax,
      food: 20,
      money: 50,
      crew: defaultShip.crewMax,
      sight: 10,
      weather: '晴れ' as WeatherType,
      relics: [],
      weapons: [defaultWeapon],

      // Private parameters
      speed: defaultShip.baseSpeed,
      karma: 0,
    };
  }

  private async init(): Promise<void> {
    try {
      await this.loadGameData();
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

    const configResponse = await fetch('data/event_config.json');
    if (!configResponse.ok) {
      throw new Error(
        `HTTP ${configResponse.status}: ${configResponse.statusText}`
      );
    }
    this.eventConfig = await configResponse.json();
  }

  private setupEventListeners(): void {
    const saveBtn = document.getElementById('save-btn');
    const loadBtn = document.getElementById('load-btn');
    const settingsBtn = document.getElementById('settings-btn');

    if (saveBtn) saveBtn.addEventListener('click', () => this.saveGame());
    if (loadBtn) loadBtn.addEventListener('click', () => this.loadGame());
    if (settingsBtn)
      settingsBtn.addEventListener('click', () => this.showSettings());
  }

  private startGame(): void {
    this.updateDisplay();
  }

  // ==================== GAME FLOW METHODS ====================

  private updateDisplay(): void {
    this.updateParameterDisplay();

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
    Object.values(this.gameData.ships).forEach(ship => {
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

    this.gameState.gamePhase = 'chapter_start';
    this.generateChapterMap();
    this.updateDisplay();
  }

  private showChapterStart(): void {
    if (!this.gameData) return;

    const chapter = this.gameData.chapters.find(
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

    const currentNode =
      this.gameState.currentMap.nodes[this.gameState.currentNodeId];
    const sightRange = Math.min(
      3,
      Math.max(1, Math.floor(this.gameState.playerParameters.sight / 5))
    );

    // Auto-show map when in navigation mode
    this.isMapVisible = true;

    content.innerHTML = `
      <h2>航海中</h2>
      <p>船は穏やかに海を進んでいます。マップ上のアクセス可能なノードをクリックして次の目的地を選択してください。</p>
      <div id="map-display" class="${this.isMapVisible ? 'visible' : 'hidden'}">
        ${this.isMapVisible ? this.generateMapDisplay(sightRange) : ''}
      </div>
    `;

    this.updateMapToggleButton();
    this.setupMapToggleListener();

    // Auto-scroll to show current node when navigation display is shown
    if (this.isMapVisible) {
      this.scrollToNode(this.gameState.currentNodeId);
    }

    // Clear choices container and add instruction
    choicesContainer.innerHTML = '';

    const currentNodeInfo = currentNode
      ? this.getEventTypeName(currentNode.eventType || 'unknown')
      : '不明';
    const instructionText = document.createElement('p');
    instructionText.innerHTML = `
      <strong>現在地:</strong> ${currentNodeInfo}<br>
      <strong>指示:</strong> マップ上の<span style="color: #66ff66;">緑色</span>のノードをクリックして移動してください。
    `;
    instructionText.style.color = '#ccc';
    instructionText.style.backgroundColor = '#2a2a2a';
    instructionText.style.padding = '1rem';
    instructionText.style.borderRadius = '4px';
    instructionText.style.border = '1px solid #444';
    choicesContainer.appendChild(instructionText);
  }

  private generateMapDisplay(sightRange: number): string {
    return this.displayManager.generateMapDisplay(this.gameState, sightRange);
  }

  private showEvent(): void {
    // Event handling will be implemented later
    const content = document.getElementById('story-text');
    if (content) {
      content.innerHTML = '<h2>イベント処理中...</h2>';
    }
  }

  private showCombat(): void {
    // Combat handling will be implemented later
    const content = document.getElementById('story-text');
    if (content) {
      content.innerHTML = '<h2>戦闘中...</h2>';
    }
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
    const chapter = this.gameData?.chapters.find(
      c => c.id === this.gameState.currentChapter
    );
    if (!chapter || !this.eventConfig) return;

    const chapterConfigKey = `chapter_${this.gameState.currentChapter}`;
    const chapterConfig = this.eventConfig.eventConfigs[chapterConfigKey];
    if (!chapterConfig) return;

    this.gameState.currentMap = this.mapManager.generateChapterMap(
      chapter,
      chapterConfig,
      this.gameState.currentChapter
    );
    this.mapManager.updateNodeVisibility(this.gameState);
  }

  private updateNodeVisibility(): void {
    this.mapManager.updateNodeVisibility(this.gameState);
  }

  private getVisibleNodes(currentNode: MapNode): string[] {
    return this.mapManager.getVisibleNodes(currentNode, this.gameState);
  }

  private getEventTypeName(eventType: EventType, node?: MapNode): string {
    const currentNode =
      this.gameState.currentMap.nodes[this.gameState.currentNodeId];
    return this.mapManager.getEventTypeName(
      eventType,
      node,
      this.gameState.playerParameters.sight,
      this.gameState.visitedNodes,
      currentNode?.layer
    );
  }

  public navigateToNode(nodeId: string): void {
    // Check if navigation is valid (only accessible nodes can be selected)
    const node = this.gameState.currentMap.nodes[nodeId];
    if (
      !node ||
      !node.isAccessible ||
      this.gameState.gamePhase !== 'navigation'
    ) {
      console.log(
        `Navigation to ${nodeId} not allowed: accessible=${node?.isAccessible}, phase=${this.gameState.gamePhase}`
      );
      return;
    }

    this.gameState.currentNodeId = nodeId;
    this.gameState.visitedNodes.add(nodeId);

    if (node && node.eventType) {
      this.gameState.gamePhase = 'event';
      // Process event here
      this.gameState.eventsCompleted++;

      // Check if chapter is complete
      const chapter = this.gameData?.chapters.find(
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
    }

    this.updateNodeVisibility();
    this.gameState.gamePhase = 'navigation';
    this.updateDisplay();

    // Auto-scroll to position the selected node's layer at the left edge
    this.scrollToNode(nodeId);
  }

  private scrollToNode(nodeId: string): void {
    this.displayManager.scrollToNode(nodeId, this.gameState);
  }

  // ==================== PARAMETER DISPLAY ====================

  private updateParameterDisplay(): void {
    this.displayManager.updateParameterDisplay(this.gameState, this.gameData);
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

  private toggleMapView(): void {
    this.isMapVisible = !this.isMapVisible;

    // Only refresh display if we're in navigation phase
    if (this.gameState.gamePhase === 'navigation') {
      this.showNavigation();
    }
  }

  private updateMapToggleButton(): void {
    const mapToggleBtn = document.getElementById('map-toggle-btn');
    if (mapToggleBtn) {
      mapToggleBtn.textContent = this.isMapVisible
        ? 'マップを隠す'
        : 'マップを見る';
      mapToggleBtn.classList.toggle('active', this.isMapVisible);

      // Show/hide the button based on game phase
      const storyHeader = document.querySelector(
        '.story-header'
      ) as HTMLElement;
      if (storyHeader) {
        storyHeader.style.display =
          this.gameState.gamePhase === 'navigation' ? 'block' : 'none';
      }
    }
  }

  private setupMapToggleListener(): void {
    const mapToggleBtn = document.getElementById('map-toggle-btn');
    if (mapToggleBtn) {
      // Remove existing listener to avoid duplicates
      mapToggleBtn.replaceWith(mapToggleBtn.cloneNode(true));
      const newMapToggleBtn = document.getElementById('map-toggle-btn');
      if (newMapToggleBtn) {
        newMapToggleBtn.addEventListener('click', () => this.toggleMapView());
      }
    }
  }
}

// ゲーム開始
document.addEventListener('DOMContentLoaded', () => {
  const game = new MistvoyageGame();
  // Make game instance globally accessible for onclick handlers
  (window as any).gameInstance = game;
});
