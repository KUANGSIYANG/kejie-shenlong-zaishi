<template>
  <div class="lab-wrapper">
    <header class="lab-header panel glass">
      <div>
        <p class="eyebrow">围棋博弈论实验室</p>
        <h1>态势 · 胜率 · 策略 全景分析</h1>
        <p class="subtitle">
          实时读取对局信息，跟踪胜率、捕获差、落子质量，并以帕累托前沿与纳什均衡视角呈现棋局演化。
        </p>
        <div class="pills">
          <span class="pill">当前手数 {{ moveCount }}</span>
          <span class="pill">黑胜率 {{ (currentWinRate * 100).toFixed(1) }}%</span>
          <span class="pill">平衡度 {{ balanceScore }} / 100</span>
          <span class="pill">Pareto 效率 {{ (currentParetoEfficiency * 100).toFixed(1) }}%</span>
          <span class="pill">纳什偏离 {{ (currentNashGap * 100).toFixed(1) }}%</span>
          <span class="pill">零和张力 {{ (zeroSumIndex * 100).toFixed(1) }}%</span>
        </div>
      </div>
      <div class="actions">
        <button class="ghost" @click="refreshEvaluation" :disabled="gameStore.isThinking">
          手动刷新评估
        </button>
        <button class="primary" @click="emit('back')">
          返回对局
        </button>
      </div>
    </header>

    <div class="lab-body">
      <div class="chart-grid">
        <div class="metric-grid">
          <div class="metric-card panel glass">
            <div class="metric-title">局势倾斜</div>
            <div class="metric-value">{{ (currentWinRate * 100).toFixed(1) }}%</div>
            <div class="metric-sub">{{ currentWinRate >= 0.5 ? '黑方更优' : '白方更优' }}</div>
            <div class="bar">
              <div class="bar-fill" :style="{ width: `${currentWinRate * 100}%` }"></div>
            </div>
          </div>
          <div class="metric-card panel glass">
            <div class="metric-title">捕获差</div>
            <div class="metric-value">{{ captureDiff >= 0 ? '+' : '' }}{{ captureDiff }}</div>
            <div class="metric-sub">黑方捕获 - 白方捕获</div>
            <div class="bar">
              <div class="bar-fill alt" :style="{ width: `${capturePercent}%` }"></div>
            </div>
          </div>
          <div class="metric-card panel glass">
            <div class="metric-title">平均着手质量</div>
            <div class="metric-value">{{ (averageQuality * 100).toFixed(1) }}%</div>
            <div class="metric-sub">综合考虑棋形、连通与威胁</div>
            <div class="quality-dots">
              <span v-for="i in 5" :key="i" :class="{ on: averageQuality * 100 >= i * 18 }"></span>
            </div>
          </div>
          <div class="metric-card panel glass">
            <div class="metric-title">黑箱不确定度</div>
            <div class="metric-value">{{ (blackBoxUncertainty * 100).toFixed(1) }}%</div>
            <div class="metric-sub">胜率波动标准差映射</div>
            <div class="bar">
              <div class="bar-fill alt" :style="{ width: `${blackBoxUncertainty * 100}%` }"></div>
            </div>
          </div>
          <div class="metric-card panel glass">
            <div class="metric-title">策略网络协同</div>
            <div class="metric-value">{{ (strategySynergy * 100).toFixed(1) }}%</div>
            <div class="metric-sub">基于最近落子质量均值</div>
            <div class="bar">
              <div class="bar-fill" :style="{ width: `${strategySynergy * 100}%` }"></div>
            </div>
          </div>
        </div>

        <div class="chart-row">
          <div class="chart-card panel glass">
            <div class="chart-head">
              <div>
                <p class="eyebrow">胜率走势</p>
                <h3>Winrate Trajectory</h3>
              </div>
            <div class="pill-group">
              <span class="pill">黑 {{ (currentWinRate * 100).toFixed(1) }}%</span>
              <span class="pill">白 {{ ((1 - currentWinRate) * 100).toFixed(1) }}%</span>
            </div>
            </div>
            <div class="chart-actions">
              <button class="ghost-btn" @click="saveBaseline">保存为对比</button>
              <button class="ghost-btn" @click="clearBaseline" :disabled="!baselineWinrateData.length">清除对比</button>
              <span v-if="baselineWinrateData.length" class="note">对比: {{ gameStore.compareBaseline?.label || '基准' }}</span>
            </div>
            <div ref="winrateChartRef" class="chart"></div>
          </div>
          <div class="chart-notes panel glass">
            <h4>胜率轨迹说明</h4>
            <p>依据五个维度：影响力(40%)、地盘(30~40%)、吃子(15~20%)、子力(10%)、近 8 手稳定度(5~10%)综合得分，经 logistic 压缩得到黑胜率；白胜率 = 1 - 黑胜率，并根据局面早中后期叠加不确定度。</p>
          </div>
        </div>

        <div class="chart-row">
          <div class="chart-card panel glass">
            <div class="chart-head">
              <div>
                <p class="eyebrow">捕获 / 地盘</p>
                <h3>Captures & Territory</h3>
              </div>
              <span class="pill">双方对比</span>
            </div>
            <div ref="captureChartRef" class="chart"></div>
          </div>
          <div class="chart-notes panel glass">
            <h4>捕获 / 地盘说明</h4>
            <p>黑吃、白吃为累计提子数；黑地、白地来自 flood-fill 估算的领地。无历史时读取当前评估，柱状并列展示四个指标，便于观察战果与实地差。</p>
          </div>
        </div>

        <div class="chart-row">
          <div class="chart-card panel glass">
            <div class="chart-head">
              <div>
                <p class="eyebrow">着手质量</p>
                <h3>Move Quality Scatter</h3>
              </div>
              <span class="pill">0.0 - 1.0</span>
            </div>
            <div ref="qualityChartRef" class="chart"></div>
          </div>
          <div class="chart-notes panel glass">
            <h4>着手质量说明</h4>
            <p>基于阶段基准(开局/中盘/官子)、位置价值（星位/中心/边角）、吃子奖励、连通度和周围气，范围 0.25~0.85。折线为平滑趋势，散点颜色区分高低质量。</p>
          </div>
        </div>

        <div class="chart-row">
          <div class="chart-card panel glass">
            <div class="chart-head">
              <div>
                <p class="eyebrow">帕累托前沿</p>
                <h3>Pareto Frontier (U黑, U白)</h3>
              </div>
              <span class="pill">双效益对比</span>
            </div>
            <div ref="paretoChartRef" class="chart"></div>
          </div>
          <div class="chart-notes panel glass">
            <h4>帕累托前沿说明</h4>
            <p>效用对(U黑=blackScore, U白=whiteScore)散点，气泡大小按效率=1-|U黑-U白|/(U黑+U白)。虚线为均衡线，越靠近表示双方收益越均衡，气泡越大表示帕累托效率越高。</p>
          </div>
        </div>

        <div class="chart-row">
          <div class="chart-card panel glass">
            <div class="chart-head">
              <div>
                <p class="eyebrow">纳什均衡偏离</p>
                <h3>Nash Gap & Stability</h3>
              </div>
              <span class="pill">0 = 完全均衡</span>
            </div>
            <div ref="nashChartRef" class="chart"></div>
          </div>
          <div class="chart-notes panel glass">
            <h4>纳什偏离说明</h4>
            <p>偏离=|黑胜率-0.5|，越低越接近均衡；稳定度=1-2*偏离。两条曲线展现随手数的均衡程度与稳定性变化，可辅助判断关键转折。</p>
          </div>
        </div>

        <div class="chart-row">
          <div class="chart-card panel glass">
            <div class="chart-head">
              <div>
                <p class="eyebrow">零和张力</p>
                <h3>Zero-Sum Tension</h3>
              </div>
              <span class="pill">差距占比</span>
            </div>
            <div ref="zeroSumChartRef" class="chart"></div>
          </div>
          <div class="chart-notes panel glass">
            <h4>零和张力说明</h4>
            <p>张力=|黑分-白分|/(|黑分|+|白分|)，衡量此刻差距占比分布。数值越高，局面越“零和”且偏向一方；越低表示双方收益接近平衡。</p>
          </div>
        </div>

        <div class="chart-row">
          <div class="chart-card panel glass">
            <div class="chart-head">
              <div>
                <p class="eyebrow">黑箱 & 协同</p>
                <h3>Uncertainty vs Synergy</h3>
              </div>
              <span class="pill">模型波动/决策一致</span>
            </div>
            <div ref="stabilityChartRef" class="chart"></div>
          </div>
          <div class="chart-notes panel glass">
            <h4>黑箱 & 协同说明</h4>
            <p>不确定度：近 12 手胜率标准差映射 0.05~0.6，衡量模型波动；策略协同：近 8 手落子质量均值映射 0.3~0.9，越高表示最近决策一致性越好。两者并行帮助判断策略稳定性。</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { useGameStore } from '../stores/game'

