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

export class MistvoyageGame {
  private gameData: GameData | null = null;
  private eventConfig: any = null;
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

    content.innerHTML = `
      <h2>航海中</h2>
      <p>船は穏やかに海を進んでいます。次の目的地を選択してください。</p>
      <div id="map-display">
        ${this.generateMapDisplay(sightRange)}
      </div>
    `;

    choicesContainer.innerHTML = '';

    // Show available nodes based on sight
    if (currentNode) {
      const availableNodes = this.getVisibleNodes(currentNode);

      availableNodes.forEach(nodeId => {
        const node = this.gameState.currentMap.nodes[nodeId];
        if (node && node.isAccessible) {
          const nodeBtn = document.createElement('button');
          nodeBtn.className = 'choice-btn';

          let displayText = '???';
          if (node.isVisible && node.eventType) {
            displayText = this.getEventTypeName(node.eventType, node);
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

  private generateMapDisplay(sightRange: number): string {
    const currentNode =
      this.gameState.currentMap.nodes[this.gameState.currentNodeId];
    if (!currentNode) return '';

    let mapHtml = '<div class="map-container">';
    mapHtml += '<h3>周辺の海域</h3>';

    // Show visible nodes within sight range
    const visibleNodes: MapNode[] = [];
    Object.values(this.gameState.currentMap.nodes).forEach(node => {
      const layerDistance = Math.abs(node.layer - currentNode.layer);
      if (layerDistance <= sightRange) {
        visibleNodes.push(node);
      }
    });

    // Group nodes by layer
    const nodesByLayer: { [layer: number]: MapNode[] } = {};
    visibleNodes.forEach(node => {
      if (!nodesByLayer[node.layer]) {
        nodesByLayer[node.layer] = [];
      }
      nodesByLayer[node.layer].push(node);
    });

    // Render each layer
    const layers = Object.keys(nodesByLayer)
      .map(Number)
      .sort((a, b) => a - b);
    layers.forEach(layer => {
      mapHtml += `<div class="map-layer">`;
      mapHtml += `<div class="layer-label">レイヤー ${layer}</div>`;
      mapHtml += `<div class="layer-nodes">`;

      nodesByLayer[layer].forEach(node => {
        const isCurrentNode = node.id === this.gameState.currentNodeId;
        const isAccessible = node.isAccessible;
        const isVisited = this.gameState.visitedNodes.has(node.id);

        let nodeClass = 'map-node';
        if (isCurrentNode) nodeClass += ' current';
        if (isAccessible) nodeClass += ' accessible';
        if (isVisited) nodeClass += ' visited';

        const displayName = node.eventType
          ? this.getEventTypeName(node.eventType, node)
          : '???';

        mapHtml += `<div class="${nodeClass}" title="${displayName}">`;
        mapHtml += displayName;
        mapHtml += '</div>';
      });

      mapHtml += '</div></div>';
    });

    mapHtml += '</div>';
    return mapHtml;
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

    // Create tree-structured map
    const map: ChapterMap = {
      chapterId: this.gameState.currentChapter,
      nodes: {},
      startNodeId: 'start',
      bossNodeId: 'boss',
      totalLayers: chapter.requiredEvents + 2, // start + events + boss
      eventTypeConfig: chapterConfig.eventTypes,
    };

    this.generateTreeStructure(map, chapter, chapterConfig);
    this.gameState.currentMap = map;
    this.updateNodeVisibility();
  }

  private generateTreeStructure(
    map: ChapterMap,
    chapter: Chapter,
    chapterConfig: any
  ): void {
    const totalLayers = chapter.requiredEvents + 2;
    const eventTypes = this.generateEventTypeDistribution(
      chapterConfig.eventTypes,
      chapter.requiredEvents
    );

    // Create start node
    map.nodes['start'] = {
      id: 'start',
      x: 0,
      y: 1,
      eventType: 'start',
      isVisible: true,
      isAccessible: true,
      connections: [],
      layer: 0,
      branchIndex: 0,
    };

    // Generate event layers (tree structure)
    let nodeCounter = 1;
    const layerNodes: string[][] = [['start']];

    for (let layer = 1; layer <= chapter.requiredEvents; layer++) {
      const currentLayerNodes: string[] = [];
      const previousLayer = layerNodes[layer - 1];

      // Each layer can have 1-3 branches
      const branchCount = Math.min(
        3,
        Math.max(1, Math.floor(Math.random() * 3) + 1)
      );

      for (let branch = 0; branch < branchCount; branch++) {
        const nodeId = `node_${nodeCounter++}`;
        const eventType = eventTypes.shift() || 'unknown';

        map.nodes[nodeId] = {
          id: nodeId,
          x: layer,
          y: branch,
          eventType,
          difficulty: chapter.difficulty + Math.floor(Math.random() * 3) - 1,
          isVisible: false,
          isAccessible: false,
          connections: [],
          layer,
          branchIndex: branch,
        };

        currentLayerNodes.push(nodeId);
      }

      // Connect previous layer nodes to current layer
      this.connectLayers(map, previousLayer, currentLayerNodes);
      layerNodes.push(currentLayerNodes);
    }

    // Create boss node and connect to final event layer
    map.nodes['boss'] = {
      id: 'boss',
      x: totalLayers - 1,
      y: 1,
      eventId: chapter.bossEvent,
      eventType: 'boss',
      difficulty: chapter.difficulty + 2,
      isVisible: false,
      isAccessible: false,
      connections: [],
      layer: totalLayers - 1,
      branchIndex: 0,
    };

    // Connect final event layer to boss
    const finalEventLayer = layerNodes[layerNodes.length - 1];
    finalEventLayer.forEach(nodeId => {
      map.nodes[nodeId].connections.push('boss');
    });
  }

  private generateEventTypeDistribution(
    config: any,
    totalEvents: number
  ): EventType[] {
    const eventTypes: EventType[] = [];
    const typeKeys = Object.keys(config) as EventType[];

    // First, add fixed count events
    typeKeys.forEach(type => {
      const typeConfig = config[type];
      if (typeConfig.fixedCount && typeConfig.fixedCount > 0) {
        for (let i = 0; i < typeConfig.fixedCount; i++) {
          eventTypes.push(type);
        }
      }
    });

    // Fill remaining slots based on weights
    const remainingSlots = totalEvents - eventTypes.length;
    const weightedTypes: EventType[] = [];

    typeKeys.forEach(type => {
      const weight = config[type].weight;
      for (let i = 0; i < weight; i++) {
        weightedTypes.push(type);
      }
    });

    for (let i = 0; i < remainingSlots; i++) {
      const randomType =
        weightedTypes[Math.floor(Math.random() * weightedTypes.length)];
      eventTypes.push(randomType);
    }

    // Shuffle the array
    for (let i = eventTypes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [eventTypes[i], eventTypes[j]] = [eventTypes[j], eventTypes[i]];
    }

    return eventTypes;
  }

  private connectLayers(
    map: ChapterMap,
    fromLayer: string[],
    toLayer: string[]
  ): void {
    // Each node in previous layer connects to 1-3 nodes in next layer
    fromLayer.forEach(fromNodeId => {
      const connectionsCount = Math.min(
        toLayer.length,
        Math.max(1, Math.floor(Math.random() * 3) + 1)
      );
      const shuffledToLayer = [...toLayer].sort(() => Math.random() - 0.5);

      for (let i = 0; i < connectionsCount; i++) {
        const toNodeId = shuffledToLayer[i];
        if (!map.nodes[fromNodeId].connections.includes(toNodeId)) {
          map.nodes[fromNodeId].connections.push(toNodeId);
        }
      }
    });
  }

  private updateNodeVisibility(): void {
    const currentNode =
      this.gameState.currentMap.nodes[this.gameState.currentNodeId];
    if (!currentNode) return;

    const playerSight = this.gameState.playerParameters.sight;
    const maxVisibleLayers = Math.min(
      2,
      Math.max(1, Math.floor(playerSight / 5))
    );

    Object.values(this.gameState.currentMap.nodes).forEach(node => {
      const layerDistance = Math.abs(node.layer - currentNode.layer);

      // Nodes within sight range become visible
      if (layerDistance <= maxVisibleLayers) {
        node.isVisible = true;

        // However, if sight is too low compared to event difficulty, show as "???"
        if (
          node.eventType &&
          node.difficulty &&
          playerSight < node.difficulty * 3
        ) {
          // Will be handled in display method
        }
      }

      // Make directly connected nodes accessible
      if (currentNode.connections.includes(node.id)) {
        node.isAccessible = true;
      }
    });
  }

  private getVisibleNodes(currentNode: MapNode): string[] {
    // Return directly connected accessible nodes
    return currentNode.connections.filter(nodeId => {
      const node = this.gameState.currentMap.nodes[nodeId];
      return node && node.isAccessible;
    });
  }

  private getEventTypeName(eventType: EventType, node?: MapNode): string {
    // Check if player sight is insufficient to reveal event type
    if (
      node &&
      node.difficulty &&
      this.gameState.playerParameters.sight < node.difficulty * 3
    ) {
      return '???';
    }

    switch (eventType) {
      case 'monster':
        return 'モンスター';
      case 'elite_monster':
        return 'エリートモンスター';
      case 'port':
        return '港';
      case 'treasure':
        return '宝';
      case 'boss':
        return 'ボス';
      case 'start':
        return 'スタート地点';
      case 'unknown':
        return '???';
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
