<template>
  <div class="battle-screen">
    <h2>⚔️ 戦闘中</h2>

    <!-- 武器クールダウン表示 -->
    <div class="weapons-cooldown" v-if="playerWeaponCooldowns.length > 0">
      <h3>🗡️ 武器状況</h3>
      <div class="weapon-cooldown-list">
        <div
          v-for="weapon in playerWeaponCooldowns"
          :key="weapon.name"
          class="weapon-cooldown-item"
        >
          <div class="weapon-info">
            <span class="weapon-name">{{ weapon.name }}</span>
            <span class="weapon-status" :class="{ ready: weapon.isReady }">
              {{
                weapon.isReady
                  ? '準備完了'
                  : Math.ceil(weapon.remainingTime / 1000) + '秒'
              }}
            </span>
          </div>
          <div class="weapon-cooldown-bar">
            <div
              class="weapon-cooldown-fill"
              :class="{ ready: weapon.isReady }"
              :style="{ width: 100 - weapon.cooldownPercent + '%' }"
            ></div>
          </div>
        </div>
      </div>
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
      <div class="log-content" v-html="formattedBattleLog"></div>
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

// プレイヤー武器のクールダウン状況を計算
const playerWeaponCooldowns = computed(() => {
  if (!props.battleState.weaponCooldowns) return [];

  return props.playerParams.weapons.map(weapon => {
    const cooldownInfo = props.battleState.weaponCooldowns?.player?.[weapon.id];
    if (!cooldownInfo) {
      return {
        name: weapon.name,
        cooldownPercent: 0,
        remainingTime: 0,
        isReady: true,
      };
    }

    return {
      name: weapon.name,
      cooldownPercent: cooldownInfo.cooldownPercent || 0,
      remainingTime: cooldownInfo.remainingTime || 0,
      isReady: cooldownInfo.isReady || cooldownInfo.remainingTime <= 0,
    };
  });
});

const formatElapsedTime = (timestamp: number): string => {
  if (!props.battleState.startTime || !timestamp) {
    return '[0.0s]';
  }
  const elapsed = (timestamp - props.battleState.startTime) / 1000;
  return `[${elapsed.toFixed(1)}s]`;
};

const formattedBattleLog = computed(() => {
  return recentLogs.value
    .slice()
    .reverse() // Show newest first
    .map(entry => {
      let timePrefix = '';
      let content = '';

      if (typeof entry === 'string') {
        timePrefix = '[0.0s]'; // Legacy string entries get default time
        content = entry;
        return `<p style="background-color: #444; padding: 0.5rem; margin: 0.2rem 0; border-radius: 4px;"><span style="color: #888; font-size: 0.8em;">${timePrefix}</span> ${content}</p>`;
      } else if (entry.actorType && entry.weaponName) {
        timePrefix = formatElapsedTime(entry.timestamp);
        const actor = entry.actorType === 'player' ? 'あなた' : entry.actorId;
        const result = entry.hit
          ? entry.critical
            ? `${entry.damage}ダメージ (クリティカル!)`
            : `${entry.damage}ダメージ`
          : 'ミス';
        content = `${actor}の${entry.weaponName}: ${result}`;
        const backgroundColor =
          entry.actorType === 'player' ? '#2a4a2a' : '#4a2a2a'; // Green for player, red for enemy
        return `<p style="background-color: ${backgroundColor}; padding: 0.5rem; margin: 0.2rem 0; border-radius: 4px; border-left: 4px solid ${
          entry.actorType === 'player' ? '#66ff66' : '#ff6666'
        };"><span style="color: #888; font-size: 0.8em;">${timePrefix}</span> ${content}</p>`;
      } else if (entry.type === 'status') {
        // Handle status messages
        timePrefix = formatElapsedTime(entry.timestamp);
        content = entry.message;
        return `<p style="background-color: #444; padding: 0.5rem; margin: 0.2rem 0; border-radius: 4px; color: #ffcc00;"><span style="color: #888; font-size: 0.8em;">${timePrefix}</span> ${content}</p>`;
      } else if (entry.type === 'victory') {
        // Handle victory messages
        timePrefix = formatElapsedTime(entry.timestamp);
        content = entry.message;
        return `<p style="background-color: #2a4a2a; padding: 0.5rem; margin: 0.2rem 0; border-radius: 4px; color: #66ff66; font-weight: bold;"><span style="color: #888; font-size: 0.8em;">${timePrefix}</span> ${content}</p>`;
      } else if (entry.type === 'defeat') {
        // Handle defeat messages
        timePrefix = formatElapsedTime(entry.timestamp);
        content = entry.message;
        return `<p style="background-color: #4a2a2a; padding: 0.5rem; margin: 0.2rem 0; border-radius: 4px; color: #ff6666; font-weight: bold;"><span style="color: #888; font-size: 0.8em;">${timePrefix}</span> ${content}</p>`;
      } else if (entry.type === 'battle_end') {
        // Handle battle end messages
        timePrefix = formatElapsedTime(entry.timestamp);
        content = entry.message;
        return `<p style="background-color: #333; padding: 0.5rem; margin: 0.2rem 0; border-radius: 4px; color: #ccc; font-weight: bold;"><span style="color: #888; font-size: 0.8em;">${timePrefix}</span> ${content}</p>`;
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
      timePrefix = formatElapsedTime(entry.timestamp || 0);
      return `<p style="background-color: #333; padding: 0.5rem; margin: 0.2rem 0; border-radius: 4px; color: #ccc;"><span style="color: #888; font-size: 0.8em;">${timePrefix}</span> ${message}</p>`;
    })
    .join('');
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

.enemies-status {
  margin: 1rem 0;
  padding: 1rem;
  background-color: #2a2a2a;
  border-radius: 8px;
  border: 1px solid #444;
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
  text-align: left;
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

/* 武器クールダウン表示のスタイル */
.weapons-cooldown {
  margin: 1rem 0;
  padding: 0.75rem;
  background-color: #2a3a2a;
  border-radius: 6px;
  border: 1px solid #446644;
}

.weapons-cooldown h4 {
  margin: 0 0 0.5rem 0;
  color: #66ff88;
  font-size: 0.9rem;
}

.weapon-cooldown-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.weapon-cooldown-item {
  background-color: #1a2a1a;
  border-radius: 4px;
  padding: 0.5rem;
  border: 1px solid #334433;
}

.weapon-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.weapon-name {
  font-weight: bold;
  color: #ccffcc;
  font-size: 0.8rem;
}

.weapon-status {
  font-size: 0.7rem;
  color: #ffcc66;
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
  background-color: #3a3a1a;
}

.weapon-status.ready {
  color: #66ff66;
  background-color: #1a3a1a;
  animation: pulse-ready 1.5s ease-in-out infinite alternate;
}

.weapon-cooldown-bar {
  width: 100%;
  height: 8px;
  background-color: #333;
  border-radius: 4px;
  overflow: hidden;
}

.weapon-cooldown-fill {
  height: 10px;
  background-color: #4a7c59;
  transition: width 0.2s ease;
}

.weapon-cooldown-fill.ready {
  background-color: #66ff66;
  animation: pulse-fill 1.5s ease-in-out infinite alternate;
}

@keyframes pulse-ready {
  0% {
    opacity: 0.8;
  }
  100% {
    opacity: 1;
  }
}

@keyframes pulse-fill {
  0% {
    opacity: 0.7;
  }
  100% {
    opacity: 1;
  }
}
</style>