const emit = defineEmits(['back'])
const gameStore = useGameStore()
const winrateChartRef = ref(null)
const captureChartRef = ref(null)
const qualityChartRef = ref(null)
const paretoChartRef = ref(null)
const nashChartRef = ref(null)
const zeroSumChartRef = ref(null)
const stabilityChartRef = ref(null)

const charts = {
  winrate: null,
  capture: null,
  quality: null,
  pareto: null,
  nash: null
}

const winrateData = computed(() =>
  gameStore.gameTheoryData.winRateHistory.map((item, index) => ({
    move: item.move ?? index + 1,
    black: Number(((item.blackWinRate ?? 0.5) * 100).toFixed(2)),
    white: Number(((item.whiteWinRate ?? 0.5) * 100).toFixed(2))
  }))
)

const baselineWinrateData = computed(() => {
  const base = gameStore.compareBaseline?.winRateHistory || []
  return base.map((item, index) => ({
    move: item.move ?? index + 1,
    black: Number(((item.blackWinRate ?? 0.5) * 100).toFixed(2)),
    white: Number(((item.whiteWinRate ?? 0.5) * 100).toFixed(2))
  }))
})

const captureData = computed(() => {
  if (gameStore.gameTheoryData.captureHistory.length) {
    return gameStore.gameTheoryData.captureHistory.map((item, index) => ({
      move: item.move ?? index + 1,
      black: item.blackCaptures ?? 0,
      white: item.whiteCaptures ?? 0,
      blackTerritory: item.blackTerritory ?? 0,
      whiteTerritory: item.whiteTerritory ?? 0
    }))
  }
  return [
    {
      move: 1,
      black: gameStore.evaluation.blackCaptures ?? 0,
      white: gameStore.evaluation.whiteCaptures ?? 0,
      blackTerritory: gameStore.evaluation.blackTerritory ?? 0,
      whiteTerritory: gameStore.evaluation.whiteTerritory ?? 0
    }
  ]
})

