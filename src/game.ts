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
import { BattleManager } from './BattleManager.js';

export class MistvoyageGame {
  private gameData: GameData | null = null;
  private eventConfig: any = null;
  private gameState: GameState = this.initializeGameState();
  private isMapVisible: boolean = false;

  // Manager instances
  private mapManager: MapManager;
  private displayManager: DisplayManager;
  private saveManager: SaveManager;
  private battleManager: BattleManager;

  constructor() {
    this.mapManager = new MapManager();
    this.displayManager = new DisplayManager(this.mapManager);
    this.saveManager = new SaveManager();
    this.battleManager = new BattleManager();
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
      accuracy: 75,
      cooldown: 3000,
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
    };
  }

  private async init(): Promise<void> {
    try {
      await this.loadGameData();
      await this.battleManager.initialize();
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

      // Process event based on type
      if (node.eventType === 'monster' || node.eventType === 'elite_monster') {
        this.handleMonsterEvent();
        return; // Return early as battle will handle state changes
      } else {
        // Process other event types here
        this.processEvent(node.eventType);
      }

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

  // ==================== EVENT PROCESSING ====================

  private handleMonsterEvent(): void {
    try {
      this.battleManager.initiateBattle(this.gameState);
      this.startBattleLoop();
    } catch (error) {
      console.error('Failed to start battle:', error);
      // Fallback to normal event processing
      this.processEvent('monster');
    }
  }

  private processEvent(eventType: EventType): void {
    // Placeholder for other event types
    console.log(`Processing ${eventType} event`);

    // For now, just display a simple message
    const storyElement = document.getElementById('story-text');
    if (storyElement) {
      const eventMessages: { [key: string]: string } = {
        port: '港に到着しました。補給や修理が可能です。',
        treasure: '宝箱を発見しました！',
        unknown: '何かが起こりました...',
        boss: 'ボスとの戦闘が始まります！',
      };

      storyElement.textContent =
        eventMessages[eventType] || '謎のイベントが発生しました。';
    }
  }

  private startBattleLoop(): void {
    const battleLoop = () => {
      if (this.gameState.battleState?.isActive) {
        this.battleManager.updateBattle(this.gameState);
        this.updateBattleDisplay();

        // Use setTimeout instead of requestAnimationFrame for slower updates
        setTimeout(battleLoop, 200); // Update every 200ms instead of ~16ms
      } else if (this.gameState.battleState?.phase === 'victory') {
        // Transition to result screen instead of immediate victory handling
        this.gameState.battleState.phase = 'result_screen';
        this.showBattleResultScreen();
      } else if (this.gameState.battleState?.phase === 'defeat') {
        this.handleBattleDefeat();
      }
      // Note: result_screen phase stops the loop until user clicks continue
    };

    this.updateBattleDisplay();
    setTimeout(battleLoop, 200); // Start with 200ms delay
  }

  private handleBattleVictory(): void {
    console.log(
      'handleBattleVictory called, gamePhase before:',
      this.gameState.gamePhase
    );

    // Complete the event
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

    // Clean up battle and return to navigation
    this.battleManager.completeBattle(this.gameState);
    console.log(
      'handleBattleVictory: after completeBattle, gamePhase:',
      this.gameState.gamePhase
    );
    this.updateNodeVisibility();
    this.updateDisplay();
  }

  private handleBattleDefeat(): void {
    // Game over
    this.gameState.gamePhase = 'game_over';
    this.updateDisplay();
  }

  private updateBattleDisplay(): void {
    if (!this.gameState.battleState) return;

    const storyElement = document.getElementById('story-text');
    const choicesContainer = document.getElementById('choices-container');

    if (!storyElement || !choicesContainer) return;

    const battleState = this.gameState.battleState;

    // Display battle information
    let battleInfo = `<h3>戦闘中</h3>`;
    battleInfo += `<p><strong>敵:</strong> ${battleState.monsters
      .map(m => m.name)
      .join(', ')}</p>`;

    // Display player status
    battleInfo += `<p><strong>船体:</strong> ${this.gameState.playerParameters.hull}/${this.gameState.playerParameters.ship.hullMax}</p>`;

    // Display monster HP bars
    battleInfo += `<div class="monster-status">`;
    battleState.monsters.forEach(monster => {
      const hpPercentage = (monster.hp / monster.maxHp) * 100;
      battleInfo += `
        <div class="monster-hp">
          <span>${monster.name}</span>
          <div class="hp-bar">
            <div class="hp-fill" style="width: ${hpPercentage}%"></div>
          </div>
        </div>
      `;
    });
    battleInfo += `</div>`;

    // Display recent battle log (newest first)
    const recentLog = battleState.battleLog.slice(-10).reverse(); // Show last 10 actions, newest first
    const battleDuration = Math.floor(
      (Date.now() - battleState.startTime) / 1000
    );
    battleInfo += `<div class="battle-log">`;
    battleInfo += `<h4>戦闘ログ (経過時間: ${battleDuration}秒):</h4>`;
    recentLog.forEach(action => {
      const actor =
        action.actorType === 'player' ? 'プレイヤー' : action.actorId;
      const target =
        action.targetType === 'player' ? 'プレイヤー' : action.targetId;
      const result = action.hit ? `${action.damage}ダメージ` : 'ミス';
      const actionTime = Math.floor(
        (action.timestamp - battleState.startTime) / 1000
      );

      // Color coding for different actors
      let cssClass = '';
      if (action.actorType === 'player') {
        cssClass = 'log-player';
      } else {
        // Different colors for different monsters
        const monsterIndex = battleState.monsters.findIndex(
          m => m.id === action.actorId
        );
        cssClass = `log-monster log-monster-${monsterIndex % 4}`; // Cycle through 4 colors
      }

      battleInfo += `<p class="${cssClass}">[${actionTime}s] ${actor}の${action.weaponName} → ${target}: ${result}</p>`;
    });
    battleInfo += `</div>`;

    storyElement.innerHTML = battleInfo;

    // Clear choices during battle
    choicesContainer.innerHTML = '';

    // If battle is over, show result
    if (battleState.phase === 'defeat') {
      choicesContainer.innerHTML =
        '<button onclick="window.gameInstance.restart()">ゲームオーバー - リスタート</button>';
    }
    // Note: victory and result_screen phases are handled elsewhere
  }

  private showBattleResultScreen(): void {
    if (!this.gameState.battleState) return;

    const storyElement = document.getElementById('story-text');
    const choicesContainer = document.getElementById('choices-container');

    if (!storyElement || !choicesContainer) return;

    const battleState = this.gameState.battleState;
    const battleDuration = Math.floor(
      (Date.now() - battleState.startTime) / 1000
    );

    // Get already calculated rewards from battle manager
    const goldReward = battleState.monsters.reduce((total, monster) => {
      const reward =
        Math.floor(
          Math.random() * (monster.goldReward.max - monster.goldReward.min + 1)
        ) + monster.goldReward.min;
      return total + reward;
    }, 0);

    let resultHTML = `<div class="battle-result"><h2>🎉 戦闘勝利！</h2>`;
    resultHTML += `<p><strong>戦闘時間:</strong> ${battleDuration}秒</p>`;
    resultHTML += `<p><strong>敵を倒しました:</strong> ${battleState.monsters
      .map(m => m.name)
      .join(', ')}</p>`;

    // Show rewards
    resultHTML += `<div class="battle-rewards">`;
    resultHTML += `<h3>💰 戦利品:</h3>`;
    resultHTML += `<p>金: +${goldReward}（現在: ${this.gameState.playerParameters.money}）</p>`;
    // TODO: 将来的には武器、レリックなどの報酬も表示
    resultHTML += `</div>`;

    // Show complete battle log
    resultHTML += `<div class="battle-log">`;
    resultHTML += `<h3>📋 戦闘ログ:</h3>`;
    resultHTML += `<div class="battle-log-complete">`;

    // Show all battle log entries (newest first)
    const completeLog = [...battleState.battleLog].reverse();
    completeLog.forEach(action => {
      const actor =
        action.actorType === 'player' ? 'プレイヤー' : action.actorId;
      const target =
        action.targetType === 'player' ? 'プレイヤー' : action.targetId;
      const result = action.hit ? `${action.damage}ダメージ` : 'ミス';
      const actionTime = Math.floor(
        (action.timestamp - battleState.startTime) / 1000
      );

      // Color coding
      let cssClass = '';
      if (action.actorType === 'player') {
        cssClass = 'log-player';
      } else {
        const monsterIndex = battleState.monsters.findIndex(
          m => m.id === action.actorId
        );
        cssClass = `log-monster log-monster-${monsterIndex % 4}`;
      }

      resultHTML += `<p class="${cssClass}">[${actionTime}s] ${actor}の${action.weaponName} → ${target}: ${result}</p>`;
    });

    resultHTML += `</div></div></div>`; // Close battle-result div

    storyElement.innerHTML = resultHTML;

    // Show continue button
    choicesContainer.innerHTML = `
      <button onclick="window.gameInstance.continueBattle()">マップに戻る</button>
    `;
  }

  private calculateGoldReward(monsters: any[]): number {
    return monsters.reduce((total, monster) => {
      const reward =
        Math.floor(
          Math.random() * (monster.goldReward.max - monster.goldReward.min + 1)
        ) + monster.goldReward.min;
      return total + reward;
    }, 0);
  }

  public continueBattle(): void {
    console.log(
      'continueBattle called, battleState phase:',
      this.gameState.battleState?.phase
    );
    console.log('continueBattle called, gamePhase:', this.gameState.gamePhase);
    if (this.gameState.battleState?.phase === 'result_screen') {
      this.handleBattleVictory();
    }
  }

  public restart(): void {
    // Reset game state to initial state
    this.gameState = this.initializeGameState();
    this.startGame();
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
