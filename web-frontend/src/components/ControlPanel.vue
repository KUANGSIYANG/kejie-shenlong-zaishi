<template>
  <div class="control-panel">
    <div class="panel-section">
      <h3>游戏设置</h3>
      
      <div class="control-group">
        <label>AI模式:</label>
        <select v-model="aiMode" @change="handleModeChange">
          <option value="policy">策略网络 (快速)</option>
          <option value="mcts">MCTS搜索 (更强)</option>
        </select>
        <small v-if="gameStore.isConnected" class="mode-hint">
          切换模式将重新连接
        </small>
      </div>
      
      <div class="control-group">
        <label>游戏模式:</label>
        <select v-model="gameMode" @change="handleGameModeChange">
          <option value="manual">手动模式</option>
          <option value="vsAI">人机对弈</option>
          <option value="aiOnly">AI自动对弈</option>
        </select>
      </div>
      
      <div class="control-group">
        <button @click="handleConnect" :disabled="gameStore.isThinking">
          {{ gameStore.isConnected ? '已连接' : '连接AI' }}
        </button>
        <button @click="handleClear" :disabled="!gameStore.isConnected || gameStore.isThinking">
          清空棋盘
        </button>
        <button @click="handleGenMove" :disabled="!gameStore.isConnected || gameStore.isThinking || gameMode === 'vsAI'">
          AI走子
        </button>
        <button @click="handleGetSuggestions" :disabled="!gameStore.isConnected || gameStore.isThinking">
          {{ gameStore.showSuggestions ? '隐藏建议' : 'AI建议' }}
        </button>
      </div>
    </div>
    
    <div class="panel-section">
      <h3>游戏信息</h3>
      <div class="info-item">
        <span>当前玩家:</span>
        <span :class="['player-indicator', gameStore.currentPlayer === 1 ? 'black' : 'white']">
          {{ gameStore.currentPlayer === 1 ? '黑' : '白' }}
        </span>
      </div>
      <div class="info-item">
        <span>步数:</span>
        <span>{{ gameStore.moveHistory.length }}</span>
      </div>
      <div class="info-item" v-if="gameStore.isThinking">
        <span class="thinking">AI思考中...</span>
      </div>
    </div>
    
    <div class="panel-section" v-if="gameStore.error">
      <div class="error-message">
        {{ gameStore.error }}
      </div>
    </div>
  </div>
  
  <!-- AI建议组件 -->
  <AISuggestions 
    v-if="gameStore.showSuggestions"
    :suggestions="gameStore.aiSuggestions"
    :showSuggestions="gameStore.showSuggestions"
    @select="handleSuggestionSelect"
  />
  
  <!-- 对局数据组件 -->
  <GameStats />
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useGameStore } from '../stores/game'
import AISuggestions from './AISuggestions.vue'
import GameStats from './GameStats.vue'

const gameStore = useGameStore()

const aiMode = ref('policy')
const gameMode = ref('manual')

const handleConnect = async () => {
  await gameStore.initGame(aiMode.value)
}

const handleModeChange = async () => {
  if (gameStore.isConnected) {
    await gameStore.switchAIMode(aiMode.value)
  }
}

const handleGameModeChange = () => {
  gameStore.setMode(gameMode.value)
}

const handleClear = async () => {
  await gameStore.clearBoard()
}

const handleGenMove = async () => {
  await gameStore.genAIMove()
}

const handleGetSuggestions = async () => {
  gameStore.showSuggestions = !gameStore.showSuggestions
  if (gameStore.showSuggestions) {
    await gameStore.getAISuggestions(5)
  } else {
    gameStore.aiSuggestions = []
  }
}

const handleSuggestionSelect = async (suggestion) => {
  await gameStore.makeMove(suggestion.x, suggestion.y)
}

// 监听棋盘变化，更新评估数据
watch(() => gameStore.board, () => {
  gameStore.updateEvaluation()
  // 自动刷新AI建议
  if (gameStore.showSuggestions && gameStore.isConnected && !gameStore.isThinking) {
    gameStore.getAISuggestions(5)
  }
}, { deep: true })

watch(() => gameStore.moveHistory.length, () => {
  if (gameStore.showSuggestions && gameStore.isConnected && !gameStore.isThinking) {
    gameStore.getAISuggestions(5)
  }
})

onMounted(() => {
  gameStore.updateEvaluation()
})
</script>

<style scoped>
.control-panel {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-width: 250px;
}

.panel-section {
  margin-bottom: 20px;
}

.panel-section:last-child {
  margin-bottom: 0;
}

.panel-section h3 {
  font-size: 16px;
  margin-bottom: 12px;
  color: #333;
  border-bottom: 2px solid #007bff;
  padding-bottom: 6px;
}

.control-group {
  margin-bottom: 12px;
}

.control-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  color: #666;
}

.control-group select {
  width: 100%;
  margin-bottom: 8px;
}

.control-group button {
  width: 100%;
  margin-bottom: 8px;
}

.control-group button:last-child {
  margin-bottom: 0;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
  border-bottom: 1px solid #eee;
}

.info-item:last-child {
  border-bottom: none;
}

.player-indicator {
  font-weight: bold;
  padding: 2px 8px;
  border-radius: 4px;
}

.player-indicator.black {
  background: #333;
  color: white;
}

.player-indicator.white {
  background: #fff;
  color: #333;
  border: 1px solid #333;
}

.thinking {
  color: #007bff;
  font-style: italic;
}

.error-message {
  background: #fee;
  color: #c33;
  padding: 10px;
  border-radius: 4px;
  font-size: 13px;
}

.mode-hint {
  display: block;
  font-size: 11px;
  color: #999;
  margin-top: 4px;
  font-style: italic;
}
</style>