const qualityData = computed(() => {
  if (gameStore.gameTheoryData.moveQuality.length > 0) {
    return gameStore.gameTheoryData.moveQuality
  }
  return gameStore.moveHistory.map((move, index) => ({
    move: index + 1,
    quality: move.quality ?? 0.55
  }))
})

const paretoData = computed(() => {
  if (gameStore.gameTheoryData.paretoHistory.length > 0) {
    return gameStore.gameTheoryData.paretoHistory
  }
  const bu = gameStore.evaluation.blackScore ?? 0
  const wu = gameStore.evaluation.whiteScore ?? 0
  const base = Math.max(Math.abs(bu) + Math.abs(wu), 1)
  const efficiency = Math.max(0, Math.min(1, 1 - Math.abs(bu - wu) / base))
  return [{ move: 1, blackUtility: bu, whiteUtility: wu, efficiency }]
})

const nashData = computed(() => {
  if (gameStore.gameTheoryData.nashHistory.length > 0) {
    return gameStore.gameTheoryData.nashHistory
  }
  const gap = Math.abs((gameStore.evaluation.winRate || 0.5) - 0.5)
  return [{ move: 1, gap, stability: 1 - gap * 2, potential: 0.5 }]
})

const zeroSumData = computed(() => {
  if (gameStore.gameTheoryData.zeroSumHistory.length > 0) {
    return gameStore.gameTheoryData.zeroSumHistory
  }
  return [{ move: 1, tension: 0 }]
})

