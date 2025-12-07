/**
 * GTP协议客户端
 * 通过HTTP API与后端GTP服务通信
 */

class GTPClient {
  constructor(baseURL = '/api') {
    this.baseURL = baseURL
    this.sessionId = null
  }

  /**
   * 初始化GTP会话
   */
  async init(mode = 'policy') {
    try {
      const response = await fetch(`${this.baseURL}/gtp/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      })
      const data = await response.json()
      this.sessionId = data.sessionId
      return data
    } catch (error) {
      console.error('GTP初始化失败:', error)
      throw error
    }
  }

  /**
   * 发送GTP命令
   */
  async sendCommand(command) {
    if (!this.sessionId) {
      throw new Error('GTP会话未初始化')
    }

    try {
      const response = await fetch(`${this.baseURL}/gtp/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          command
        })
      })
      const data = await response.json()
      return data
    } catch (error) {
      console.error('GTP命令执行失败:', error)
      throw error
    }
  }

  /**
   * 清空棋盘
   */
  async clearBoard() {
    return this.sendCommand('clear_board')
  }

  /**
   * 设置棋盘大小
   */
  async setBoardSize(size = 19) {
    return this.sendCommand(`boardsize ${size}`)
  }

  /**
   * 落子
   * @param {string} color - 'B' 或 'W'
   * @param {string} position - 位置，如 'F12' 或 'pass'
   */
  async play(color, position) {
    const cmd = position === 'pass' ? `play ${color} pass` : `play ${color} ${position}`
    return this.sendCommand(cmd)
  }

  /**
   * 生成走子
   * @param {string} color - 'B' 或 'W'
   */
  async genmove(color) {
    return this.sendCommand(`genmove ${color}`)
  }

  /**
   * 显示棋盘
   */
  async showboard() {
    return this.sendCommand('showboard')
  }

  /**
   * 获取引擎名称
   */
  async getName() {
    return this.sendCommand('name')
  }

  /**
   * 获取引擎版本
   */
  async getVersion() {
    return this.sendCommand('version')
  }

  /**
   * 获取AI建议
   * @param {string} color - 'B' 或 'W'
   * @param {number} topN - 返回前N个建议
   */
  async getSuggestions(color = 'B', topN = 5) {
    if (!this.sessionId) {
      throw new Error('GTP会话未初始化')
    }

    try {
      const response = await fetch(`${this.baseURL}/gtp/suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          color,
          topN
        })
      })
      const data = await response.json()
      return data
    } catch (error) {
      console.error('获取AI建议失败:', error)
      throw error
    }
  }

  /**
   * 关闭会话
   */
  async quit() {
    if (this.sessionId) {
      try {
        await fetch(`${this.baseURL}/gtp/quit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: this.sessionId })
        })
      } catch (error) {
        console.error('关闭GTP会话失败:', error)
      }
      this.sessionId = null
    }
  }
}

export default new GTPClient()


