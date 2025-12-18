<template>
  <div class="game-stats">
    <div class="header">
      <div>
        <p class="eyebrow">对局态势</p>
        <h3>Game Snapshot</h3>
      </div>
      <span class="pill" :class="currentPlayer === 1 ? 'black' : 'white'">
        轮到：{{ currentPlayer === 1 ? '黑' : '白' }}
      </span>
    </div>

    <div class="stats-section">
      <div class="stat-row">
        <span class="stat-label">总步数</span>
        <span class="stat-value">{{ moveHistory.length }}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">黑棋</span>
        <span class="stat-value">{{ evaluation.blackStones }} 子</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">白棋</span>
        <span class="stat-value">{{ evaluation.whiteStones }} 子</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">黑方捕获</span>
        <span class="stat-value">{{ evaluation.blackCaptures ?? 0 }}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">白方捕获</span>
        <span class="stat-value">{{ evaluation.whiteCaptures ?? 0 }}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">黑方领地</span>
        <span class="stat-value">{{ evaluation.blackTerritory ?? 0 }}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">白方领地</span>
        <span class="stat-value">{{ evaluation.whiteTerritory ?? 0 }}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">黑方得分</span>
        <span class="stat-value">{{ evaluation.blackScore?.toFixed(1) ?? '0.0' }}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">白方得分</span>
        <span class="stat-value">{{ evaluation.whiteScore?.toFixed(1) ?? '0.0' }}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">黑方胜率</span>
        <span class="stat-value black">{{ (blackWinRate * 100).toFixed(1) }}%</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">白方胜率</span>
        <span class="stat-value white">{{ (whiteWinRate * 100).toFixed(1) }}%</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">AI 模式</span>
        <span class="stat-value">{{ aiModeName }}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">状态</span>
        <span class="stat-value" :class="gameStore.isConnected ? 'connected' : 'disconnected'">
          {{ gameStore.isConnected ? '已连接' : '未连接' }}
        </span>
      </div>
      <div class="stat-row" v-if="gameStore.isThinking">
        <span class="stat-label">AI 思考中…</span>
        <span class="stat-value">...</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGameStore } from '../stores/game'

const gameStore = useGameStore()
const evaluation = computed(() => gameStore.evaluation)
const moveHistory = computed(() => gameStore.moveHistory)
const currentPlayer = computed(() => gameStore.currentPlayer)

const blackWinRate = computed(() => {
  if (evaluation.value.winRate === undefined) return 0.5
  const safe = Math.max(0.0, Math.min(1.0, evaluation.value.winRate))
  return safe
})

const whiteWinRate = computed(() => {
  const rate = 1.0 - blackWinRate.value
  return Math.max(0.0, Math.min(1.0, rate))
})

const aiModeName = computed(() => {
  const modeMap = {
    policy: '策略网络',
    value: '价值网络',
    mcts: 'MCTS 搜索',
    hybrid: '混合模式'
  }
  return modeMap[gameStore.aiMode] || gameStore.aiMode
})
</script>

<style scoped>
.game-stats {
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.eyebrow {
  margin: 0;
  color: var(--text-muted);
  font-size: 11px;
}

h3 {
  margin: 2px 0 0 0;
  font-size: 15px;
}

.stats-section {
  display: grid;
  grid-template-columns: 1fr;
  gap: 4px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color);
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.stat-value {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.stat-value.black {
  color: #0f0f0f;
  background: rgba(92, 214, 195, 0.8);
  padding: 4px 8px;
  border-radius: 8px;
}

.stat-value.white {
  color: #101522;
  background: rgba(122, 167, 255, 0.8);
  padding: 4px 8px;
  border-radius: 8px;
}

.stat-value.connected {
  color: var(--accent-color);
}

.stat-value.disconnected {
  color: var(--danger);
}

.pill {
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background: rgba(255, 255, 255, 0.04);
}

.pill.black {
  border-color: rgba(92, 214, 195, 0.6);
}

.pill.white {
  border-color: rgba(122, 167, 255, 0.6);
}
</style>
