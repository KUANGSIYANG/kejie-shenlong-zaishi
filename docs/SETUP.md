# 项目环境配置与运行指南

> 适用于本仓库 `WQ` 目录下的前后端（Flask 后端 + Vue 3 前端）。后端默认监听 `http://localhost:8000`，前端开发服务器默认在 `http://localhost:3000` 并通过 Vite 代理转发 `/api`。

## 1. 前置依赖
1) 必备：
   - Python 3.9+（建议 3.10/3.11）
   - Node.js 16+（含 npm）
   - git
2) Python 依赖（后端）：
   - Flask、flask-cors、torch、numpy（如有 `requirements.txt` 可直接 `pip install -r requirements.txt`）
3) 前端依赖：
   - npm 自动安装

## 2. 目录结构要点
- 后端：`WQ/server.py`（Flask GTP API，端口 8000）
- 前端：`WQ/front-ksy/`（Vue 3 + Vite，端口 3000，代理到 8000）
- 代理配置：`front-ksy/vite.config.js` 中 `server.proxy['/api'] -> http://localhost:8000`

## 3. 后端运行
```bash
cd WQ
# 可选：创建虚拟环境
python -m venv .venv
./.venv/Scripts/activate        # Windows
source .venv/bin/activate       # macOS/Linux

# 安装依赖（如无 requirements.txt，可手动安装）
pip install flask flask-cors torch numpy

# 启动后端（默认 8000）
python server.py
# 看到日志 “Starting GTP HTTP API server on http://localhost:8000” 即启动成功
```
健康检查：
```bash
curl http://localhost:8000/api/health
# 预期返回 {"status": "ok"}
```

## 4. 前端运行（开发模式）
```bash
cd WQ/front-ksy
npm install
npm run dev
# 终端会提示本地访问地址，默认 http://localhost:3000
```
> 前端已配置代理：所有以 `/api` 开头的请求会自动转发到 `http://localhost:8000`。

## 5. 连接与操作流程（避免 “GTP 会话未初始化”）
1) **先启动后端** `server.py`，确认 8000 端口正常。
2) 打开前端页面（默认 http://localhost:3000）。
3) 点击“连接AI”（或“连接 GTP”）按钮，前端会调用 `/api/gtp/init` 获取 `sessionId`。  
   - 若后端未启动或端口不符，会出现“GTP会话未初始化”。
4) 连接成功后即可：
   - 落子 / 生成 AI 推荐
   - 查看博弈论分析图表、影响区域等

## 6. 常见问题排查
- **GTP 会话未初始化**：
  - 确认 `server.py` 已启动且无报错；访问 `http://localhost:8000/api/health` 应返回 ok。
  - 确认前端代理端口一致（vite.config.js -> target 8000），前端访问地址是否为 3000。
  - 浏览器控制台 Network 面板检查 `/api/gtp/init` 是否 200，若 404/500 查看后端日志。
- **端口冲突**：
  - 后端改端口：`python server.py` 前设置 `PORT=xxxx`（若代码支持）或修改 `server.py` 的 `app.run(port=...)`，同时修改 `vite.config.js` 的 proxy target。
  - 前端改端口：`npm run dev -- --port 5173`（示例），保持代理指向后端端口。
- **依赖缺失**：按需安装 `pip install flask flask-cors torch numpy`；前端重新 `npm install`。
- **CORS/跨域**：后端已启用 `flask_cors.CORS`，前端走 `/api` 代理即可避免跨域。

## 7. 生产或局域网访问（可选）
- 后端开放：`app.run(host='0.0.0.0', port=8000)` 已允许局域网访问，需确保防火墙放行端口。
- 前端生产构建：`npm run build`，静态文件位于 `front-ksy/dist`，可用 Nginx/静态服务器部署，并将 `/api` 反向代理到后端服务。

## 8. 快速命令汇总
```bash
# 后端
cd WQ
python -m venv .venv && ./.venv/Scripts/activate
pip install flask flask-cors torch numpy
python server.py

# 前端
cd WQ/front-ksy
npm install
npm run dev
```

