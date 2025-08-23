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
  private isMapVisible: boolean = false;

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
    
    const currentNodeInfo = currentNode ? this.getEventTypeName(currentNode.eventType || 'unknown') : '不明';
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
    const currentNode =
      this.gameState.currentMap.nodes[this.gameState.currentNodeId];
    if (!currentNode) return '';

    let mapHtml = '<div class="map-container scrollable">';
    mapHtml += '<h3>周辺の海域</h3>';

    // Show all visible layers within extended sight range (up to the end of the map)
    const visibleNodes: MapNode[] = [];
    Object.values(this.gameState.currentMap.nodes).forEach(node => {
      visibleNodes.push(node);
    });

    // Group nodes by layer
    const nodesByLayer: { [layer: number]: MapNode[] } = {};
    visibleNodes.forEach(node => {
      if (!nodesByLayer[node.layer]) {
        nodesByLayer[node.layer] = [];
      }
      nodesByLayer[node.layer].push(node);
    });

    const layers = Object.keys(nodesByLayer)
      .map(Number)
      .sort((a, b) => a - b);

    // Constants for layout
    const nodeWidth = 180;
    const nodeHeight = 80;
    const layerSpacing = 250;
    const layerPadding = 50;
    const mapHeight = 500;
    
    // Calculate positions with center alignment
    const nodePositions: { [nodeId: string]: { 
      centerX: number; 
      centerY: number;
      leftX: number;
      rightX: number;
      topY: number;
      bottomY: number;
    } } = {};
    
    layers.forEach((layer, layerIndex) => {
      const layerNodes = nodesByLayer[layer];
      const totalLayerHeight = layerNodes.length * nodeHeight + (layerNodes.length - 1) * 20;
      const availableHeight = mapHeight - 80; // Account for header space (40px top + 40px bottom)
      const startY = (availableHeight - totalLayerHeight) / 2 + 40; // Center vertically with proper spacing
      
      layerNodes.forEach((node, nodeIndex) => {
        const centerX = layerIndex * layerSpacing + layerPadding + (nodeWidth / 2);
        const centerY = startY + nodeIndex * (nodeHeight + 20) + (nodeHeight / 2);
        
        nodePositions[node.id] = {
          centerX,
          centerY,
          leftX: centerX - (nodeWidth / 2),
          rightX: centerX + (nodeWidth / 2),
          topY: centerY - (nodeHeight / 2),
          bottomY: centerY + (nodeHeight / 2)
        };
      });
    });

    // Calculate total map width for SVG - ensure it covers all layers with extra margin
    const totalWidth = Math.max(
      (layers.length - 1) * layerSpacing + layerPadding * 2 + nodeWidth,
      layers.length * layerSpacing + layerPadding * 2 + nodeWidth + 100 // Extra margin for safety
    );
    
    // Generate SVG for connections
    let svgConnections = `<svg class="map-connections" xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${mapHeight}" viewBox="0 0 ${totalWidth} ${mapHeight}">`;

    // Draw connection lines - show ALL connections regardless of distance
    Object.values(this.gameState.currentMap.nodes).forEach(node => {
      if (node.connections && node.connections.length > 0 && nodePositions[node.id]) {
        node.connections.forEach(connectedNodeId => {
          const connectedNode = this.gameState.currentMap.nodes[connectedNodeId];
          if (connectedNode && nodePositions[connectedNodeId]) {
            const fromPos = nodePositions[node.id];
            const toPos = nodePositions[connectedNodeId];
            
            const isCurrentPath = (node.id === this.gameState.currentNodeId || 
                                  this.gameState.visitedNodes.has(node.id)) &&
                                  node.connections.includes(connectedNodeId);
            
            // Calculate distance from current node for styling
            const fromDistance = Math.abs(node.layer - currentNode.layer);
            const toDistance = Math.abs(connectedNode.layer - currentNode.layer);
            const isDistantConnection = fromDistance >= 3 || toDistance >= 3;
            
            // Calculate connection points on the edges of the boxes
            let x1, y1, x2, y2;
            
            // From node: use right edge (since we're going to next layer)
            x1 = fromPos.rightX;
            y1 = fromPos.centerY;
            
            // To node: use left edge (since we're coming from previous layer)  
            x2 = toPos.leftX;
            y2 = toPos.centerY;
            
            // If nodes are on the same layer (shouldn't happen in this design but safety check)
            if (node.layer === connectedNode.layer) {
              // Use top/bottom connection for same layer
              if (fromPos.centerY < toPos.centerY) {
                x1 = fromPos.centerX;
                y1 = fromPos.bottomY;
                x2 = toPos.centerX;
                y2 = toPos.topY;
              } else {
                x1 = fromPos.centerX;
                y1 = fromPos.topY;
                x2 = toPos.centerX;
                y2 = toPos.bottomY;
              }
            }
            
            let connectionClass = 'map-connection';
            if (isCurrentPath) {
              connectionClass += ' active';
            }
            if (isDistantConnection) {
              connectionClass += ' distant';
            }
            
            // Adjust line visibility based on distance and current path
            let strokeWidth = isCurrentPath ? '3' : (isDistantConnection ? '1' : '2');
            let strokeColor = isCurrentPath ? '#66ccff' : (isDistantConnection ? '#999' : '#666');
            let opacity = isCurrentPath ? '1' : (isDistantConnection ? '0.8' : '0.9');
            
            svgConnections += `<line x1="${x1}" y1="${y1}" `;
            svgConnections += `x2="${x2}" y2="${y2}" `;
            svgConnections += `class="${connectionClass}" `;
            svgConnections += `stroke="${strokeColor}" stroke-width="${strokeWidth}" opacity="${opacity}" />`;
          }
        });
      }
    });
    

    svgConnections += '</svg>';
    mapHtml += svgConnections;

    // Render each layer
    layers.forEach((layer, layerIndex) => {
      const layerNodes = nodesByLayer[layer];
      const totalLayerHeight = layerNodes.length * nodeHeight + (layerNodes.length - 1) * 20;
      const availableHeight = mapHeight - 80; // Account for header space
      const startY = (availableHeight - totalLayerHeight) / 2 + 40; // Center vertically with proper spacing
      
      mapHtml += `<div class="map-layer" style="left: ${layerIndex * layerSpacing + layerPadding}px;">`;
      mapHtml += `<div class="layer-label">レイヤー ${layer}</div>`;
      mapHtml += `<div class="layer-nodes">`;

      layerNodes.forEach((node, nodeIndex) => {
        const isCurrentNode = node.id === this.gameState.currentNodeId;
        const isAccessible = node.isAccessible;
        const isVisited = this.gameState.visitedNodes.has(node.id);
        const layerDistance = Math.abs(layer - currentNode.layer);

        let nodeClass = 'map-node';
        if (isCurrentNode) nodeClass += ' current';
        if (isAccessible) nodeClass += ' accessible';
        if (isVisited) nodeClass += ' visited';
        if (layerDistance > 2) nodeClass += ' distant';

        // Apply masking for events 3+ layers away
        let displayName;
        if (layerDistance >= 3) {
          displayName = '???';
        } else {
          displayName = node.eventType
            ? this.getEventTypeName(node.eventType, node)
            : '???';
        }

        const nodeY = startY + nodeIndex * (nodeHeight + 20);
        // Account for border width (2px on each side = 4px total) to prevent overflow
        const adjustedNodeWidth = nodeWidth - 4;
        
        // Add click handler for accessible nodes
        const clickHandler = (node.isAccessible && this.gameState.gamePhase === 'navigation') 
          ? `onclick="window.gameInstance.navigateToNode('${node.id}')"` 
          : '';
        const cursorStyle = (node.isAccessible && this.gameState.gamePhase === 'navigation') 
          ? 'cursor: pointer;' 
          : '';
        
        mapHtml += `<div class="${nodeClass}" title="${displayName}" `;
        mapHtml += `style="position: absolute; top: ${nodeY}px; left: 2px; width: ${adjustedNodeWidth}px; height: ${nodeHeight}px; ${cursorStyle}" `;
        mapHtml += `${clickHandler}>`;
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

      // Each layer can have 1-4 events (maximum 4 per layer)
      const branchCount = Math.min(
        4,
        Math.max(1, Math.floor(Math.random() * 4) + 1)
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

      // Connect previous layer nodes to current layer ensuring no orphans
      this.connectLayersWithOrphanPrevention(map, previousLayer, currentLayerNodes);
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

  private connectLayersWithOrphanPrevention(
    map: ChapterMap,
    fromLayer: string[],
    toLayer: string[]
  ): void {
    // First pass: each node in previous layer connects to 1-3 nodes in next layer
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

    // Second pass: ensure all nodes in next layer have at least one connection
    const connectedNodes = new Set<string>();
    fromLayer.forEach(fromNodeId => {
      map.nodes[fromNodeId].connections.forEach(toNodeId => {
        connectedNodes.add(toNodeId);
      });
    });

    // Connect orphan nodes to random previous layer node
    toLayer.forEach(toNodeId => {
      if (!connectedNodes.has(toNodeId)) {
        const randomFromNode = fromLayer[Math.floor(Math.random() * fromLayer.length)];
        if (!map.nodes[randomFromNode].connections.includes(toNodeId)) {
          map.nodes[randomFromNode].connections.push(toNodeId);
        }
      }
    });
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

    // Reset accessibility first
    Object.values(this.gameState.currentMap.nodes).forEach(node => {
      node.isAccessible = false;
    });

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
    });

    // Make only directly connected nodes accessible
    currentNode.connections.forEach(connectedNodeId => {
      const connectedNode = this.gameState.currentMap.nodes[connectedNodeId];
      if (connectedNode) {
        connectedNode.isAccessible = true;
      }
    });
  }

  private getVisibleNodes(currentNode: MapNode): string[] {
    // Return only directly connected accessible nodes (restricted by connections)
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

  public navigateToNode(nodeId: string): void {
    // Check if navigation is valid (only accessible nodes can be selected)
    const node = this.gameState.currentMap.nodes[nodeId];
    if (!node || !node.isAccessible || this.gameState.gamePhase !== 'navigation') {
      console.log(`Navigation to ${nodeId} not allowed: accessible=${node?.isAccessible}, phase=${this.gameState.gamePhase}`);
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
    const node = this.gameState.currentMap.nodes[nodeId];
    if (!node) return;

    // Wait for the display to update, then scroll
    setTimeout(() => {
      const mapContainer = document.querySelector('.map-container.scrollable') as HTMLElement;
      if (!mapContainer) return;

      // Calculate scroll position based on node's layer
      const layerSpacing = 250;
      const layerPadding = 50;
      const targetScrollLeft = node.layer * layerSpacing;

      // Smooth scroll to the target position
      mapContainer.scrollTo({
        left: targetScrollLeft,
        behavior: 'smooth'
      });
    }, 100); // Small delay to ensure DOM is updated
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
      const storyHeader = document.querySelector('.story-header') as HTMLElement;
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
