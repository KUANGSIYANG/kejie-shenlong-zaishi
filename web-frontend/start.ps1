# PowerShell启动脚本
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "启动围棋AI Web前端服务" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/2] 启动后端服务..." -ForegroundColor Yellow
$backendJob = Start-Process -FilePath "python" -ArgumentList "server\gtp_bridge.py" -WorkingDirectory $PSScriptRoot -PassThru -WindowStyle Normal

Start-Sleep -Seconds 2

Write-Host "[2/2] 启动前端开发服务器..." -ForegroundColor Yellow
$frontendJob = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory $PSScriptRoot -PassThru -WindowStyle Normal

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "服务启动完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "前端地址: http://localhost:3000" -ForegroundColor Cyan
Write-Host "后端地址: http://localhost:8000" -ForegroundColor Cyan
Write-Host ""
Write-Host "服务正在运行，关闭窗口将停止服务" -ForegroundColor Yellow
Write-Host "按 Ctrl+C 停止服务" -ForegroundColor Yellow

# 等待用户中断
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host ""
    Write-Host "正在停止服务..." -ForegroundColor Yellow
    Stop-Process -Id $backendJob.Id -ErrorAction SilentlyContinue
    Stop-Process -Id $frontendJob.Id -ErrorAction SilentlyContinue
    Write-Host "服务已停止" -ForegroundColor Green
}


