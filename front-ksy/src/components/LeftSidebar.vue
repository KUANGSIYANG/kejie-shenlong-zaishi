<template>
  <div class="left-sidebar">
    <div class="header">
      <div>
        <p class="eyebrow">对局回放</p>
        <h3>Move Timeline</h3>
      </div>
      <span class="badge" v-if="moveHistory.length === 0">暂无落子</span>
    </div>

    <div class="game-tree subtle-scrollbar">
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
          <div class="move-number">#{{ index + 1 }}</div>
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
      <button @click="goToFirst" :disabled="moveHistory.length === 0 || currentMoveIndex === 0">|<</button>
      <button @click="goToPrev" :disabled="moveHistory.length === 0 || currentMoveIndex === 0"><</button>
      <span class="move-counter">
        {{ moveHistory.length === 0 ? '0 / 0' : `${currentMoveIndex + 1} / ${moveHistory.length}` }}
      </span>
      <button @click="goToNext" :disabled="moveHistory.length === 0 || currentMoveIndex >= moveHistory.length - 1">></button>
      <button @click="goToLast" :disabled="moveHistory.length === 0 || currentMoveIndex >= moveHistory.length - 1">>|</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useGameStore } from '../stores/game'

const gameStore = useGameStore()
const currentMoveIndex = ref(0)

const moveHistory = computed(() => gameStore.moveHistory)

watch(
  moveHistory,
  (list) => {
    currentMoveIndex.value = list.length > 0 ? list.length - 1 : 0
  },
  { immediate: true }
)

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
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-radius: 14px;
  box-shadow: var(--shadow);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.badge {
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 11px;
}

.game-tree {
  flex: 1;
  overflow-y: auto;
  max-height: calc(100vh - 240px);
  padding-right: 4px;
}

.empty-tree {
  text-align: center;
  color: var(--text-secondary);
  font-size: 12px;
  padding: 40px 20px;
  border: 1px dashed var(--border-color);
  border-radius: 12px;
}

.tree-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid var(--border-color);
}

.tree-node:hover {
  border-color: var(--accent-color);
  transform: translateX(2px);
}

.tree-node.active {
  background: linear-gradient(135deg, rgba(92, 214, 195, 0.16), rgba(122, 167, 255, 0.14));
  border-color: var(--accent-color);
  color: white;
}

.move-number {
  min-width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  font-size: 12px;
  font-weight: bold;
}

.move-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.move-color {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: bold;
}

.move-color.black {
  background: #1c1c1c;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.move-color.white {
  background: #f0f0f0;
  color: #333;
  border: 1px solid rgba(0, 0, 0, 0.12);
}

.move-position {
  font-family: monospace;
  font-size: 12px;
}

.move-eval {
  font-size: 11px;
  color: var(--text-secondary);
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.tree-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.tree-controls button {
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  cursor: pointer;
  border-radius: 8px;
  font-size: 12px;
  transition: all 0.2s;
}

.tree-controls button:hover:not(:disabled) {
  border-color: var(--accent-color);
}

.tree-controls button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.move-counter {
  font-size: 12px;
  color: var(--text-secondary);
  padding: 0 8px;
}
</style>
