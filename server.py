"""
GTP HTTP API 服务器
提供 HTTP API 接口供前端调用
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import threading
import uuid
import sys
import os

# 添加当前目录到路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from go import Go
from genMove import getPolicyNetResult, toPosition, getValueResult
import torch
import numpy as np

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 存储每个会话的游戏状态
sessions = {}

class GTPSession:
    def __init__(self, mode='policy'):
        self.go = Go()
        self.mode = mode
        self.session_id = str(uuid.uuid4())
    
    def clear_board(self):
        self.go = Go()
        return True
    
    def play(self, color, position):
        """落子: color='B' or 'W', position='F12' or 'pass'"""
        if position == 'pass':
            return True
        
        # 转换坐标
        y_char, x_str = position[0], position[1:]
        x = 19 - int(x_str)
        
        # 字母转索引
        letters = 'ABCDEFGHJKLMNOPQRST'
        y = letters.index(y_char)
        
        # 颜色转换
        color_map = {'B': 1, 'W': -1}
        color_int = color_map[color]
        
        if self.go.move(color_int, x, y):
            return True
        else:
            return False
    
    def genmove(self, color):
        """生成AI走子"""
        color_map = {'B': 1, 'W': -1}
        will_play_color = color_map[color]
        
        if self.mode == 'mcts':
            # MCTS模式
            from genMove import genMoveMCTS, toStrPosition
            # genMoveMCTS 会直接修改 go 对象并返回 (x, y)
            x, y = genMoveMCTS(self.go, will_play_color)
            if (x, y) == (None, None):
                return 'pass'
            return toStrPosition(x, y)
        else:
            # Policy网络模式
            predict = getPolicyNetResult(self.go, will_play_color)
            probs = torch.softmax(predict, dim=0)
            idx = torch.argmax(probs).item()
            x, y = toPosition(idx)
        
        if (x, y) == (None, None):
            return 'pass'
        
        if self.go.move(will_play_color, x, y):
            letters = 'ABCDEFGHJKLMNOPQRST'
            row = 19 - x
            col = letters[y]
            return f"{col}{row}"
        else:
            return 'pass'
    
    def showboard(self):
        """显示棋盘状态"""
        board_str = []
        for i in range(19):
            row = []
            for j in range(19):
                if self.go.board[i][j] == 1:
                    row.append('X')
                elif self.go.board[i][j] == -1:
                    row.append('O')
                else:
                    row.append('.')
            board_str.append(''.join(row))
        return '\n'.join(board_str)
    
    def get_suggestions(self, color, top_n=5):
        """获取AI建议"""
        color_map = {'B': 1, 'W': -1}
        will_play_color = color_map[color]
        
        try:
            predict = getPolicyNetResult(self.go, will_play_color)
            probs = torch.softmax(predict, dim=0)
            
            # 获取前N个位置
            top_indices = torch.topk(probs, min(top_n + 10, len(probs))).indices
            
            suggestions = []
            for idx in top_indices:
                x, y = toPosition(idx)
                if (x, y) == (None, None):
                    continue
                
                # 检查是否合法
                test_go = self.go.clone()
                if test_go.move(will_play_color, x, y):
                    score = probs[idx].item()
                    suggestions.append({
                        'x': int(x),
                        'y': int(y),
                        'score': float(score),
                        'color': will_play_color
                    })
                    
                    if len(suggestions) >= top_n:
                        break
            
            return suggestions
        except Exception as e:
            print(f"Error getting suggestions: {e}", file=sys.stderr)
            return []
    
    def get_evaluation(self, color):
        """获取评估"""
        color_map = {'B': 1, 'W': -1}
        will_play_color = color_map[color]
        
        try:
            black_stones = int(np.sum(self.go.board == 1))
            white_stones = int(np.sum(self.go.board == -1))
            
            value = getValueResult(self.go, will_play_color)
            
            # 简单的胜率估算
            total_stones = black_stones + white_stones
            if total_stones == 0:
                winrate = 0.5
            else:
                stone_diff = value
                winrate = 0.5 + (stone_diff / 200.0)
                winrate = max(0.0, min(1.0, winrate))
            
            return {
                'winrate': float(winrate),
                'blackStones': black_stones,
                'whiteStones': white_stones,
                'blackScore': float(black_stones),
                'whiteScore': float(white_stones),
                'value': float(value)
            }
        except Exception as e:
            print(f"Error getting evaluation: {e}", file=sys.stderr)
            return {
                'winrate': 0.5,
                'blackStones': 0,
                'whiteStones': 0,
                'blackScore': 0.0,
                'whiteScore': 0.0,
                'value': 0.0
            }

@app.route('/api/gtp/init', methods=['POST'])
def init_gtp():
    """初始化GTP会话"""
    try:
        data = request.json
        mode = data.get('mode', 'policy')
        
        session = GTPSession(mode=mode)
        sessions[session.session_id] = session
        
        return jsonify({
            'success': True,
            'sessionId': session.session_id
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/gtp/command', methods=['POST'])
def gtp_command():
    """执行GTP命令"""
    try:
        data = request.json
        session_id = data.get('sessionId')
        command = data.get('command', '').strip()
        
        if not session_id or session_id not in sessions:
            return jsonify({
                'success': False,
                'error': 'Invalid session ID'
            }), 400
        
        session = sessions[session_id]
        
        if command == 'clear_board':
            session.clear_board()
            return jsonify({'success': True, 'data': ''})
        elif command.startswith('play '):
            parts = command.split()
            if len(parts) >= 3:
                color = parts[1]
                position = parts[2]
                if session.play(color, position):
                    return jsonify({'success': True, 'data': ''})
                else:
                    return jsonify({'success': False, 'error': 'Illegal move'})
        elif command.startswith('genmove '):
            color = command.split()[1]
            result = session.genmove(color)
            return jsonify({'success': True, 'data': result})
        elif command == 'showboard':
            board = session.showboard()
            return jsonify({'success': True, 'data': board})
        else:
            return jsonify({'success': False, 'error': f'Unknown command: {command}'})
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/gtp/suggestions', methods=['POST'])
def get_suggestions():
    """获取AI建议"""
    try:
        data = request.json
        session_id = data.get('sessionId')
        color = data.get('color', 'B')
        top_n = data.get('topN', 5)
        
        if not session_id or session_id not in sessions:
            return jsonify({
                'success': False,
                'error': 'Invalid session ID'
            }), 400
        
        session = sessions[session_id]
        suggestions = session.get_suggestions(color, top_n)
        
        return jsonify({
            'success': True,
            'data': suggestions
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/gtp/eval', methods=['POST'])
def get_evaluation():
    """获取评估"""
    try:
        data = request.json
        session_id = data.get('sessionId')
        color = data.get('color', 'B')
        
        if not session_id or session_id not in sessions:
            return jsonify({
                'success': False,
                'error': 'Invalid session ID'
            }), 400
        
        session = sessions[session_id]
        evaluation = session.get_evaluation(color)
        
        return jsonify({
            'success': True,
            'data': evaluation
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/gtp/quit', methods=['POST'])
def quit_gtp():
    """关闭会话"""
    try:
        data = request.json
        session_id = data.get('sessionId')
        
        if session_id and session_id in sessions:
            del sessions[session_id]
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
def health():
    """健康检查"""
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    print('Starting GTP HTTP API server on http://localhost:8000')
    app.run(host='0.0.0.0', port=8000, debug=True)