const stabilityData = computed(() => {
  const u = gameStore.gameTheoryData.uncertaintyHistory
  const s = gameStore.gameTheoryData.synergyHistory
  if (u.length || s.length) {
    const maxLen = Math.max(u.length, s.length)
    const res = []
    for (let i = 0; i < maxLen; i++) {
      res.push({
        move: (u[i]?.move ?? s[i]?.move ?? i + 1) || i + 1,
        uncertainty: u[i]?.uncertainty ?? u[u.length - 1]?.uncertainty ?? 0.2,
        synergy: s[i]?.synergy ?? s[s.length - 1]?.synergy ?? 0.55
      })
    }
    return res
  }
  return [{ move: 1, uncertainty: 0.2, synergy: 0.55 }]
})

const moveCount = computed(() => gameStore.moveHistory.length)
const currentWinRate = computed(() => gameStore.evaluation.winRate ?? 0.5)

const captureDiff = computed(() => {
  const last = captureData.value[captureData.value.length - 1]
  if (!last) return 0
  return (last.black ?? 0) - (last.white ?? 0)
})

const capturePercent = computed(() => {
  const last = captureData.value[captureData.value.length - 1]
  if (!last) return 50
  const total = Math.max((last.black ?? 0) + (last.white ?? 0), 1)
  return Math.min(100, Math.max(0, ((last.black ?? 0) / total) * 100))
})

const averageQuality = computed(() => {
  if (!qualityData.value.length) return 0.55
  const total = qualityData.value.reduce((sum, item) => sum + (item.quality ?? 0.55), 0)
  return total / qualityData.value.length
})

const balanceScore = computed(() => {
  const winScore = Math.abs(currentWinRate.value - 0.5) * 100
  const captureScore = Math.min(Math.abs(captureDiff.value) * 6, 40)
  const balance = Math.max(0, 100 - (winScore + captureScore) * 0.35)
  return Math.round(balance)
})

const currentParetoEfficiency = computed(() => {
  const last = paretoData.value[paretoData.value.length - 1]
  return last?.efficiency ?? 0.5
})

const currentNashGap = computed(() => {
  const last = nashData.value[nashData.value.length - 1]
  return last?.gap ?? 0.0
})

const zeroSumIndex = computed(() => {
  const bs = gameStore.evaluation.blackScore || 0
  const ws = gameStore.evaluation.whiteScore || 0
  const total = Math.max(Math.abs(bs) + Math.abs(ws), 1)
  return Math.min(1, Math.abs(bs - ws) / total)
})

const blackBoxUncertainty = computed(() => {
  const history = gameStore.gameTheoryData.winRateHistory
  if (!history.length) return 0.2
  const recent = history.slice(-12).map((h) => h.blackWinRate ?? 0.5)
  const avg = recent.reduce((a, b) => a + b, 0) / Math.max(recent.length, 1)
  const variance = recent.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / Math.max(recent.length, 1)
  const std = Math.sqrt(variance)
  return Math.max(0.05, Math.min(0.6, std * 1.8))
})

const strategySynergy = computed(() => {
  const recent = gameStore.gameTheoryData.moveQuality.slice(-8)
  if (!recent.length) return 0.55
  const avg = recent.reduce((sum, i) => sum + (i.quality ?? 0.55), 0) / recent.length
  return Math.max(0.3, Math.min(0.9, avg))
})

