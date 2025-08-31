<template>
  <div class="battle-screen">
    <h2>⚔️ 戦闘中</h2>

    <div class="player-status">
      <h3>🛡️ あなたのステータス</h3>
      <div class="status-bars">
        <div class="health-bar">
          <span
            >HP: {{ playerParams.health }}/{{ playerParams.maxHealth }}</span
          >
          <div class="bar">
            <div
              class="fill"
              :style="{
                width:
                  (playerParams.health / playerParams.maxHealth) * 100 + '%',
              }"
            ></div>
          </div>
        </div>
      </div>
      <p>
        攻撃力: {{ playerParams.attack }} | 防御力: {{ playerParams.defense }}
      </p>
    </div>

    <div class="enemies-status">
      <h3>👹 敵のステータス</h3>
      <div
        v-for="(monster, index) in battleState.monsters"
        :key="index"
        :class="['enemy', { defeated: monster.hp <= 0 }]"
      >
        <span
          >{{ monster.name }} - HP: {{ monster.hp }}/{{ monster.maxHp }}</span
        >
        <div class="bar">
          <div
            class="fill"
            :style="{ width: (monster.hp / monster.maxHp) * 100 + '%' }"
          ></div>
        </div>
      </div>
    </div>

    <div class="battle-log">
      <h3>📜 戦闘ログ</h3>
      <div class="log-content">
        <p v-for="(log, index) in recentLogs" :key="index">{{ log }}</p>
      </div>
    </div>

    <div class="turn-info">
      <p>
        <strong>ターン {{ battleState.turnCount }} - {{ turnStatus }}</strong>
      </p>
    </div>

    <div class="battle-choices">
      <p
        :style="{
          color: statusColor,
          fontWeight: 'bold',
          textAlign: 'center',
          padding: '1rem',
        }"
      >
        {{ statusText }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { BattleState, PlayerParameters } from '@/types';

interface Props {
  battleState: BattleState;
  playerParams: PlayerParameters;
}

const props = defineProps<Props>();

const recentLogs = computed(() => {
  return props.battleState.battleLog.slice(-5);
});

const turnStatus = computed(() => {
  return props.battleState.playerTurn ? 'あなたの番' : '敵の番';
});

const statusText = computed(() => {
  if (
    props.battleState.playerTurn &&
    props.battleState.monsters.some(m => m.hp > 0)
  ) {
    return '⚔️ あなたのターン - 自動攻撃中...';
  } else if (!props.battleState.playerTurn) {
    return '👹 敵のターンです...';
  } else {
    return '戦闘終了';
  }
});

const statusColor = computed(() => {
  if (
    props.battleState.playerTurn &&
    props.battleState.monsters.some(m => m.hp > 0)
  ) {
    return '#66ff66';
  } else if (!props.battleState.playerTurn) {
    return '#ffaa00';
  } else {
    return '#ffffff';
  }
});
</script>

<style scoped>
.battle-screen {
  padding: 1rem;
}

.player-status, .enemies-status {
  margin: 1rem 0;
  padding: 1rem;
  background-color: #2a2a2a;
  border-radius: 8px;
  border: 1px solid #444;
}

.status-bars {
  margin: 0.5rem 0;
}

.health-bar {
  margin: 0.5rem 0;
}

.bar {
  width: 100%;
  height: 20px;
  background-color: #444;
  border-radius: 10px;
  overflow: hidden;
  margin: 0.25rem 0;
}

.fill {
  height: 100%;
  background-color: #4a7c59;
  transition: width 0.3s ease;
}

.enemy {
  margin: 0.5rem 0;
  padding: 0.5rem;
  background-color: #1a1a1a;
  border-radius: 4px;
}

.enemy.defeated {
  opacity: 0.5;
}

.enemy.defeated .fill {
  background-color: #666;
}

.battle-log {
  margin: 1rem 0;
  padding: 1rem;
  background-color: #2a2a2a;
  border-radius: 8px;
  border: 1px solid #444;
}

.log-content {
  max-height: 150px;
  overflow-y: auto;
  font-family: monospace;
  font-size: 0.9rem;
}

.turn-info {
  text-align: center;
  margin: 1rem 0;
  color: #66ccff;
}

.battle-choices {
  text-align: center;
  margin: 1rem 0;
}
</style>
