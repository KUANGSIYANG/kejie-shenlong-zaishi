<template>
  <div class="game-stats">
    <h3>对局数据</h3>
    <div class="stats-section">
      <div class="stat-group">
        <div class="stat-row">
          <span class="stat-label">当前玩家:</span>
          <span :class="['stat-value', currentPlayer === 1 ? 'black' : 'white']">
            {{ currentPlayer === 1 ? '黑' : '白' }}
          </span>
        </div>
        <div class="stat-row">
          <span class="stat-label">总步数:</span>
          <span class="stat-value">{{ moveHistory.length }}</span>
        </div>
      </div>
      
      <div class="stat-divider"></div>
      
      <div class="stat-group">
        <div class="stat-row">
          <span class="stat-label">黑棋:</span>
          <span class="stat-value black">{{ evaluation.blackStones }} 子</span>
        </div>
      <div class="stat-row">
          <span class="stat-label">白棋:</span>
          <span class="stat-value white">{{ evaluation.whiteStones }} 子</span>
        </div>
        <div class="stat-row" v-if="evaluation.blackCaptures !== undefined">
          <span class="stat-label">黑方吃子:</span>
          <span class="stat-value">{{ evaluation.blackCaptures }}</span>
        </div>
        <div class="stat-row" v-if="evaluation.whiteCaptures !== undefined">
          <span class="stat-label">白方吃子:</span>
          <span class="stat-value">{{ evaluation.whiteCaptures }}</span>
        </div>
        <div class="stat-row" v-if="evaluation.blackTerritory !== undefined">
          <span class="stat-label">黑方领地:</span>
          <span class="stat-value">{{ evaluation.blackTerritory }}</span>
        </div>
        <div class="stat-row" v-if="evaluation.whiteTerritory !== undefined">
          <span class="stat-label">白方领地:</span>
          <span class="stat-value">{{ evaluation.whiteTerritory }}</span>
        </div>
        <div class="stat-row" v-if="evaluation.blackScore !== undefined">
          <span class="stat-label">黑方得分:</span>
          <span class="stat-value">{{ evaluation.blackScore.toFixed(1) }}</span>
        </div>
        <div class="stat-row" v-if="evaluation.whiteScore !== undefined">
          <span class="stat-label">白方得分:</span>
          <span class="stat-value">{{ evaluation.whiteScore.toFixed(1) }}</span>
        </div>
      </div>
      
      <div class="stat-divider" v-if="evaluation.winRate !== undefined"></div>
      
      <div class="stat-group" v-if="evaluation.winRate !== undefined">
      <div class="stat-row">
          <span class="stat-label">黑方胜率:</span>
          <span class="stat-value black">
            {{ (blackWinRate * 100).toFixed(1) }}%
          </span>
        </div>
        <div class="stat-row">
          <span class="stat-label">白方胜率:</span>
          <span class="stat-value white">
            {{ (whiteWinRate * 100).toFixed(1) }}%
          </span>
        </div>
        <div class="stat-row" v-if="evaluation.komi !== undefined">
          <span class="stat-label">贴目:</span>
          <span class="stat-value">{{ evaluation.komi }}</span>
        </div>
      </div>
      
      <div class="stat-divider"></div>
      
      <div class="stat-group">
        <div class="stat-row">
          <span class="stat-label">AI模式:</span>
          <span class="stat-value">{{ aiModeName }}</span>
      </div>
      <div class="stat-row">
          <span class="stat-label">状态:</span>
          <span class="stat-value" :class="gameStore.isConnected ? 'connected' : 'disconnected'">
            {{ gameStore.isConnected ? '已连接' : '未连接' }}
          </span>
        </div>
        <div class="stat-row" v-if="gameStore.isThinking">
          <span class="stat-label">AI思考中...</span>
        </div>
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

// 计算黑白两方胜率，确保和为100%
const blackWinRate = computed(() => {
  if (evaluation.value.winRate === undefined) return 0.5
  let winRate = Math.max(0.0, Math.min(1.0, evaluation.value.winRate))
  return winRate
})

const whiteWinRate = computed(() => {
  // 确保两方胜率之和为1（100%）
  return 1.0 - blackWinRate.value
})

const aiModeName = computed(() => {
  const modeMap = {
    'policy': '策略网络',
    'value': '价值网络',
    'mcts': 'MCTS搜索',
    'hybrid': '混合模式'
  }
  return modeMap[gameStore.aiMode] || gameStore.aiMode
})
</script>

<style scoped>
.game-stats {
  margin-bottom: 20px;
}

h3 {
  margin-bottom: 12px;
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 600;
}

.stats-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-divider {
  height: 1px;
  background: var(--border-color);
  margin: 8px 0;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.stat-row:hover {
  background: rgba(255, 255, 255, 0.05);
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  flex: 1;
}

.stat-value {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
}

.stat-value.black {
  color: #333;
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 6px;
  border-radius: 3px;
}

.stat-value.white {
  color: #fff;
  background: rgba(255, 255, 255, 0.3);
  padding: 2px 6px;
  border-radius: 3px;
}

.stat-value.connected {
  color: #4ade80;
}

.stat-value.disconnected {
  color: #f87171;
}
</style>
