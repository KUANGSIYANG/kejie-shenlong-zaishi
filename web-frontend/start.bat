@echo off
echo ========================================
echo 启动围棋AI Web前端服务
echo ========================================
echo.

echo [1/2] 启动后端服务...
start "GTP Bridge Server" cmd /k "cd server && python gtp_bridge.py"
timeout /t 2 /nobreak >nul

echo [2/2] 启动前端开发服务器...
cd ..
cd web-frontend
start "Vite Dev Server" cmd /k "npm run dev"

echo.
echo ========================================
echo 服务启动完成！
echo ========================================
echo 前端地址: http://localhost:3000
echo 后端地址: http://localhost:8000
echo.
echo 按任意键关闭此窗口（服务将继续运行）...
pause >nul


