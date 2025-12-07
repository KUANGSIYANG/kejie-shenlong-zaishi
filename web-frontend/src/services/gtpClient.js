/**
 * GTP协议客户端
 * 通过HTTP API与后端GTP服务通信
 */

class GTPClient {
  constructor(baseURL = '/api') {
    this.baseURL = baseURL
    this.sessionId = null
  }

  async _parseResponse(response) {
    let data = null
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      try {
        data = await response.json()
      } catch (err) {
        const txt = await response.text()
        console.error('无法解析JSON响应，返回文本：', txt)
        data = { success: false, error: txt || 'Invalid JSON response' }
      }
    } else {
      const txt = await response.text()
      if (!txt) {
        data = { success: false, error: 'Empty response from server' }
      } else {
        try {
          data = JSON.parse(txt)
        } catch (err) {
          console.error('非JSON响应文本：', txt)
          data = { success: false, error: txt }
        }
      }
    }
    return data
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
      const data = await this._parseResponse(response)
      if (data && data.sessionId) this.sessionId = data.sessionId
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
      // 尝试解析 JSON；若响应为空或不是 JSON，则回退为读取文本并包装为错误对象
      let data = null
      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        try {
          data = await response.json()
        } catch (err) {
          // JSON 解析失败，读取文本以便诊断
          const txt = await response.text()
          console.error('无法解析JSON响应，返回文本：', txt)
          data = { success: false, error: txt || 'Invalid JSON response' }
        }
      } else {
        // 非 JSON 响应（可能为空），读取文本并构造错误信息
        const txt = await response.text()
        if (!txt) {
          data = { success: false, error: 'Empty response from server' }
        } else {
          try {
            // 某些后端返回 JSON 但未设置 content-type，尝试解析
            data = JSON.parse(txt)
          } catch (err) {
            console.error('非JSON响应文本：', txt)
            data = { success: false, error: txt }
          }
        }
      }
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
      const data = await this._parseResponse(response)
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
        const response = await fetch(`${this.baseURL}/gtp/quit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: this.sessionId })
        })
        await this._parseResponse(response)
      } catch (error) {
        console.error('关闭GTP会话失败:', error)
      }
      this.sessionId = null
    }
  }
}

export default new GTPClient()


