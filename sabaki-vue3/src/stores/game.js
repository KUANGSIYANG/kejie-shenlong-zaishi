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
    
    // 基于影响区域计算胜率（专业博弈论方法）
    calculateWinRateFromInfluence() {
      if (!this.influenceMap) {
        this.updateInfluenceMap()
      }
      
      if (!this.influenceMap) return 0.5
      
      // 计算黑方和白方的总影响值
      let blackInfluence = 0
      let whiteInfluence = 0
      
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
      
      // 考虑贴目
      const komi = 7.5
      const komiInfluence = komi * 2 // 贴目转换为影响值
      whiteInfluence += komiInfluence
      
      // 使用纳什均衡思想：影响值差异决定胜率
      const totalInfluence = blackInfluence + whiteInfluence
      if (totalInfluence === 0) return 0.5
      
      // 使用sigmoid函数将影响差异转换为胜率
      const influenceDiff = blackInfluence - whiteInfluence
      const normalizedDiff = influenceDiff / (totalInfluence * 0.5) // 归一化
      const sigmoid = (x) => 1 / (1 + Math.exp(-x * 3)) // 乘以3使曲线更陡
      
      let winRate = sigmoid(normalizedDiff)
      
      // 根据手数调整（早期不确定性更高）
      const moveCount = this.moveHistory.length
      const uncertainty = Math.max(0, 1 - moveCount / 50) // 50手后不确定性为0
      winRate = 0.5 + (winRate - 0.5) * (1 - uncertainty * 0.5)
      
      return Math.max(0.0, Math.min(1.0, winRate))
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
    
    // 计算走子质量（在落子后计算，考虑实际效果）
    calculateMoveQuality(x, y, capturedCount = 0) {
      // 基于位置、吃子、形势等因素计算质量
      let quality = 0.5 // 基础质量
      
      // 1. 位置价值（中心区域价值更高）
      const centerDist = Math.abs(x - 9) + Math.abs(y - 9)
      const positionValue = 1 - (centerDist / 18) * 0.3
      quality += positionValue * 0.3
      
      // 2. 吃子价值（传入已吃子数）
      if (capturedCount > 0) {
        quality += Math.min(capturedCount * 0.1, 0.3)
      }
      
      // 3. 手数因素（早期手数可能质量较低）
      const moveNum = this.moveHistory.length
      const moveNumFactor = Math.min(1, moveNum / 30)
      quality += moveNumFactor * 0.2
      
      // 4. 基于影响区域的价值
      if (this.influenceMap) {
        const influence = this.influenceMap[x] && this.influenceMap[x][y] ? this.influenceMap[x][y] : 0
        quality += Math.abs(influence) * 0.2
      }
      
      return Math.max(0.2, Math.min(0.95, quality))
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
      const winRate = this.evaluation.winRate || 0.5
      const value = this.evaluation.value || 0
      const blackCaptures = this.evaluation.blackCaptures || 0
      const whiteCaptures = this.evaluation.whiteCaptures || 0
      
      this.gameTheoryData.winRateHistory.push({
        move: moveNum,
        blackWinRate: winRate,
        whiteWinRate: 1 - winRate
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





