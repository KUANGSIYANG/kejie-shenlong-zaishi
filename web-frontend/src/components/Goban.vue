<template>
  <div class="goban-container">
    <div class="goban" :style="boardStyle" ref="gobanRef">
      <!-- 棋盘背景 -->
      <svg class="board-bg" :width="boardSize" :height="boardSize">
        <!-- 棋盘�?-->
        <g v-for="i in 19" :key="`line-${i}`">
          <!-- 横线 -->
          <line
            :x1="cellSize"
            :y1="i * cellSize"
            :x2="18 * cellSize + cellSize"
            :y2="i * cellSize"
            :stroke="gridColor"
            stroke-width="1"
          />
          <!-- 竖线 -->
          <line
            :x1="i * cellSize"
            :y1="cellSize"
            :x2="i * cellSize"
            :y2="18 * cellSize + cellSize"
            :stroke="gridColor"
            stroke-width="1"
          />
        </g>
        
        <!-- 星位 -->
        <circle
          v-for="star in starPoints"
          :key="`star-${star.x}-${star.y}`"
          :cx="(star.y + 1) * cellSize"
          :cy="(star.x + 1) * cellSize"
          r="4"
          fill="#000"
        />
      </svg>
      
      <!-- 棋子�?-->
      <div class="stones-layer">
        <div
          v-for="(row, x) in board"
          :key="`row-${x}`"
          class="row"
        >
          <div
            v-for="(cell, y) in row"
            :key="`cell-${x}-${y}`"
            class="cell"
            :style="getCellStyle(x, y)"
            @click="handleCellClick(x, y)"
            @mouseenter="handleCellHover(x, y)"
            @mouseleave="hoveredCell = null"
          >
            <!-- 棋子 -->
            <div
              v-if="cell !== 0"
              :class="['stone', cell === 1 ? 'black' : 'white']"
            >
            </div>
            
            <!-- 悬停指示�?-->
            <div
              v-if="cell === 0 && hoveredCell?.x === x && hoveredCell?.y === y && canPlaceStone(x, y)"
              :class="['stone', 'preview', currentPlayer === 1 ? 'black' : 'white']"
            >
            </div>
            
            <!-- 最后一步标�?-->
            <div
              v-if="isLastMove(x, y)"
              class="last-move-marker"
            >
            </div>
            
            <!-- AI建议标记（绿色半透明圆圈 + 序号�?-->
            <template v-if="isAISuggestion(x, y)">
              <div
                class="ai-suggestion-marker"
                :title="getSuggestionInfo(x, y)"
              ></div>
              <div
                class="ai-suggestion-badge"
              >{{ getSuggestionRank(x, y) }}</div>
            </template>
          </div>
        </div>
      </div>
      
      <!-- 坐标标签 -->
      <div class="coordinates" v-if="showCoordinates">
        <div class="coords-row coords-top">
          <span v-for="(letter, i) in letters" :key="`top-${i}`">{{ letter }}</span>
        </div>
        <div class="coords-row coords-bottom">
          <span v-for="(letter, i) in letters" :key="`bottom-${i}`">{{ letter }}</span>
        </div>
        <div class="coords-col coords-left">
          <span v-for="i in 19" :key="`left-${i}`">{{ 20 - i }}</span>
        </div>
        <div class="coords-col coords-right">
          <span v-for="i in 19" :key="`right-${i}`">{{ 20 - i }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/game'

const props = defineProps({
  showCoordinates: {
    type: Boolean,
    default: true
  }
})

const gameStore = useGameStore()
const gobanRef = ref(null)
const hoveredCell = ref(null)

// 确保board是响应式�?const board = computed(() => gameStore.board)
// 当前玩家
const currentPlayer = computed(() => gameStore.currentPlayer)

// 确保aiSuggestions是响应式�?const aiSuggestions = computed(() => gameStore.aiSuggestions)
const showSuggestions = computed(() => gameStore.showSuggestions)

// 棋盘尺寸
const cellSize = 28
const boardSize = computed(() => 19 * cellSize + 2 * cellSize)
const padding = cellSize

// 字母坐标
const letters = 'ABCDEFGHJKLMNOPQRST'.split('')

// 星位
const starPoints = [
  { x: 3, y: 3 }, { x: 3, y: 9 }, { x: 3, y: 15 },
  { x: 9, y: 3 }, { x: 9, y: 9 }, { x: 9, y: 15 },
  { x: 15, y: 3 }, { x: 15, y: 9 }, { x: 15, y: 15 }
]

// 棋盘样式
const boardStyle = computed(() => ({
  width: `${boardSize.value}px`,
  height: `${boardSize.value}px`,
  backgroundColor: '#dcb35c'
}))

const gridColor = '#000'



// 获取单元格样式
const getCellStyle = (x, y) => ({
  width: `${cellSize}px`,
  height: `${cellSize}px`,
  position: 'absolute',
  left: `${(y + 1) * cellSize - cellSize / 2}px`,
  top: `${(x + 1) * cellSize - cellSize / 2}px`,
  cursor: canPlaceStone(x, y) ? 'pointer' : 'default',
})

// 检查是否可以落子
const canPlaceStone = (x, y) => {
  return gameStore.board[x][y] === 0 && !gameStore.isThinking && gameStore.isConnected
}

// 检查是否是最后一步
const isLastMove = (x, y) => {
  const lastMove = gameStore.moveHistory[gameStore.moveHistory.length - 1]
  return lastMove && lastMove.x === x && lastMove.y === y
}

// 检查是否是AI建议
const isAISuggestion = (x, y) => {
  if (!showSuggestions.value) {
    return false
  }
  
  const suggestions = aiSuggestions.value
  if (!suggestions || !Array.isArray(suggestions) || suggestions.length === 0) {
    return false
  }
  
  // 检查该位置是否在建议列表中
  const found = suggestions.some((s) => {
    if (!s || typeof s !== 'object') return false
    
    // 转换坐标类型（确保是数字�?    const sx = typeof s.x === 'number' ? s.x : parseInt(s.x, 10)
    const sy = typeof s.y === 'number' ? s.y : parseInt(s.y, 10)
    
    // 验证坐标有效性并匹配
    if (isNaN(sx) || isNaN(sy)) return false
    
    return sx === x && sy === y
  })
  
  return found
}

// 获取建议信息
const getSuggestionInfo = (x, y) => {
  const suggestions = aiSuggestions.value
  if (!suggestions || !Array.isArray(suggestions)) return ''
  
  const suggestion = suggestions.find(s => {
    if (!s || typeof s !== 'object') return false
    const sx = typeof s.x === 'number' ? s.x : parseInt(s.x, 10)
    const sy = typeof s.y === 'number' ? s.y : parseInt(s.y, 10)
    return !isNaN(sx) && !isNaN(sy) && sx === x && sy === y
  })
  
  if (!suggestion) return ''
  const rank = suggestions.indexOf(suggestion) + 1
  const score = suggestion.score ? (suggestion.score * 100).toFixed(1) : '0.0'
  return `AI建议 #${rank} (${score}%)`
}

// 获取建议序号
const getSuggestionRank = (x, y) => {
  const suggestions = aiSuggestions.value
  if (!suggestions || !Array.isArray(suggestions)) return ''
  
  const idx = suggestions.findIndex(s => {
    if (!s || typeof s !== 'object') return false
    const sx = typeof s.x === 'number' ? s.x : parseInt(s.x, 10)
    const sy = typeof s.y === 'number' ? s.y : parseInt(s.y, 10)
    return !isNaN(sx) && !isNaN(sy) && sx === x && sy === y
  })
  
  return idx >= 0 ? idx + 1 : ''
}

// 处理单元格点击�?const handleCellClick = async (x, y) => {
  if (!gameStore.isConnected) {
    gameStore.error = '请先点击"连接AI"按钮'
    console.warn('未连接AI无法落子�?')
    return
  }
  
  if (gameStore.isThinking) {
    console.warn('AI正在思考中..')
    return
  }
  
  if (gameStore.board[x][y] !== 0) {
    console.warn('该位置已有棋子?')
    return
  }
  
  if (!canPlaceStone(x, y)) {
    console.warn('无法在此位置落子')
    return
  }
  
  console.log(`尝试在位置�?(${x}, ${y}) 落子`)
  await gameStore.makeMove(x, y)


// 处理悬停
const handleCellHover = (x, y) => {
  if (canPlaceStone(x, y)) {
    hoveredCell.value = { x, y }
  }
}

// 响应式调�?const resize = () => {
  // 可以根据窗口大小调整棋盘尺寸


onMounted(() => {
  window.addEventListener('resize', resize)
  resize()
})

onUnmounted(() => {
  window.removeEventListener('resize', resize)
})
</script>

<style scoped>
.goban-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  overflow: auto;
}

