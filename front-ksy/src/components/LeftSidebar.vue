<template>
  <div class="left-sidebar">
    <h3>游戏树</h3>
    <div class="game-tree">
      <div v-if="moveHistory.length === 0" class="empty-tree">
        暂无走子记录
      </div>
      <div v-else class="tree-content">
        <div 
          v-for="(move, index) in moveHistory" 
          :key="`move-${index}`"
          class="tree-node"
          :class="{ active: index === moveHistory.length - 1 }"
          @click="goToMove(index)"
        >
          <div class="move-number">{{ index + 1 }}</div>
          <div class="move-info">
            <div class="move-color" :class="move.color === 1 ? 'black' : 'white'">
              {{ move.color === 1 ? '黑' : '白' }}
            </div>
            <div class="move-position">{{ coordToGTP(move.x, move.y) }}</div>
          </div>
          <div class="move-eval" v-if="getMoveEval(index)">
            {{ getMoveEval(index) }}
          </div>
        </div>
      </div>
    </div>
    
    <div class="tree-controls">
      <button @click="goToFirst" :disabled="currentMoveIndex === 0">⏮</button>
      <button @click="goToPrev" :disabled="currentMoveIndex === 0">⏪</button>
      <span class="move-counter">{{ currentMoveIndex + 1 }} / {{ moveHistory.length }}</span>
      <button @click="goToNext" :disabled="currentMoveIndex >= moveHistory.length - 1">⏩</button>
      <button @click="goToLast" :disabled="currentMoveIndex >= moveHistory.length - 1">⏭</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useGameStore } from '../stores/game'

const gameStore = useGameStore()
const currentMoveIndex = ref(-1)

const moveHistory = computed(() => gameStore.moveHistory)

const coordToGTP = (x, y) => {
  const letters = 'ABCDEFGHJKLMNOPQRST'
  const row = 19 - x
  const col = letters[y]
  return `${col}${row}`
}

const getMoveEval = (index) => {
  if (index < gameStore.gameTheoryData.winRateHistory.length) {
    const winRate = gameStore.gameTheoryData.winRateHistory[index]
    if (winRate) {
      return `${(winRate.blackWinRate * 100).toFixed(0)}%`
    }
  }
  return null
}

const goToMove = (index) => {
  currentMoveIndex.value = index
  // 这里可以添加回退到指定步数的功能
}

const goToFirst = () => {
  currentMoveIndex.value = 0
}

const goToPrev = () => {
  if (currentMoveIndex.value > 0) {
    currentMoveIndex.value--
  }
}

const goToNext = () => {
  if (currentMoveIndex.value < moveHistory.value.length - 1) {
    currentMoveIndex.value++
  }
}

const goToLast = () => {
  currentMoveIndex.value = moveHistory.value.length - 1
}
</script>

<style scoped>
.left-sidebar {
  width: 280px;
  min-width: 250px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 600;
}

.game-tree {
  flex: 1;
  overflow-y: auto;
}

.empty-tree {
  text-align: center;
  color: var(--text-secondary);
  font-size: 12px;
  padding: 40px 20px;
}

.tree-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: var(--bg-primary);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.tree-node:hover {
  background: var(--bg-tertiary);
  border-color: var(--border-color);
}

.tree-node.active {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: white;
}

.move-number {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border-radius: 50%;
  font-size: 11px;
  font-weight: bold;
}

.tree-node.active .move-number {
  background: rgba(255, 255, 255, 0.2);
}

.move-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.move-color {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
}

.move-color.black {
  background: #333;
  color: white;
}

.move-color.white {
  background: #fff;
  color: #333;
  border: 1px solid #aaa;
}

.move-position {
  font-family: monospace;
  font-size: 12px;
}

.move-eval {
  font-size: 10px;
  color: var(--text-secondary);
  padding: 2px 6px;
  background: var(--bg-tertiary);
  border-radius: 3px;
}

.tree-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px;
  background: var(--bg-primary);
  border-radius: 4px;
}

.tree-controls button {
  padding: 4px 8px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  cursor: pointer;
  border-radius: 4px;
  font-size: 12px;
  transition: all 0.2s;
}

.tree-controls button:hover:not(:disabled) {
  background: var(--bg-primary);
  border-color: var(--accent-color);
}

.tree-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.move-counter {
  font-size: 11px;
  color: var(--text-secondary);
  padding: 0 8px;
}
</style>
