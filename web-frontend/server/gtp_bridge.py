"""
GTP协议桥接服务器
将HTTP API请求转发给Python GTP进程
"""
import subprocess
import threading
import json
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os

app = Flask(__name__)
CORS(app)

# 存储GTP进程会话
sessions = {}
# 存储每个会话的Go对象状态（用于分析）
session_states = {}

# 存储每个会话的Go对象状态（用于分析）
session_states = {}

def get_gtp_process(mode='policy'):
    """启动GTP进程"""
    # 获取项目根目录
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(os.path.dirname(script_dir))
    script_path = os.path.join(project_root, 'gtp.py')
    
    if not os.path.exists(script_path):
        raise FileNotFoundError(f'GTP脚本不存在: {script_path}')
    
    cmd = ['python', script_path]
    if mode == 'mcts':
        cmd.append('MCTS')
    
    # 设置工作目录为项目根目录
    process = subprocess.Popen(
        cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
        cwd=project_root
    )
    
    # 等待GTP ready信号（从stderr读取）
    import time
    time.sleep(0.5)  # 给进程启动时间
    
    return process

# 导入分析模块
try:
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from gtp_analysis import get_top_moves
    from go import Go
    ANALYSIS_AVAILABLE = True
except ImportError:
    ANALYSIS_AVAILABLE = False
    print("Warning: Analysis module not available", file=sys.stderr)

@app.route('/api/gtp/init', methods=['POST'])
def init_gtp():
    """初始化GTP会话"""
    data = request.json
    mode = data.get('mode', 'policy')
    
    session_id = str(uuid.uuid4())
    process = get_gtp_process(mode)
    
    # 初始化Go对象状态
    try:
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from go import Go
        session_states[session_id] = Go()
    except ImportError:
        session_states[session_id] = None
    
    sessions[session_id] = {
        'process': process,
        'mode': mode
    }
    
    return jsonify({
        'success': True,
        'sessionId': session_id
    })

