# front-ksy - Go Board with AI Integration

基于 Sabaki 的 Vue3 围棋前端，现名 front-ksy，集成 AI 后端 API。

## 项目结构

```
front-ksy/
├── src/
│   ├── components/      # Vue 组件
│   │   ├── Goban.vue    # 棋盘组件（使用 @sabaki/shudan）
│   │   ├── MainMenu.vue # 主菜单
│   │   ├── MainView.vue # 主视图
│   │   ├── LeftSidebar.vue  # 左侧边栏（游戏树）
│   │   ├── RightSidebar.vue # 右侧边栏（统计和AI建议）
│   │   ├── GameStats.vue    # 游戏统计
│   │   └── AISuggestions.vue # AI建议列表
│   ├── stores/          # Pinia 状态管理
│   │   └── game.js      # 游戏状态
│   ├── services/        # API 服务
│   │   └── gtpClient.js # GTP 客户端
│   ├── App.vue          # 根组件
│   ├── main.js          # 入口文件
│   └── style.css        # 全局样式
├── package.json
├── vite.config.js
└── index.html
```

## 安装依赖

```bash
cd front-ksy
npm install
```

## 运行开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 构建生产版本

```bash
npm run build
```

## 功能特性

- ✅ 基于 Vue3 + Vite 的现代化前端
- ✅ 使用 @sabaki/shudan 渲染专业围棋棋盘
- ✅ 集成后端 GTP API（server.py，已替换 gtp_bridge.py）
- ✅ AI 建议显示
- ✅ 游戏统计和评估
- ✅ 支持策略网络和 MCTS 两种 AI 模式

## 后端要求

确保后端服务运行在 http://localhost:8000（使用项目根目录的 `server.py`）

## 注意事项

- 原 web-frontend 项目已弃用
- 新项目使用 Vue3 Composition API
- 保留了 Sabaki 的 UI 风格和核心功能