const renderWinrateChart = () => {
  if (!winrateChartRef.value) return
  if (!charts.winrate) {
    charts.winrate = echarts.init(winrateChartRef.value)
  }
  const moves = winrateData.value.map((i) => i.move)
  charts.winrate.setOption({
    backgroundColor: 'transparent',
    grid: { left: 40, right: 20, top: 30, bottom: 28 },
    tooltip: {
      trigger: 'axis',
      valueFormatter: (val) => `${val.toFixed(1)}%`
    },
    xAxis: {
      type: 'category',
      data: moves,
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#4b5672' } },
      axisLabel: { color: '#9eabc8' },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLine: { show: false },
      axisLabel: { color: '#9eabc8', formatter: '{value}%' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
    },
    series: [
      {
        name: '黑胜率',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: winrateData.value.map((i) => i.black),
        lineStyle: { color: '#5cd6c3', width: 2.4 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(92,214,195,0.32)' },
            { offset: 1, color: 'rgba(92,214,195,0)' }
          ])
        }
      },
      {
        name: '白胜率',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: winrateData.value.map((i) => i.white),
        lineStyle: { color: '#7aa7ff', width: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(122,167,255,0.28)' },
            { offset: 1, color: 'rgba(122,167,255,0)' }
          ])
        }
      }
    ]
  })
}

const renderCaptureChart = () => {
  if (!captureChartRef.value) return
  if (!charts.capture) {
    charts.capture = echarts.init(captureChartRef.value)
  }
  const moves = captureData.value.length ? captureData.value.map((i) => i.move) : [1]
  const blackCap = captureData.value.length ? captureData.value.map((i) => i.black) : [0]
  const whiteCap = captureData.value.length ? captureData.value.map((i) => i.white) : [0]
  const blackTer = captureData.value.length ? captureData.value.map((i) => i.blackTerritory ?? 0) : [0]
  const whiteTer = captureData.value.length ? captureData.value.map((i) => i.whiteTerritory ?? 0) : [0]
  charts.capture.setOption({
    backgroundColor: 'transparent',
    grid: { left: 45, right: 20, top: 30, bottom: 28 },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: moves,
      axisLabel: { color: '#9eabc8' },
      axisLine: { lineStyle: { color: '#4b5672' } }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#9eabc8' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
    },
    legend: {
      data: ['黑吃', '白吃', '黑地', '白地'],
      textStyle: { color: '#e8ecf7' },
      top: 0
    },
    series: [
      {
        name: '黑吃',
        type: 'bar',
        data: blackCap,
        itemStyle: { color: '#5cd6c3', borderRadius: 4 }
      },
      {
        name: '白吃',
        type: 'bar',
        data: whiteCap,
        itemStyle: { color: '#7aa7ff', borderRadius: 4 }
      },
      {
        name: '黑地',
        type: 'bar',
        data: blackTer,
        itemStyle: { color: '#fcb564', borderRadius: 4 },
        barGap: '25%'
      },
      {
        name: '白地',
        type: 'bar',
        data: whiteTer,
        itemStyle: { color: '#ff7eb6', borderRadius: 4 },
        barGap: '25%'
      }
    ]
  })
}

const renderQualityChart = () => {
  if (!qualityChartRef.value) return
  if (!charts.quality) {
    charts.quality = echarts.init(qualityChartRef.value)
  }
  charts.quality.setOption({
    backgroundColor: 'transparent',
    grid: { left: 40, right: 20, top: 30, bottom: 28 },
    tooltip: {
      trigger: 'item',
      formatter: (p) => `第${p.dataIndex + 1}手: ${(p.data[1] * 100).toFixed(1)}%`
    },
    xAxis: {
      type: 'value',
      name: '手数',
      axisLabel: { color: '#9eabc8' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 1,
      axisLabel: {
        color: '#9eabc8',
        formatter: (v) => `${Math.round(v * 100)}%`
      },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
    },
    series: [
      {
        name: '着手质量',
        type: 'scatter',
        symbolSize: 9,
        data: qualityData.value.map((item, idx) => [item.move ?? idx + 1, item.quality ?? 0.55]),
        itemStyle: {
          color: (params) => (params.data[1] >= 0.6 ? '#5cd6c3' : '#ffb86c'),
          shadowBlur: 8,
          shadowColor: 'rgba(0,0,0,0.35)'
        }
      },
      {
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#7aa7ff', width: 2 },
        data: qualityData.value.map((item, idx) => [item.move ?? idx + 1, item.quality ?? 0.55]),
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(122,167,255,0.22)' },
            { offset: 1, color: 'rgba(122,167,255,0)' }
          ])
        }
      }
    ]
  })
}

