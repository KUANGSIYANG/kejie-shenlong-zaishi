<template>
  <div class="ai-suggestions">
    <div class="header">
      <div>
        <p class="eyebrow">智能落子提示</p>
        <h3>Top Moves</h3>
      </div>
      <div class="header-actions">
        <span class="pill" v-if="suggestions.length > 0">共 {{ suggestions.length }} 手</span>
        <button
          v-if="suggestions.length > 0"
          @click="refreshSuggestions"
          class="refresh-btn"
          :disabled="gameStore.isThinking"
          title="刷新推荐"
        >
          ↻
        </button>
      </div>
    </div>
    <div v-if="suggestions.length > 0" class="suggestions-list">
      <div
        v-for="(suggestion, index) in suggestions"
        :key="`${suggestion.x}-${suggestion.y}`"
        class="suggestion-item"
        :class="`rank-${index + 1}`"
        @click="handleSuggestionClick(suggestion)"
      >
        <div class="tag">#{{ index + 1 }}</div>
        <div class="content">
          <div class="pos">{{ coordToGTP(suggestion.x, suggestion.y) }}</div>
          <div class="score-line">
            <div class="bar">
              <div class="fill" :style="{ width: `${Math.min(100, suggestion.score * 100)}%` }"></div>
            </div>
            <span class="score">{{ (suggestion.score * 100).toFixed(1) }}%</span>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="no-suggestions">
      <span v-if="gameStore.isConnected">暂无推荐，等待新落子</span>
      <span v-else>请先连接 AI</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGameStore } from '../stores/game'

const gameStore = useGameStore()
const suggestions = computed(() => gameStore.aiSuggestions)

const coordToGTP = (x, y) => {
  const letters = 'ABCDEFGHJKLMNOPQRST'
  const row = 19 - x
  const col = letters[y]
  return `${col}${row}`
}

const handleSuggestionClick = async (suggestion) => {
  if (!gameStore.isThinking && gameStore.board[suggestion.x][suggestion.y] === 0) {
    await gameStore.makeMove(suggestion.x, suggestion.y)
  }
}

const refreshSuggestions = async () => {
  if (gameStore.isConnected && !gameStore.isThinking) {
    await gameStore.getAISuggestions(5)
  }
}
</script>

<style scoped>
.ai-suggestions {
  margin-bottom: 12px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background: rgba(255, 255, 255, 0.02);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.ai-suggestions h3 {
  margin: 0;
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 600;
}

.eyebrow {
  margin: 0;
  color: var(--text-muted);
  font-size: 11px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.refresh-btn {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 15px;
  padding: 4px 8px;
  border-radius: 8px;
  transition: all 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  border-color: var(--accent-color);
  color: var(--accent-color);
  transform: rotate(90deg);
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.suggestion-item {
  display: grid;
  grid-template-columns: 60px 1fr;
  align-items: center;
  padding: 12px;
  background: linear-gradient(135deg, rgba(92, 214, 195, 0.08), rgba(122, 167, 255, 0.06));
  border-radius: 12px;
  gap: 10px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid var(--border-color);
}

.suggestion-item:hover {
  border-color: var(--accent-color);
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
}

.suggestion-item.rank-1 {
  background: linear-gradient(135deg, rgba(92, 214, 195, 0.14), rgba(122, 167, 255, 0.12));
  border-color: var(--accent-color);
}

.tag {
  min-width: 56px;
  padding: 8px 0;
  text-align: center;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border-color);
  font-weight: 700;
  color: rgba(92, 214, 195, 0.9);
}

.content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pos {
  font-family: monospace;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.score-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bar {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 999px;
  overflow: hidden;
}

.fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-color), var(--accent-strong));
  border-radius: 999px;
}

.score {
  color: var(--text-secondary);
  font-size: 11px;
  min-width: 60px;
  text-align: right;
}

.no-suggestions {
  color: var(--text-secondary);
  font-size: 12px;
  text-align: center;
  padding: 20px;
  font-style: italic;
}
</style>
