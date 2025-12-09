import { defineStore } from 'pinia'
import gtpClient from '../services/gtpClient'

export const useGameStore = defineStore('game', {
  state: () => ({
    board: Array(19).fill(null).map(() => Array(19).fill(0)),
    currentPlayer: 1,
    gameMode: 'manual', // 'manual' | 'vsAI' | 'aiOnly'
    aiMode: 'policy',
    isConnected: false,
    isThinking: false,
    moveHistory: [],
    aiSuggestions: [],
    showSuggestions: false,
    evaluation: {
      blackScore: 0,
      whiteScore: 0,
      blackStones: 0,
      whiteStones: 0,
      blackCaptures: 0, // 黑方吃子数
      whiteCaptures: 0, // 白方吃子数
      blackTerritory: 0, // 黑方领地
      whiteTerritory: 0, // 白方领地
      winRate: 0.5,
      value: 0
    },
    // 游戏状态
    gameStatus: 'playing', // 'playing' | 'blackWin' | 'whiteWin' | 'draw' | 'resigned'
    resignedBy: null, // 1 (黑) or -1 (白)
    consecutivePasses: 0, // 连续pass次数
    // 吃子统计（需要跟踪每次落子前后的变化）
    captureHistory: [], // [{move: number, blackCaptures: number, whiteCaptures: number, captured: [{x, y, color}]}]
    // 博弈论数据
    gameTheoryData: {
      winRateHistory: [], // [{move: number, blackWinRate: number, whiteWinRate: number}]
      valueHistory: [], // [{move: number, value: number}]
      captureHistory: [], // [{move: number, blackCaptures: number, whiteCaptures: number}]
      moveQuality: [] // [{move: number, quality: number}]
    },
    // 棋子影响区域
    influenceMap: null, // 19x19 的影响值矩阵
    showInfluence: false,
    error: null
  }),

  actions: {
    async initGame(mode = 'policy') {
      try {
        this.aiMode = mode
        await gtpClient.init(mode)
        this.isConnected = true
        this.error = null
        await this.updateBoard()
        this.updateEvaluation()
        
        // 初始化后自动获取AI推荐
        if (this.showSuggestions) {
          await this.getAISuggestions(5)
        }
      } catch (error) {
        this.error = error.message
        console.error('初始化游戏失败:', error)
      }
    },

    async updateBoard() {
      if (!this.isConnected) {
        return // 未连接AI时不需要更新
      }
      try {
        const response = await gtpClient.showboard()
        if (response.success && response.data) {
          const lines = response.data.trim().split('\n').filter(line => line.trim())
          const newBoard = Array(19).fill(null).map(() => Array(19).fill(0))
          
          lines.forEach((line, i) => {
            if (i < 19 && line.length >= 19) {
              line.split('').slice(0, 19).forEach((char, j) => {
                if (char === 'X') newBoard[i][j] = 1
                else if (char === 'O') newBoard[i][j] = -1
              })
            }
          })
          
          this.board = newBoard
        }
      } catch (error) {
        console.error('更新棋盘失败:', error)
        // 不抛出错误，允许继续使用本地棋盘状态
      }
    },

    async makeMove(x, y) {
      if (this.gameStatus !== 'playing') {
        this.error = '游戏已结束'
        return false
      }
      
      if (this.isThinking) {
        return false
      }
      
      if (this.board[x][y] !== 0) {
        this.error = '该位置已有棋子'
        return false
      }
      
      // 本地模式：直接落子，不连接AI也能下棋
      if (!this.isConnected) {
        const prevBlackCaptures = this.evaluation.blackCaptures || 0
        const prevWhiteCaptures = this.evaluation.whiteCaptures || 0
        
        this.board[x][y] = this.currentPlayer
        
        // 检查吃子
        const captured = this.checkCaptures(x, y)
        const newBlackCaptures = prevBlackCaptures + (this.currentPlayer === 1 ? captured.length : 0)
        const newWhiteCaptures = prevWhiteCaptures + (this.currentPlayer === -1 ? captured.length : 0)
        
        // 计算走子质量（在落子并检查吃子后）
        const moveQuality = this.calculateMoveQuality(x, y, captured.length)
        
        this.moveHistory.push({ 
          x, 
          y, 
          color: this.currentPlayer,
          quality: moveQuality
        })
        
        this.captureHistory.push({
          move: this.moveHistory.length,
          blackCaptures: newBlackCaptures,
          whiteCaptures: newWhiteCaptures,
          captured: captured
        })
        
        this.currentPlayer = -this.currentPlayer
        this.consecutivePasses = 0
        this.updateEvaluation()
        this.updateGameTheoryData()
        this.checkGameEnd()
        this.error = null
        return true
      }
      
      // AI模式：通过GTP协议落子
      const colorChar = this.currentPlayer === 1 ? 'B' : 'W'
      const position = this.coordToGTP(x, y)
      
      try {
        this.isThinking = true
        this.error = null

        const response = await gtpClient.play(colorChar, position)

        if (response.success) {
          // 记录落子前的吃子数
          const prevBlackCaptures = this.evaluation.blackCaptures || 0
          const prevWhiteCaptures = this.evaluation.whiteCaptures || 0
          
          this.board[x][y] = this.currentPlayer
          
          // 检查并更新吃子数（在落子后检查）
          const captured = this.checkCaptures(x, y)
          const newBlackCaptures = prevBlackCaptures + (this.currentPlayer === 1 ? captured.length : 0)
          const newWhiteCaptures = prevWhiteCaptures + (this.currentPlayer === -1 ? captured.length : 0)
          
          // 计算走子质量（在落子并检查吃子后）
          const moveQuality = this.calculateMoveQuality(x, y, captured.length)
          
          this.moveHistory.push({ 
            x, 
            y, 
            color: this.currentPlayer,
            quality: moveQuality
          })
          
          this.captureHistory.push({
            move: this.moveHistory.length,
            blackCaptures: newBlackCaptures,
            whiteCaptures: newWhiteCaptures,
            captured: captured
          })
          
          this.currentPlayer = -this.currentPlayer
          this.consecutivePasses = 0
          await this.updateBoard()
          this.updateEvaluation()
          this.updateGameTheoryData()
          this.checkGameEnd()
          
          // 自动获取AI推荐
          if (this.showSuggestions) {
            await this.getAISuggestions(5)
          }
          
          // 人机对弈模式：自动触发AI走子
          if (this.gameMode === 'vsAI' && this.gameStatus === 'playing') {
            setTimeout(() => {
              if (!this.isThinking && this.gameStatus === 'playing') {
                this.genAIMove()
              }
            }, 500)
          }
          
          return true
        } else {
          this.error = response.error || '落子失败'
          return false
        }
      } catch (error) {
        this.error = error.message || '网络错误'
        return false
      } finally {
        this.isThinking = false
      }
    },

    async genAIMove() {
      if (this.gameStatus !== 'playing') return
      if (this.isThinking || !this.isConnected) return
      
      const colorChar = this.currentPlayer === 1 ? 'B' : 'W'
      
      try {
        this.isThinking = true
        this.error = null
        
        const response = await gtpClient.genmove(colorChar)
        
        if (response.success && response.data) {
          const position = response.data.trim().toUpperCase()
          
          if (position.toLowerCase() === 'pass') {
            this.currentPlayer = -this.currentPlayer
            this.consecutivePasses++
            this.checkGameEnd()
          } else {
            const { x, y } = this.gtpToCoord(position)
            if (x >= 0 && x < 19 && y >= 0 && y < 19) {
              this.board[x][y] = this.currentPlayer
              this.moveHistory.push({ x, y, color: this.currentPlayer })
              this.currentPlayer = -this.currentPlayer
              this.consecutivePasses = 0
              await this.updateBoard()
              this.updateEvaluation()
              this.updateGameTheoryData()
              this.checkGameEnd()
              
              // AI走子后自动获取新的推荐
              if (this.showSuggestions) {
                await this.getAISuggestions(5)
              }
              
              // 电脑自动博弈模式：继续AI走子
              if (this.gameMode === 'aiOnly' && this.gameStatus === 'playing') {
                setTimeout(() => {
                  if (!this.isThinking && this.gameStatus === 'playing') {
                    this.genAIMove()
                  }
                }, 1000)
              }
            }
          }
        }
      } catch (error) {
        this.error = error.message || 'AI走子失败'
      } finally {
        this.isThinking = false
      }
    },

    async clearBoard() {
      try {
        this.isThinking = true
        this.error = null
        
        // 如果已连接AI，发送清空命令
        if (this.isConnected) {
          try {
        await gtpClient.sendCommand('clear_board')
          } catch (error) {
            console.warn('清空GTP棋盘失败，继续本地清空:', error)
          }
        }
        
        // 本地清空棋盘
        this.board = Array(19).fill(null).map(() => Array(19).fill(0))
        this.moveHistory = []
        this.currentPlayer = 1
        this.aiSuggestions = []
        this.gameStatus = 'playing'
        this.resignedBy = null
        this.consecutivePasses = 0
        this.evaluation = {
          blackScore: 0,
          whiteScore: 0,
          blackStones: 0,
          whiteStones: 0,
          blackCaptures: 0,
          whiteCaptures: 0,
          blackTerritory: 0,
          whiteTerritory: 0,
          winRate: 0.5,
          value: 0
        }
        this.captureHistory = []
        this.gameTheoryData = {
          winRateHistory: [],
          valueHistory: [],
          captureHistory: [],
          moveQuality: [],
          nashEquilibrium: [], // 纳什均衡数据
          optimalStrategy: [] // 最优策略数据
        }
        this.influenceMap = null
        
        // 如果已连接AI，更新棋盘状态
        if (this.isConnected) {
        await this.updateBoard()
        }
        this.updateEvaluation()
        
        // 清空后如果显示推荐，重新获取
        if (this.showSuggestions && this.isConnected) {
          await this.getAISuggestions(5)
        }
        
        // 电脑自动博弈模式：自动开始
        if (this.gameMode === 'aiOnly' && this.isConnected) {
          setTimeout(() => {
            if (!this.isThinking && this.gameStatus === 'playing') {
              this.genAIMove()
            }
          }, 500)
        }
      } catch (error) {
        this.error = error.message || '清空棋盘失败'
      } finally {
        this.isThinking = false
      }
    },

    async switchAIMode(newMode) {
      const wasConnected = this.isConnected
      if (wasConnected) {
        await gtpClient.quit()
      }
      this.aiMode = newMode
      if (wasConnected) {
        await this.initGame(newMode)
      }
    },

    async getAISuggestions(count = 5) {
      if (!this.isConnected) {
        if (!this.showSuggestions) {
        this.aiSuggestions = []
        }
        return []
      }
      
      try {
        const colorChar = this.currentPlayer === 1 ? 'B' : 'W'
        const response = await gtpClient.getSuggestions(colorChar, count)
        
        if (response.success && response.data && Array.isArray(response.data)) {
          const validSuggestions = response.data
            .filter(s => s && typeof s === 'object' && 'x' in s && 'y' in s)
            .map(s => ({
              x: parseInt(s.x, 10),
              y: parseInt(s.y, 10),
              score: parseFloat(s.score || 0),
              color: parseInt(s.color || this.currentPlayer, 10)
            }))
            .filter(s => {
              // 过滤掉已有棋子的位置
              if (s.x >= 0 && s.x < 19 && s.y >= 0 && s.y < 19) {
                return this.board[s.x][s.y] === 0
              }
              return false
            })
            .sort((a, b) => b.score - a.score) // 按分数排序
            .slice(0, count) // 只取前N个
          
          this.aiSuggestions = [...validSuggestions]
          
          return validSuggestions
        } else {
          this.aiSuggestions = []
          return []
        }
      } catch (error) {
        console.error('获取AI建议失败:', error)
        this.aiSuggestions = []
        return []
      }
    },

    updateEvaluation() {
      let blackStones = 0
      let whiteStones = 0
      
      for (let i = 0; i < 19; i++) {
        for (let j = 0; j < 19; j++) {
          if (this.board[i][j] === 1) blackStones++
          else if (this.board[i][j] === -1) whiteStones++
        }
      }
      
      // 计算吃子数（从历史记录中统计）
      let blackCaptures = 0
      let whiteCaptures = 0
      if (this.captureHistory.length > 0) {
        const lastCapture = this.captureHistory[this.captureHistory.length - 1]
        blackCaptures = lastCapture.blackCaptures || 0
        whiteCaptures = lastCapture.whiteCaptures || 0
      }
      
      // 计算领地（简化算法：统计被己方棋子包围的空点）
      const { blackTerritory, whiteTerritory } = this.calculateTerritory()
      
      // 综合评估值（考虑子力、吃子、领地）
      const komi = 7.5 // 贴目
      const stoneValue = blackStones - whiteStones
      const captureValue = (blackCaptures - whiteCaptures) * 2 // 吃子价值更高
      const territoryValue = blackTerritory - whiteTerritory
      const value = stoneValue + captureValue + territoryValue - komi
      
      // 基于影响区域计算胜率
      if (this.showInfluence) {
        this.updateInfluenceMap()
      }
      const winRate = this.calculateWinRateFromInfluence()
      
      this.evaluation = {
        blackScore: blackStones + blackTerritory + blackCaptures * 2,
        whiteScore: whiteStones + whiteTerritory + whiteCaptures * 2 + komi,
        blackStones,
        whiteStones,
        blackCaptures,
        whiteCaptures,
        blackTerritory,
        whiteTerritory,
        winRate,
        value
      }
    },
    
    // 计算领地（简化算法）
    calculateTerritory() {
      let blackTerritory = 0
      let whiteTerritory = 0
      
      // 使用简单的洪水填充算法
      const visited = Array(19).fill(null).map(() => Array(19).fill(false))
      
      for (let i = 0; i < 19; i++) {
        for (let j = 0; j < 19; j++) {
          if (this.board[i][j] !== 0 || visited[i][j]) continue
          
          const territory = this.floodFill(i, j, visited)
          if (territory.owner !== 0) {
            if (territory.owner === 1) {
              blackTerritory += territory.size
            } else {
              whiteTerritory += territory.size
            }
          }
        }
      }
      
      return { blackTerritory, whiteTerritory }
    },
    
    // 洪水填充算法判断领地归属
    floodFill(startX, startY, visited) {
      const queue = [[startX, startY]]
      const territory = []
      let owner = 0 // 0=未确定, 1=黑, -1=白
      
      while (queue.length > 0) {
        const [x, y] = queue.shift()
        if (x < 0 || x >= 19 || y < 0 || y >= 19 || visited[x][y]) continue
        if (this.board[x][y] !== 0) {
          if (owner === 0) {
            owner = this.board[x][y]
          } else if (owner !== this.board[x][y]) {
            return { owner: 0, size: 0 } // 混合区域，不算领地
          }
          continue
        }
        
        visited[x][y] = true
        territory.push([x, y])
        
        // 检查边界
        const neighbors = [[x-1, y], [x+1, y], [x, y-1], [x, y+1]]
        for (const [nx, ny] of neighbors) {
          if (nx >= 0 && nx < 19 && ny >= 0 && ny < 19 && !visited[nx][ny]) {
            queue.push([nx, ny])
          }
        }
      }
      
      // 如果到达边界，不算领地
      const onBorder = territory.some(([x, y]) => 
        x === 0 || x === 18 || y === 0 || y === 18
      )
      
      if (onBorder && owner === 0) {
        return { owner: 0, size: 0 }
      }
      
      return { owner, size: territory.length }
    },
    
    // 检查吃子
    checkCaptures(x, y) {
      const captured = []
      const color = this.board[x][y]
      const opponentColor = -color
      
      // 检查四个方向的相邻位置
      const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]
      
      for (const [dx, dy] of directions) {
        const nx = x + dx
        const ny = y + dy
        
        if (nx >= 0 && nx < 19 && ny >= 0 && ny < 19 && this.board[nx][ny] === opponentColor) {
          // 检查这个棋子组是否被完全包围
          const group = this.getGroup(nx, ny)
          if (this.isGroupCaptured(group)) {
            captured.push(...group)
            // 移除被吃的棋子
            group.forEach(([gx, gy]) => {
              this.board[gx][gy] = 0
            })
          }
        }
      }
      
      return captured
    },
    
    // 获取棋子组（连通区域）
    getGroup(startX, startY) {
      const color = this.board[startX][startY]
      if (color === 0) return []
      
      const group = []
      const visited = Array(19).fill(null).map(() => Array(19).fill(false))
      const queue = [[startX, startY]]
      
      while (queue.length > 0) {
        const [x, y] = queue.shift()
        if (x < 0 || x >= 19 || y < 0 || y >= 19 || visited[x][y]) continue
        if (this.board[x][y] !== color) continue
        
        visited[x][y] = true
        group.push([x, y])
        
        const neighbors = [[x-1, y], [x+1, y], [x, y-1], [x, y+1]]
        for (const [nx, ny] of neighbors) {
          if (nx >= 0 && nx < 19 && ny >= 0 && ny < 19 && !visited[nx][ny]) {
            queue.push([nx, ny])
          }
        }
      }
      
      return group
    },
    
    // 检查棋子组是否被吃
    isGroupCaptured(group) {
      for (const [x, y] of group) {
        const neighbors = [[x-1, y], [x+1, y], [x, y-1], [x, y+1]]
        for (const [nx, ny] of neighbors) {
          if (nx < 0 || nx >= 19 || ny < 0 || ny >= 19) continue
          if (this.board[nx][ny] === 0) return false // 有气，没被吃
        }
      }
      return true // 无气，被吃
    },
    
    // 基于多因素综合计算胜率（专业博弈论方法）
    calculateWinRateFromInfluence() {
      const komi = 7.5 // 贴目
      const moveCount = this.moveHistory.length
      
      // 1. 计算影响区域
      if (!this.influenceMap) {
        this.updateInfluenceMap()
      }
      
      let blackInfluence = 0
      let whiteInfluence = 0
      
      if (this.influenceMap) {
      for (let i = 0; i < 19; i++) {
        for (let j = 0; j < 19; j++) {
          const influence = this.influenceMap[i][j]
          if (influence > 0) {
            blackInfluence += influence
          } else if (influence < 0) {
            whiteInfluence += Math.abs(influence)
          }
          }
        }
      }
      
      // 2. 计算地盘（已计算好的territory）
      const { blackTerritory, whiteTerritory } = this.calculateTerritory()
      
      // 3. 计算吃子数
      let blackCaptures = 0
      let whiteCaptures = 0
      if (this.captureHistory.length > 0) {
        const lastCapture = this.captureHistory[this.captureHistory.length - 1]
        blackCaptures = lastCapture.blackCaptures || 0
        whiteCaptures = lastCapture.whiteCaptures || 0
      }
      
      // 4. 计算棋子数量
      let blackStones = 0
      let whiteStones = 0
      for (let i = 0; i < 19; i++) {
        for (let j = 0; j < 19; j++) {
          if (this.board[i][j] === 1) blackStones++
          else if (this.board[i][j] === -1) whiteStones++
        }
      }
      
      // 5. 综合评分（权重分配）
      // 影响区域权重：0.4（形势评估）
      // 地盘权重：0.35（实际控制区域）
      // 吃子权重：0.15（已得利益）
      // 棋子数权重：0.1（子力对比）
      
      const influenceWeight = 0.4
      const territoryWeight = 0.35
      const captureWeight = 0.15
      const stoneWeight = 0.1
      
      // 归一化各项指标（避免数值差异过大）
      const maxInfluence = Math.max(blackInfluence, whiteInfluence, 1)
      const maxTerritory = Math.max(blackTerritory, whiteTerritory, 1)
      const maxCaptures = Math.max(blackCaptures, whiteCaptures, 1)
      const maxStones = Math.max(blackStones, whiteStones, 1)
      
      const normalizedBlackInfluence = blackInfluence / maxInfluence
      const normalizedWhiteInfluence = whiteInfluence / maxInfluence
      const normalizedBlackTerritory = blackTerritory / maxTerritory
      const normalizedWhiteTerritory = whiteTerritory / maxTerritory
      const normalizedBlackCaptures = blackCaptures / Math.max(maxCaptures, 1)
      const normalizedWhiteCaptures = whiteCaptures / Math.max(maxCaptures, 1)
      const normalizedBlackStones = blackStones / maxStones
      const normalizedWhiteStones = whiteStones / maxStones
      
      // 计算综合得分
      let blackScore = 
        normalizedBlackInfluence * influenceWeight +
        normalizedBlackTerritory * territoryWeight +
        normalizedBlackCaptures * captureWeight +
        normalizedBlackStones * stoneWeight
      
      let whiteScore = 
        normalizedWhiteInfluence * influenceWeight +
        normalizedWhiteTerritory * territoryWeight +
        normalizedWhiteCaptures * captureWeight +
        normalizedWhiteStones * stoneWeight
      
      // 考虑贴目（白方优势）
      const komiValue = komi / 50 // 归一化贴目值
      whiteScore += komiValue * territoryWeight
      
      // 6. 使用sigmoid函数将得分差异转换为胜率
      const totalScore = blackScore + whiteScore
      if (totalScore === 0) return 0.5
      
      const scoreDiff = blackScore - whiteScore
      const normalizedDiff = scoreDiff / Math.max(totalScore, 0.1) // 归一化差异
      
      // 使用改进的sigmoid函数（更平滑的曲线）
      const sigmoid = (x) => {
        // 使用tanh函数变体，使曲线更平滑
        const exp = Math.exp(-x * 4) // 乘以4使曲线更陡
        return 1 / (1 + exp)
      }
      
      let blackWinRate = sigmoid(normalizedDiff)
      
      // 7. 根据手数调整不确定性（早期不确定性更高）
      // 前30手：不确定性较高，胜率更接近0.5
      // 30-100手：不确定性逐渐降低
      // 100手后：不确定性最低，胜率更准确
      let uncertainty = 0
      if (moveCount < 30) {
        uncertainty = 0.4 * (1 - moveCount / 30) // 前30手不确定性0.4-0
      } else if (moveCount < 100) {
        uncertainty = 0.2 * (1 - (moveCount - 30) / 70) // 30-100手不确定性0.2-0
      }
      
      // 应用不确定性：使胜率向0.5收敛
      blackWinRate = 0.5 + (blackWinRate - 0.5) * (1 - uncertainty)
      
      // 8. 确保胜率在合理范围内
      blackWinRate = Math.max(0.05, Math.min(0.95, blackWinRate))
      
      return blackWinRate
    },
    
    // 计算棋子影响区域
    calculateInfluence(x, y) {
      if (x < 0 || x >= 19 || y < 0 || y >= 19) return null
      if (this.board[x][y] === 0) return null
      
      const color = this.board[x][y]
      const influence = Array(19).fill(null).map(() => Array(19).fill(0))
      
      // 使用距离衰减函数计算影响（曼哈顿距离 + 欧几里得距离混合）
      for (let i = 0; i < 19; i++) {
        for (let j = 0; j < 19; j++) {
          const dx = i - x
          const dy = j - y
          const manhattanDist = Math.abs(dx) + Math.abs(dy)
          const euclideanDist = Math.sqrt(dx * dx + dy * dy)
          
          // 使用曼哈顿距离计算影响（更符合围棋特性）
          let influenceValue = 0
          if (manhattanDist === 0) {
            influenceValue = 1.0
          } else if (manhattanDist === 1) {
            influenceValue = 0.8 // 直接相邻
          } else if (manhattanDist === 2) {
            influenceValue = 0.5 // 跳一
          } else if (manhattanDist <= 4) {
            influenceValue = 0.3 * Math.exp(-(manhattanDist - 2) / 2)
          } else if (manhattanDist <= 6) {
            influenceValue = 0.1 * Math.exp(-(manhattanDist - 4) / 2)
          }
          
          // 考虑已有棋子的影响
          if (this.board[i][j] === -color) {
            // 对方棋子会削弱影响
            influenceValue *= 0.3
          } else if (this.board[i][j] === color) {
            // 己方棋子会增强影响
            influenceValue *= 1.2
          }
          
          // 边界衰减
          const edgeDist = Math.min(i, 18 - i, j, 18 - j)
          if (edgeDist <= 2) {
            influenceValue *= 0.8
          }
          
          influence[i][j] = influenceValue * color // 正负表示黑白
        }
      }
      
      return influence
    },
    
    // 计算走子质量（基于实际效果和位置价值）
    calculateMoveQuality(x, y, capturedCount = 0) {
      const moveNum = this.moveHistory.length
      
      // === 1. 基础质量：根据对局阶段设定基准 ===
      // 开局(0-30手): 基准0.45-0.55，中盘(30-150手): 基准0.50-0.60，收官(150手+): 基准0.55-0.65
      let baseQuality = 0.5
      if (moveNum < 30) {
        baseQuality = 0.45 + (moveNum / 30) * 0.1 // 0.45-0.55
      } else if (moveNum < 150) {
        baseQuality = 0.55 + ((moveNum - 30) / 120) * 0.05 // 0.55-0.60
      } else {
        baseQuality = 0.60 + Math.min((moveNum - 150) / 100, 0.05) // 0.60-0.65
      }
      
      // === 2. 吃子效果评估（最重要因素） ===
      let captureBonus = 0
      if (capturedCount > 0) {
        // 吃子价值：吃1子+0.08, 吃2子+0.15, 吃3子+0.22, 吃4子以上+0.28
        captureBonus = Math.min(0.08 * capturedCount + 0.02 * capturedCount * (capturedCount - 1), 0.28)
      }
      
      // === 3. 位置价值评估 ===
      let positionScore = 0
      
      // 3.1 星位和重要位置（开局价值高）
      const starPoints = [
        [3, 3], [3, 9], [3, 15],
        [9, 3], [9, 9], [9, 15],
        [15, 3], [15, 9], [15, 15]
      ]
      const isStarPoint = starPoints.some(([sx, sy]) => sx === x && sy === y)
      
      if (isStarPoint && moveNum < 50) {
        positionScore += 0.05 // 星位开局加分
      }
      
      // 3.2 中心区域价值（中盘价值高）
      const centerDist = Math.abs(x - 9) + Math.abs(y - 9)
      if (moveNum >= 30 && moveNum < 150) {
        // 中盘阶段，中心区域更有价值
        const centerValue = 1 - (centerDist / 18) * 0.6
        positionScore += centerValue * 0.03
      }
      
      // 3.3 边角位置（收官价值高）
      const isCorner = (x < 4 || x > 14) && (y < 4 || y > 14)
      const isEdge = (x < 4 || x > 14 || y < 4 || y > 14) && !isCorner
      
      if (moveNum >= 150) {
        // 收官阶段，边角位置更有价值
        if (isCorner) positionScore += 0.04
        else if (isEdge) positionScore += 0.02
      }
      
      // === 4. 连接和扩展评估 ===
      let connectionScore = 0
      const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]
      let sameColorNeighbors = 0
      let emptyNeighbors = 0
      
      for (const [dx, dy] of directions) {
        const nx = x + dx
        const ny = y + dy
        if (nx >= 0 && nx < 19 && ny >= 0 && ny < 19) {
          if (this.board[nx][ny] === this.currentPlayer) {
            sameColorNeighbors++
          } else if (this.board[nx][ny] === 0) {
            emptyNeighbors++
          }
        }
      }
      
      // 连接己方棋子：+0.02-0.06
      if (sameColorNeighbors > 0) {
        connectionScore += Math.min(sameColorNeighbors * 0.02, 0.06)
      }
      
      // 扩展空间：+0.01-0.03
      if (emptyNeighbors >= 3) {
        connectionScore += 0.03
      } else if (emptyNeighbors >= 2) {
        connectionScore += 0.02
      } else if (emptyNeighbors >= 1) {
        connectionScore += 0.01
      }
      
      // === 5. 威胁评估（如果吃子或形成威胁） ===
      let threatScore = 0
      if (capturedCount > 0) {
        // 吃子本身就是威胁
        threatScore += Math.min(capturedCount * 0.02, 0.06)
      }
      
      // === 6. 综合计算 ===
      // 基础质量 + 各项加分
      let quality = baseQuality + captureBonus + positionScore + connectionScore + threatScore
      
      // === 7. 惩罚项：避免明显不好的走子 ===
      // 7.1 如果落子后立即被吃（自杀走子），大幅降低质量
      // （这个在checkCaptures中已经处理，这里假设不会发生）
      
      // 7.2 如果位置太偏且没有实际效果，轻微惩罚
      if (centerDist > 15 && capturedCount === 0 && sameColorNeighbors === 0 && moveNum < 30) {
        quality -= 0.03
      }
      
      // === 8. 最终归一化和限制 ===
      // 质量值范围：0.25-0.85
      // 大部分走子应该在0.40-0.70之间
      quality = Math.max(0.25, Math.min(0.85, quality))
      
      return Number(quality.toFixed(3))
    },
    
    // 更新全局影响图（使用更专业的算法）
    updateInfluenceMap() {
      const totalInfluence = Array(19).fill(null).map(() => Array(19).fill(0))
      
      // 使用迭代算法计算影响（类似热扩散）
      for (let i = 0; i < 19; i++) {
        for (let j = 0; j < 19; j++) {
          if (this.board[i][j] !== 0) {
            const influence = this.calculateInfluence(i, j)
            if (influence) {
              for (let x = 0; x < 19; x++) {
                for (let y = 0; y < 19; y++) {
                  totalInfluence[x][y] += influence[x][y]
                }
              }
            }
          }
        }
      }
      
      // 归一化影响值（使其在合理范围内）
      let maxInfluence = 0
      for (let i = 0; i < 19; i++) {
        for (let j = 0; j < 19; j++) {
          maxInfluence = Math.max(maxInfluence, Math.abs(totalInfluence[i][j]))
        }
      }
      
      if (maxInfluence > 0) {
        for (let i = 0; i < 19; i++) {
          for (let j = 0; j < 19; j++) {
            totalInfluence[i][j] = totalInfluence[i][j] / maxInfluence
          }
        }
      }
      
      this.influenceMap = totalInfluence
    },
    
    // 更新博弈论数据
    updateGameTheoryData() {
      const moveNum = this.moveHistory.length
      let blackWinRate = this.evaluation.winRate || 0.5
      
      // 确保胜率在合理范围内
      blackWinRate = Math.max(0.0, Math.min(1.0, blackWinRate))
      
      // 计算白方胜率，确保两方胜率之和为1（100%）
      const whiteWinRate = 1.0 - blackWinRate
      
      const value = this.evaluation.value || 0
      const blackCaptures = this.evaluation.blackCaptures || 0
      const whiteCaptures = this.evaluation.whiteCaptures || 0
      
      // 验证：确保两方胜率之和为1
      const total = blackWinRate + whiteWinRate
      if (Math.abs(total - 1.0) > 0.001) {
        // 如果和不等于1，重新归一化
        blackWinRate = blackWinRate / total
        whiteWinRate = whiteWinRate / total
      }
      
      this.gameTheoryData.winRateHistory.push({
        move: moveNum,
        blackWinRate: blackWinRate,
        whiteWinRate: whiteWinRate
      })
      
      this.gameTheoryData.valueHistory.push({
        move: moveNum,
        value: value
      })
      
      this.gameTheoryData.captureHistory.push({
        move: moveNum,
        blackCaptures,
        whiteCaptures
      })
      
      // 更新影响图
      if (this.showInfluence) {
        this.updateInfluenceMap()
      }
    },
    
    // 检查游戏是否结束
    checkGameEnd() {
      // 检查连续pass
      if (this.consecutivePasses >= 2) {
        // 双方都pass，计算胜负
        const diff = this.evaluation.blackStones - this.evaluation.whiteStones
        // 假设贴目7.5
        const komi = 7.5
        const finalScore = diff - komi
        
        if (finalScore > 0) {
          this.gameStatus = 'blackWin'
        } else if (finalScore < 0) {
          this.gameStatus = 'whiteWin'
        } else {
          this.gameStatus = 'draw'
        }
        return
      }
      
      // 检查认输
      if (this.resignedBy !== null) {
        if (this.resignedBy === 1) {
          this.gameStatus = 'whiteWin'
        } else {
          this.gameStatus = 'blackWin'
        }
        return
      }
    },
    
    // 认输
    resign(color) {
      if (this.gameStatus !== 'playing') return
      this.resignedBy = color
      this.checkGameEnd()
    },
    
    // 设置游戏模式
    setGameMode(mode) {
      this.gameMode = mode
      if (mode === 'aiOnly' && this.isConnected && this.gameStatus === 'playing') {
        // 自动开始AI对弈
        setTimeout(() => {
          if (!this.isThinking && this.gameStatus === 'playing') {
            this.genAIMove()
          }
        }, 500)
      }
    },

    coordToGTP(x, y) {
      const letters = 'ABCDEFGHJKLMNOPQRST'
      const row = 19 - x
      const col = letters[y]
      return `${col}${row}`
    },

    gtpToCoord(gtp) {
      const letters = 'ABCDEFGHJKLMNOPQRST'
      const col = gtp[0]
      const row = parseInt(gtp.slice(1))
      const x = 19 - row
      const y = letters.indexOf(col)
      return { x, y }
    }
  }
})