const renderParetoChart = () => {
  if (!paretoChartRef.value) return
  if (!charts.pareto) {
    charts.pareto = echarts.init(paretoChartRef.value)
  }
  const safeData =
    paretoData.value.length && paretoData.value.some((p) => Number.isFinite(p.blackUtility) || Number.isFinite(p.whiteUtility))
      ? paretoData.value
      : [
          {
            move: 1,
            blackUtility: gameStore.evaluation.blackScore ?? 0,
            whiteUtility: gameStore.evaluation.whiteScore ?? 0,
            efficiency: 0.5
          }
        ]
  const scatterData = safeData.map((p) => ({
    value: [Number(p.blackUtility ?? 0), Number(p.whiteUtility ?? 0)],
    move: p.move ?? 1,
    efficiency: Number(p.efficiency ?? 0.5)
  }))
  const maxX = Math.max(...scatterData.map((d) => d.value[0]), 1)
  const maxY = Math.max(...scatterData.map((d) => d.value[1]), 1)
  charts.pareto.setOption({
    backgroundColor: 'transparent',
    grid: { left: 55, right: 18, top: 30, bottom: 32 },
    tooltip: {
      trigger: 'item',
      formatter: (params) =>
        `第${params.data.move}手<br/>U黑: ${params.data.value[0].toFixed(1)} / U白: ${params.data.value[1].toFixed(
          1
        )}<br/>效率: ${(params.data.efficiency * 100).toFixed(1)}%`
    },
    xAxis: {
      name: '黑方效用',
      nameTextStyle: { color: '#9eabc8' },
      axisLabel: { color: '#9eabc8' },
      axisLine: { lineStyle: { color: '#4b5672' } },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
    },
    yAxis: {
      name: '白方效用',
      nameTextStyle: { color: '#9eabc8' },
      axisLabel: { color: '#9eabc8' },
      axisLine: { lineStyle: { color: '#4b5672' } },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
    },
    series: [
      {
        type: 'line',
        data: [
          [0, 0],
          [maxX, maxY]
        ],
        lineStyle: { color: 'rgba(255,255,255,0.12)', type: 'dashed' },
        silent: true,
        showSymbol: false
      },
      {
        type: 'scatter',
        symbolSize: (val, params) => 10 + (scatterData[params.dataIndex].efficiency || 0) * 10,
        data: scatterData,
        itemStyle: {
          color: (params) =>
            new echarts.graphic.LinearGradient(0, 1, 1, 0, [
              { offset: 0, color: '#7aa7ff' },
              { offset: 1, color: '#5cd6c3' }
            ]),
          opacity: 0.9
        },
        emphasis: {
          scale: true
        }
      }
    ],
    visualMap: {
      show: false,
      min: 0,
      max: 1,
      dimension: 2,
      inRange: {
        color: ['#ff7eb6', '#7aa7ff', '#5cd6c3']
      }
    }
  })
}

