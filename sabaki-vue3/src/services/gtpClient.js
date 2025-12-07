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
      console.error('GTP初始化失败：', error)
      throw error
    }
  }

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
      const data = await this._parseResponse(response)
      return data
    } catch (error) {
      console.error('GTP命令执行失败:', error)
      throw error
    }
  }

  async play(color, position) {
    const cmd = position === 'pass' ? `play ${color} pass` : `play ${color} ${position}`
    return this.sendCommand(cmd)
  }

  async genmove(color) {
    console.log(`[GTP Client] 发送genmove命令: ${color}`)
    try {
      const result = await this.sendCommand(`genmove ${color}`)
      console.log(`[GTP Client] genmove响应:`, result)
      return result
    } catch (error) {
      console.error(`[GTP Client] genmove失败:`, error)
      throw error
    }
  }

  async showboard() {
    return this.sendCommand('showboard')
  }

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
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }
      const data = await this._parseResponse(response)
      return data
    } catch (error) {
      console.error('[GTP Client] 获取AI建议失败:', error)
      throw error
    }
  }

  async getEvaluation(color = 'B') {
    if (!this.sessionId) {
      throw new Error('GTP会话未初始化')
    }
    try {
      const response = await fetch(`${this.baseURL}/gtp/eval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: this.sessionId, color })
      })
      const data = await this._parseResponse(response)
      return data
    } catch (error) {
      console.error('获取评估失败:', error)
      throw error
    }
  }

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
