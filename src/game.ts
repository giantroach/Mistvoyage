import {
  GameData,
  GameState,
  GamePhase,
  Chapter,
  ChapterMap,
  MapNode,
  GameEvent,
  EventType,
  Ship,
  Weapon,
  Relic,
  WeatherType,
  PlayerParameters,
  SaveData,
  CombatState,
  Enemy,
} from './types.js';

export class MistvoyageGame {
  private gameData: GameData | null = null;
  private gameState: GameState = this.initializeGameState();

  constructor() {
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
    const response = await fetch('data/game.json');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    this.gameData = await response.json();
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

    content.innerHTML = `
      <h2>航海中</h2>
      <p>船は穏やかに海を進んでいます。次の目的地を選択してください。</p>
    `;

    choicesContainer.innerHTML = '';

    // Show available nodes based on sight
    const currentNode =
      this.gameState.currentMap.nodes[this.gameState.currentNodeId];
    if (currentNode) {
      const availableNodes = this.getVisibleNodes(currentNode);

      availableNodes.forEach(nodeId => {
        const node = this.gameState.currentMap.nodes[nodeId];
        if (node && node.isAccessible) {
          const nodeBtn = document.createElement('button');
          nodeBtn.className = 'choice-btn';

          let displayText = '???';
          if (node.isVisible && node.eventType) {
            displayText = this.getEventTypeName(node.eventType);
          } else if (node.isVisible) {
            displayText = '未知の場所';
          }

          nodeBtn.textContent = displayText;
          nodeBtn.addEventListener('click', () => this.navigateToNode(nodeId));
          choicesContainer.appendChild(nodeBtn);
        }
      });
    }
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
    if (!chapter) return;

    // Simple linear map generation for now (will be enhanced to tree structure)
    const map: ChapterMap = {
      chapterId: this.gameState.currentChapter,
      nodes: {},
      startNodeId: 'start',
      bossNodeId: 'boss',
    };

    // Create start node
    map.nodes['start'] = {
      id: 'start',
      x: 0,
      y: 0,
      isVisible: true,
      isAccessible: true,
      connections: ['node_1'],
    };

    // Create event nodes
    for (let i = 1; i <= chapter.requiredEvents; i++) {
      const nodeId = `node_${i}`;
      map.nodes[nodeId] = {
        id: nodeId,
        x: i,
        y: 0,
        eventType: this.getRandomEventType(),
        difficulty: chapter.difficulty + Math.floor(Math.random() * 3) - 1,
        isVisible: false,
        isAccessible: false,
        connections:
          i === chapter.requiredEvents ? ['boss'] : [`node_${i + 1}`],
      };
    }

    // Create boss node
    map.nodes['boss'] = {
      id: 'boss',
      x: chapter.requiredEvents + 1,
      y: 0,
      eventId: chapter.bossEvent,
      eventType: 'boss',
      difficulty: chapter.difficulty + 2,
      isVisible: false,
      isAccessible: false,
      connections: [],
    };

    this.gameState.currentMap = map;
    this.updateNodeVisibility();
  }

  private getRandomEventType(): EventType {
    const types: EventType[] = [
      'combat',
      'navigation',
      'encounter',
      'hunger',
      'port',
    ];
    return types[Math.floor(Math.random() * types.length)];
  }

  private updateNodeVisibility(): void {
    const currentNode =
      this.gameState.currentMap.nodes[this.gameState.currentNodeId];
    if (!currentNode) return;

    // Update visibility based on sight stat
    const maxVisibleDistance = Math.min(
      2,
      Math.floor(this.gameState.playerParameters.sight / 5)
    );

    Object.values(this.gameState.currentMap.nodes).forEach(node => {
      const distance =
        Math.abs(node.x - currentNode.x) + Math.abs(node.y - currentNode.y);
      if (distance <= maxVisibleDistance) {
        node.isVisible = true;
      }

      // Make connected nodes accessible
      if (currentNode.connections.includes(node.id)) {
        node.isAccessible = true;
      }
    });
  }

  private getVisibleNodes(currentNode: MapNode): string[] {
    return currentNode.connections.filter(nodeId => {
      const node = this.gameState.currentMap.nodes[nodeId];
      return node && node.isAccessible;
    });
  }

  private getEventTypeName(eventType: EventType): string {
    switch (eventType) {
      case 'combat':
        return '戦闘';
      case 'navigation':
        return '航海';
      case 'encounter':
        return '遭遇';
      case 'hunger':
        return '飢餓';
      case 'port':
        return '港';
      case 'boss':
        return 'ボス';
      default:
        return '不明';
    }
  }

