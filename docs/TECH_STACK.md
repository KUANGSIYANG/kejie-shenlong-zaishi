# 技术栈与算法说明（前端 / 后端 / 训练推理）

## 前端（WQ/front-ksy，Vue 3 + Vite）
- **框架与状态管理**：Vue 3 组合式 API；Pinia 作为轻量全局状态（对弈状态、棋谱、AI 连接状态）。
- **构建与开发**：Vite + @vitejs/plugin-vue，原生 ESM，冷启动快；开发端口 3000，代理 `/api` 到后端 8000。
- **围棋/棋谱组件**：@sabaki/go-board、@sabaki/shudan 提供棋盘渲染与交互；@sabaki/sgf、@sabaki/immutable-gametree 负责 SGF 解析与棋谱树维护。
- **可视化**：ECharts 5 绘制胜率曲线、形势判断、落子热力等。
- **辅助工具**：classnames（样式拼接）。
- **运行环境**：Node.js 16+（建议 18+），npm。

## 后端（Python + Flask）
- **Web 服务**：Flask + Flask-Cors 暴露 REST/GTP HTTP API（默认 8000），供前端调用。
- **深度学习/数值**：PyTorch（模型训练与推理）、numpy（张量/数组计算）。
- **棋谱解析**：sgfmill 读取与操作 SGF 数据。
- **常用依赖（节选自 requirements）**：pandas/scipy/scikit-learn（数据处理与评估）、httpx/aiohttp（HTTP/异步请求）、pydantic/orjson（数据校验与高速序列化）、matplotlib（可视化）。
- **运行环境**：Python 3.9+（建议 3.10/3.11），venv/virtualenv。

## 核心算法与模型
- **规则引擎**：`Go` 类实现落子、提子、打劫检测、气的计算，确保所有搜索/网络输入遵守规则。
- **特征提取**：15 通道棋盘张量（空/本方/对方、气数 1-8、最近 3 步 one-hot、常数平面），为策略/价值网络提供状态表征。
- **神经网络**
  - **策略网络（PolicyNet）**：多层卷积 + BatchNorm，输出 362 维概率（19×19 + pass），为 MCTS 提供先验分布。
  - **快速策略网络（PlayoutNet）**：轻量卷积 + 全连接，牺牲精度换取速度，用于 MCTS 模拟阶段快速 roll-out。
  - **价值网络（ValueNet）**：卷积 + 全连接 + Sigmoid，直接评估当前局面的胜率（0-1）。
- **搜索**：蒙特卡洛树搜索（MCTS）
  - 使用策略先验（PolicyNet 输出）指导扩展；UCB/PUCT 选择子节点。
  - 模拟阶段可用 PlayoutNet 进行快速走子；回溯阶段更新访问次数与价值。
  - 兼顾探索与利用，使 AI 在中后盘仍能搜索出高质量落子。
- **训练流程**
  - 数据：从 SGF 棋谱提取特征/标签；`policyData.pt`（落子分布），`valueData.pt`（对局结果）。
  - 损失：策略网络用交叉熵；价值网络用 MSE。
  - 优化：SGD/Adam；学习率调度 StepLR（策略每 15 epoch 衰减，价值每 2 epoch 衰减）。
- **推理与服务**
  - `genMove.py`：提供策略直出（快）与 MCTS 搜索（强）两种生成模式。
  - `gtp.py`：实现 GTP 协议接口，方便与前端/外部围棋客户端对接。
  - `server.py`：封装 HTTP API（健康检查、初始化会话、落子、建议）。

## 数据与预处理
- **筛选**：`filter.py` 过滤 SGF（无让子、日期过滤等），生成有效棋谱列表。
- **生成**：`prepareData.py` 将棋谱转换为策略/价值训练样本，保存为 `policyData.pt`、`valueData.pt`。

## 启动与运维
- **配置环境脚本**：`配置环境.bat` 创建/激活 venv，安装后端依赖与前端 npm 依赖（首选脚本）。
- **启动脚本**：`启动.bat` 启动 Flask 后端（8000）与 Vue 前端（3000），并自动打开浏览器。
- **联调**：Vite 代理 `/api` → 8000，解决跨域并统一接口路径。

## 目录与模型文件
- 训练/推理核心：`train.py`、`train_all.py`、`genMove.py`、`go.py`、`net.py`
- 模型权重：`policyNet.pt`、`valueNet.pt`、`playoutNet.pt`
- 前端：`front-ksy/`（Vue 3 + Vite）
- 文档：`docs/`（架构、训练指南、使用指南、技术栈说明等）

