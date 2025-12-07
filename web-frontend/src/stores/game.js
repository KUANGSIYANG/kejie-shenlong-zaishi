import { defineStore } from 'pinia'
import gtpClient from '../services/gtpClient'

export const useGameStore = defineStore('game', {
  state: () => ({
    // 棋盘状态: 0=空, 1=黑, -1=白
    board: Array(19).fill(null).map(() => Array(19).fill(0)),
    
    // 当前玩家: 1=黑, -1=白
    currentPlayer: 1,
    
    // 游戏模式: 'manual' | 'vsAI' | 'aiOnly'
    mode: 'manual',
    
    // AI模式: 'policy' | 'mcts'
    aiMode: 'policy',
    
    // 游戏状态
    isConnected: false,
    isThinking: false,
    gameStarted: false,
    statusText: null, // 状态提示文本（如"思考中..."）
    
    // 历史记录
    moveHistory: [],
    
    // AI建议
    aiSuggestions: [], // [{x, y, score, color}]
    showSuggestions: false,
    
    // 实时数据
    evaluation: {
      blackScore: 0,
      whiteScore: 0,
      blackStones: 0,
      whiteStones: 0,
      territory: { black: 0, white: 0 }
    },
    
    // 错误信息
    error: null
  }),

  getters: {
    // 检查位置是否有棋子
    hasStone: (state) => (x, y) => {
      return state.board[x][y] !== 0
    },
    
    // 获取指定位置的棋子颜色
    getStone: (state) => (x, y) => {
      return state.board[x][y]
    }
  },

  actions: {
    /**
     * 初始化游戏
     */
    async initGame(mode = 'policy') {
      try {
        this.aiMode = mode
        await gtpClient.init(mode)
        await gtpClient.setBoardSize(19)
        await gtpClient.clearBoard()
        this.isConnected = true
        this.error = null
        
        // 刷新棋盘状态
        await this.updateBoard()
      } catch (error) {
        this.error = error.message
        console.error('初始化游戏失败:', error)
      }
    },

    /**
     * 更新棋盘状态
     */
    async updateBoard() {
      try {
        const response = await gtpClient.showboard()
        if (response.success && response.data) {
          // 解析showboard输出
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
      }
    },

    /**
     * 落子
     */
    async makeMove(x, y, color = null) {
      if (!this.isConnected) {
        this.error = '请先连接AI'
        console.error('未连接AI，无法落子')
        return false
      }
      
      if (this.isThinking) {
        console.warn('正在处理中，请稍候...')
        return false
      }
      
      if (this.board[x][y] !== 0) {
        this.error = '该位置已有棋子'
        return false
      }
      
      const moveColor = color || this.currentPlayer
      const colorChar = moveColor === 1 ? 'B' : 'W'
      
      // 将坐标转换为GTP格式 (如 F12)
      const position = this.coordToGTP(x, y)
      
      console.log(`发送GTP命令: play ${colorChar} ${position}`)
      
      let moveSucceeded = false
      try {
        this.isThinking = true
        this.error = null

        const response = await gtpClient.play(colorChar, position)

        console.log('GTP响应:', response)

        if (response.success) {
          moveSucceeded = true

          // 更新本地棋盘
          this.board[x][y] = moveColor

          // 记录历史
          this.moveHistory.push({ x, y, color: moveColor })

          // 切换玩家
          this.currentPlayer = -this.currentPlayer

          // 刷新棋盘
          await this.updateBoard()

          // 更新评估数据
          this.updateEvaluation()

          return true
        } else {
          this.error = response.error || '落子失败'
          console.error('落子失败:', response.error)
          return false
        }
      } catch (error) {
        this.error = error.message || '网络错误，请检查后端服务'
        console.error('落子异常:', error)
        return false
      } finally {
        this.isThinking = false

        // 如果本次落子成功且是人机对弈模式，则在思考结束后触发AI走子
        if (moveSucceeded && this.mode === 'vsAI') {
          // 延迟800ms确保isThinking已重置
          setTimeout(() => {
            if (!this.isThinking && this.isConnected && this.mode === 'vsAI') {
              console.log('[Game Store] 触发AI走子')
              this.genAIMove()
            }
          }, 800)
        }
      }
    },

    /**
     * AI生成走子（修复MCTS）
     */
    async genAIMove() {
      if (this.isThinking || !this.isConnected) {
        console.warn('[Game Store] genAIMove跳过: isThinking=', this.isThinking, 'isConnected=', this.isConnected)
        return
      }
      
      const colorChar = this.currentPlayer === 1 ? 'B' : 'W'
      const thinkingMode = this.aiMode === 'mcts' ? 'MCTS思考中（可能需要较长时间）...' : 'AI思考中...'
      
      try {
        this.isThinking = true
        this.statusText = thinkingMode
        this.error = null
        
        console.log(`[Game Store] 发送genmove命令: ${colorChar}, mode=${this.aiMode}`)
        const response = await gtpClient.genmove(colorChar)
        
        console.log(`[Game Store] genmove响应:`, response)
        
        if (response.success && response.data) {
          const position = response.data.trim().toUpperCase()
          
          if (position.toLowerCase() === 'pass') {
            console.log('[Game Store] AI选择pass')
            this.currentPlayer = -this.currentPlayer
          } else {
            // 解析位置
            const { x, y } = this.gtpToCoord(position)
            console.log(`[Game Store] AI走子位置: ${position} -> (${x}, ${y})`)
            
            // 验证坐标
            if (x < 0 || x >= 19 || y < 0 || y >= 19) {
              throw new Error(`AI返回了无效位置: ${position} -> (${x}, ${y})`)
            }
            
            // 立即更新本地棋盘（确保响应性）
            this.board[x][y] = this.currentPlayer
            
            // 刷新棋盘状态
            await this.updateBoard()
            
            // 记录历史
            this.moveHistory.push({ x, y, color: this.currentPlayer })
            
            // 切换玩家
            this.currentPlayer = -this.currentPlayer
            
            // 更新评估数据
            this.updateEvaluation()
          }
        } else {
          throw new Error(response.error || 'AI走子失败')
        }
      } catch (error) {
        this.error = error.message || 'AI走子失败'
        console.error('[Game Store] AI走子失败:', error)
      } finally {
        this.isThinking = false
        this.statusText = null
      }
    },

    /**
     * 清空棋盘
     */
    async clearBoard() {
      try {
        this.isThinking = true
        this.error = null
        
        await gtpClient.clearBoard()
        await gtpClient.setBoardSize(19)
        
        // 重置所有状态
        this.board = Array(19).fill(null).map(() => Array(19).fill(0))
        this.moveHistory = []
        this.currentPlayer = 1
        this.gameStarted = false
        this.aiSuggestions = []
        this.evaluation = {
          blackScore: 0,
          whiteScore: 0,
          blackStones: 0,
          whiteStones: 0,
          territory: { black: 0, white: 0 }
        }
        
        // 刷新棋盘
        await this.updateBoard()
        
        this.error = null
      } catch (error) {
        this.error = error.message || '清空棋盘失败'
        console.error('清空棋盘失败:', error)
      } finally {
        this.isThinking = false
      }
    },

    /**
     * 坐标转换为GTP格式
     * @param {number} x - 行 (0-18)
     * @param {number} y - 列 (0-18)
     * @returns {string} GTP位置，如 'F12'
     */
    coordToGTP(x, y) {
      const letters = 'ABCDEFGHJKLMNOPQRST'
      const row = 19 - x
      const col = letters[y]
      return `${col}${row}`
    },

    /**
     * GTP格式转换为坐标
     * @param {string} gtp - GTP位置，如 'F12'
     * @returns {{x: number, y: number}}
     */
    gtpToCoord(gtp) {
      const letters = 'ABCDEFGHJKLMNOPQRST'
      const col = gtp[0]
      const row = parseInt(gtp.slice(1))
      const x = 19 - row
      const y = letters.indexOf(col)
      return { x, y }
    },

    /**
     * 设置游戏模式
     */
    setMode(mode) {
      this.mode = mode
      this.gameStarted = mode !== 'manual'
    },

    /**
     * 切换AI模式
     */
    async switchAIMode(newMode) {
      const wasConnected = this.isConnected
      if (wasConnected) {
        await this.quit()
      }
      this.aiMode = newMode
      if (wasConnected) {
        await this.initGame(newMode)
      }
    },

    /**
     * 获取AI建议（前N个最佳走子）
     */
    async getAISuggestions(count = 5) {
      if (!this.isConnected) {
        this.aiSuggestions = []
        this.showSuggestions = false
        return []
      }
      
      try {
        const colorChar = this.currentPlayer === 1 ? 'B' : 'W'
        console.log(`[Game Store] 请求AI建议: color=${colorChar}, count=${count}`)
        const response = await gtpClient.getSuggestions(colorChar, count)
        
        console.log(`[Game Store] AI建议响应:`, response)
        
        if (response.success && response.data && Array.isArray(response.data)) {
          // 验证并格式化建议数据
          const validSuggestions = response.data
            .filter(s => s && typeof s === 'object' && 'x' in s && 'y' in s)
            .map(s => ({
              x: parseInt(s.x, 10),
              y: parseInt(s.y, 10),
              score: parseFloat(s.score || 0),
              color: parseInt(s.color || this.currentPlayer, 10)
            }))
            .filter(s => !isNaN(s.x) && !isNaN(s.y) && s.x >= 0 && s.x < 19 && s.y >= 0 && s.y < 19)
          
          console.log(`[Game Store] 有效建议数量: ${validSuggestions.length}`, validSuggestions)
          
          // 创建新数组确保Vue响应式更新
          this.aiSuggestions = [...validSuggestions]
          this.showSuggestions = validSuggestions.length > 0
          
          return validSuggestions
        } else {
          console.warn('[Game Store] AI建议响应无效:', response)
          this.aiSuggestions = []
          this.showSuggestions = false
          return []
        }
      } catch (error) {
        console.error('[Game Store] 获取AI建议失败:', error)
        this.aiSuggestions = []
        this.showSuggestions = false
        return []
      }
    },

    /**
     * 更新评估数据
     */
    updateEvaluation() {
      // 统计棋子数
      let blackStones = 0
      let whiteStones = 0
      
      for (let i = 0; i < 19; i++) {
        for (let j = 0; j < 19; j++) {
          if (this.board[i][j] === 1) blackStones++
          else if (this.board[i][j] === -1) whiteStones++
        }
      }
      
      this.evaluation = {
        blackScore: blackStones,
        whiteScore: whiteStones,
        blackStones,
        whiteStones,
        territory: { black: 0, white: 0 } // 需要更复杂的算法计算领地
      }
    },

    /**
     * 关闭游戏
     */
    async quit() {
      if (this.isConnected) {
        await gtpClient.quit()
      }
      this.isConnected = false
      this.gameStarted = false
      this.isThinking = false
    }
  }
})
          return []
        }
      } catch (error) {
        console.error('[Game Store] 获取AI建议失败:', error)
        this.aiSuggestions = []
        this.showSuggestions = false
        return []
      }
    },

    /**
     * 更新评估数据
     */
    updateEvaluation() {
      // 统计棋子数
      let blackStones = 0
      let whiteStones = 0
      
      for (let i = 0; i < 19; i++) {
        for (let j = 0; j < 19; j++) {
          if (this.board[i][j] === 1) blackStones++
          else if (this.board[i][j] === -1) whiteStones++
        }
      }
      
      this.evaluation = {
        blackScore: blackStones,
        whiteScore: whiteStones,
        blackStones,
        whiteStones,
        territory: { black: 0, white: 0 } // 需要更复杂的算法计算领地
      }
    },

    /**
     * 关闭游戏
     */
    async quit() {
      if (this.isConnected) {
        await gtpClient.quit()
      }
      this.isConnected = false
      this.gameStarted = false
      this.isThinking = false
    }
  }
})