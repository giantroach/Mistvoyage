import { GameState, BattleState, PlayerParameters } from './types';

export class CombatSystem {
  constructor(
    private gameState: GameState,
    private updateDisplayCallback?: () => void,
    private updateNodeVisibilityCallback?: () => void
  ) {}

  public handleMonsterEvent(): BattleState {
    const currentNode =
      this.gameState.currentMap.nodes[this.gameState.currentNodeId];
    if (!currentNode || !currentNode.eventType) {
      throw new Error('Invalid monster event');
    }

    let monsters;
    if (currentNode.eventType === 'elite_monster') {
      monsters = [
        {
          id: 'elite_goblin',
          name: 'エリートゴブリン',
          description: 'より強力なゴブリン',
          hp: 80,
          maxHp: 80,
          speed: 5,
          weapons: [],
          goldReward: { min: 40, max: 60 },
          difficulty: 3,
          chapters: [1],
          effects: [],
          attack: 25,
          defense: 8,
        },
      ];
    } else {
      monsters = [
        {
          id: 'goblin',
          name: 'ゴブリン',
          description: '小さな敵',
          hp: 30,
          maxHp: 30,
          speed: 3,
          weapons: [],
          goldReward: { min: 15, max: 25 },
          difficulty: 1,
          chapters: [1],
          effects: [],
          attack: 15,
          defense: 3,
        },
      ];
    }

    const battleState: BattleState = {
      isActive: true,
      phase: 'combat',
      monsters: monsters,
      playerWeapons: [],
      battleLog: ['戦闘開始！'],
      startTime: Date.now(),
      playerEffects: [],
      playerTurn: true,
      turnCount: 1,
    };

    this.gameState.battleState = battleState;
    this.gameState.gamePhase = 'combat';

    return battleState;
  }

  public startBattleLoop(): void {
    if (!this.gameState.battleState) return;

    const battleState = this.gameState.battleState;

    if (battleState.playerTurn) {
      // Auto-execute player turn
      this.performPlayerAttack();
    } else {
      // Enemy turn
      this.handleEnemyTurn();
    }
  }

  private handleEnemyTurn(): void {
    if (!this.gameState.battleState) return;

    const battleState = this.gameState.battleState;
    const aliveMonsters = battleState.monsters.filter(m => m.hp > 0);

    for (const monster of aliveMonsters) {
      const damage = Math.max(
        1,
        monster.attack - this.gameState.playerParameters.defense
      );
      this.gameState.playerParameters.health -= damage;

      battleState.battleLog.push(
        `${monster.name}の攻撃！ ${damage}のダメージ！`
      );

      if (this.gameState.playerParameters.health <= 0) {
        this.gameState.playerParameters.health = 0;
        battleState.battleLog.push('あなたは倒れました...');
        this.gameState.gamePhase = 'game_over';
        return;
      }
    }

    battleState.playerTurn = true;
    battleState.turnCount++;
  }

  public performPlayerAttack(): void {
    if (!this.gameState.battleState || !this.gameState.battleState.playerTurn)
      return;

    const battleState = this.gameState.battleState;
    const aliveMonsters = battleState.monsters.filter(m => m.hp > 0);

    if (aliveMonsters.length === 0) return;

    // Attack first alive monster
    const target = aliveMonsters[0];
    const damage = Math.max(
      1,
      this.gameState.playerParameters.attack - target.defense
    );
    target.hp -= damage;

    battleState.battleLog.push(
      `あなたの攻撃！ ${target.name}に${damage}のダメージ！`
    );

    if (target.hp <= 0) {
      target.hp = 0;
      battleState.battleLog.push(`${target.name}を倒した！`);
    }

    // Check if all monsters are defeated
    if (battleState.monsters.every(m => m.hp <= 0)) {
      this.handleBattleVictory();
      return;
    }

    battleState.playerTurn = false;

    // Update display and continue battle loop for auto-battle
    this.updateDisplayCallback?.();
    setTimeout(() => {
      this.startBattleLoop();
    }, 500);
  }

  public handleBattleVictory(): void {
    if (!this.gameState.battleState) return;

    const goldReward = this.calculateGoldReward(
      this.gameState.battleState.monsters
    );
    this.gameState.playerParameters.gold += goldReward;
    this.gameState.playerParameters.experience += 10;

    // Level up logic
    const expToNextLevel = this.gameState.playerParameters.level * 100;
    if (this.gameState.playerParameters.experience >= expToNextLevel) {
      this.gameState.playerParameters.level++;
      this.gameState.playerParameters.experience -= expToNextLevel;

      // Stat increases on level up
      this.gameState.playerParameters.maxHealth += 20;
      this.gameState.playerParameters.health =
        this.gameState.playerParameters.maxHealth;
      this.gameState.playerParameters.attack += 5;
      this.gameState.playerParameters.defense += 3;
    }

    this.gameState.battleState.battleLog.push('戦闘に勝利しました！');
    this.gameState.battleState.battleLog.push(`${goldReward}ゴールドを獲得！`);
    this.gameState.battleState.battleLog.push('10経験値を獲得！');

    if (
      this.gameState.playerParameters.level >
      this.gameState.playerParameters.level - 1
    ) {
      this.gameState.battleState.battleLog.push('レベルアップ！');
    }

    this.gameState.gamePhase = 'battle_result';
    this.updateDisplayCallback?.();
  }

  public handleBattleDefeat(): void {
    this.gameState.gamePhase = 'game_over';
  }

  private calculateGoldReward(monsters: any[]): number {
    let totalGold = 0;
    for (const monster of monsters) {
      if (monster.id === 'elite_goblin') {
        totalGold += 50;
      } else {
        totalGold += 20;
      }
    }
    return totalGold;
  }

  public continueBattle(): void {
    if (this.gameState.battleState) {
      this.gameState.battleState = undefined;
    }

    this.gameState.eventsCompleted++;

    // Check if chapter is complete and enable boss node
    const requiredEvents = 3; // This should come from chapter config
    if (this.gameState.eventsCompleted >= requiredEvents) {
      const bossNode = this.gameState.currentMap.nodes['boss'];
      if (bossNode) {
        bossNode.isAccessible = true;
        bossNode.isVisible = true;
      }
    }

    this.gameState.gamePhase = 'navigation';

    // Update node visibility after battle completion
    this.updateNodeVisibilityCallback?.();

    this.updateDisplayCallback?.();
  }

  // UI methods removed - now handled by Vue components
}
