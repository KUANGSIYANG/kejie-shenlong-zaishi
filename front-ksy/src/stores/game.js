import { defineStore } from 'pinia'
import gtpClient from '../services/gtpClient'

const BOARD_SIZE = 19
const KOMI = 7.5

const createEmptyBoard = () => Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0))

export const useGameStore = defineStore('game', {
  state: () => ({
    board: createEmptyBoard(),
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
      blackCaptures: 0,
      whiteCaptures: 0,
      blackTerritory: 0,
      whiteTerritory: 0,
      winRate: 0.5,
      value: 0
    },
    gameStatus: 'playing',
    resignedBy: null,
    consecutivePasses: 0,
    captureHistory: [],
    gameTheoryData: {
      winRateHistory: [],
      valueHistory: [],
      captureHistory: [],
      moveQuality: [],
      paretoHistory: [],
      nashHistory: [],
      zeroSumHistory: [],
      uncertaintyHistory: [],
      synergyHistory: []
    },
    compareBaseline: null,
    influenceMap: null,
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
        if (this.showSuggestions) {
          await this.getAISuggestions(5)
        }
      } catch (error) {
        this.error = error.message || '连接 AI 失败'
        console.error('初始化游戏失败:', error)
      }
    },

    async updateBoard() {
      if (!this.isConnected) return
      try {
        const response = await gtpClient.showboard()
        if (response.success && response.data) {
          const lines = response.data.trim().split('\n').filter((line) => line.trim())
          const newBoard = createEmptyBoard()
          lines.forEach((line, i) => {
            if (i < BOARD_SIZE && line.length >= BOARD_SIZE) {
              line
                .split('')
                .slice(0, BOARD_SIZE)
                .forEach((char, j) => {
                  if (char === 'X') newBoard[i][j] = 1
                  else if (char === 'O') newBoard[i][j] = -1
                })
            }
          })
          this.board = newBoard
        }
      } catch (error) {
        console.error('更新棋盘失败:', error)
      }
    },

    async makeMove(x, y) {
      if (this.gameStatus !== 'playing') {
        this.error = '对局已结束'
        return false
      }
      if (this.isThinking) return false
      if (this.board[x][y] !== 0) {
        this.error = '该位置已有棋子'
        return false
      }

      if (!this.isConnected) {
        this.applyLocalMove(x, y, this.currentPlayer)
        return true
      }

      const colorChar = this.currentPlayer === 1 ? 'B' : 'W'
      const position = this.coordToGTP(x, y)

      try {
        this.isThinking = true
        this.error = null

        const response = await gtpClient.play(colorChar, position)
        if (response.success) {
          this.applyLocalMove(x, y, this.currentPlayer)
          await this.updateBoard()
          if (this.showSuggestions) {
            await this.getAISuggestions(5)
          }

          if (this.gameMode === 'vsAI' && this.gameStatus === 'playing') {
            setTimeout(() => {
              if (!this.isThinking && this.gameStatus === 'playing') {
                this.genAIMove()
              }
            }, 400)
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
      if (this.gameStatus !== 'playing' || this.isThinking || !this.isConnected) return

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
            if (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE) {
              this.applyLocalMove(x, y, this.currentPlayer)
              await this.updateBoard()
              if (this.showSuggestions) {
                await this.getAISuggestions(5)
              }
              if (this.gameMode === 'aiOnly' && this.gameStatus === 'playing') {
                setTimeout(() => {
                  if (!this.isThinking && this.gameStatus === 'playing') {
                    this.genAIMove()
                  }
                }, 800)
              }
            }
          }
        }
      } catch (error) {
        this.error = error.message || 'AI 落子失败'
      } finally {
        this.isThinking = false
      }
    },

    applyLocalMove(x, y, color) {
      const prevBlackCaptures = this.evaluation.blackCaptures || 0
      const prevWhiteCaptures = this.evaluation.whiteCaptures || 0

      this.board[x][y] = color
      const captured = this.checkCaptures(x, y)
      const newBlackCaptures = prevBlackCaptures + (color === 1 ? captured.length : 0)
      const newWhiteCaptures = prevWhiteCaptures + (color === -1 ? captured.length : 0)

      const moveQuality = this.calculateMoveQuality(x, y, captured.length, color)

      this.moveHistory.push({
        x,
        y,
        color,
        quality: moveQuality
      })

      this.captureHistory.push({
        move: this.moveHistory.length,
        blackCaptures: newBlackCaptures,
        whiteCaptures: newWhiteCaptures,
        captured
      })

      this.currentPlayer = -color
      this.consecutivePasses = 0
      this.updateEvaluation()
      this.updateGameTheoryData()
      this.checkGameEnd()
    },

    async clearBoard() {
      try {
        this.isThinking = true
        this.error = null
        if (this.isConnected) {
          try {
            await gtpClient.sendCommand('clear_board')
          } catch (error) {
            console.warn('清空远端棋盘失败，继续本地重置', error)
          }
        }

        this.board = createEmptyBoard()
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
          paretoHistory: [],
          nashHistory: [],
          zeroSumHistory: [],
          uncertaintyHistory: [],
          synergyHistory: []
        }
        this.compareBaseline = null
        this.influenceMap = null

        if (this.isConnected) {
          await this.updateBoard()
        }
        this.updateEvaluation()

        if (this.showSuggestions && this.isConnected) {
          await this.getAISuggestions(5)
        }

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

    setComparisonBaseline(label = '基准模型') {
      this.compareBaseline = {
        label,
        winRateHistory: JSON.parse(JSON.stringify(this.gameTheoryData.winRateHistory || []))
      }
    },

    clearComparisonBaseline() {
      this.compareBaseline = null
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
            .filter((s) => s && typeof s === 'object' && 'x' in s && 'y' in s)
            .map((s) => ({
              x: parseInt(s.x, 10),
              y: parseInt(s.y, 10),
              score: parseFloat(s.score || 0),
              color: parseInt(s.color || this.currentPlayer, 10)
            }))
            .filter((s) => {
              if (s.x >= 0 && s.x < BOARD_SIZE && s.y >= 0 && s.y < BOARD_SIZE) {
                return this.board[s.x][s.y] === 0
              }
              return false
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, count)
          this.aiSuggestions = [...validSuggestions]
          return validSuggestions
        } else {
          this.aiSuggestions = []
          return []
        }
      } catch (error) {
        console.error('获取 AI 建议失败:', error)
        this.aiSuggestions = []
        return []
      }
    },

    updateEvaluation() {
      let blackStones = 0
      let whiteStones = 0

      for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
          if (this.board[i][j] === 1) blackStones++
          else if (this.board[i][j] === -1) whiteStones++
        }
      }

      let blackCaptures = 0
      let whiteCaptures = 0
      if (this.captureHistory.length > 0) {
        const lastCapture = this.captureHistory[this.captureHistory.length - 1]
        blackCaptures = lastCapture.blackCaptures || 0
        whiteCaptures = lastCapture.whiteCaptures || 0
      }

      const { blackTerritory, whiteTerritory } = this.calculateTerritory()

      if (this.showInfluence) {
        this.updateInfluenceMap()
      }
      const winRate = this.calculateWinRateFromInfluence()

      this.evaluation = {
        blackScore: blackStones + blackTerritory + blackCaptures * 2,
        whiteScore: whiteStones + whiteTerritory + whiteCaptures * 2 + KOMI,
        blackStones,
        whiteStones,
        blackCaptures,
        whiteCaptures,
        blackTerritory,
        whiteTerritory,
        winRate,
        value: blackStones - whiteStones + (blackCaptures - whiteCaptures) * 2 + (blackTerritory - whiteTerritory) - KOMI
      }
    },

    calculateTerritory() {
      let blackTerritory = 0
      let whiteTerritory = 0
      const visited = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(false))

      for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
          if (this.board[i][j] !== 0 || visited[i][j]) continue

          const territory = this.floodFill(i, j, visited)
          if (territory.owner !== 0) {
            if (territory.owner === 1) blackTerritory += territory.size
            else whiteTerritory += territory.size
          }
        }
      }
      return { blackTerritory, whiteTerritory }
    },

    floodFill(startX, startY, visited) {
      const queue = [[startX, startY]]
      const territory = []
      let owner = 0

      while (queue.length > 0) {
        const [x, y] = queue.shift()
        if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE || visited[x][y]) continue
        if (this.board[x][y] !== 0) {
          if (owner === 0) {
            owner = this.board[x][y]
          } else if (owner !== this.board[x][y]) {
            return { owner: 0, size: 0 }
          }
          continue
        }

        visited[x][y] = true
        territory.push([x, y])

        const neighbors = [
          [x - 1, y],
          [x + 1, y],
          [x, y - 1],
          [x, y + 1]
        ]
        for (const [nx, ny] of neighbors) {
          if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && !visited[nx][ny]) {
            queue.push([nx, ny])
          }
        }
      }

      const onBorder = territory.some(([x, y]) => x === 0 || x === BOARD_SIZE - 1 || y === 0 || y === BOARD_SIZE - 1)
      if (onBorder && owner === 0) {
        return { owner: 0, size: 0 }
      }
      return { owner, size: territory.length }
    },

    checkCaptures(x, y) {
      const captured = []
      const color = this.board[x][y]
      const opponentColor = -color
      const directions = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1]
      ]

      for (const [dx, dy] of directions) {
        const nx = x + dx
        const ny = y + dy
        if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && this.board[nx][ny] === opponentColor) {
          const group = this.getGroup(nx, ny)
          if (this.isGroupCaptured(group)) {
            captured.push(...group)
            group.forEach(([gx, gy]) => {
              this.board[gx][gy] = 0
            })
          }
        }
      }
      return captured
    },

    getGroup(startX, startY) {
      const color = this.board[startX][startY]
      if (color === 0) return []

      const group = []
      const visited = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(false))
      const queue = [[startX, startY]]

      while (queue.length > 0) {
        const [x, y] = queue.shift()
        if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE || visited[x][y]) continue
        if (this.board[x][y] !== color) continue

        visited[x][y] = true
        group.push([x, y])

        const neighbors = [
          [x - 1, y],
          [x + 1, y],
          [x, y - 1],
          [x, y + 1]
        ]
        for (const [nx, ny] of neighbors) {
          if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && !visited[nx][ny]) {
            queue.push([nx, ny])
          }
        }
      }
      return group
    },

    isGroupCaptured(group) {
      for (const [x, y] of group) {
        const neighbors = [
          [x - 1, y],
          [x + 1, y],
          [x, y - 1],
          [x, y + 1]
        ]
        for (const [nx, ny] of neighbors) {
          if (nx < 0 || nx >= BOARD_SIZE || ny < 0 || ny >= BOARD_SIZE) continue
          if (this.board[nx][ny] === 0) return false
        }
      }
      return true
    },

    calculateWinRateFromInfluence() {
      const moveCount = this.moveHistory.length
      if (!this.influenceMap) {
        this.updateInfluenceMap()
      }

      let blackInfluence = 0
      let whiteInfluence = 0
      if (this.influenceMap) {
        for (let i = 0; i < BOARD_SIZE; i++) {
          for (let j = 0; j < BOARD_SIZE; j++) {
            const influence = this.influenceMap[i][j]
            if (influence > 0) blackInfluence += influence
            if (influence < 0) whiteInfluence += Math.abs(influence)
          }
        }
      }

      const { blackTerritory, whiteTerritory } = this.calculateTerritory()
      const captureSnapshot = this.captureHistory[this.captureHistory.length - 1] || { blackCaptures: 0, whiteCaptures: 0 }
      const blackCaptures = captureSnapshot.blackCaptures || 0
      const whiteCaptures = captureSnapshot.whiteCaptures || 0

      let blackStones = 0
      let whiteStones = 0
      for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
          if (this.board[i][j] === 1) blackStones++
          else if (this.board[i][j] === -1) whiteStones++
        }
      }

      const influenceDiff = blackInfluence - whiteInfluence
      const territoryDiff = blackTerritory - whiteTerritory - KOMI
      const captureDiff = blackCaptures - whiteCaptures
      const stoneDiff = blackStones - whiteStones

      const recentQuality =
        this.moveHistory.slice(-8).reduce((sum, move) => sum + (move.quality ?? 0.55), 0) /
        Math.max(1, Math.min(8, this.moveHistory.length))

      const phase = moveCount < 40 ? 'opening' : moveCount < 120 ? 'mid' : 'end'
      const weights = {
        opening: { influence: 0.45, territory: 0.25, capture: 0.15, stones: 0.1, stability: 0.05 },
        mid: { influence: 0.35, territory: 0.3, capture: 0.15, stones: 0.1, stability: 0.1 },
        end: { influence: 0.2, territory: 0.4, capture: 0.2, stones: 0.1, stability: 0.1 }
      }[phase]

      const normalize = (value, scale) => Math.max(-1, Math.min(1, value / scale))
      const influenceScore = normalize(influenceDiff, 120)
      const territoryScore = normalize(territoryDiff, 30)
      const captureScore = normalize(captureDiff, 12)
      const stoneScore = normalize(stoneDiff, 30)
      const stabilityScore = normalize(recentQuality - 0.55, 0.45)

      const blended =
        influenceScore * weights.influence +
        territoryScore * weights.territory +
        captureScore * weights.capture +
        stoneScore * weights.stones +
        stabilityScore * weights.stability

      const logistic = (x) => 1 / (1 + Math.exp(-x * 3.2))
      const baseWinRate = logistic(blended)

      let uncertainty = 0.08
      if (moveCount < 30) uncertainty = 0.2 - (moveCount / 30) * 0.07
      else if (moveCount < 100) uncertainty = 0.13 - ((moveCount - 30) / 70) * 0.05

      const finalRate = 0.5 + (baseWinRate - 0.5) * (1 - uncertainty)
      return Math.max(0.03, Math.min(0.97, finalRate))
    },

    calculateInfluence(x, y) {
      if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return null
      if (this.board[x][y] === 0) return null

      const color = this.board[x][y]
      const influence = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0))

      for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
          const dx = i - x
          const dy = j - y
          const manhattanDist = Math.abs(dx) + Math.abs(dy)

          let influenceValue = 0
          if (manhattanDist === 0) influenceValue = 1.0
          else if (manhattanDist === 1) influenceValue = 0.82
          else if (manhattanDist === 2) influenceValue = 0.55
          else if (manhattanDist <= 4) influenceValue = 0.32 * Math.exp(-(manhattanDist - 2) / 2)
          else if (manhattanDist <= 6) influenceValue = 0.14 * Math.exp(-(manhattanDist - 4) / 2)

          if (this.board[i][j] === -color) {
            influenceValue *= 0.35
          } else if (this.board[i][j] === color) {
            influenceValue *= 1.2
          }

          const edgeDist = Math.min(i, BOARD_SIZE - 1 - i, j, BOARD_SIZE - 1 - j)
          if (edgeDist <= 2) {
            influenceValue *= 0.85
          }
          influence[i][j] = influenceValue * color
        }
      }
      return influence
    },

    calculateMoveQuality(x, y, capturedCount = 0, color = 1) {
      const moveNum = this.moveHistory.length + 1
      let quality = 0.55

      if (moveNum < 30) {
        quality = 0.48 + (moveNum / 30) * 0.1
      } else if (moveNum < 150) {
        quality = 0.58
      } else {
        quality = 0.62
      }

      if (capturedCount > 0) {
        quality += Math.min(0.08 * capturedCount, 0.25)
      }

      const starPoints = [
        [3, 3],
        [3, 9],
        [3, 15],
        [9, 3],
        [9, 9],
        [9, 15],
        [15, 3],
        [15, 9],
        [15, 15]
      ]
      const isStarPoint = starPoints.some(([sx, sy]) => sx === x && sy === y)
      if (isStarPoint && moveNum < 60) {
        quality += 0.03
      }

      const centerDist = Math.abs(x - 9) + Math.abs(y - 9)
      if (moveNum >= 30 && moveNum < 150) {
        const centerValue = 1 - (centerDist / 18) * 0.6
        quality += centerValue * 0.02
      }

      const isCorner = (x < 4 || x > 14) && (y < 4 || y > 14)
      const isEdge = (x < 4 || x > 14 || y < 4 || y > 14) && !isCorner
      if (moveNum >= 150) {
        if (isCorner) quality += 0.03
        else if (isEdge) quality += 0.015
      }

      const directions = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1]
      ]
      let sameColorNeighbors = 0
      let emptyNeighbors = 0
      for (const [dx, dy] of directions) {
        const nx = x + dx
        const ny = y + dy
        if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
          if (this.board[nx][ny] === color) {
            sameColorNeighbors++
          } else if (this.board[nx][ny] === 0) {
            emptyNeighbors++
          }
        }
      }
      if (sameColorNeighbors > 0) {
        quality += Math.min(sameColorNeighbors * 0.02, 0.06)
      }
      if (emptyNeighbors >= 3) quality += 0.03
      else if (emptyNeighbors >= 2) quality += 0.02
      else if (emptyNeighbors >= 1) quality += 0.01

      if (centerDist > 15 && capturedCount === 0 && sameColorNeighbors === 0 && moveNum < 30) {
        quality -= 0.03
      }

      quality = Math.max(0.25, Math.min(0.85, quality))
      return Number(quality.toFixed(3))
    },

    updateInfluenceMap() {
      const totalInfluence = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0))
      for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
          if (this.board[i][j] !== 0) {
            const influence = this.calculateInfluence(i, j)
            if (influence) {
              for (let x = 0; x < BOARD_SIZE; x++) {
                for (let y = 0; y < BOARD_SIZE; y++) {
                  totalInfluence[x][y] += influence[x][y]
                }
              }
            }
          }
        }
      }

      let maxInfluence = 0
      for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
          maxInfluence = Math.max(maxInfluence, Math.abs(totalInfluence[i][j]))
        }
      }

      if (maxInfluence > 0) {
        for (let i = 0; i < BOARD_SIZE; i++) {
          for (let j = 0; j < BOARD_SIZE; j++) {
            totalInfluence[i][j] = totalInfluence[i][j] / maxInfluence
          }
        }
      }
      this.influenceMap = totalInfluence
    },

    updateGameTheoryData() {
      const moveNum = this.moveHistory.length
      let blackWinRate = this.evaluation.winRate || 0.5
      blackWinRate = Math.max(0.0, Math.min(1.0, blackWinRate))
      let whiteWinRate = 1.0 - blackWinRate
      const total = blackWinRate + whiteWinRate
      if (Math.abs(total - 1.0) > 0.001) {
        blackWinRate = blackWinRate / total
        whiteWinRate = whiteWinRate / total
      }

      const value = this.evaluation.value || 0
      const blackCaptures = this.evaluation.blackCaptures || 0
      const whiteCaptures = this.evaluation.whiteCaptures || 0
      const blackTerritory = this.evaluation.blackTerritory || 0
      const whiteTerritory = this.evaluation.whiteTerritory || 0
      const lastMove = this.moveHistory[this.moveHistory.length - 1]
      const blackUtility = this.evaluation.blackScore || 0
      const whiteUtility = this.evaluation.whiteScore || 0
      const totalUtility = Math.max(blackUtility + whiteUtility, 1)
      const paretoEfficiency = Math.max(
        0,
        Math.min(1, 1 - Math.abs(blackUtility - whiteUtility) / totalUtility)
      )
      const nashGap = Math.abs(0.5 - blackWinRate)
      const nashStability = Math.max(0, Math.min(1, 1 - nashGap * 2))
      const nashPotential = Number(
        (((paretoEfficiency + nashStability) / 2) || 0.5).toFixed(3)
      )
      const zeroSumIndex =
        Math.min(
          1,
          Math.abs((this.evaluation.blackScore || 0) - (this.evaluation.whiteScore || 0)) /
            Math.max(Math.abs(this.evaluation.blackScore || 0) + Math.abs(this.evaluation.whiteScore || 0), 1)
        )

      // 近 12 手胜率波动 -> 不确定度
      const recentWin = this.gameTheoryData.winRateHistory.slice(-12).map((h) => h.blackWinRate ?? 0.5)
      const winAvg = recentWin.length
        ? recentWin.reduce((a, b) => a + b, 0) / Math.max(recentWin.length, 1)
        : 0.5
      const winVar = recentWin.length
        ? recentWin.reduce((s, v) => s + Math.pow(v - winAvg, 2), 0) / Math.max(recentWin.length, 1)
        : 0
      const winStd = Math.sqrt(winVar)
      const uncertainty = Math.max(0.05, Math.min(0.6, winStd * 1.8))

      // 近 8 手落子质量均值 -> 策略协同
      const recentQuality = this.gameTheoryData.moveQuality.slice(-8)
      const synergy = recentQuality.length
        ? Math.max(
            0.3,
            Math.min(
              0.9,
              recentQuality.reduce((s, m) => s + (m.quality ?? 0.55), 0) / Math.max(recentQuality.length, 1)
            )
          )
        : 0.55

      this.gameTheoryData.winRateHistory.push({
        move: moveNum,
        blackWinRate,
        whiteWinRate
      })

      this.gameTheoryData.valueHistory.push({
        move: moveNum,
        value
      })

      this.gameTheoryData.captureHistory.push({
        move: moveNum,
        blackCaptures,
        whiteCaptures,
        blackTerritory,
        whiteTerritory
      })

      if (lastMove) {
        this.gameTheoryData.moveQuality.push({
          move: moveNum,
          quality: lastMove.quality ?? 0.55
        })
      }

      this.gameTheoryData.paretoHistory.push({
        move: moveNum,
        blackUtility,
        whiteUtility,
        efficiency: paretoEfficiency
      })

      this.gameTheoryData.nashHistory.push({
        move: moveNum,
        gap: nashGap,
        stability: nashStability,
        potential: nashPotential
      })

      this.gameTheoryData.zeroSumHistory.push({
        move: moveNum,
        tension: zeroSumIndex
      })

      this.gameTheoryData.uncertaintyHistory.push({
        move: moveNum,
        uncertainty
      })

      this.gameTheoryData.synergyHistory.push({
        move: moveNum,
        synergy
      })

      if (this.showInfluence) {
        this.updateInfluenceMap()
      }
    },

    checkGameEnd() {
      if (this.consecutivePasses >= 2) {
        const diff = (this.evaluation.blackScore || 0) - (this.evaluation.whiteScore || 0)
        if (diff > 0) this.gameStatus = 'blackWin'
        else if (diff < 0) this.gameStatus = 'whiteWin'
        else this.gameStatus = 'draw'
        return
      }

      if (this.resignedBy !== null) {
        if (this.resignedBy === 1) this.gameStatus = 'whiteWin'
        else this.gameStatus = 'blackWin'
      }
    },

    resign(color) {
      if (this.gameStatus !== 'playing') return
      this.resignedBy = color
      this.gameStatus = 'resigned'
      this.checkGameEnd()
    },

    setGameMode(mode) {
      this.gameMode = mode
      if (mode === 'aiOnly' && this.isConnected && this.gameStatus === 'playing') {
        setTimeout(() => {
          if (!this.isThinking && this.gameStatus === 'playing') {
            this.genAIMove()
          }
        }, 500)
      }
    },

    coordToGTP(x, y) {
      const letters = 'ABCDEFGHJKLMNOPQRST'
      const row = BOARD_SIZE - x
      const col = letters[y]
      return `${col}${row}`
    },

    gtpToCoord(gtp) {
      const letters = 'ABCDEFGHJKLMNOPQRST'
      const col = gtp[0]
      const row = parseInt(gtp.slice(1))
      const x = BOARD_SIZE - row
      const y = letters.indexOf(col)
      return { x, y }
    }
  }
})