@app.route('/api/gtp/suggestions', methods=['POST'])
def get_suggestions():
    """获取AI建议"""
    if not ANALYSIS_AVAILABLE:
        return jsonify({
            'success': False,
            'error': 'Analysis module not available'
        }), 500
    
    data = request.json
    session_id = data.get('sessionId')
    color = data.get('color', 'B')  # 'B' or 'W'
    top_n = data.get('topN', 5)
    
    if session_id not in sessions:
        return jsonify({
            'success': False,
            'error': 'Session not found'
        }), 400
    
    try:
        # 获取当前棋盘状态
        session = sessions[session_id]
        process = session['process']
        
        # 发送showboard获取当前状态
        process.stdin.write('showboard\n')
        process.stdin.flush()
        
        # 读取棋盘数据
        response_line = process.stdout.readline()  # "= ..."
        lines = []
        for i in range(19):
            line = process.stdout.readline().strip()
            if line and len(line) >= 19:
                lines.append(line[:19])
        
        # 重建Go对象
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from go import Go
        go = Go()
        for i, line in enumerate(lines):
            for j, char in enumerate(line):
                if char == 'X':
                    go.board[i][j] = 1
                elif char == 'O':
                    go.board[i][j] = -1
        
        # 更新会话状态
        session_states[session_id] = go
        
        # 获取建议
        willPlayColor = 1 if color == 'B' else -1
        suggestions = get_top_moves(go, willPlayColor, top_n)
        
        return jsonify({
            'success': True,
            'data': suggestions
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/gtp/command', methods=['POST'])
def send_command():
    """发送GTP命令"""
    data = request.json
    session_id = data.get('sessionId')
    command = data.get('command')
    
    if session_id not in sessions:
        return jsonify({
            'success': False,
            'error': 'Session not found'
        }), 400
    
    session = sessions[session_id]
    process = session['process']
    
    try:
        # 发送命令
        process.stdin.write(command + '\n')
        process.stdin.flush()
        
        # 读取响应
        # gtp.py输出格式: "= response" 后跟换行
        # 注意genmove和showboard会在"="后直接输出结果，然后换行
        response_line = process.stdout.readline()
        
        # 处理可能的空行
        while response_line and not response_line.strip():
            response_line = process.stdout.readline()
        
        if not response_line:
            return jsonify({
                'success': False,
                'error': 'No response from GTP'
            }), 500
        
        if response_line.startswith('='):
            # 成功响应
            # gtp.py输出格式: "= " + 结果
            response_data = response_line[2:].strip() if len(response_line) > 2 else ''
            
            # genmove命令：gtp.py打印 "= "，然后genMove函数直接print位置在下一行
            if command.startswith('genmove'):
                # genmove输出格式：
                # = \n
                # F12\n
                # 所以需要读取下一行获取实际位置
                if not response_data:
                    actual_move = process.stdout.readline().strip()
                    response_data = actual_move if actual_move else ''
                return jsonify({
                    'success': True,
                    'data': response_data
                })
            
            # showboard命令：gtp.py输出 "= " + 第一行棋盘数据（19个字符），然后换行继续输出剩余18行
            elif command == 'showboard' or command.startswith('showboard'):
                lines = []
                # 第一行棋盘数据在 "= " 后面（response_data已经去掉了 "= " 前缀）
                if response_data and len(response_data) >= 19:
                    # 第一行在 "= " 后面，取前19个字符
                    lines.append(response_data[:19])
                elif not response_data:
                    # 如果response_data为空，第一行在下一行
                    first_line = process.stdout.readline().strip()
                    if first_line and len(first_line) >= 19:
                        lines.append(first_line[:19])
                
                # 读取剩余18行棋盘数据
                for i in range(18):
                    line = process.stdout.readline().strip()
                    if line and len(line) >= 19:
                        lines.append(line[:19])
                    elif not line:
                        break
                
                # 确保有19行数据
                while len(lines) < 19:
                    lines.append('.' * 19)
                
                response_data = '\n'.join(lines[:19])
                return jsonify({
                    'success': True,
                    'data': response_data
                })
            
            # 其他命令："=" 后直接是结果
            else:
                # 如果当前行没有数据，尝试读取下一行
                if not response_data:
                    response_data = process.stdout.readline().strip()
                return jsonify({
                    'success': True,
                    'data': response_data
                })
        elif response_line.startswith('?'):
            # 错误响应
            error_msg = response_line[2:].strip() if len(response_line) > 2 else 'Unknown error'
            return jsonify({
                'success': False,
                'error': error_msg
            }), 400
        else:
            # 非标准格式，可能是showboard的第一行数据（19个点）
            # 检查是否是棋盘数据格式（19个字符，只包含X、O、.）
            response_str = response_line.strip()
            if len(response_str) == 19 and all(c in 'XO.' for c in response_str):
                # 这是showboard的第一行数据，需要特殊处理
                lines = [response_str]
                # 读取剩余18行
                for i in range(18):
                    line = process.stdout.readline().strip()
                    if line and len(line) >= 19:
                        lines.append(line[:19])
                    elif not line:
                        break
                return jsonify({
                    'success': True,
                    'data': '\n'.join(lines)
                })
            
            # 真正的错误
            return jsonify({
                'success': False,
                'error': f'Invalid GTP response: {response_line.strip()[:50]}'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/gtp/quit', methods=['POST'])
def quit_gtp():
    """关闭GTP会话"""
    data = request.json
    session_id = data.get('sessionId')
    
    if session_id not in sessions:
        return jsonify({
            'success': False,
            'error': 'Session not found'
        }), 400
    
    session = sessions[session_id]
    process = session['process']
    
    try:
        # 发送quit命令
        process.stdin.write('quit\n')
        process.stdin.flush()
        
        # 等待进程结束
        process.wait(timeout=5)
        
        # 移除会话
        del sessions[session_id]
        if session_id in session_states:
            del session_states[session_id]
        
        return jsonify({
            'success': True
        })
    except Exception as e:
        # 强制终止
        process.terminate()
        try:
            process.wait(timeout=2)
        except:
            process.kill()
        
        if session_id in sessions:
            del sessions[session_id]
        if session_id in session_states:
            del session_states[session_id]
        
        return jsonify({
            'success': True
        })

@app.route('/api/health', methods=['GET'])
def health():
    """健康检查"""
    return jsonify({
        'status': 'ok',
        'active_sessions': len(sessions)
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=True)

