<template>
  <div class="main-menu panel glass">
    <div class="top-row">
      <div class="brand">
        <div class="brand-mark"></div>
        <div>
          <div class="brand-title">Weiqi AI Studio</div>
          <div class="brand-sub">围棋 · 博弈论 · 胜率引擎</div>
        </div>
        <div class="tabs">
          <button
            class="tab"
            :class="{ active: props.activePage === 'board' }"
            @click="emit('switch-page', 'board')"
          >
            对局面板
          </button>
          <button
            class="tab"
            :class="{ active: props.activePage === 'lab' }"
            @click="emit('switch-page', 'lab')"
          >
            博弈论实验室
          </button>
        </div>
      </div>
      <div class="project-side">
        <div class="project-meta">
          <span class="contributor">
            Team 7 · 围棋博弈论前端实验｜贡献来自第七小组：匡思炀23089088（组长）、成俊翔2308907、石嘉铭23089087、施政23089046、李正彤23089062
          </span>
          <p class="project-note">
            前端采用 Vue 3 + Pinia 组件化面板，后端以 Python/GTP 管理对弈服务，结合 PyTorch CNN 深度策略/价值网络与 MCTS 搜索，将纳什稳定性、帕累托前沿、零和张力等博弈论指标可视化，辅助围棋对局复盘与教学。
          </p>
        </div>
        <div class="resign-group resign-animated" v-if="gameStore.gameStatus === 'playing'">
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
      </div>
    </div>

    <div class="menu-row">
      <button @click="handleNewGame" :disabled="gameStore.isThinking">新对局</button>
      <button @click="handleConnectAI" :disabled="gameStore.isThinking">
        {{ gameStore.isConnected ? '已连接' : '连接 AI' }}
      </button>
      <button @click="handleClearBoard" :disabled="gameStore.isThinking">清空棋盘</button>
      <button @click="handleToggleSuggestions" :class="{ active: gameStore.showSuggestions }">
        {{ gameStore.showSuggestions ? '隐藏推荐' : '显示推荐' }}
      </button>
      <button @click="handleToggleInfluence" :class="{ active: gameStore.showInfluence }">
        {{ gameStore.showInfluence ? '隐藏影响' : '显示影响' }}
      </button>
    </div>

    <div class="menu-row">
      <label>对局模式</label>
      <select v-model="selectedGameMode" @change="handleGameModeChange" :disabled="gameStore.isThinking">
        <option value="manual">手动对弈</option>
        <option value="vsAI">人机对弈</option>
        <option value="aiOnly">AI 自博弈</option>
      </select>

      <label>模型选择</label>
      <select v-model="selectedModel" @change="handleModelChange" :disabled="gameStore.isThinking">
        <option value="policy">策略网络 (Policy)</option>
        <option value="value">价值网络 (Value)</option>
        <option value="mcts">MCTS 搜索</option>
        <option value="hybrid">混合模式</option>
      </select>

      <div class="status-dot" :class="gameStore.isConnected ? 'online' : 'offline'">
        {{ gameStore.isConnected ? 'AI 在线' : '未连接' }}
      </div>
      <div class="thinking" v-if="gameStore.isThinking">AI 思考中…</div>
    </div>

    <div class="menu-row wrap">
      <span class="game-status" :class="gameStore.gameStatus" v-if="gameStore.gameStatus !== 'playing'">
        {{ getGameStatusText() }}
      </span>

      <span v-if="gameStore.error" class="error-message">{{ gameStore.error }}</span>
    </div>

    <div class="result-overlay" v-if="showResultModal">
      <div class="result-modal">
        <div class="result-header">
          <div class="result-title">{{ resultTitle }}</div>
          <button class="close-btn" @click="closeResultModal">✕</button>
        </div>
        <div class="result-body">
          <p class="result-desc">
            本局已结束，点击关闭继续查看棋盘或发起新对局。
          </p>
          <div class="result-stats">
            <div class="stat">
              <span class="label">总步数</span>
              <span class="value">{{ resultStats.moves }}</span>
            </div>
            <div class="stat">
              <span class="label">黑吃子</span>
              <span class="value">{{ resultStats.blackCaptures }}</span>
            </div>
            <div class="stat">
              <span class="label">白吃子</span>
              <span class="value">{{ resultStats.whiteCaptures }}</span>
            </div>
            <div class="stat">
              <span class="label">黑方得分</span>
              <span class="value">{{ resultStats.blackScore }}</span>
            </div>
            <div class="stat">
              <span class="label">白方得分</span>
              <span class="value">{{ resultStats.whiteScore }}</span>
            </div>
            <div class="stat wide">
              <span class="label">胜率估计</span>
              <span class="value accent">{{ resultStats.winRate }}%</span>
            </div>
          </div>
          <button class="primary-btn" @click="closeResultModal">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useGameStore } from '../stores/game'