  private navigateToNode(nodeId: string): void {
    this.gameState.currentNodeId = nodeId;
    this.gameState.visitedNodes.add(nodeId);

    const node = this.gameState.currentMap.nodes[nodeId];
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
  }

  // ==================== PARAMETER DISPLAY ====================

  private updateParameterDisplay(): void {
    const params = this.gameState.playerParameters;

    // Update public parameters display
    this.updateParameterElement(
      'hull-display',
      `船体: ${params.hull}/${params.ship.hullMax}`
    );
    this.updateParameterElement('food-display', `食料: ${params.food}`);
    this.updateParameterElement('money-display', `資金: ${params.money}`);
    this.updateParameterElement(
      'crew-display',
      `乗組員: ${params.crew}/${params.ship.crewMax}`
    );
    this.updateParameterElement('sight-display', `視界: ${params.sight}`);
    this.updateParameterElement('weather-display', `天候: ${params.weather}`);
    this.updateParameterElement(
      'storage-display',
      `保管庫: ${params.relics.length}/${params.ship.storage}`
    );
    this.updateParameterElement(
      'weapons-display',
      `武器: ${params.weapons.map(w => w.name).join(', ')}`
    );

    // Update game progress
    const chapter = this.gameData?.chapters.find(
      c => c.id === this.gameState.currentChapter
    );
    if (chapter) {
      this.updateParameterElement(
        'chapter-display',
        `チャプター: ${this.gameState.currentChapter} - ${chapter.name}`
      );
      this.updateParameterElement(
        'progress-display',
        `進行: ${this.gameState.eventsCompleted}/${chapter.requiredEvents}`
      );
    }
  }

  private updateParameterElement(id: string, text: string): void {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = text;
    }
  }

  // ==================== SAVE/LOAD SYSTEM ====================

  private saveGame(): void {
    try {
      const saveData: SaveData = {
        gameState: {
          currentChapter: this.gameState.currentChapter,
          currentMap: this.gameState.currentMap,
          currentNodeId: this.gameState.currentNodeId,
          eventsCompleted: this.gameState.eventsCompleted,
          playerParameters: this.gameState.playerParameters,
          variables: this.gameState.variables,
          visitedNodes: Array.from(this.gameState.visitedNodes),
          activeSequentialEvents: this.gameState.activeSequentialEvents,
          gamePhase: this.gameState.gamePhase,
        },
        timestamp: Date.now(),
      };

      localStorage.setItem('mistvoyage_save', JSON.stringify(saveData));
      this.showSaveStatus('セーブしました');
    } catch (error) {
      console.error('セーブエラー:', error);
      this.showSaveStatus('セーブに失敗しました', true);
    }
  }

  private loadGame(): void {
    try {
      const saveData = localStorage.getItem('mistvoyage_save');
      if (!saveData) {
        this.showSaveStatus('セーブデータがありません', true);
        return;
      }

      const parsed: SaveData = JSON.parse(saveData);
      this.gameState = {
        currentChapter: parsed.gameState.currentChapter,
        currentMap: parsed.gameState.currentMap,
        currentNodeId: parsed.gameState.currentNodeId,
        eventsCompleted: parsed.gameState.eventsCompleted,
        playerParameters: parsed.gameState.playerParameters,
        variables: parsed.gameState.variables,
        visitedNodes: new Set(parsed.gameState.visitedNodes),
        activeSequentialEvents: parsed.gameState.activeSequentialEvents,
        gamePhase: parsed.gameState.gamePhase,
      };

      this.updateDisplay();
      this.showSaveStatus('ロードしました');
    } catch (error) {
      console.error('ロードエラー:', error);
      this.showSaveStatus('ロードに失敗しました', true);
    }
  }

  private showSaveStatus(message: string, isError: boolean = false): void {
    const statusElement = document.getElementById('save-status');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.style.color = isError ? '#ff6666' : '#66ccff';

      setTimeout(() => {
        statusElement.textContent = '';
      }, 3000);
    }
  }

  private showSettings(): void {
    alert('設定画面（未実装）');
  }

  private showError(message: string): void {
    const storyText = document.getElementById('story-text');
    if (storyText) {
      storyText.innerHTML = `<p style="color: #ff6666;">エラー: ${message}</p>`;
    }
  }
}

// ゲーム開始
document.addEventListener('DOMContentLoaded', () => {
  new MistvoyageGame();
});