.goban {
  position: relative;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}

.board-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.stones-layer {
  position: relative;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.row {
  position: relative;
}

.cell {
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
}

.stone {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  position: relative;
}

.stone.black {
  background: radial-gradient(circle at 30% 30%, #555, #000);
}

.stone.white {
  background: radial-gradient(circle at 30% 30%, #fff, #ddd);
  border: 1px solid #aaa;
}

.stone.preview {
  opacity: 0.6;
}

.last-move-marker {
  position: absolute;
  width: 8px;
  height: 8px;
  background: #ff6b6b;
  border-radius: 50%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;
}

.ai-suggestion-marker {
  position: absolute;
  width: 20px;
  height: 20px;
  background: rgba(0, 255, 0, 0.4);
  border: 2px solid rgba(0, 200, 0, 0.6);
  border-radius: 50%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;
  box-shadow: 0 0 8px rgba(0, 255, 0, 0.5);
}

.ai-suggestion-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 20px;
  height: 20px;
  background: rgba(0, 200, 0, 0.9);
  color: #fff;
  font-size: 12px;
  font-weight: bold;
  line-height: 20px;
  text-align: center;
  border-radius: 10px;
  z-index: 3;
  box-shadow: 0 2px 6px rgba(0, 200, 0, 0.6);
  border: 2px solid #fff;
}

.coordinates {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2;
}

.coords-row {
  position: absolute;
  display: flex;
  justify-content: space-between;
  width: calc(100% - 56px);
  left: 28px;
  font-size: 11px;
  color: #333;
  font-weight: 500;
}

.coords-top {
  top: 6px;
}

.coords-bottom {
  bottom: 6px;
}

.coords-col {
  position: absolute;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: calc(100% - 56px);
  top: 28px;
  font-size: 11px;
  color: #333;
  font-weight: 500;
}

.coords-left {
  left: 6px;
}

.coords-right {
  right: 6px;
}
</style>