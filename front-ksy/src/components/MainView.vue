<template>
  <div class="main-view panel glass subtle-scrollbar">
    <div class="board-info">
      <div class="winrate">
        <div class="label">黑胜率</div>
        <div class="bar">
          <div class="fill black" :style="{ width: `${(blackWinRate * 100).toFixed(1)}%` }"></div>
        </div>
        <span class="value">{{ (blackWinRate * 100).toFixed(1) }}%</span>
      </div>
      <div class="winrate">
        <div class="label">白胜率</div>
        <div class="bar">
          <div class="fill white" :style="{ width: `${(whiteWinRate * 100).toFixed(1)}%` }"></div>
        </div>
        <span class="value">{{ (whiteWinRate * 100).toFixed(1) }}%</span>
      </div>
      <div class="captures">
        <span>黑吃 {{ evaluation.blackCaptures ?? 0 }}</span>
        <span>白吃 {{ evaluation.whiteCaptures ?? 0 }}</span>
      </div>
    </div>
    <Goban />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import Goban from './Goban.vue'

const gameStore = useGameStore()
const evaluation = computed(() => gameStore.evaluation)
const blackWinRate = computed(() => Math.max(0, Math.min(1, evaluation.value.winRate ?? 0.5)))
const whiteWinRate = computed(() => 1 - blackWinRate.value)
</script>

<style scoped>
.main-view {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 12px;
  background: rgba(255, 255, 255, 0.01);
  overflow: auto;
  min-height: 0;
  width: 100%;
  padding: 18px;
  border-radius: 16px;
}

.board-info {
  min-width: 220px;
  max-width: 240px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background: rgba(255, 255, 255, 0.02);
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.winrate {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.label {
  font-size: 12px;
  color: var(--text-secondary);
}

.bar {
  position: relative;
  width: 100%;
  height: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 999px;
  overflow: hidden;
}

.fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  border-radius: 999px;
}

.fill.black {
  background: linear-gradient(90deg, #5cd6c3, #7aa7ff);
}

.fill.white {
  background: linear-gradient(90deg, #ffffff, #d0d8ff);
}

.value {
  font-size: 12px;
  color: var(--text-primary);
}

.captures {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
}

@media (max-width: 1080px) {
  .main-view {
    flex-direction: column;
    align-items: center;
  }
  .board-info {
    width: 100%;
    max-width: 560px;
    flex-direction: row;
    align-items: center;
    gap: 14px;
  }
  .winrate {
    flex: 1;
  }
}
</style>
