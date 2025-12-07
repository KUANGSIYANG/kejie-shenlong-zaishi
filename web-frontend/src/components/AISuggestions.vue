<template>
  <div class="ai-suggestions" v-if="showSuggestions && suggestions.length > 0">
    <h4>AI建议</h4>
    <div class="suggestions-list">
      <div
        v-for="(suggestion, index) in suggestions"
        :key="index"
        class="suggestion-item"
        @click="handleSuggestionClick(suggestion)"
      >
        <span class="rank">#{{ index + 1 }}</span>
        <span class="position">{{ formatPosition(suggestion.x, suggestion.y) }}</span>
        <span class="score" :class="getScoreClass(suggestion.score)">
          {{ formatScore(suggestion.score) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGameStore } from '../stores/game'

const props = defineProps({
  suggestions: {
    type: Array,
    default: () => []
  },
  showSuggestions: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['select'])

const gameStore = useGameStore()

const formatPosition = (x, y) => {
  return gameStore.coordToGTP(x, y)
}

const formatScore = (score) => {
  if (score === null || score === undefined) return '-'
  return (score * 100).toFixed(1) + '%'
}

const getScoreClass = (score) => {
  if (score > 0.7) return 'high'
  if (score > 0.4) return 'medium'
  return 'low'
}

const handleSuggestionClick = (suggestion) => {
  emit('select', suggestion)
}
</script>

<style scoped>
.ai-suggestions {
  background: white;
  border-radius: 8px;
  padding: 12px;
  margin-top: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.ai-suggestions h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 6px;
}

.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.suggestion-item {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 13px;
}

.suggestion-item:hover {
  background: #f0f0f0;
}

.rank {
  width: 24px;
  font-weight: bold;
  color: #666;
}

.position {
  flex: 1;
  font-family: monospace;
  color: #333;
}

.score {
  font-weight: 500;
  min-width: 50px;
  text-align: right;
}

.score.high {
  color: #28a745;
}

.score.medium {
  color: #ffc107;
}

.score.low {
  color: #dc3545;
}
</style>

