<template>
  <div class="ai-suggestions">
    <div class="header">
      <h3>AI推荐</h3>
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
    <div v-if="suggestions.length > 0" class="suggestions-list">
      <div
        v-for="(suggestion, index) in suggestions"
        :key="`${suggestion.x}-${suggestion.y}`"
        class="suggestion-item"
        :class="`rank-${index + 1}`"
        @click="handleSuggestionClick(suggestion)"
      >
        <span class="rank">#{{ index + 1 }}</span>
        <span class="position">{{ coordToGTP(suggestion.x, suggestion.y) }}</span>
        <span class="score">{{ (suggestion.score * 100).toFixed(1) }}%</span>
      </div>
    </div>
    <div v-else class="no-suggestions">
      <span v-if="gameStore.isConnected">暂无推荐</span>
      <span v-else>请先连接AI</span>
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
  margin-bottom: 20px;
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

.refresh-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 16px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  transform: rotate(90deg);
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.suggestion-item {
  display: flex;
  align-items: center;
  padding: 8px;
  background: rgba(0, 200, 0, 0.1);
  border-radius: 4px;
  gap: 8px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.suggestion-item:hover {
  background: rgba(0, 200, 0, 0.2);
  border-color: rgba(0, 255, 0, 0.3);
  transform: translateX(2px);
}

.suggestion-item.rank-1 {
  background: rgba(0, 255, 0, 0.15);
  border-color: rgba(0, 255, 0, 0.4);
}

.suggestion-item.rank-2 {
  background: rgba(0, 220, 0, 0.12);
}

.suggestion-item.rank-3 {
  background: rgba(0, 200, 0, 0.1);
}

.rank {
  font-weight: bold;
  color: rgba(0, 150, 0, 0.9);
  min-width: 24px;
  text-align: center;
}

.position {
  flex: 1;
  font-family: monospace;
  font-weight: 500;
}

.score {
  color: var(--text-secondary);
  font-size: 11px;
}

.no-suggestions {
  color: var(--text-secondary);
  font-size: 12px;
  text-align: center;
  padding: 20px;
  font-style: italic;
}
</style>
