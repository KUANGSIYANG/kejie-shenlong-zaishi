<template>
  <div class="game-stats">
    <h4>对局数据</h4>
    
    <div class="stats-section">
      <div class="stat-row">
        <span class="stat-label">黑棋:</span>
        <span class="stat-value">{{ evaluation.blackStones }} 子</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">白棋:</span>
        <span class="stat-value">{{ evaluation.whiteStones }} 子</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">差距:</span>
        <span class="stat-value" :class="getDiffClass()">
          {{ Math.abs(evaluation.blackStones - evaluation.whiteStones) }}
        </span>
      </div>
    </div>
    
    <div class="stats-section">
      <div class="stat-row">
        <span class="stat-label">总步数:</span>
        <span class="stat-value">{{ moveHistory.length }}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">当前玩家:</span>
        <span class="stat-value" :class="currentPlayer === 1 ? 'black' : 'white'">
          {{ currentPlayer === 1 ? '黑' : '白' }}
        </span>
      </div>
    </div>
    
    <div class="progress-bar">
      <div class="progress-label">棋子数对比</div>
      <div class="progress-container">
        <div 
          class="progress-fill black" 
          :style="{ width: blackPercentage + '%' }"
        ></div>
        <div 
          class="progress-fill white" 
          :style="{ width: whitePercentage + '%' }"
        ></div>
      </div>
      <div class="progress-text">
        <span>黑: {{ evaluation.blackStones }}</span>
        <span>白: {{ evaluation.whiteStones }}</span>
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

const totalStones = computed(() => {
  return evaluation.value.blackStones + evaluation.value.whiteStones || 1
})

const blackPercentage = computed(() => {
  return (evaluation.value.blackStones / totalStones.value) * 100
})

const whitePercentage = computed(() => {
  return (evaluation.value.whiteStones / totalStones.value) * 100
})

const getDiffClass = () => {
  const diff = evaluation.value.blackStones - evaluation.value.whiteStones
  if (Math.abs(diff) < 5) return 'even'
  return diff > 0 ? 'black-advantage' : 'white-advantage'
}
</script>

<style scoped>
.game-stats {
  background: white;
  border-radius: 8px;
  padding: 12px;
  margin-top: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.game-stats h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 6px;
}

.stats-section {
  margin-bottom: 12px;
}

.stats-section:last-child {
  margin-bottom: 0;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 13px;
  border-bottom: 1px solid #f5f5f5;
}

.stat-row:last-child {
  border-bottom: none;
}

.stat-label {
  color: #666;
}

.stat-value {
  font-weight: 500;
  color: #333;
}

.stat-value.black {
  color: #333;
  font-weight: bold;
}

.stat-value.white {
  color: #666;
  font-weight: bold;
}

.stat-value.black-advantage {
  color: #28a745;
}

.stat-value.white-advantage {
  color: #dc3545;
}

.stat-value.even {
  color: #666;
}

.progress-bar {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #eee;
}

.progress-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 6px;
}

.progress-container {
  height: 20px;
  background: #f0f0f0;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  position: relative;
}

.progress-fill {
  height: 100%;
  transition: width 0.3s;
}

.progress-fill.black {
  background: linear-gradient(90deg, #333, #555);
}

.progress-fill.white {
  background: linear-gradient(90deg, #ddd, #fff);
  border-left: 1px solid #ccc;
}

.progress-text {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 11px;
  color: #666;
}
</style>

