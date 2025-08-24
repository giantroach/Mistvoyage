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

  public updateBattleDisplay(
    content: HTMLElement,
    choicesContainer: HTMLElement
  ): void {
    if (!this.gameState.battleState) return;

    const battleState = this.gameState.battleState;
    const playerParams = this.gameState.playerParameters;

    content.innerHTML = `
      <div class="battle-screen">
        <h2>⚔️ 戦闘中</h2>
        
        <div class="player-status">
          <h3>🛡️ あなたのステータス</h3>
          <div class="status-bars">
            <div class="health-bar">
              <span>HP: ${playerParams.health}/${playerParams.maxHealth}</span>
              <div class="bar">
                <div class="fill" style="width: ${
                  (playerParams.health / playerParams.maxHealth) * 100
                }%"></div>
              </div>
            </div>
          </div>
          <p>攻撃力: ${playerParams.attack} | 防御力: ${
      playerParams.defense
    }</p>
        </div>

        <div class="enemies-status">
          <h3>👹 敵のステータス</h3>
          ${battleState.monsters
            .map(
              monster => `
            <div class="enemy ${monster.hp <= 0 ? 'defeated' : ''}">
              <span>${monster.name} - HP: ${monster.hp}/${monster.maxHp}</span>
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
            ${battleState.battleLog
              .slice(-5)
              .map(log => `<p>${log}</p>`)
              .join('')}
          </div>
        </div>

        <div class="turn-info">
          <p><strong>ターン ${battleState.turnCount} - ${
      battleState.playerTurn ? 'あなたの番' : '敵の番'
    }</strong></p>
        </div>
      </div>
    `;

    this.updateBattleChoices(choicesContainer, battleState);
  }

  private updateBattleChoices(
    choicesContainer: HTMLElement,
    battleState: BattleState
  ): void {
    choicesContainer.innerHTML = '';

    // Auto-battle - show current turn status
    const statusText = document.createElement('p');
    if (battleState.playerTurn && battleState.monsters.some(m => m.hp > 0)) {
      statusText.textContent = '⚔️ あなたのターン - 自動攻撃中...';
      statusText.style.color = '#66ff66';
    } else if (!battleState.playerTurn) {
      statusText.textContent = '👹 敵のターンです...';
      statusText.style.color = '#ffaa00';
    } else {
      statusText.textContent = '戦闘終了';
      statusText.style.color = '#ffffff';
    }
    statusText.style.fontWeight = 'bold';
    statusText.style.textAlign = 'center';
    statusText.style.padding = '1rem';
    choicesContainer.appendChild(statusText);
  }

  public showBattleResultScreen(
    content: HTMLElement,
    choicesContainer: HTMLElement
  ): void {
    if (!this.gameState.battleState) return;

    const battleState = this.gameState.battleState;
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
            <li>💰 ゴールド: +${this.calculateGoldReward(
              battleState.monsters
            )}</li>
            <li>⭐ 経験値: +10</li>
          </ul>
        </div>

        <div class="current-status">
          <h3>📊 現在のステータス</h3>
          <p><strong>レベル:</strong> ${playerParams.level}</p>
          <p><strong>体力:</strong> ${playerParams.health}/${
      playerParams.maxHealth
    }</p>
          <p><strong>ゴールド:</strong> ${playerParams.gold}</p>
          <p><strong>経験値:</strong> ${playerParams.experience}/${
      playerParams.level * 100
    }</p>
        </div>
      </div>
    `;

    choicesContainer.innerHTML = '';
    const continueBtn = document.createElement('button');
    continueBtn.textContent = '⛵ 航海を続ける';
    continueBtn.className = 'choice-btn';
    continueBtn.addEventListener('click', () => {
      this.continueBattle();
    });
    choicesContainer.appendChild(continueBtn);
  }
}
