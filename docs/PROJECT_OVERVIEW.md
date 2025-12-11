# 项目全景说明（端到端详解）

本文汇总本项目的目标、架构、核心算法、前后端协同、数据与训练、运行方式及目录索引，便于快速理解与落地。

---

## 1. 项目目标与特性
- 面向围棋对弈与分析：提供可交互的前端界面、后端 GTP/HTTP API、AI 对弈与建议。
- 核心能力：策略/价值/快速策略三类神经网络 + MCTS 搜索，支持胜率评估、落子推荐、快速模拟。
- 体验侧重：低延迟（前端 Vite 开发服务器 + 轻量 PlayoutNet）、可视化（胜率曲线/热力）、易启动（批处理脚本）。

---

## 2. 整体架构
- **前端（WQ/front-ksy）**：Vue 3 + Vite，Sabaki 棋盘组件，ECharts 可视化，Pinia 状态管理，端口 3000，代理 `/api` → 8000。
- **后端（WQ/server.py）**：Flask + Flask-Cors，提供 REST/GTP HTTP 接口，端口 8000。
- **AI 核心**：`go.py` 规则引擎 + `features.py` 特征 + `net.py` 三类网络 + `genMove.py` MCTS/推理。
- **训练与数据**：`filter.py`/`prepareData.py` 数据预处理；`train.py`/`train_all.py` 训练；模型权重 `policyNet.pt`、`valueNet.pt`、`playoutNet.pt`。
- **脚本**：`配置环境.bat`（安装依赖）与 `启动.bat`（启动前后端）。

---

## 3. 核心算法（摘要）
- **特征**：15 通道棋盘张量（空/本方/对方、气数 1-8、最近 3 步、常数平面）。
- **网络**：
  - PolicyNet：多层卷积 + BatchNorm，输出 362 维落子概率（含 pass），为 MCTS 提供先验。
  - PlayoutNet：轻量卷积 + 全连接，加速 MCTS roll-out。
  - ValueNet：卷积 + 全连接 + Sigmoid，输出局面胜率。
- **搜索（MCTS）**：PUCT/UCB 选择；扩展用策略先验；模拟可用 PlayoutNet；回溯更新访问次数与价值；兼顾探索/利用。
- **训练**：策略用交叉熵，价值用 MSE；优化器 SGD/Adam；StepLR 调度（策略每 15 epoch 衰减，价值每 2 epoch 衰减）；数据来自 SGF 棋谱（`policyData.pt` / `valueData.pt`）。

---

## 4. 前后端交互流程
1) 前端提交当前棋盘到 `/api`。  
2) 后端用 PolicyNet 生成先验，MCTS 结合 ValueNet/PlayoutNet 进行搜索与评估。  
3) 返回推荐落子、胜率、候选列表；前端渲染棋盘、胜率曲线、热力/建议。  
4) 用户落子或 AI 落子后更新棋谱，继续循环。

---

## 5. 主要功能点
- AI 对弈 / 人机对弈 / 建议模式
- 胜率与形势评估（ValueNet + MCTS）
- 落子热力与推荐（Policy/MCTS 访问分布）
- 棋谱导入导出（SGF），历史步回溯
- 健康检查与会话管理（后端 API）

---

## 6. 运行与启动
- **依赖**：Python 3.9+（建议 3.10/3.11）、Node.js 16+（建议 18+）、pip/npm。
- **配置环境**：运行 `配置环境.bat`（创建 venv，安装后端依赖；`front-ksy` npm install）。
- **启动**：运行 `启动.bat`（后端 8000 + 前端 3000，并自动打开浏览器）。
- **开发模式**：前端 `npm run dev`（3000，代理 `/api`）；后端 `python server.py`（8000）。

---

## 7. 数据与训练流水线
- **过滤**：`filter.py` 选取合规 SGF（无让子、时间过滤）生成列表。  
- **生成**：`prepareData.py` 生成策略/价值训练样本（`policyData.pt`、`valueData.pt`）。  
- **训练**：`train.py`（策略/价值）或 `train_all.py`（全流程）。  
- **权重**：`policyNet.pt`、`valueNet.pt`、`playoutNet.pt`。  
- **推理**：`genMove.py` / `server.py` 调用训练好的权重。

---

## 8. 目录与文件速览
- 前端：`front-ksy/`（Vue 3 + Vite，Sabaki 棋盘组件，ECharts）
- 后端与核心：`server.py`、`gtp.py`、`genMove.py`、`go.py`、`features.py`、`net.py`
- 数据/训练：`filter.py`、`prepareData.py`、`train.py`、`train_all.py`、`games/`（SGF 数据）
- 模型：`policyNet.pt`、`valueNet.pt`、`playoutNet.pt`
- 脚本：`配置环境.bat`、`启动.bat`
- 文档：`docs/ARCHITECTURE.md`（架构）、`docs/TECH_STACK.md`（技术栈）、`docs/NN_AND_MCTS.md`（网络+MCTS）、`docs/GO_AND_GAME_THEORY.md`（博弈论视角）

---

## 9. 代码索引（关键逻辑）
- 规则与特征：`go.py`、`features.py`
- 网络结构：`net.py`（PolicyNet / PlayoutNet / ValueNet）
- 搜索与落子：`genMove.py`（MCTS + 推理）、`gtp.py`
- 训练：`train.py`、`train_all.py`
- 服务层：`server.py`（Flask API）
- 前端 UI：`front-ksy/src`（Vue 组件、Pinia store、ECharts）

---

## 10. 如何验证
- 前端：启动后访问 `http://localhost:3000`，查看棋盘、胜率曲线、推荐落子。  
- 后端：健康检查 `http://localhost:8000/api/health`；对弈/建议接口通过前端“连接 AI”按钮触发。  
- 快速自测：在前端落子，观察后端控制台与前端胜率/热力响应是否正常。