const renderNashChart = () => {
  if (!nashChartRef.value) return
  if (!charts.nash) {
    charts.nash = echarts.init(nashChartRef.value)
  }
  const moves = nashData.value.map((n) => n.move)
  charts.nash.setOption({
    backgroundColor: 'transparent',
    grid: { left: 45, right: 20, top: 30, bottom: 28 },
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const gapVal = params[0]?.data ?? 0
        const stabilityVal = params[1]?.data ?? 0
        return `第${params[0]?.axisValue}手<br/>纳什偏离: ${(gapVal * 100).toFixed(1)}%<br/>稳定度: ${(stabilityVal * 100).toFixed(1)}%`
      }
    },
    xAxis: {
      type: 'category',
      data: moves,
      axisLabel: { color: '#9eabc8' },
      axisLine: { lineStyle: { color: '#4b5672' } }
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 1,
      axisLabel: {
        color: '#9eabc8',
        formatter: (v) => `${(v * 100).toFixed(0)}%`
      },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
    },
    legend: {
      data: ['纳什偏离', '均衡稳定度'],
      textStyle: { color: '#e8ecf7' },
      top: 0
    },
    series: [
      {
        name: '纳什偏离',
        type: 'line',
        smooth: true,
        data: nashData.value.map((n) => n.gap ?? 0),
        lineStyle: { color: '#ffb86c', width: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255,184,108,0.28)' },
            { offset: 1, color: 'rgba(255,184,108,0)' }
          ])
        }
      },
      {
        name: '均衡稳定度',
        type: 'line',
        smooth: true,
        data: nashData.value.map((n) => n.stability ?? 0),
        lineStyle: { color: '#7aa7ff', width: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(122,167,255,0.22)' },
            { offset: 1, color: 'rgba(122,167,255,0)' }
          ])
        }
      }
    ]
  })
}

const renderZeroSumChart = () => {
  if (!zeroSumChartRef.value) return
  if (!charts.zeroSum) {
    charts.zeroSum = echarts.init(zeroSumChartRef.value)
  }
  const moves = zeroSumData.value.map((z) => z.move ?? 1)
  charts.zeroSum.setOption({
    backgroundColor: 'transparent',
    grid: { left: 45, right: 20, top: 30, bottom: 28 },
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const t = params[0]?.data ?? 0
        return `第${params[0]?.axisValue}手<br/>零和张力: ${(t * 100).toFixed(1)}%`
      }
    },
    xAxis: {
      type: 'category',
      data: moves,
      axisLabel: { color: '#9eabc8' },
      axisLine: { lineStyle: { color: '#4b5672' } }
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 1,
      axisLabel: { color: '#9eabc8', formatter: (v) => `${(v * 100).toFixed(0)}%` },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
    },
    series: [
      {
        name: '零和张力',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: zeroSumData.value.map((z) => z.tension ?? 0),
        lineStyle: { color: '#fcb564', width: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(252,181,100,0.3)' },
            { offset: 1, color: 'rgba(252,181,100,0)' }
          ])
        }
      }
    ]
  })
}

const renderStabilityChart = () => {
  if (!stabilityChartRef.value) return
  if (!charts.stability) {
    charts.stability = echarts.init(stabilityChartRef.value)
  }
  const moves = stabilityData.value.map((d) => d.move ?? 1)
  charts.stability.setOption({
    backgroundColor: 'transparent',
    grid: { left: 45, right: 20, top: 30, bottom: 28 },
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const u = params.find((p) => p.seriesName === '不确定度')?.data ?? 0
        const s = params.find((p) => p.seriesName === '策略协同')?.data ?? 0
        return `第${params[0]?.axisValue}手<br/>不确定度: ${(u * 100).toFixed(1)}%<br/>策略协同: ${(s * 100).toFixed(1)}%`
      }
    },
    xAxis: {
      type: 'category',
      data: moves,
      axisLabel: { color: '#9eabc8' },
      axisLine: { lineStyle: { color: '#4b5672' } }
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 1,
      axisLabel: { color: '#9eabc8', formatter: (v) => `${(v * 100).toFixed(0)}%` },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
    },
    legend: {
      data: ['不确定度', '策略协同'],
      textStyle: { color: '#e8ecf7' },
      top: 0
    },
    series: [
      {
        name: '不确定度',
        type: 'line',
        smooth: true,
        data: stabilityData.value.map((d) => d.uncertainty ?? 0),
        lineStyle: { color: '#ff7eb6', width: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255,126,182,0.28)' },
            { offset: 1, color: 'rgba(255,126,182,0)' }
          ])
        }
      },
      {
        name: '策略协同',
        type: 'line',
        smooth: true,
        data: stabilityData.value.map((d) => d.synergy ?? 0.55),
        lineStyle: { color: '#5cd6c3', width: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(92,214,195,0.24)' },
            { offset: 1, color: 'rgba(92,214,195,0)' }
          ])
        }
      }
    ]
  })
}