const props = defineProps({
  activePage: {
    type: String,
    default: 'board'
  }
})

const emit = defineEmits(['switch-page'])
const gameStore = useGameStore()
const selectedModel = ref(gameStore.aiMode || 'policy')
const selectedGameMode = ref(gameStore.gameMode || 'manual')
const showResultModal = ref(false)

watch(
  () => gameStore.aiMode,
  (newMode) => {
    selectedModel.value = newMode
  }
)

watch(
  () => gameStore.gameMode,
  (newMode) => {
    selectedGameMode.value = newMode
  }
)

watch(
  () => gameStore.gameStatus,
  (newStatus) => {
    showResultModal.value = newStatus !== 'playing'
  }
)

const resultTitle = computed(() => getGameStatusText())
const resultStats = computed(() => ({
  moves: gameStore.moveHistory.length,
  blackCaptures: gameStore.evaluation.blackCaptures ?? 0,
  whiteCaptures: gameStore.evaluation.whiteCaptures ?? 0,
  blackScore: (gameStore.evaluation.blackScore ?? 0).toFixed(1),
  whiteScore: (gameStore.evaluation.whiteScore ?? 0).toFixed(1),
  winRate: ((gameStore.evaluation.winRate ?? 0.5) * 100).toFixed(1)
}))

const handleNewGame = () => {
  gameStore.clearBoard()
}

const handleConnectAI = async () => {
  if (!gameStore.isConnected) {
    try {
      await gameStore.initGame(selectedModel.value)
    } catch (error) {
      console.error('连接 AI 失败:', error)
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
    blackWin: '黑方胜',
    whiteWin: '白方胜',
    draw: '平局',
    resigned: '已认输'
  }
  return statusMap[gameStore.gameStatus] || '对局中'
}

const handleToggleInfluence = () => {
  gameStore.showInfluence = !gameStore.showInfluence
  if (gameStore.showInfluence) {
    gameStore.updateInfluenceMap()
  }
}

const closeResultModal = () => {
  showResultModal.value = false
}
</script>

<style scoped>
.top-row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.main-menu {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px 50px;
  margin: 10px 16px 0;
  border-radius: 14px;
  z-index: 2;
  position: relative;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  flex: 1 1 55%;
  min-width: 360px;
}

.brand-mark {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  background: linear-gradient(135deg, var(--accent-color), var(--accent-strong));
  box-shadow: 0 0 12px rgba(92, 214, 195, 0.6);
}

.brand-title {
  font-weight: 700;
  font-size: 14px;
}

.brand-sub {
  font-size: 11px;
  color: var(--text-secondary);
}

.tabs {
  display: flex;
  gap: 6px;
  margin-left: 12px;
}

.tab {
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: rgba(255, 255, 255, 0.02);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.tab.active {
  background: linear-gradient(135deg, var(--accent-color), var(--accent-strong));
  color: #0a0c14;
  border-color: transparent;
}

.menu-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.menu-row.wrap {
  justify-content: flex-start;
}

.project-side {
  position: absolute;
  right: 12px;
  bottom: 8px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  width: min(52%, 560px);
  min-width: 300px;
  z-index: 1;
}

.project-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.01));
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.18);
  text-align: right;
}

label {
  font-size: 12px;
  color: var(--text-secondary);
}

button {
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  cursor: pointer;
  border-radius: 10px;
  font-size: 12px;
  transition: all 0.2s;
}

