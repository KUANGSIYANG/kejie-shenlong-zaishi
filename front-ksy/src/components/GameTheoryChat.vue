<template>
    <div class="game-theory-chart" ref="chartContainerRef">
      <div class="chart-header">
      <h3>博弈论分析</h3>
        <div class="theory-badge">Game Theory</div>
      </div>
      
      <div class="chart-tabs">
        <button 
          v-for="tab in tabs" 
          :key="tab.key"
          @click="activeTab = tab.key"
          :class="{ active: activeTab === tab.key }"
          class="tab-btn"
        >
          {{ tab.label }}
        </button>
      </div>
      
      <!-- 胜率曲线 -->
<div v-show="activeTab === 'winrate'" class="chart-container">
        <div class="chart" ref="winrateChartRef">
          <!-- ECharts 胜率曲线 -->
          <div v-if="useEcharts">
            <div v-if="winrateData.length === 0" class="empty-state">
              <p class="empty-message">暂无胜率数据</p>
              <p class="empty-hint">请进行对局以生成胜率曲线</p>
            </div>
            <div v-else ref="winrateEchartRef" class="echart-container" style="width: 100%; height: 280px;"></div>
          </div>
          
          <!-- 原 SVG 备用 -->
          <svg v-else class="chart-svg" :viewBox="`0 0 ${chartWidth.value} ${chartHeight}`" preserveAspectRatio="xMidYMid meet">
            <!-- 背景网格 -->
            <defs>
              <linearGradient id="blackGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:rgba(0,0,0,0.3);stop-opacity:1" />
                <stop offset="100%" style="stop-color:rgba(0,0,0,0);stop-opacity:1" />
              </linearGradient>
              <linearGradient id="whiteGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:rgba(255,255,255,0.3);stop-opacity:1" />
                <stop offset="100%" style="stop-color:rgba(255,255,255,0);stop-opacity:1" />
              </linearGradient>
              <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
              </pattern>
            </defs>
            
            <!-- 背景网格 -->
            <rect :width="chartWidth.value" :height="chartHeight" fill="url(#gridPattern)" />
            
            <!-- Y轴 -->
            <line 
              :x1="padding.value" 
              :y1="padding.value" 
              :x2="padding.value" 
              :y2="chartHeight - padding.value" 
              stroke="var(--text-secondary)" 
              stroke-width="1.5"
            />
            
            <!-- X轴 -->
            <line 
              :x1="padding.value" 
              :y1="chartHeight - padding.value" 
              :x2="chartWidth.value - padding.value" 
              :y2="chartHeight - padding.value" 
              stroke="var(--text-secondary)" 
              stroke-width="1.5"
            />
            
            <!-- Y轴标签和刻度 -->
            <text :x="25" :y="padding.value + 5" class="axis-label" text-anchor="end">100%</text>
            <text :x="25" :y="chartHeight / 2 + 5" class="axis-label" text-anchor="end">50%</text>
            <text :x="25" :y="chartHeight - padding.value + 5" class="axis-label" text-anchor="end">0%</text>
            
            <!-- Y轴刻度线 -->
            <line 
              :x1="padding.value - 5" 
              :y1="padding.value" 
              :x2="padding.value" 
              :y2="padding.value" 
              stroke="var(--text-secondary)" 
              stroke-width="1"
            />
            <line 
              :x1="padding.value - 5" 
              :y1="chartHeight / 2" 
              :x2="padding.value" 
              :y2="chartHeight / 2" 
              stroke="var(--text-secondary)" 
              stroke-width="1"
            />
            <line 
              :x1="padding.value - 5" 
              :y1="chartHeight - padding.value" 
              :x2="padding.value" 
              :y2="chartHeight - padding.value" 
              stroke="var(--text-secondary)" 
              stroke-width="1"
            />
            
            <!-- X轴标签 -->
            <text 
              :x="chartWidth.value / 2" 
              :y="chartHeight - 10" 
              class="axis-label" 
              text-anchor="middle"
            >
              手数
            </text>
            
            <!-- 网格线 -->
            <line 
              :x1="padding.value" 
              :y1="chartHeight / 2" 
              :x2="chartWidth.value - padding.value" 
              :y2="chartHeight / 2" 
              stroke="rgba(255,255,255,0.2)" 
              stroke-width="1" 
              stroke-dasharray="2,2"
            />
            
            <!-- 黑方胜率区域 -->
            <polygon
              v-if="winrateData.length > 0"
              :points="getWinrateAreaPoints('black')"
              fill="url(#blackGradient)"
              opacity="0.5"
            />
            
            <!-- 白方胜率区域 -->
            <polygon
              v-if="winrateData.length > 0"
              :points="getWinrateAreaPoints('white')"
              fill="url(#whiteGradient)"
              opacity="0.5"
            />
            
            <!-- 黑方胜率曲线 -->
            <polyline
              v-if="winrateData.length > 0"
              :points="getWinrateLinePoints('black')"
              fill="none"
              stroke="#333"
              stroke-width="2"
            />
            
            <!-- 白方胜率曲线 -->
            <polyline
              v-if="winrateData.length > 0"
              :points="getWinrateLinePoints('white')"
              fill="none"
              stroke="#fff"
              stroke-width="2"
            />
            
            <!-- 数据点和悬停提示 -->
            <g
              v-for="(point, index) in winrateData"
              :key="`point-${index}`"
              class="data-point-group"
            >
              <circle
              :cx="getX(index)"
              :cy="getWinrateY(point.blackWinRate)"
                r="4"
              fill="#333"
              class="data-point"
                @mouseenter="hoveredPoint = { index, point, type: 'black' }"
                @mouseleave="hoveredPoint = null"
              />
              <circle
                :cx="getX(index)"
                :cy="getWinrateY(point.whiteWinRate)"
                r="4"
                fill="#fff"
                stroke="#aaa"
                stroke-width="1"
                class="data-point"
                @mouseenter="hoveredPoint = { index, point, type: 'white' }"
                @mouseleave="hoveredPoint = null"
              />
              
              <!-- 悬停提示 -->
              <g v-if="hoveredPoint && hoveredPoint.index === index">
                <rect
                  :x="getX(index) - 40"
                  :y="hoveredPoint.type === 'black' ? getWinrateY(point.blackWinRate) - 35 : getWinrateY(point.whiteWinRate) - 35"
                  width="80"
                  height="30"
                  fill="rgba(0, 0, 0, 0.8)"
                  rx="4"
                />
                <text
                  :x="getX(index)"
                  :y="hoveredPoint.type === 'black' ? getWinrateY(point.blackWinRate) - 20 : getWinrateY(point.whiteWinRate) - 20"
                  text-anchor="middle"
                  fill="white"
                  font-size="10"
                >
                  第{{ index + 1 }}手: {{ ((hoveredPoint.type === 'black' ? point.blackWinRate : point.whiteWinRate) * 100).toFixed(1) }}%
                </text>
              </g>
            </g>
          </svg>
        </div>
        <div class="chart-footer">
        <div class="chart-legend">
          <div class="legend-item">
            <span class="legend-color black"></span>
            <span>黑方胜率</span>
          </div>
          <div class="legend-item">
            <span class="legend-color white"></span>
            <span>白方胜率</span>
            </div>
          </div>
          <div class="chart-stats">
            <div class="stat-mini">
              <span class="stat-mini-label">黑方胜率:</span>
              <span class="stat-mini-value black">
                {{ winrateData.length > 0 ? (winrateData[winrateData.length - 1].blackWinRate * 100).toFixed(1) : '50.0' }}%
              </span>
            </div>
            <div class="stat-mini">
              <span class="stat-mini-label">白方胜率:</span>
              <span class="stat-mini-value white">
                {{ winrateData.length > 0 ? (winrateData[winrateData.length - 1].whiteWinRate * 100).toFixed(1) : '50.0' }}%
              </span>
            </div>
            <div class="stat-mini">
              <span class="stat-mini-label">胜率波动:</span>
              <span class="stat-mini-value">{{ winRateVolatility.toFixed(2) }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 评估值曲线 -->
<div v-show="activeTab === 'value'" class="chart-container">
        <div class="chart" ref="valueChartRef">
          <!-- ECharts 评估值曲线 -->
          <div v-if="useEcharts">
            <div v-if="valueData.length === 0" class="empty-state">
              <p class="empty-message">暂无评估值数据</p>
              <p class="empty-hint">请进行对局以生成评估值曲线</p>
            </div>
            <div v-else ref="valueEchartRef" class="echart-container" style="width: 100%; height: 280px;"></div>
          </div>
          
          <!-- 原 SVG 备用 -->
          <svg v-else class="chart-svg" :viewBox="`0 0 ${chartWidth.value} ${chartHeight}`" preserveAspectRatio="xMidYMid meet">
            <!-- 背景网格 -->
            <rect :width="chartWidth.value" :height="chartHeight" fill="url(#gridPattern)" />
            
            <!-- Y轴 -->
            <line 
              :x1="padding.value" 
              :y1="padding.value" 
              :x2="padding.value" 
              :y2="chartHeight - padding.value" 
              stroke="var(--text-secondary)" 
              stroke-width="1.5"
            />
            
            <!-- X轴 -->
            <line 
              :x1="padding.value" 
              :y1="chartHeight - padding.value" 
              :x2="chartWidth.value - padding.value" 
              :y2="chartHeight - padding.value" 
              stroke="var(--text-secondary)" 
              stroke-width="1.5"
            />
            
            <!-- Y轴标签和刻度 -->
            <text 
              v-if="valueData.length > 0"
              :x="25" 
              :y="padding.value + 5" 
              class="axis-label" 
              text-anchor="end"
            >
              {{ maxValue.toFixed(0) }}
            </text>
            <text :x="25" :y="chartHeight / 2 + 5" class="axis-label" text-anchor="end">0</text>
            <text 
              v-if="valueData.length > 0"
              :x="25" 
              :y="chartHeight - padding + 5" 
              class="axis-label" 
              text-anchor="end"
            >
              {{ minValue.toFixed(0) }}
            </text>
            
            <!-- Y轴刻度线 -->
            <line 
              :x1="padding.value - 5" 
              :y1="padding.value" 
              :x2="padding.value" 
              :y2="padding.value" 
              stroke="var(--text-secondary)" 
              stroke-width="1"
            />
            <line 
              :x1="padding.value - 5" 
              :y1="chartHeight / 2" 
              :x2="padding.value" 
              :y2="chartHeight / 2" 
              stroke="var(--text-secondary)" 
              stroke-width="1"
            />
            <line 
              :x1="padding.value - 5" 
              :y1="chartHeight - padding" 
              :x2="padding.value" 
              :y2="chartHeight - padding" 
              stroke="var(--text-secondary)" 
              stroke-width="1"
            />
            
            <!-- X轴标签 -->
            <text 
              :x="chartWidth.value / 2" 
              :y="chartHeight - 10" 
              class="axis-label" 
              text-anchor="middle"
            >
              手数
            </text>
            
            <!-- 网格线 -->
            <line 
              :x1="padding.value" 
              :y1="chartHeight / 2" 
              :x2="chartWidth.value - padding.value" 
              :y2="chartHeight / 2" 
              stroke="rgba(255,255,255,0.2)" 
              stroke-width="1" 
              stroke-dasharray="2,2"
            />
            
            <!-- 评估值区域 -->
            <polygon
              v-if="valueData.length > 0"
              :points="getValueAreaPoints()"
              fill="rgba(74, 158, 255, 0.2)"
            />
            
            <!-- 评估值曲线 -->
            <polyline
              v-if="valueData.length > 0"
              :points="getValueLinePoints()"
              fill="none"
              stroke="#4a9eff"
              stroke-width="2"
            />
            
            <!-- 数据点和悬停提示 -->
            <g
              v-for="(point, index) in valueData"
              :key="`value-point-${index}`"
              class="data-point-group"
            >
              <circle
              :cx="getX(index)"
              :cy="getValueY(point.value)"
                r="4"
              fill="#4a9eff"
              class="data-point"
                @mouseenter="hoveredPoint = { index, point, type: 'value' }"
                @mouseleave="hoveredPoint = null"
              />
              
              <!-- 悬停提示 -->
              <g v-if="hoveredPoint && hoveredPoint.index === index && hoveredPoint.type === 'value'">
                <rect
                  :x="getX(index) - 40"
                  :y="getValueY(point.value) - 35"
                  width="80"
                  height="30"
                  fill="rgba(0, 0, 0, 0.8)"
                  rx="4"
                />
                <text
                  :x="getX(index)"
                  :y="getValueY(point.value) - 20"
                  text-anchor="middle"
                  fill="white"
                  font-size="10"
                >
                  第{{ index + 1 }}手: {{ point.value >= 0 ? '+' : '' }}{{ point.value.toFixed(1) }}
                </text>
              </g>
            </g>
          </svg>
        </div>
        <div class="chart-footer">
        <div class="chart-info">
          <div class="info-item">
            <span class="info-label">当前评估值:</span>
            <span :class="['info-value', currentValue >= 0 ? 'positive' : 'negative']">
              {{ currentValue >= 0 ? '+' : '' }}{{ currentValue.toFixed(1) }}
            </span>
          </div>
            <div class="info-item">
              <span class="info-label">平均值:</span>
              <span class="info-value">{{ averageValue.toFixed(1) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">趋势:</span>
              <span :class="['info-value', valueTrend >= 0 ? 'positive' : 'negative']">
                {{ valueTrend >= 0 ? '↑' : '↓' }} {{ Math.abs(valueTrend).toFixed(1) }}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 吃子数统计 -->
<div v-show="activeTab === 'capture'" class="chart-container">
        <div class="chart" ref="captureChartRef">
          <!-- ECharts 吃子统计 -->
          <div v-if="useEcharts">
            <div v-if="captureData.length === 0" class="empty-state">
              <p class="empty-message">暂无吃子数据</p>
              <p class="empty-hint">请进行对局以生成吃子统计</p>
            </div>
            <div v-else ref="captureEchartRef" class="echart-container" style="width: 100%; height: 280px;"></div>
          </div>
          
          <!-- 原 SVG 备用 -->
          <svg v-else class="chart-svg" :viewBox="`0 0 ${chartWidth.value} ${chartHeight}`" preserveAspectRatio="xMidYMid meet">
            <!-- 背景网格 -->
            <rect :width="chartWidth.value" :height="chartHeight" fill="url(#gridPattern)" />
            
            <!-- Y轴 -->
            <line 
              :x1="padding.value" 
              :y1="padding.value" 
              :x2="padding.value" 
              :y2="chartHeight - padding.value" 
              stroke="var(--text-secondary)" 
              stroke-width="1.5"
            />
            
            <!-- X轴 -->
            <line 
              :x1="padding.value" 
              :y1="chartHeight - padding.value" 
              :x2="chartWidth.value - padding.value" 
              :y2="chartHeight - padding.value" 
              stroke="var(--text-secondary)" 
              stroke-width="1.5"
            />
            
            <!-- Y轴标签 -->
            <text 
              v-if="captureData.length > 0"
              :x="25" 
              :y="padding.value + 5" 
              class="axis-label" 
              text-anchor="end"
            >
              {{ maxCaptures }}
            </text>
            <text :x="25" :y="chartHeight - padding + 5" class="axis-label" text-anchor="end">0</text>
            
            <!-- X轴标签 -->
            <text 
              :x="chartWidth.value / 2" 
              :y="chartHeight - 10" 
              class="axis-label" 
              text-anchor="middle"
            >
              手数
            </text>
            
            <!-- 吃子数趋势线 -->
            <polyline
              v-if="captureData.length > 0"
              :points="getCaptureTrendLine('black')"
              fill="none"
              stroke="#333"
              stroke-width="2"
              opacity="0.6"
            />
            <polyline
              v-if="captureData.length > 0"
              :points="getCaptureTrendLine('white')"
              fill="none"
              stroke="#fff"
              stroke-width="2"
              opacity="0.6"
            />
            
            <!-- 黑方吃子数柱状图 -->
            <rect
              v-for="(point, index) in captureData"
              :key="`black-capture-${index}`"
              :x="getX(index) - 4"
              :y="getCaptureY(point.blackCaptures)"
              width="8"
              :height="chartHeight - padding.value - getCaptureY(point.blackCaptures)"
              fill="#333"
              class="capture-bar"
              :title="`第${index + 1}手: 黑方吃子${point.blackCaptures}`"
            />
            
            <!-- 白方吃子数柱状图 -->
            <rect
              v-for="(point, index) in captureData"
              :key="`white-capture-${index}`"
              :x="getX(index) + 4"
              :y="getCaptureY(point.whiteCaptures)"
              width="8"
              :height="chartHeight - padding.value - getCaptureY(point.whiteCaptures)"
              fill="#fff"
              stroke="#aaa"
              stroke-width="1"
              class="capture-bar"
              :title="`第${index + 1}手: 白方吃子${point.whiteCaptures}`"
            />
          </svg>
        </div>
        <div class="chart-footer">
          <div class="chart-info">
            <div class="info-item">
              <span class="info-label">黑方吃子:</span>
              <span class="info-value">{{ evaluation.blackCaptures || 0 }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">白方吃子:</span>
              <span class="info-value">{{ evaluation.whiteCaptures || 0 }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">吃子差:</span>
              <span :class="['info-value', (evaluation.blackCaptures - evaluation.whiteCaptures) >= 0 ? 'positive' : 'negative']">
                {{ (evaluation.blackCaptures - evaluation.whiteCaptures) >= 0 ? '+' : '' }}{{ (evaluation.blackCaptures - evaluation.whiteCaptures) || 0 }}
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">吃子效率:</span>
              <span class="info-value">{{ captureEfficiency.toFixed(2) }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 纳什均衡分析 -->
      <div v-if="activeTab === 'nash'" class="nash-container">
        <div class="theory-explanation">
          <h4>纳什均衡分析 (Nash Equilibrium)</h4>
          <p class="theory-desc">
            纳什均衡是博弈论中的核心概念，指在对局中双方都采用最优策略时的稳定状态。
            在围棋中，这表示双方都无法通过单方面改变策略来获得更好的结果。
            均衡距离越小，说明当前策略越接近纳什均衡。
          </p>
        </div>
        
        <div v-if="nashData.length === 0" class="empty-state">
          <p class="empty-message">暂无纳什均衡数据</p>
          <p class="empty-hint">请进行对局以生成纳什均衡分析数据</p>
        </div>
        
        <div v-else class="nash-chart">
          <svg class="chart-svg" :viewBox="`-40 0 ${chartWidth.value + 40} ${chartHeight}`" preserveAspectRatio="xMidYMid meet">
            <!-- 背景网格 -->
            <rect :width="chartWidth.value" :height="chartHeight" fill="url(#gridPattern)" />
            
            <!-- 坐标轴 -->
            <line 
              :x1="padding.value + 20" 
              :y1="padding.value" 
              :x2="padding.value + 20" 
              :y2="chartHeight - padding.value" 
              stroke="var(--text-secondary)" 
              stroke-width="1.5"
            />
            <line 
              :x1="padding.value + 20" 
              :y1="chartHeight - padding.value" 
              :x2="chartWidth.value - padding.value + 20" 
              :y2="chartHeight - padding.value" 
              stroke="var(--text-secondary)" 
              stroke-width="1.5"
            />
            
            <!-- 轴标签 -->
            <text :x="padding.value + 25" :y="padding.value + 5" class="axis-label" text-anchor="start">白方策略</text>
            <text :x="chartWidth.value / 2 + 20" :y="chartHeight - 10" class="axis-label" text-anchor="middle">黑方策略</text>
            
            <!-- 纳什均衡点（中心点） -->
            <circle
              :cx="chartWidth.value / 2 + 20"
              :cy="chartHeight / 2"
              r="10"
              fill="#ff6b6b"
              class="nash-point"
            />
            <circle
              :cx="chartWidth.value / 2 + 20"
              :cy="chartHeight / 2"
              r="8"
              fill="none"
              stroke="#ff6b6b"
              stroke-width="2"
              stroke-dasharray="4,4"
              opacity="0.6"
            />
            <text 
              :x="chartWidth.value / 2 + 20" 
              :y="chartHeight / 2 - 20" 
              text-anchor="middle"
              class="nash-label"
            >
              纳什均衡点 (0.5, 0.5)
            </text>
            
            <!-- 当前策略点 -->
            <circle
              v-if="currentNashPoint"
              :cx="getNashX(currentNashPoint.blackStrategy)"
              :cy="getNashY(currentNashPoint.whiteStrategy)"
              r="6"
              fill="#4a9eff"
              class="strategy-point"
            />
            <text 
              v-if="currentNashPoint"
              :x="getNashX(currentNashPoint.blackStrategy) + 12" 
              :y="getNashY(currentNashPoint.whiteStrategy) + 4" 
              class="strategy-label"
            >
              当前策略 ({{ currentNashPoint.blackStrategy.toFixed(2) }}, {{ currentNashPoint.whiteStrategy.toFixed(2) }})
            </text>
            
            <!-- 连接线 -->
            <line
              v-if="currentNashPoint"
              :x1="chartWidth.value / 2 + 20"
              :y1="chartHeight / 2"
              :x2="getNashX(currentNashPoint.blackStrategy)"
              :y2="getNashY(currentNashPoint.whiteStrategy)"
              stroke="rgba(255, 107, 107, 0.5)"
              stroke-width="1"
              stroke-dasharray="2,2"
            />
            
            <!-- 策略轨迹 -->
            <polyline
              v-if="nashData.length > 0"
              :points="getNashTrajectory()"
              fill="none"
              stroke="#4a9eff"
              stroke-width="2"
              stroke-dasharray="3,3"
              opacity="0.7"
            />
            
            <!-- 轨迹点 -->
            <circle
              v-for="(point, index) in nashData"
              :key="`nash-point-${index}`"
              :cx="getNashX(point.blackStrategy)"
              :cy="getNashY(point.whiteStrategy)"
              r="2"
              fill="#4a9eff"
              opacity="0.6"
            />
          </svg>
        </div>
        
        <div class="nash-stats" v-if="nashData.length > 0">
          <div class="stat-item">
            <span class="stat-label">均衡距离:</span>
            <span class="stat-value" :class="nashDistance < 0.1 ? 'optimal' : ''">
              {{ nashDistance.toFixed(3) }}
            </span>
            <span class="stat-hint" v-if="nashDistance < 0.1">(接近均衡)</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">策略稳定性:</span>
            <span class="stat-value" :class="strategyStability > 0.8 ? 'stable' : ''">
              {{ strategyStability.toFixed(3) }}
            </span>
            <span class="stat-hint" v-if="strategyStability > 0.8">(稳定)</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">收敛速度:</span>
            <span class="stat-value">{{ convergenceSpeed.toFixed(2) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">数据点数:</span>
            <span class="stat-value">{{ nashData.length }}</span>
          </div>
          <div class="stat-item" v-if="currentNashPoint">
            <span class="stat-label">当前策略:</span>
            <span class="stat-value">
              ({{ currentNashPoint.blackStrategy.toFixed(2) }}, {{ currentNashPoint.whiteStrategy.toFixed(2) }})
            </span>
          </div>
        </div>
      </div>
      
      <!-- 最优策略分析 -->
      <div v-if="activeTab === 'strategy'" class="strategy-container">
        <div class="theory-explanation">
          <h4>最优策略分析 (Optimal Strategy)</h4>
          <p class="theory-desc">
            基于博弈论的最优策略计算，采用期望效用理论（Expected Utility Theory），
            考虑对手的可能反应和风险，选择期望收益最大的走子。
            占优策略（Dominant Strategy）是指无论对手如何选择，都能获得更好结果的策略。
          </p>
        </div>
        
        <div v-if="topStrategies.length === 0" class="empty-state">
          <p class="empty-message">暂无策略数据</p>
          <p class="empty-hint">请连接AI并获取推荐，或进行对局以生成策略分析</p>
        </div>
        
        <div v-else>
          <div class="strategy-matrix">
            <div class="matrix-header">
              <div class="matrix-cell header">排名</div>
              <div class="matrix-cell header">策略位置</div>
              <div class="matrix-cell header">期望收益</div>
              <div class="matrix-cell header">风险</div>
              <div class="matrix-cell header">推荐度</div>
              <div class="matrix-cell header">占优性</div>
            </div>
            <div 
              v-for="(strategy, index) in topStrategies" 
              :key="`strategy-${index}`"
              class="matrix-row"
              :class="{ optimal: index === 0, dominant: strategy.isDominant }"
            >
              <div class="matrix-cell rank-cell">#{{ index + 1 }}</div>
              <div class="matrix-cell position-cell">{{ strategy.position }}</div>
              <div class="matrix-cell">{{ strategy.expectedValue.toFixed(2) }}</div>
              <div class="matrix-cell" :class="{ 'low-risk': strategy.risk < 0.3 }">
                {{ strategy.risk.toFixed(2) }}
              </div>
              <div class="matrix-cell">
                <div class="recommend-bar-container">
                  <div class="recommend-bar" :style="{ width: `${strategy.recommendation * 100}%` }"></div>
                  <span class="recommend-text">{{ (strategy.recommendation * 100).toFixed(0) }}%</span>
                </div>
              </div>
              <div class="matrix-cell">
                <span v-if="strategy.isDominant" class="dominant-badge">占优</span>
                <span v-else class="normal-badge">普通</span>
              </div>
            </div>
          </div>
          
          <div class="strategy-summary">
            <div class="summary-item">
              <span class="summary-label">最优策略:</span>
              <span class="summary-value">{{ topStrategies[0]?.position || 'N/A' }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">占优策略数:</span>
              <span class="summary-value">{{ dominantStrategiesCount }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">策略多样性:</span>
              <span class="summary-value">{{ strategyDiversity.toFixed(2) }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">平均期望收益:</span>
              <span class="summary-value">{{ averageExpectedValue.toFixed(2) }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">平均风险:</span>
              <span class="summary-value">{{ averageRisk.toFixed(2) }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 帕累托最优分析 -->
      <div v-if="activeTab === 'pareto'" class="pareto-container">
        <div class="theory-explanation">
          <h4>帕累托最优分析 (Pareto Optimality)</h4>
          <p class="theory-desc">
            帕累托最优是指在不使任何一方情况变差的前提下，无法使至少一方变得更好的状态。
            在围棋中，帕累托前沿表示所有可能的策略组合中，无法同时改进双方收益的点集。
          </p>
        </div>
        
        <div v-if="paretoPoints.length === 0" class="empty-state">
          <p class="empty-message">暂无帕累托数据</p>
          <p class="empty-hint">请连接AI并获取推荐，或进行对局以生成帕累托分析</p>
        </div>
        
        <div v-else class="pareto-chart">
            <svg class="chart-svg" :viewBox="`-40 0 ${chartWidth.value + 40} ${chartHeight}`" preserveAspectRatio="xMidYMid meet">
            <!-- 背景网格 -->
            <rect :width="chartWidth.value" :height="chartHeight" fill="url(#gridPattern)" />
            
            <!-- 坐标轴 -->
            <line 
              :x1="padding.value" 
              :y1="padding.value" 
              :x2="padding.value" 
              :y2="chartHeight - padding.value" 
              stroke="var(--text-secondary)" 
              stroke-width="1.5"
            />
            <line 
              :x1="padding.value" 
              :y1="chartHeight - padding.value" 
              :x2="chartWidth.value - padding.value" 
              :y2="chartHeight - padding.value" 
              stroke="var(--text-secondary)" 
              stroke-width="1.5"
            />
            
            <!-- 轴标签 -->
            <text :x="padding.value + 5" :y="padding.value + 5" class="axis-label" text-anchor="start">黑方收益</text>
            <text :x="chartWidth.value / 2" :y="chartHeight - 10" class="axis-label" text-anchor="middle">白方收益</text>
            
            <!-- 帕累托前沿线 -->
            <polyline
              v-if="paretoFrontier.length > 0"
              :points="getParetoFrontierPoints()"
              fill="none"
              stroke="#ff6b6b"
              stroke-width="2"
            />
            
            <!-- 帕累托前沿区域 -->
            <polygon
              v-if="paretoFrontier.length > 0"
              :points="getParetoAreaPoints()"
              fill="rgba(255, 107, 107, 0.1)"
            />
            
            <!-- 策略点 -->
            <circle
              v-for="(point, index) in paretoPoints"
              :key="`pareto-${index}`"
              :cx="getParetoX(point.blackUtility)"
              :cy="getParetoY(point.whiteUtility)"
              r="4"
              :fill="point.isPareto ? '#ff6b6b' : '#4a9eff'"
              :class="{ 'pareto-point': point.isPareto }"
              :title="`策略${index + 1}: 黑${point.blackUtility.toFixed(2)}, 白${point.whiteUtility.toFixed(2)}`"
            />
          </svg>
        </div>
        
        <div class="pareto-stats" v-if="paretoPoints.length > 0">
          <div class="stat-item">
            <span class="stat-label">帕累托效率:</span>
            <span class="stat-value">{{ paretoEfficiency.toFixed(2) }}</span>
            <span class="stat-hint">({{ (paretoEfficiency * 100).toFixed(0) }}%)</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">前沿点数:</span>
            <span class="stat-value">{{ paretoFrontier.length }} / {{ paretoPoints.length }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">当前状态:</span>
            <span class="stat-value" :class="currentIsPareto ? 'optimal' : ''">
              {{ currentIsPareto ? '帕累托最优' : '非最优' }}
            </span>
          </div>
          <div class="stat-item" v-if="paretoFrontier.length > 0">
            <span class="stat-label">前沿占比:</span>
            <span class="stat-value">{{ ((paretoFrontier.length / paretoPoints.length) * 100).toFixed(1) }}%</span>
          </div>
        </div>
      </div>
      
      <!-- 走子质量分析 -->
      <div v-if="activeTab === 'quality'" class="quality-container">
        <div class="theory-explanation">
          <h4>走子质量分析 (Move Quality Analysis)</h4>
          <p class="theory-desc">
            走子质量评估基于每步走子对局面的影响，综合考虑位置价值、形势判断和战略意义。
            质量值越高，表示该走子对当前局面的改善越大。
          </p>
        </div>
        
      <div v-if="moveHistory.length === 0" class="empty-state">
          <p class="empty-message">暂无走子数据</p>
          <p class="empty-hint">请进行对局以生成走子质量分析</p>
        </div>
        
        <div v-else>
        <div class="quality-stats">
          <div class="stat-card">
            <div class="stat-label">平均走子质量</div>
            <div class="stat-value">{{ averageQuality.toFixed(2) }}</div>
              <div class="stat-desc">{{ getQualityLevel(averageQuality) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">最佳走子</div>
            <div class="stat-value">第 {{ bestMove }} 手</div>
              <div class="stat-desc">质量: {{ bestMoveQuality.toFixed(2) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">总手数</div>
            <div class="stat-value">{{ moveHistory.length }}</div>
              <div class="stat-desc">{{ getTotalMovesDesc() }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">高质量走子</div>
              <div class="stat-value">{{ highQualityMoves }}</div>
              <div class="stat-desc">(质量 > 0.7)</div>
          </div>
        </div>
        
        <div class="quality-chart">
            <div v-if="useEcharts">
              <div ref="qualityEchartRef" class="echart-container"></div>
            </div>
            <div v-else>
            <div class="quality-chart-header">
              <span class="chart-axis-label">走子质量分布</span>
              <span class="chart-axis-label-right">质量值: 0.0 - 1.0</span>
            </div>
            <div class="quality-bars-container">
          <div 
            v-for="(move, index) in moveHistory" 
            :key="`quality-${index}`"
                class="quality-bar-wrapper"
              >
                <div 
            class="quality-bar"
                  :style="{ height: `${(move.quality || getCalculatedQuality(move)) * 100}%` }"
                  :title="`第${index + 1}手 (${move.color === 1 ? '黑' : '白'}): ${(move.quality || getCalculatedQuality(move)).toFixed(2)}`"
                  :class="{ 'best-move': index + 1 === bestMove }"
          ></div>
                <div class="quality-label" v-if="(index + 1) % 5 === 0 || index === 0">
                  {{ index + 1 }}
                </div>
              </div>
            </div>
            </div>
          </div>
          
          <div class="quality-analysis">
            <div class="analysis-item">
              <span class="analysis-label">质量标准差:</span>
              <span class="analysis-value">{{ qualityStdDev.toFixed(3) }}</span>
              <span class="analysis-hint">{{ getStdDevLevel(qualityStdDev) }}</span>
            </div>
            <div class="analysis-item">
              <span class="analysis-label">质量趋势:</span>
              <span :class="['analysis-value', qualityTrend >= 0 ? 'positive' : 'negative']">
                {{ qualityTrend >= 0 ? '↑' : '↓' }} {{ Math.abs(qualityTrend).toFixed(3) }}
              </span>
            </div>
            <div class="analysis-item">
              <span class="analysis-label">质量稳定性:</span>
              <span class="analysis-value">{{ qualityStability.toFixed(2) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
  
<script setup>
import { ref, computed, watch, watchEffect, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { useGameStore } from '../stores/game'
  
  const gameStore = useGameStore()
const activeTab = ref('winrate')
const useEcharts = ref(true)
const winrateChartRef = ref(null)
const valueChartRef = ref(null)
const hoveredPoint = ref(null)
const chartContainerRef = ref(null)
const winrateEchartRef = ref(null)
const valueEchartRef = ref(null)
const captureEchartRef = ref(null)
const qualityEchartRef = ref(null)
  
  const tabs = [
    { key: 'winrate', label: '胜率曲线' },
    { key: 'value', label: '评估值' },
    { key: 'capture', label: '吃子数' },
    { key: 'nash', label: '纳什均衡' },
    { key: 'strategy', label: '最优策略' },
    { key: 'pareto', label: '帕累托最优' },
    { key: 'quality', label: '走子质量' }
  ]
  
  // 响应式图表宽度：根据容器动态计算
  const chartWidth = computed(() => {
    // 右侧边栏宽度380px，减去padding 32px，图表容器padding 24px
    // 实际可用宽度约为 380 - 32 - 24 = 324px
    // 为了确保不超出，我们使用稍微小一点的值，并考虑内边距
    const baseWidth = 320
    // 根据容器实际宽度动态调整（如果有ref的话）
    if (chartContainerRef.value) {
      const containerWidth = chartContainerRef.value.clientWidth || baseWidth
      return Math.max(280, Math.min(containerWidth - 40, 400))
    }
    return baseWidth
  })
  const chartHeight = 250
  const padding = computed(() => {
    // 根据图表宽度动态调整padding
    return Math.max(30, Math.min(chartWidth.value * 0.1, 50))
  })
  
  const winrateData = computed(() => gameStore.gameTheoryData.winRateHistory || [])
  const valueData = computed(() => gameStore.gameTheoryData.valueHistory || [])
  const captureData = computed(() => gameStore.gameTheoryData.captureHistory || [])
  const moveHistory = computed(() => gameStore.moveHistory || [])
const evaluation = computed(() => gameStore.evaluation)
  const aiSuggestions = computed(() => gameStore.aiSuggestions || [])

// ECharts 实例与渲染
let winrateChartInstance = null
let valueChartInstance = null
let captureChartInstance = null
let qualityChartInstance = null

// 防抖函数
const debounce = (fn, delay) => {
  let timer = null
  return (...args) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

// 初始化图表实例（统一方法）
const initChart = (ref, instanceVar, name) => {
  if (!ref.value) return null
  
  // 如果实例已存在且DOM匹配，直接返回
  if (instanceVar && instanceVar.getDom && instanceVar.getDom() === ref.value) {
    return instanceVar
  }
  
  // 如果实例存在但DOM不匹配，先销毁
  if (instanceVar) {
    try {
      instanceVar.dispose()
    } catch (e) {
      console.warn(`销毁${name}图表实例失败:`, e)
    }
  }
  
  // 检查容器尺寸
  const width = ref.value.clientWidth || ref.value.offsetWidth || 300
  const height = ref.value.clientHeight || ref.value.offsetHeight || 280
  
  if (width === 0 || height === 0) {
    console.warn(`${name}图表容器尺寸为0:`, { width, height })
    return null
  }
  
  try {
    const instance = echarts.init(ref.value, null, { width, height })
    return instance
  } catch (e) {
    console.error(`初始化${name}图表失败:`, e)
    return null
  }
}

const ensureWinrateChart = () => {
  if (!winrateEchartRef.value) return false
  if (!winrateChartInstance) {
    winrateChartInstance = initChart(winrateEchartRef, winrateChartInstance, '胜率')
  }
  return winrateChartInstance !== null
}

const ensureValueChart = () => {
  if (!valueEchartRef.value) return false
  if (!valueChartInstance) {
    valueChartInstance = initChart(valueEchartRef, valueChartInstance, '评估值')
  }
  return valueChartInstance !== null
}

const ensureCaptureChart = () => {
  if (!captureEchartRef.value) return false
  if (!captureChartInstance) {
    captureChartInstance = initChart(captureEchartRef, captureChartInstance, '吃子')
  }
  return captureChartInstance !== null
}

const ensureQualityChart = () => {
  if (!qualityEchartRef.value) return false
  if (!qualityChartInstance) {
    try {
      qualityChartInstance = echarts.init(qualityEchartRef.value, null, {
        width: qualityEchartRef.value.clientWidth || 300,
        height: 280
      })
      return true
    } catch (e) {
      console.error('初始化质量图表失败:', e)
      return false
    }
  }
  return true
}

const resizeAllCharts = debounce(() => {
  try {
    if (winrateChartInstance && winrateEchartRef.value) {
      const width = winrateEchartRef.value.clientWidth || winrateEchartRef.value.offsetWidth
      const height = winrateEchartRef.value.clientHeight || winrateEchartRef.value.offsetHeight
      if (width > 0 && height > 0) {
        winrateChartInstance.resize({ width, height })
      }
    }
    if (valueChartInstance && valueEchartRef.value) {
      const width = valueEchartRef.value.clientWidth || valueEchartRef.value.offsetWidth
      const height = valueEchartRef.value.clientHeight || valueEchartRef.value.offsetHeight
      if (width > 0 && height > 0) {
        valueChartInstance.resize({ width, height })
      }
    }
    if (captureChartInstance && captureEchartRef.value) {
      const width = captureEchartRef.value.clientWidth || captureEchartRef.value.offsetWidth
      const height = captureEchartRef.value.clientHeight || captureEchartRef.value.offsetHeight
      if (width > 0 && height > 0) {
        captureChartInstance.resize({ width, height })
      }
    }
    if (qualityChartInstance && qualityEchartRef.value) {
      const width = qualityEchartRef.value.clientWidth || qualityEchartRef.value.offsetWidth
      const height = qualityEchartRef.value.clientHeight || qualityEchartRef.value.offsetHeight
      if (width > 0 && height > 0) {
        qualityChartInstance.resize({ width, height })
      }
    }
  } catch (e) {
    console.error('resize图表失败:', e)
  }
}, 100)

const renderWinrateChart = debounce(() => {
  if (!useEcharts.value || activeTab.value !== 'winrate') return
  
  nextTick(() => {
    if (!winrateEchartRef.value) return
    
    if (winrateData.value.length === 0) {
      if (winrateChartInstance) {
        winrateChartInstance.clear()
      }
      return
    }
    
    // 确保实例存在
    if (!ensureWinrateChart() || !winrateChartInstance) {
      setTimeout(() => renderWinrateChart(), 150)
      return
    }
    
    // 确保数据正确：处理并验证黑白两方胜率
    const processedData = winrateData.value.map(p => {
      let blackWinRate = p.blackWinRate ?? 0.5
      let whiteWinRate = p.whiteWinRate ?? (1 - blackWinRate)
      
      blackWinRate = Math.max(0.0, Math.min(1.0, blackWinRate))
      whiteWinRate = Math.max(0.0, Math.min(1.0, whiteWinRate))
      
      const total = blackWinRate + whiteWinRate
      if (total > 0 && Math.abs(total - 1.0) > 0.001) {
        blackWinRate = blackWinRate / total
        whiteWinRate = whiteWinRate / total
      } else if (total === 0) {
        blackWinRate = 0.5
        whiteWinRate = 0.5
      }
      
      return {
        blackWinRate: Number(blackWinRate.toFixed(4)),
        whiteWinRate: Number(whiteWinRate.toFixed(4))
      }
    })
    
    try {
      winrateChartInstance.setOption({
        color: ['#1f2937', '#e5e7eb'],
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          borderColor: '#666',
          textStyle: { color: '#fff' },
          formatter: (params) => {
            if (!params || params.length === 0) return ''
            const moveNum = params[0].axisValue
            let blackValue = 0
            let whiteValue = 0
            params.forEach(param => {
              if (param.seriesName === '黑方胜率') {
                blackValue = param.value ?? 0
              } else if (param.seriesName === '白方胜率') {
                whiteValue = param.value ?? 0
              }
            })
            const total = blackValue + whiteValue
            if (Math.abs(total - 1.0) > 0.001 && total > 0) {
              blackValue = blackValue / total
              whiteValue = whiteValue / total
            }
            const blackPercent = (blackValue * 100).toFixed(1)
            const whitePercent = (whiteValue * 100).toFixed(1)
            const totalPercent = (blackValue + whiteValue) * 100
            return `第${moveNum}手<br/>` +
                   `<span style="color: #1f2937;">●</span> 黑方胜率: ${blackPercent}%<br/>` +
                   `<span style="color: #e5e7eb;">●</span> 白方胜率: ${whitePercent}%<br/>` +
                   `<span style="color: #999; font-size: 11px;">总计: ${totalPercent.toFixed(1)}%</span>`
          }
        },
        legend: { 
          data: ['黑方胜率', '白方胜率'],
          top: 8,
          textStyle: { color: '#e0e0e0', fontSize: 11 }
        },
        grid: { left: 45, right: 16, top: 40, bottom: 35 },
        xAxis: {
          type: 'category',
          data: processedData.map((_, i) => i + 1),
          boundaryGap: false,
          axisLabel: { color: '#999', fontSize: 10 },
          axisLine: { lineStyle: { color: '#666' } },
          name: '手数',
          nameTextStyle: { color: '#999', fontSize: 11 }
        },
        yAxis: {
          type: 'value',
          min: 0,
          max: 1,
          axisLabel: { 
            color: '#999',
            fontSize: 10,
            formatter: v => `${(v * 100).toFixed(0)}%` 
          },
          axisLine: { lineStyle: { color: '#666' } },
          splitLine: { 
            lineStyle: { color: '#333', type: 'dashed' }
          },
          name: '胜率',
          nameTextStyle: { color: '#999', fontSize: 11 }
        },
        series: [
          {
            name: '黑方胜率',
            type: 'line',
            smooth: true,
            symbol: 'circle',
            symbolSize: 4,
            lineStyle: { width: 2, color: '#1f2937' },
            areaStyle: { 
              opacity: 0.3,
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: 'rgba(31, 41, 55, 0.4)' },
                  { offset: 1, color: 'rgba(31, 41, 55, 0.05)' }
                ]
              }
            },
            data: processedData.map(p => p.blackWinRate),
            emphasis: {
              focus: 'series',
              lineStyle: { width: 3 }
            }
          },
          {
            name: '白方胜率',
            type: 'line',
            smooth: true,
            symbol: 'circle',
            symbolSize: 4,
            lineStyle: { width: 2, color: '#e5e7eb' },
            areaStyle: { 
              opacity: 0.25,
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: 'rgba(229, 231, 235, 0.4)' },
                  { offset: 1, color: 'rgba(229, 231, 235, 0.05)' }
                ]
              }
            },
            data: processedData.map(p => p.whiteWinRate),
            emphasis: {
              focus: 'series',
              lineStyle: { width: 3 }
            }
          }
        ]
      }, true)
      
      setTimeout(() => {
        resizeAllCharts()
      }, 50)
    } catch (e) {
      console.error('渲染胜率图表失败:', e)
    }
  })
}, 150)

const renderValueChart = debounce(() => {
  if (!useEcharts.value || activeTab.value !== 'value') return
  
  nextTick(() => {
    if (!valueEchartRef.value) return
    
    if (valueData.value.length === 0) {
      if (valueChartInstance) {
        valueChartInstance.clear()
      }
      return
    }
    
    if (!ensureValueChart() || !valueChartInstance) {
      setTimeout(() => renderValueChart(), 150)
      return
    }
    
    try {
      valueChartInstance.setOption({
    color: ['#4a9eff'],
    tooltip: { trigger: 'axis' },
    legend: { data: ['评估值'] },
    grid: { left: 40, right: 16, top: 24, bottom: 30 },
    xAxis: {
      type: 'category',
      data: valueData.value.map((_, i) => `第${i + 1}手`),
      boundaryGap: false
    },
    yAxis: {
      type: 'value',
      min: minValue.value,
      max: maxValue.value
    },
    series: [
      {
        name: '评估值',
        type: 'line',
        smooth: true,
        areaStyle: { opacity: 0.2 },
        data: valueData.value.map(p => p.value ?? 0)
      }
    ]
      }, true)
      
      setTimeout(() => {
        resizeAllCharts()
      }, 50)
    } catch (e) {
      console.error('渲染评估值图表失败:', e)
    }
  })
}, 150)

const renderCaptureChart = debounce(() => {
  if (!useEcharts.value || activeTab.value !== 'capture') return
  
  nextTick(() => {
    if (!captureEchartRef.value) return
    
    if (captureData.value.length === 0) {
      if (captureChartInstance) {
        captureChartInstance.clear()
      }
      return
    }
    
    if (!ensureCaptureChart() || !captureChartInstance) {
      setTimeout(() => renderCaptureChart(), 150)
      return
    }
    
    try {
      captureChartInstance.setOption({
    color: ['#1f2937', '#e5e7eb'],
    tooltip: { trigger: 'axis' },
    legend: { data: ['黑方吃子', '白方吃子'] },
    grid: { left: 40, right: 16, top: 24, bottom: 30 },
    xAxis: {
      type: 'category',
      data: captureData.value.map((_, i) => `第${i + 1}手`)
    },
    yAxis: { type: 'value', min: 0 },
    series: [
      {
        name: '黑方吃子',
        type: 'bar',
        stack: 'captures',
        itemStyle: { color: '#333' },
        data: captureData.value.map(p => p.blackCaptures ?? 0)
      },
      {
        name: '白方吃子',
        type: 'bar',
        stack: 'captures',
        itemStyle: { color: '#ccc' },
        data: captureData.value.map(p => p.whiteCaptures ?? 0)
      }
    ]
      }, true)
      
      setTimeout(() => {
        resizeAllCharts()
      }, 50)
    } catch (e) {
      console.error('渲染吃子图表失败:', e)
    }
  })
}, 150)

const renderQualityChart = () => {
  if (!useEcharts.value) return
  
  nextTick(() => {
    if (!qualityEchartRef.value) {
      console.warn('质量图表容器不存在')
      return
    }
    
    if (moveHistory.value.length === 0) {
      if (qualityChartInstance) {
        qualityChartInstance.clear()
      }
      return
    }
    
    if (!ensureQualityChart()) {
      console.error('无法初始化质量图表')
      return
    }
    
    if (!qualityChartInstance) {
      console.error('质量图表实例不存在')
      return
    }
    
    const qualities = moveHistory.value.map(m => m.quality || getCalculatedQuality(m))
    
    try {
      qualityChartInstance.setOption({
        color: ['var(--accent-color)'],
        tooltip: {
          trigger: 'axis',
          formatter: params => {
            const p = params[0]
            return `${p.name}<br/>质量: ${(p.value).toFixed(2)}`
          }
        },
        grid: { left: 40, right: 16, top: 24, bottom: 40 },
        xAxis: {
          type: 'category',
          data: moveHistory.value.map((_, i) => `第${i + 1}手`),
          axisLabel: { interval: 4 }
        },
        yAxis: {
          type: 'value',
          min: 0,
          max: 1
        },
        series: [
          {
            name: '走子质量',
            type: 'bar',
            data: qualities,
            itemStyle: {
              color: params => (params.dataIndex + 1 === bestMove.value ? '#4ade80' : 'var(--accent-color)')
            }
          }
        ]
      }, true)
      
      setTimeout(() => {
        qualityChartInstance?.resize()
      }, 100)
    } catch (e) {
      console.error('渲染质量图表失败:', e)
    }
  })
}

// 使用watchEffect自动响应数据变化
watchEffect(() => {
  if (activeTab.value === 'winrate' && useEcharts.value && winrateData.value.length > 0) {
    nextTick(() => renderWinrateChart())
  }
})

watchEffect(() => {
  if (activeTab.value === 'value' && useEcharts.value && valueData.value.length > 0) {
    nextTick(() => renderValueChart())
  }
})

watchEffect(() => {
  if (activeTab.value === 'capture' && useEcharts.value && captureData.value.length > 0) {
    nextTick(() => renderCaptureChart())
  }
})

watch(() => moveHistory.value, () => {
  if (activeTab.value === 'quality') {
    nextTick(() => renderQualityChart())
  }
}, { deep: true })

watch(activeTab, () => {
  nextTick(() => {
    if (activeTab.value === 'winrate') renderWinrateChart()
    if (activeTab.value === 'value') renderValueChart()
    if (activeTab.value === 'capture') renderCaptureChart()
    if (activeTab.value === 'quality') renderQualityChart()
  })
})

watch(chartWidth, () => {
  nextTick(() => resizeAllCharts())
})
  
  // 纳什均衡数据
  const nashData = computed(() => {
    // 基于胜率和评估值计算纳什均衡
    if (winrateData.value.length === 0) return []
    
    return winrateData.value.map((point, index) => {
      const value = valueData.value[index]?.value || 0
      // 确保数据有效
      const blackWinRate = point.blackWinRate !== undefined ? point.blackWinRate : 0.5
      const whiteWinRate = point.whiteWinRate !== undefined ? point.whiteWinRate : (1 - blackWinRate)
      
      return {
        move: point.move !== undefined ? point.move : index,
        blackStrategy: blackWinRate,
        whiteStrategy: whiteWinRate,
        value: value
      }
    })
  })
  
  const currentNashPoint = computed(() => {
    if (nashData.value.length === 0) return null
    return nashData.value[nashData.value.length - 1]
  })
  
  const nashDistance = computed(() => {
    if (!currentNashPoint.value) return 0
    // 计算当前策略点到纳什均衡点的距离
    const dx = currentNashPoint.value.blackStrategy - 0.5
    const dy = currentNashPoint.value.whiteStrategy - 0.5
    return Math.sqrt(dx * dx + dy * dy)
  })
  
  const strategyStability = computed(() => {
    if (nashData.value.length < 3) return 0.5
    // 计算最近几步的策略稳定性
    const recent = nashData.value.slice(-5)
    if (recent.length < 2) return 0.5
    const variances = recent.map((p, i) => {
      if (i === 0) return 0
      const prev = recent[i - 1]
      return Math.abs(p.blackStrategy - prev.blackStrategy)
    })
    const avgVariance = variances.reduce((a, b) => a + b, 0) / (variances.length - 1)
    return Math.max(0, 1 - avgVariance * 2)
  })
  
  const convergenceSpeed = computed(() => {
    if (nashData.value.length < 3) return 0
    // 计算向纳什均衡收敛的速度
    const recent = nashData.value.slice(-10)
    if (recent.length < 2) return 0
    
    const distances = recent.map(p => {
      const dx = p.blackStrategy - 0.5
      const dy = p.whiteStrategy - 0.5
      return Math.sqrt(dx * dx + dy * dy)
    })
    
    // 计算距离的减少速度
    let totalReduction = 0
    for (let i = 1; i < distances.length; i++) {
      if (distances[i] < distances[i - 1]) {
        totalReduction += distances[i - 1] - distances[i]
      }
    }
    
    return totalReduction / (distances.length - 1)
  })
  
  // 最优策略（基于AI推荐，加入博弈论分析）
  const topStrategies = computed(() => {
    if (aiSuggestions.value.length === 0) return []
    
    const strategies = aiSuggestions.value.slice(0, 5).map((s, index) => {
      const expectedValue = s.score * 100 // 转换为百分比
      const risk = 1 - s.score // 风险 = 1 - 推荐度
      const recommendation = s.score
      
      // 判断是否为占优策略（期望收益明显高于其他策略）
      const isDominant = index === 0 && expectedValue > 80 && (aiSuggestions.value.length === 1 || expectedValue - (aiSuggestions.value[1]?.score || 0) * 100 > 10)
      
      return {
        position: coordToGTP(s.x, s.y),
        expectedValue,
        risk,
        recommendation,
        isDominant
      }
    })
    
    return strategies
  })
  
  const dominantStrategiesCount = computed(() => {
    return topStrategies.value.filter(s => s.isDominant).length
  })
  
  const strategyDiversity = computed(() => {
    if (topStrategies.value.length === 0) return 0
    // 计算策略的多样性（基于期望收益的分布）
    const values = topStrategies.value.map(s => s.expectedValue)
    const avg = values.reduce((a, b) => a + b, 0) / values.length
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length
    return Math.sqrt(variance) / 100 // 归一化
  })
  
  const averageExpectedValue = computed(() => {
    if (topStrategies.value.length === 0) return 0
    const sum = topStrategies.value.reduce((a, b) => a + b.expectedValue, 0)
    return sum / topStrategies.value.length
  })
  
  const averageRisk = computed(() => {
    if (topStrategies.value.length === 0) return 0
    const sum = topStrategies.value.reduce((a, b) => a + b.risk, 0)
    return sum / topStrategies.value.length
  })
  
  const coordToGTP = (x, y) => {
    const letters = 'ABCDEFGHJKLMNOPQRST'
    const row = 19 - x
    const col = letters[y]
    return `${col}${row}`
  }
  
  const currentValue = computed(() => {
    if (valueData.value.length === 0) return 0
    return valueData.value[valueData.value.length - 1].value || 0
  })
  
  const maxValue = computed(() => {
    if (valueData.value.length === 0) return 50
    const values = valueData.value.map(d => d.value)
    return Math.max(...values, 50)
  })
  
  const minValue = computed(() => {
    if (valueData.value.length === 0) return -50
    const values = valueData.value.map(d => d.value)
    return Math.min(...values, -50)
  })
  
  const averageValue = computed(() => {
    if (valueData.value.length === 0) return 0
    const sum = valueData.value.reduce((a, b) => a + b.value, 0)
    return sum / valueData.value.length
  })
  
  const valueTrend = computed(() => {
    if (valueData.value.length < 2) return 0
    const recent = valueData.value.slice(-5)
    if (recent.length < 2) return 0
    return recent[recent.length - 1].value - recent[0].value
  })
  
  const averageQuality = computed(() => {
    if (moveHistory.value.length === 0) return 0
    const qualities = moveHistory.value.map(m => m.quality || getCalculatedQuality(m))
    return qualities.reduce((a, b) => a + b, 0) / qualities.length
  })
  
  const bestMove = computed(() => {
    if (moveHistory.value.length === 0) return 0
    let best = 0
    let bestQuality = 0
    moveHistory.value.forEach((move, index) => {
      const quality = move.quality || getCalculatedQuality(move)
      if (quality > bestQuality) {
        bestQuality = quality
        best = index + 1
      }
    })
    return best
  })
  
  const qualityStdDev = computed(() => {
    if (moveHistory.value.length === 0) return 0
    const qualities = moveHistory.value.map(m => m.quality || getCalculatedQuality(m))
    const avg = qualities.reduce((a, b) => a + b, 0) / qualities.length
    const variance = qualities.reduce((sum, q) => sum + Math.pow(q - avg, 2), 0) / qualities.length
    return Math.sqrt(variance)
  })
  
  const qualityTrend = computed(() => {
    if (moveHistory.value.length < 5) return 0
    const recent = moveHistory.value.slice(-5)
    const qualities = recent.map(m => m.quality || getCalculatedQuality(m))
    return qualities[qualities.length - 1] - qualities[0]
  })
  
  const bestMoveQuality = computed(() => {
    if (moveHistory.value.length === 0 || bestMove.value === 0) return 0
    const move = moveHistory.value[bestMove.value - 1]
    return move?.quality || getCalculatedQuality(move) || 0
  })
  
  const highQualityMoves = computed(() => {
    if (moveHistory.value.length === 0) return 0
    return moveHistory.value.filter(m => {
      const quality = m.quality || getCalculatedQuality(m)
      return quality > 0.60 // 高质量走子：质量>0.60
    }).length
  })
  
  const qualityStability = computed(() => {
    if (moveHistory.value.length < 2) return 1
    // 计算质量的一致性（标准差越小，稳定性越高）
    return Math.max(0, 1 - qualityStdDev.value)
  })
  
  // 计算走子质量（如果没有提供，使用简化算法）
  const getCalculatedQuality = (move) => {
    if (!move) return 0.5
    
    const x = move.x
    const y = move.y
    const moveNum = moveHistory.value.indexOf(move) + 1
    
    // 基础质量：根据对局阶段
    let baseQuality = 0.5
    if (moveNum < 30) {
      baseQuality = 0.45 + (moveNum / 30) * 0.1
    } else if (moveNum < 150) {
      baseQuality = 0.55 + ((moveNum - 30) / 120) * 0.05
    } else {
      baseQuality = 0.60 + Math.min((moveNum - 150) / 100, 0.05)
    }
    
    // 位置价值：星位和中心区域
    let positionScore = 0
    const starPoints = [
      [3, 3], [3, 9], [3, 15],
      [9, 3], [9, 9], [9, 15],
      [15, 3], [15, 9], [15, 15]
    ]
    const isStarPoint = starPoints.some(([sx, sy]) => sx === x && sy === y)
    
    if (isStarPoint && moveNum < 50) {
      positionScore += 0.05
    }
    
    const centerDist = Math.abs(x - 9) + Math.abs(y - 9)
    if (moveNum >= 30 && moveNum < 150) {
      const centerValue = 1 - (centerDist / 18) * 0.6
      positionScore += centerValue * 0.03
    }
    
    // 综合计算
    const quality = baseQuality + positionScore
    
    // 确保质量值在合理范围内：0.30-0.75
    return Math.max(0.30, Math.min(0.75, quality))
  }
  
  const getQualityLevel = (quality) => {
    // 根据新的质量分布调整阈值
    if (quality >= 0.70) return '优秀'
    if (quality >= 0.55) return '良好'
    if (quality >= 0.40) return '一般'
    return '较差'
  }
  
  const getStdDevLevel = (stdDev) => {
    if (stdDev < 0.1) return '(稳定)'
    if (stdDev < 0.2) return '(较稳定)'
    return '(波动较大)'
  }
  
  const getTotalMovesDesc = () => {
    const count = moveHistory.value.length
    if (count < 10) return '开局阶段'
    if (count < 100) return '中盘阶段'
    return '收官阶段'
  }
  
  const currentWinRate = computed(() => {
    if (winrateData.value.length === 0) return 0.5
    return winrateData.value[winrateData.value.length - 1].blackWinRate || 0.5
  })
  
  const winRateVolatility = computed(() => {
    if (winrateData.value.length < 2) return 0
    const rates = winrateData.value.map(p => p.blackWinRate)
    const changes = []
    for (let i = 1; i < rates.length; i++) {
      changes.push(Math.abs(rates[i] - rates[i - 1]))
    }
    return changes.reduce((a, b) => a + b, 0) / changes.length
  })
  
  const getX = (index) => {
    if (winrateData.value.length <= 1) return padding.value
    const maxMoves = Math.max(winrateData.value.length, valueData.value.length)
    const availableWidth = chartWidth.value - 2 * padding.value
    return padding.value + (index / (maxMoves - 1)) * availableWidth
  }
  
  const getWinrateY = (winrate) => {
    // 将胜率(0-1)转换为Y坐标，0%在底部，100%在顶部
    const availableHeight = chartHeight - 2 * padding.value
    return chartHeight - padding.value - (winrate * availableHeight)
  }
  
  const getValueY = (value) => {
    // 将评估值转换为Y坐标，需要找到最大值和最小值
    if (valueData.value.length === 0) return chartHeight / 2
    
    const values = valueData.value.map(d => d.value)
    const maxValue = Math.max(...values, 50)
    const minValue = Math.min(...values, -50)
    const range = maxValue - minValue || 100
    
    const normalizedValue = (value - minValue) / range
    const availableHeight = chartHeight - 2 * padding.value
    return chartHeight - padding.value - (normalizedValue * availableHeight)
  }
  
  const maxCaptures = computed(() => {
    if (captureData.value.length === 0) return 10
    return Math.max(
      ...captureData.value.map(d => Math.max(d.blackCaptures, d.whiteCaptures)),
      10
    )
  })
  
  const getCaptureY = (captures) => {
    // 将吃子数转换为Y坐标
    if (captureData.value.length === 0) return chartHeight - padding.value
    
    const availableHeight = chartHeight - 2 * padding.value
    const normalizedCaptures = captures / maxCaptures.value
    return chartHeight - padding.value - (normalizedCaptures * availableHeight)
  }
  
  const getCaptureTrendLine = (color) => {
    if (captureData.value.length === 0) return ''
    return captureData.value.map((point, index) => {
      const x = getX(index)
      const y = color === 'black' 
        ? getCaptureY(point.blackCaptures)
        : getCaptureY(point.whiteCaptures)
      return `${x},${y}`
    }).join(' ')
  }
  
  const captureEfficiency = computed(() => {
    if (captureData.value.length === 0 || moveHistory.value.length === 0) return 0
    const totalCaptures = (evaluation.value.blackCaptures || 0) + (evaluation.value.whiteCaptures || 0)
    return totalCaptures / moveHistory.value.length
  })
  
  const getWinrateLinePoints = (color) => {
    if (winrateData.value.length === 0) return ''
    
    return winrateData.value.map((point, index) => {
      const x = getX(index)
      const y = color === 'black' 
        ? getWinrateY(point.blackWinRate)
        : getWinrateY(point.whiteWinRate)
      return `${x},${y}`
    }).join(' ')
  }
  
  const getWinrateAreaPoints = (color) => {
    if (winrateData.value.length === 0) return ''
    
    const linePoints = getWinrateLinePoints(color)
    const firstX = getX(0)
    const lastX = getX(winrateData.value.length - 1)
    const bottomY = chartHeight - padding.value
    
    return `${firstX},${bottomY} ${linePoints} ${lastX},${bottomY}`
  }
  
  const getValueLinePoints = () => {
    if (valueData.value.length === 0) return ''
    
    return valueData.value.map((point, index) => {
      const x = getX(index)
      const y = getValueY(point.value)
      return `${x},${y}`
    }).join(' ')
  }
  
  const getValueAreaPoints = () => {
    if (valueData.value.length === 0) return ''
    
    const linePoints = getValueLinePoints()
    const firstX = getX(0)
    const lastX = getX(valueData.value.length - 1)
    const centerY = chartHeight / 2
    
    return `${firstX},${centerY} ${linePoints} ${lastX},${centerY}`
  }
  
  // 纳什均衡相关函数
  const getNashX = (blackStrategy) => {
    return padding.value + 20 + (blackStrategy * (chartWidth.value - 2 * padding.value))
  }
  
  const getNashY = (whiteStrategy) => {
    return padding.value + (whiteStrategy * (chartHeight - 2 * padding.value))
  }
  
  const getNashTrajectory = () => {
    if (nashData.value.length === 0) return ''
    return nashData.value.map((point, index) => {
      const x = getNashX(point.blackStrategy)
      const y = getNashY(point.whiteStrategy)
      return `${x},${y}`
    }).join(' ')
  }
  
  // 帕累托最优分析
  const paretoPoints = computed(() => {
    // 基于AI推荐和评估值计算帕累托点
    if (aiSuggestions.value.length === 0) return []
    
    return aiSuggestions.value.map((s, index) => {
      // 黑方收益 = 胜率 * 推荐度
      const blackUtility = (evaluation.value.winRate || 0.5) * s.score
      // 白方收益 = (1 - 胜率) * 推荐度
      const whiteUtility = (1 - (evaluation.value.winRate || 0.5)) * s.score
      
      return {
        index,
        blackUtility,
        whiteUtility,
        isPareto: false // 将在下面计算
      }
    })
  })
  
  const paretoFrontier = computed(() => {
    if (paretoPoints.value.length === 0) return []
    
    // 计算帕累托前沿（使用帕累托支配关系）
    const points = [...paretoPoints.value]
    const frontier = []
    
    for (let i = 0; i < points.length; i++) {
      let isDominated = false
      for (let j = 0; j < points.length; j++) {
        if (i === j) continue
        // 检查是否被支配：如果j在黑方和白方收益上都更好，则i被支配
        if (points[j].blackUtility >= points[i].blackUtility && 
            points[j].whiteUtility >= points[i].whiteUtility &&
            (points[j].blackUtility > points[i].blackUtility || 
             points[j].whiteUtility > points[i].whiteUtility)) {
          isDominated = true
          break
        }
      }
      if (!isDominated) {
        points[i].isPareto = true
        frontier.push(points[i])
      }
    }
    
    // 按黑方收益排序
    frontier.sort((a, b) => a.blackUtility - b.blackUtility)
    
    return frontier
  })
  
  const paretoEfficiency = computed(() => {
    if (paretoPoints.value.length === 0) return 0
    return paretoFrontier.value.length / paretoPoints.value.length
  })
  
  const currentIsPareto = computed(() => {
    if (paretoPoints.value.length === 0) return false
    // 检查当前最佳策略是否在帕累托前沿
    return paretoFrontier.value.some(p => p.index === 0)
  })
  
  const getParetoX = (blackUtility) => {
    const maxUtility = Math.max(...paretoPoints.value.map(p => p.blackUtility), 1)
    const availableWidth = chartWidth.value - 2 * padding.value
    return padding.value + (blackUtility / maxUtility) * availableWidth
  }
  
  const getParetoY = (whiteUtility) => {
    const maxUtility = Math.max(...paretoPoints.value.map(p => p.whiteUtility), 1)
    const availableHeight = chartHeight - 2 * padding.value
    return chartHeight - padding.value - (whiteUtility / maxUtility) * availableHeight
  }
  
  const getParetoFrontierPoints = () => {
    if (paretoFrontier.value.length === 0) return ''
    return paretoFrontier.value.map(point => {
      const x = getParetoX(point.blackUtility)
      const y = getParetoY(point.whiteUtility)
      return `${x},${y}`
    }).join(' ')
  }
  
  const getParetoAreaPoints = () => {
    if (paretoFrontier.value.length === 0) return ''
    const frontierPoints = getParetoFrontierPoints()
    const firstX = getParetoX(paretoFrontier.value[0].blackUtility)
    const lastX = getParetoX(paretoFrontier.value[paretoFrontier.value.length - 1].blackUtility)
    const bottomY = chartHeight - padding.value
    
    return `${firstX},${bottomY} ${frontierPoints} ${lastX},${bottomY}`
  }
  
  // 监听容器大小变化，更新图表宽度
  let resizeObserver = null
  
  onMounted(() => {
    nextTick(() => {
      if (chartContainerRef.value) {
        // 使用 ResizeObserver 监听容器大小变化
        if (window.ResizeObserver) {
          resizeObserver = new ResizeObserver(() => {
            resizeAllCharts()
          })
          resizeObserver.observe(chartContainerRef.value)
        }
      }
      
      // 延迟初始化，确保DOM完全渲染
      setTimeout(() => {
        if (activeTab.value === 'winrate') renderWinrateChart()
        if (activeTab.value === 'value') renderValueChart()
        if (activeTab.value === 'capture') renderCaptureChart()
        if (activeTab.value === 'quality') renderQualityChart()
        window.addEventListener('resize', resizeAllCharts)
      }, 200)
    })
  })
  
  onUnmounted(() => {
    if (resizeObserver) {
      resizeObserver.disconnect()
    }
  window.removeEventListener('resize', resizeAllCharts)
  winrateChartInstance?.dispose?.()
  valueChartInstance?.dispose?.()
  captureChartInstance?.dispose?.()
  qualityChartInstance?.dispose?.()
  })
  </script>
  
  <style scoped>
  .game-theory-chart {
    background: var(--bg-secondary);
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 20px;
    border: 1px solid var(--border-color);
    width: 100%;
    box-sizing: border-box;
    overflow: hidden;
    min-height: 300px;
    max-width: 100%;
  }
  
  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 2px solid var(--border-color);
  }
  
  h3 {
    margin: 0;
    font-size: 16px;
    color: var(--text-primary);
    font-weight: 700;
  }
  
  .theory-badge {
    font-size: 10px;
    padding: 4px 8px;
    background: var(--accent-color);
    color: white;
    border-radius: 12px;
    font-weight: 600;
    letter-spacing: 0.5px;
  }
  
  .chart-tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 12px;
    border-bottom: 1px solid var(--border-color);
    overflow-x: auto;
    overflow-y: hidden;
    width: 100%;
    box-sizing: border-box;
    -webkit-overflow-scrolling: touch;
  }
  
  .tab-btn {
    padding: 6px 10px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 11px;
    transition: all 0.2s;
    white-space: nowrap;
    flex-shrink: 0;
  }
  
  .tab-btn:hover {
    color: var(--text-primary);
  }
  
  .tab-btn.active {
    color: var(--accent-color);
    border-bottom-color: var(--accent-color);
  }
  
  .chart-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 300px;
    width: 100%;
    box-sizing: border-box;
  }
  
  .chart {
    background: var(--bg-primary);
    border-radius: 4px;
  padding: 8px 8px 8px 18px; /* 左侧留一列不可见的空白，避免内容贴边 */
  overflow: hidden;
    width: 100%;
    box-sizing: border-box;
    min-height: 250px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

.echart-container {
  width: 100%;
  height: 280px;
  min-height: 280px;
  display: block;
}
  
  .chart-svg {
    display: block;
    width: 100%;
    height: auto;
    max-width: 100%;
    min-height: 250px;
    overflow: visible;
    flex-shrink: 1;
  }
  
  /* 确保 SVG 内容完整显示 */
  .chart-svg[viewBox] {
    width: 100%;
    height: auto;
    aspect-ratio: var(--chart-aspect-ratio, 320 / 250);
  }
  
.nash-chart,
.pareto-chart {
  background: var(--bg-primary);
  border-radius: 4px;
  padding: 16px 12px 16px 32px; /* 左侧更多空列，确保轴文字不出界 */
  width: 100%;
  box-sizing: border-box;
  overflow: visible;            /* 允许内部元素完整显示 */
  min-height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
  
  .nash-chart .chart-svg,
  .pareto-chart .chart-svg {
    display: block;
    width: 100%;
    height: auto;
    max-width: 100%;
    min-height: 250px;
    overflow: visible;
    flex-shrink: 1;
  }
  
  .nash-chart .chart-svg[viewBox],
  .pareto-chart .chart-svg[viewBox] {
    width: 100%;
    height: auto;
    aspect-ratio: var(--chart-aspect-ratio, 320 / 250);
  }
  
  .axis-label {
    font-size: 10px;
    fill: var(--text-secondary);
    font-weight: 500;
  }
  
  .data-point {
    cursor: pointer;
    transition: r 0.2s;
  }
  
  .data-point:hover {
    r: 5;
  }
  
  .chart-footer {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 8px;
    width: 100%;
    box-sizing: border-box;
  }
  
  .chart-legend {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .chart-stats {
    display: flex;
    gap: 12px;
    justify-content: center;
    padding-top: 8px;
    border-top: 1px solid var(--border-color);
    flex-wrap: wrap;
  }
  
  .stat-mini {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    white-space: nowrap;
    flex-shrink: 0;
  }
  
  .stat-mini-label {
    color: var(--text-secondary);
  }
  
  .stat-mini-value {
    font-weight: bold;
    color: var(--text-primary);
  }
  
  .stat-mini-value.black {
    color: #333;
  }
  
  .stat-mini-value.white {
    color: #fff;
  }
  
  .data-point-group {
    cursor: pointer;
  }
  
  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-secondary);
  }
  
  .legend-color {
    width: 12px;
    height: 12px;
    border-radius: 2px;
  }
  
  .legend-color.black {
    background: #333;
  }
  
  .legend-color.white {
    background: #fff;
    border: 1px solid #aaa;
  }
  
  .chart-info {
    display: flex;
    justify-content: center;
    gap: 8px;
    flex-wrap: wrap;
    width: 100%;
  }
  
  .info-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    white-space: nowrap;
    flex-shrink: 0;
  }
  
  .info-label {
    color: var(--text-secondary);
  }
  
  .info-value {
    font-weight: bold;
    font-size: 14px;
  }
  
  .info-value.positive {
    color: #4ade80;
  }
  
  .info-value.negative {
    color: #f87171;
  }
  
  .quality-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-height: 300px;
    width: 100%;
    box-sizing: border-box;
  }
  
  .quality-stats {
    display: flex;
    gap: 12px;
  }
  
  .stat-card {
    flex: 1;
    background: var(--bg-primary);
    padding: 12px;
    border-radius: 4px;
    text-align: center;
  }
  
  .stat-label {
    font-size: 11px;
    color: var(--text-secondary);
    margin-bottom: 4px;
  }
  
  .stat-value {
    font-size: 18px;
    font-weight: bold;
    color: var(--text-primary);
  }
  
  .quality-chart {
    background: var(--bg-primary);
    border-radius: 4px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .quality-chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    color: var(--text-secondary);
  }
  
  .chart-axis-label {
    font-weight: 500;
  }
  
  .quality-bars-container {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 120px;
    position: relative;
  }
  
  .quality-bar-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
    position: relative;
  }
  
  .quality-bar {
    width: 100%;
    background: linear-gradient(to top, var(--accent-color), rgba(74, 158, 255, 0.5));
    min-height: 2px;
    border-radius: 2px 2px 0 0;
    cursor: pointer;
    transition: all 0.2s;
    position: absolute;
    bottom: 0;
  }
  
  .quality-bar:hover {
    opacity: 0.8;
    transform: scaleY(1.1);
  }
  
  .quality-bar.best-move {
    background: linear-gradient(to top, #4ade80, rgba(74, 222, 128, 0.5));
    box-shadow: 0 0 8px rgba(74, 222, 128, 0.5);
  }
  
  .quality-label {
    position: absolute;
    bottom: -18px;
    font-size: 9px;
    color: var(--text-secondary);
    white-space: nowrap;
  }
  
  .quality-analysis {
    display: flex;
    gap: 16px;
    justify-content: center;
    padding: 12px;
    background: var(--bg-primary);
    border-radius: 4px;
    margin-top: 8px;
  }
  
  .analysis-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
  }
  
  .analysis-label {
    color: var(--text-secondary);
  }
  
  .analysis-value {
    font-weight: bold;
    color: var(--text-primary);
  }
  
  .analysis-value.positive {
    color: #4ade80;
  }
  
  .analysis-value.negative {
    color: #f87171;
  }
  
  .capture-bar {
    transition: height 0.3s;
    cursor: pointer;
  }
  
  .capture-bar:hover {
    opacity: 0.8;
  }
  
  .theory-explanation {
    margin-bottom: 12px;
    padding: 10px;
    background: var(--bg-primary);
    border-radius: 4px;
    border-left: 3px solid var(--accent-color);
    width: 100%;
    box-sizing: border-box;
  }
  
  .theory-explanation h4 {
    margin: 0 0 6px 0;
    font-size: 12px;
    color: var(--text-primary);
    font-weight: 600;
  }
  
  .theory-desc {
    margin: 0;
    font-size: 10px;
    color: var(--text-secondary);
    line-height: 1.4;
  }
  
  .nash-container,
  .strategy-container,
  .pareto-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-height: 300px;
    width: 100%;
    box-sizing: border-box;
  }
  
  .nash-chart {
    background: var(--bg-primary);
    border-radius: 4px;
    padding: 12px;
  }
  
  .nash-point {
    animation: pulse 2s infinite;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
  
  .nash-label {
    font-size: 10px;
    fill: var(--text-primary);
    font-weight: bold;
  }
  
  .strategy-point {
    transition: r 0.2s;
  }
  
  .strategy-point:hover {
    r: 7;
  }
  
  .strategy-label {
    font-size: 9px;
    fill: var(--text-secondary);
  }
  
  .nash-stats,
  .pareto-stats {
    display: flex;
    gap: 8px;
    justify-content: center;
    flex-wrap: wrap;
    width: 100%;
  }
  
  .empty-state {
    padding: 40px 20px;
    text-align: center;
    background: var(--bg-primary);
    border-radius: 4px;
    border: 1px dashed var(--border-color);
  }
  
  .empty-message {
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 8px;
    font-weight: 500;
  }
  
  .empty-hint {
    font-size: 12px;
    color: var(--text-secondary);
    opacity: 0.7;
  }
  
  .stat-desc {
    font-size: 10px;
    color: var(--text-secondary);
    margin-top: 4px;
    opacity: 0.8;
  }
  
  .chart-axis-label-right {
    font-size: 10px;
    color: var(--text-secondary);
    margin-left: auto;
  }
  
  .analysis-hint {
    font-size: 9px;
    color: var(--text-secondary);
    margin-left: 4px;
    opacity: 0.7;
  }
  
  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 6px 10px;
    background: var(--bg-primary);
    border-radius: 4px;
    flex: 1 1 auto;
    min-width: 0;
  }
  
  .stat-label {
    font-size: 10px;
    color: var(--text-secondary);
  }
  
  .stat-value {
    font-size: 16px;
    font-weight: bold;
    color: var(--accent-color);
  }
  
  .stat-value.optimal {
    color: #4ade80;
  }
  
  .stat-value.stable {
    color: #4ade80;
  }
  
  .stat-hint {
    font-size: 9px;
    color: var(--text-secondary);
    margin-left: 4px;
  }
  
  .strategy-matrix {
    background: var(--bg-primary);
    border-radius: 4px;
    overflow: hidden;
  }
  
  .matrix-header,
  .matrix-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1.5fr;
    gap: 8px;
    padding: 8px;
  }
  
  .matrix-header {
    background: var(--bg-tertiary);
    font-weight: bold;
    font-size: 11px;
  }
  
  .matrix-row {
    border-top: 1px solid var(--border-color);
    transition: background 0.2s;
  }
  
  .matrix-row:hover {
    background: var(--bg-tertiary);
  }
  
  .matrix-row.optimal {
    background: rgba(74, 158, 255, 0.1);
    border-left: 3px solid var(--accent-color);
  }
  
  .matrix-cell {
    font-size: 11px;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .matrix-cell.header {
    color: var(--text-secondary);
    font-weight: 600;
  }
  
  .recommend-bar-container {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
  }
  
  .recommend-bar {
    flex: 1;
    height: 6px;
    background: var(--accent-color);
    border-radius: 3px;
    min-width: 4px;
  }
  
  .recommend-text {
    font-size: 10px;
    color: var(--text-primary);
    min-width: 30px;
  }
  
  .matrix-row.dominant {
    background: rgba(74, 222, 128, 0.1);
    border-left: 3px solid #4ade80;
  }
  
  .rank-cell {
    font-weight: bold;
    color: var(--accent-color);
  }
  
  .position-cell {
    font-family: monospace;
    font-weight: 500;
  }
  
  .low-risk {
    color: #4ade80;
  }
  
  .dominant-badge {
    font-size: 9px;
    padding: 2px 6px;
    background: #4ade80;
    color: white;
    border-radius: 10px;
    font-weight: bold;
  }
  
  .normal-badge {
    font-size: 9px;
    padding: 2px 6px;
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    border-radius: 10px;
  }
  
  .strategy-summary {
    display: flex;
    gap: 8px;
    justify-content: center;
    padding: 10px;
    background: var(--bg-primary);
    border-radius: 4px;
    margin-top: 12px;
    flex-wrap: wrap;
    width: 100%;
    box-sizing: border-box;
  }
  
  .summary-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    white-space: nowrap;
    flex: 1 1 auto;
    min-width: 0;
  }
  
  .summary-label {
    color: var(--text-secondary);
  }
  
  .summary-value {
    font-weight: bold;
    color: var(--text-primary);
  }
  
  .matrix-header {
    grid-template-columns: 0.8fr 1fr 1fr 1fr 1.5fr 1fr;
  }
  
  .matrix-row {
    grid-template-columns: 0.8fr 1fr 1fr 1fr 1.5fr 1fr;
  }
  
  .pareto-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .pareto-chart {
    background: var(--bg-primary);
    border-radius: 4px;
    padding: 12px;
  }
  
  .pareto-point {
    animation: pulse 2s infinite;
  }
  
  .pareto-stats {
    display: flex;
    gap: 16px;
    justify-content: center;
  }
  </style>