const refreshEvaluation = async () => {
  try {
    if (gameStore.isConnected) {
      await gameStore.updateBoard()
    }
    gameStore.updateEvaluation()
    gameStore.updateGameTheoryData()
  } catch (err) {
    console.error('刷新评估失败', err)
  }
}

const resizeCharts = () => {
  charts.winrate?.resize()
  charts.capture?.resize()
  charts.quality?.resize()
  charts.pareto?.resize()
  charts.nash?.resize()
  charts.zeroSum?.resize()
  charts.stability?.resize()
}

onMounted(() => {
  nextTick(() => {
    renderWinrateChart()
    renderCaptureChart()
    renderQualityChart()
    renderParetoChart()
    renderNashChart()
    renderZeroSumChart()
    renderStabilityChart()
  })
  window.addEventListener('resize', resizeCharts)
})

onBeforeUnmount(() => {
  Object.values(charts).forEach((chart) => chart?.dispose())
  window.removeEventListener('resize', resizeCharts)
})

watch([winrateData, captureData, qualityData, paretoData, nashData, zeroSumData, stabilityData], () => {
  nextTick(() => {
    renderWinrateChart()
    renderCaptureChart()
    renderQualityChart()
    renderParetoChart()
    renderNashChart()
    renderZeroSumChart()
    renderStabilityChart()
  })
})
</script>

<style scoped>
.lab-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
  z-index: 1;
}

.lab-header {
  padding: 20px 22px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.eyebrow {
  margin: 0 0 4px 0;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 11px;
  color: var(--text-muted);
}

h1 {
  margin: 0;
  font-size: 26px;
  letter-spacing: 0.4px;
}

h3 {
  margin: 2px 0 0 0;
}

.subtitle {
  margin: 6px 0 10px;
  color: var(--text-secondary);
}

.pills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ghost,
.primary {
  border-radius: 10px;
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  cursor: pointer;
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-primary);
  transition: all 0.2s;
  font-weight: 600;
}

.ghost:hover {
  border-color: var(--accent-color);
}

.primary {
  background: linear-gradient(135deg, var(--accent-color), var(--accent-strong));
  border: none;
  color: #0a0c14;
}

.primary:hover {
  transform: translateY(-1px);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.metric-card {
  padding: 14px;
}

.metric-title {
  color: var(--text-muted);
  font-size: 13px;
}

.metric-value {
  font-size: 26px;
  font-weight: 700;
  margin-top: 4px;
}

.metric-sub {
  color: var(--text-secondary);
  font-size: 12px;
  margin-top: 2px;
}

.bar {
  margin-top: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 999px;
  overflow: hidden;
  height: 10px;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-color), var(--accent-strong));
  border-radius: 999px;
}

.bar-fill.alt {
  background: linear-gradient(90deg, #fcb564, #ff7eb6);
}

.quality-dots {
  display: flex;
  gap: 6px;
  margin-top: 10px;
}

.quality-dots span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
}

.quality-dots span.on {
  background: var(--accent-color);
  box-shadow: 0 0 8px rgba(92, 214, 195, 0.6);
}

.chart-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 16px;
}

.chart-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  align-items: stretch;
}

.chart-row .chart-card,
.chart-row .chart-notes {
  height: 100%;
}

.chart-card {
  padding: 12px;
}

.chart-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.chart {
  height: 260px;
  width: 100%;
  min-height: 240px;
}

.explain {
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid var(--border-color);
}

.explain h4 {
  margin: 0 0 8px 0;
}

.explain ul {
  margin: 0;
  padding-left: 18px;
  color: var(--text-secondary);
  line-height: 1.6;
  font-size: 13px;
}

@media (max-width: 960px) {
  .lab-header {
    flex-direction: column;
  }
  .actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