button:hover:not(:disabled) {
  border-color: var(--accent-color);
  transform: translateY(-1px);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button.active {
  background: linear-gradient(135deg, var(--accent-color), var(--accent-strong));
  color: #0a0c14;
  border: none;
}

select {
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  border-radius: 10px;
  font-size: 12px;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23e8ecf7' stroke-width='1.4' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  background-size: 12px 8px;
  padding-right: 28px;
}

select option {
  background: #0f1322;
  color: #e8ecf7;
}

.resign-btn {
  background: rgba(255, 107, 107, 0.12);
  border-color: rgba(255, 107, 107, 0.4);
  position: relative;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.resign-btn:hover:not(:disabled) {
  transform: translateY(-1px) scale(1.02);
  box-shadow: 0 8px 24px rgba(255, 107, 107, 0.25);
}

.resign-group {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.resign-animated .resign-btn:not(:disabled)::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 30% 50%, rgba(255, 255, 255, 0.14), transparent 55%);
  opacity: 0;
  animation: resignPulse 3s ease-in-out infinite;
}

.resign-animated .resign-btn:not(:disabled) {
  animation: resignGlow 3s ease-in-out infinite;
}

.game-status {
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
}

.game-status {
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
}

.status-dot {
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid var(--border-color);
}

.status-dot.online {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.status-dot.offline {
  color: var(--text-muted);
}

.thinking {
  color: var(--text-secondary);
  font-size: 12px;
}

.project-meta {
  font-family: 'Inter', 'SF Pro Display', 'Noto Sans SC', 'PingFang SC', sans-serif;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.3px;
  color: var(--text-primary);
  line-height: 1.5;
}

.contributor {
  font-family: 'Inter', 'SF Pro Display', 'Noto Sans SC', 'PingFang SC', sans-serif;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.3px;
  color: var(--text-primary);
  line-height: 1.5;
}

.project-note {
  margin: 0;
  font-family: 'Inter', 'Noto Sans SC', 'Segoe UI', sans-serif;
  font-size: 12px;
  line-height: 1.65;
  color: var(--text-secondary);
}

.error-message {
  color: var(--danger);
  font-size: 12px;
  padding: 4px 8px;
  background: rgba(255, 107, 107, 0.1);
  border-radius: 8px;
}

.result-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 80px;
  z-index: 10;
}

.result-modal {
  width: min(520px, 90vw);
  background: #101524;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
  padding: 18px 18px 20px;
  animation: popIn 0.2s ease;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.result-title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.close-btn {
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
}

.result-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-desc {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.result-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
}

.stat {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.stat.wide {
  grid-column: span 2;
}

.label {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
}

.value {
  font-size: 15px;
  font-weight: 600;
  margin-top: 4px;
}

.accent {
  color: var(--accent-color);
}

.primary-btn {
  align-self: flex-end;
  padding: 10px 16px;
  border-radius: 12px;
  border: 1px solid var(--accent-color);
  background: linear-gradient(135deg, var(--accent-color), var(--accent-strong));
  color: #0a0c14;
  font-weight: 700;
  cursor: pointer;
}

@keyframes popIn {
  from {
    transform: translateY(6px) scale(0.98);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

@keyframes resignPulse {
  0% {
    opacity: 0;
  }
  50% {
    opacity: 0.45;
  }
  100% {
    opacity: 0;
  }
}

@keyframes resignGlow {
  0% {
    box-shadow: 0 0 0 rgba(255, 107, 107, 0.15);
  }
  50% {
    box-shadow: 0 0 12px rgba(255, 107, 107, 0.35);
  }
  100% {
    box-shadow: 0 0 0 rgba(255, 107, 107, 0.15);
  }
}

@media (max-width: 1100px) {
  .top-row {
    flex-wrap: wrap;
  }
  .tabs {
    margin-left: auto;
  }
  .menu-row.wrap {
    gap: 10px;
  }
  .project-side {
    position: static;
    width: 100%;
    align-items: flex-start;
    max-width: 100%;
  }
  .result-overlay {
    padding-top: 50px;
  }
}
</style>
