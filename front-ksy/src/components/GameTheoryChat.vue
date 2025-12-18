<template>
  <div class="theory-card">
    <div class="header">
      <div>
        <p class="eyebrow">博弈论速览</p>
        <h3>Winrate · Pareto · Nash</h3>
      </div>
      <span class="pill">{{ moveCount }} 手</span>
    </div>

    <div class="metric-grid">
      <div class="metric">
        <span class="label">捕获差</span>
        <div class="value">
          {{ captureDiff >= 0 ? '+' : '' }}{{ captureDiff }}
        </div>
        <div class="hint">黑方捕获 - 白方捕获</div>
      </div>
      <div class="metric">
        <span class="label">帕累托效率</span>
        <div class="value">{{ (currentParetoEfficiency * 100).toFixed(1) }}%</div>
        <div class="hint">双效用越平衡越高</div>
      </div>
      <div class="metric">
        <span class="label">纳什偏离</span>
        <div class="value">{{ (currentNashGap * 100).toFixed(1) }}%</div>
        <div class="hint">越接近 0 越均衡</div>
      </div>
      <div class="metric">
        <span class="label">零和张力</span>
        <div class="value">{{ (zeroSumIndex * 100).toFixed(1) }}%</div>
        <div class="hint">分数差占比（零和刻画）</div>
      </div>
    </div>

    <div class="chart" ref="sparklineRef"></div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, watch, nextTick, ref } from 'vue'
import * as echarts from 'echarts'
import { useGameStore } from '../stores/game'

const gameStore = useGameStore()
const sparklineRef = ref(null)
let chart = null

const moveCount = computed(() => gameStore.moveHistory.length)
const blackWinRate = computed(() => Math.max(0, Math.min(1, gameStore.evaluation.winRate ?? 0.5)))

const captureDiff = computed(() => {
  const history = gameStore.gameTheoryData.captureHistory
  const last = history[history.length - 1]
  if (!last) return 0
  return (last.blackCaptures ?? 0) - (last.whiteCaptures ?? 0)
})

const currentParetoEfficiency = computed(() => {
  const history = gameStore.gameTheoryData.paretoHistory
  const last = history[history.length - 1]
  return last?.efficiency ?? 0.5
})

const currentNashGap = computed(() => {
  const history = gameStore.gameTheoryData.nashHistory
  const last = history[history.length - 1]
  return last?.gap ?? 0
})

const zeroSumIndex = computed(() => {
  const bs = gameStore.evaluation.blackScore || 0
  const ws = gameStore.evaluation.whiteScore || 0
  const total = Math.max(Math.abs(bs) + Math.abs(ws), 1)
  return Math.min(1, Math.abs(bs - ws) / total)
})

const renderChart = () => {
  if (!sparklineRef.value) return
  if (!chart) {
    chart = echarts.init(sparklineRef.value)
  }
  const history = gameStore.gameTheoryData.winRateHistory
  const data = history.length
    ? history.map((item) => Number(((item.blackWinRate ?? 0.5) * 100).toFixed(2)))
    : [blackWinRate.value * 100]
  chart.setOption({
    backgroundColor: 'transparent',
    grid: { left: 10, right: 10, top: 10, bottom: 10 },
    xAxis: { type: 'category', data: data.map((_, i) => i + 1), show: false },
    yAxis: { type: 'value', min: 0, max: 100, show: false },
    tooltip: {
      trigger: 'axis',
      valueFormatter: (val) => `${val.toFixed(1)}%`
    },
    series: [
      {
        type: 'line',
        smooth: true,
        showSymbol: false,
        data,
        lineStyle: { color: '#5cd6c3', width: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(92,214,195,0.35)' },
            { offset: 1, color: 'rgba(92,214,195,0)' }
          ])
        }
      }
    ]
  })
}

onMounted(() => {
  nextTick(renderChart)
})

onBeforeUnmount(() => {
  chart?.dispose()
  chart = null
})

watch(
  () => gameStore.gameTheoryData.winRateHistory,
  () => nextTick(renderChart),
  { deep: true }
)
</script>

<style scoped>
.theory-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.eyebrow {
  margin: 0;
  color: var(--text-muted);
  font-size: 11px;
}

h3 {
  margin: 2px 0 0 0;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
}

.metric {
  padding: 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  border: 1px solid var(--border-color);
}

.label {
  color: var(--text-secondary);
  font-size: 12px;
}

.value {
  font-size: 18px;
  font-weight: 700;
  margin-top: 4px;
}

.hint {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.bar {
  margin-top: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 999px;
  overflow: hidden;
  height: 8px;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-color), var(--accent-strong));
  border-radius: 999px;
}

.chart {
  height: 160px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
}
</style>
