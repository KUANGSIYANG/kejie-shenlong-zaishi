<template>
  <div class="main-menu">
    <div class="menu-section">
      <button @click="handleNewGame">新对局</button>
      <button @click="handleConnectAI" :disabled="gameStore.isThinking">
        {{ gameStore.isConnected ? '已连接' : '连接AI' }}
      </button>
      <button @click="handleClearBoard" :disabled="gameStore.isThinking">清空棋盘</button>
      <button @click="handleToggleSuggestions" :class="{ active: gameStore.showSuggestions }">
        {{ gameStore.showSuggestions ? '隐藏推荐' : '显示推荐' }}
      </button>
      <button @click="handleToggleInfluence" :class="{ active: gameStore.showInfluence }">
        {{ gameStore.showInfluence ? '隐藏影响' : '显示影响' }}
      </button>
    </div>
    <div class="menu-section">
      <label>游戏模式:</label>
      <select v-model="selectedGameMode" @change="handleGameModeChange" :disabled="gameStore.isThinking">
        <option value="manual">手动对弈</option>
        <option value="vsAI">人机对弈</option>
        <option value="aiOnly">电脑自动博弈</option>
      </select>
    </div>
    <div class="menu-section">
      <label>模型选择:</label>
      <select v-model="selectedModel" @change="handleModelChange" :disabled="gameStore.isThinking">
        <option value="policy">策略网络 (Policy Net)</option>
        <option value="value">价值网络 (Value Net)</option>
        <option value="mcts">MCTS搜索</option>
        <option value="hybrid">混合模式</option>
      </select>
    </div>
    <div class="menu-section" v-if="gameStore.gameStatus === 'playing'">
      <button 
        @click="handleResign(1)" 
        :disabled="gameStore.isThinking || gameStore.currentPlayer !== 1"
        class="resign-btn"
      >
        黑方认输
      </button>
      <button 
        @click="handleResign(-1)" 
        :disabled="gameStore.isThinking || gameStore.currentPlayer !== -1"
        class="resign-btn"
      >
        白方认输
      </button>
    </div>
    <div class="menu-section contributor-section">
      <span class="contributor-info">Contributed By：team 7  "匡思炀（组长）石嘉铭 施政 成俊翔 李正彤"</span>
    </div>
    <div class="menu-section" v-if="gameStore.gameStatus !== 'playing'">
      <span class="game-status" :class="gameStore.gameStatus">
        {{ getGameStatusText() }}
      </span>
    </div>
    <div class="menu-section" v-if="gameStore.error">
      <span class="error-message">{{ gameStore.error }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useGameStore } from '../stores/game'

const gameStore = useGameStore()
const selectedModel = ref(gameStore.aiMode || 'policy')
const selectedGameMode = ref(gameStore.gameMode || 'manual')

watch(() => gameStore.aiMode, (newMode) => {
  selectedModel.value = newMode
})

watch(() => gameStore.gameMode, (newMode) => {
  selectedGameMode.value = newMode
})

const handleNewGame = () => {
  gameStore.clearBoard()
}

const handleConnectAI = async () => {
  if (!gameStore.isConnected) {
    try {
      await gameStore.initGame(selectedModel.value)
    } catch (error) {
      console.error('连接AI失败:', error)
      // 即使连接失败，也允许本地对局
    }
  }
}

const handleClearBoard = () => {
  gameStore.clearBoard()
}

const handleModelChange = async () => {
  await gameStore.switchAIMode(selectedModel.value)
}

const handleToggleSuggestions = () => {
  gameStore.showSuggestions = !gameStore.showSuggestions
  if (gameStore.showSuggestions && gameStore.isConnected) {
    gameStore.getAISuggestions(5)
  }
}

const handleGameModeChange = () => {
  gameStore.setGameMode(selectedGameMode.value)
}

const handleResign = (color) => {
  if (confirm(color === 1 ? '黑方确定要认输吗？' : '白方确定要认输吗？')) {
    gameStore.resign(color)
  }
}

const getGameStatusText = () => {
  const statusMap = {
    'blackWin': '黑方获胜！',
    'whiteWin': '白方获胜！',
    'draw': '平局',
    'resigned': '已认输'
  }
  return statusMap[gameStore.gameStatus] || '游戏中'
}

const handleToggleInfluence = () => {
  gameStore.showInfluence = !gameStore.showInfluence
  if (gameStore.showInfluence) {
    gameStore.updateInfluenceMap()
  }
}
</script>

<style scoped>
.main-menu {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  gap: 12px;
  flex-wrap: wrap;
}

.menu-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

label {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
}

button {
  padding: 6px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  cursor: pointer;
  border-radius: 4px;
  font-size: 12px;
  transition: all 0.2s;
}

button:hover:not(:disabled) {
  background: var(--bg-primary);
  border-color: var(--accent-color);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button.active {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: white;
}

select {
  padding: 6px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  color: #ff6b6b;
  font-size: 12px;
  padding: 4px 8px;
  background: rgba(255, 107, 107, 0.1);
  border-radius: 4px;
}

.resign-btn {
  background: #ff6b6b !important;
  color: white !important;
}

.resign-btn:hover:not(:disabled) {
  background: #ff5252 !important;
}

.game-status {
  font-size: 14px;
  font-weight: bold;
  padding: 6px 12px;
  border-radius: 4px;
}

.game-status.blackWin {
  color: #333;
  background: rgba(0, 0, 0, 0.2);
}

.game-status.whiteWin {
  color: #fff;
  background: rgba(255, 255, 255, 0.3);
}

.game-status.draw {
  color: #ffa500;
  background: rgba(255, 165, 0, 0.2);
}

.contributor-section {
  margin-left: auto;
}

.contributor-info {
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
  opacity: 0.8;
}
</style>
