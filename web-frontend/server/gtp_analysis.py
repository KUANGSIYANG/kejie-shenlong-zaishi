"""
扩展GTP功能：支持获取AI分析和建议
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from genMove import getPolicyNetResult, toPosition
import torch
import numpy as np

def get_top_moves(go, willPlayColor, top_n=5):
    """
    获取前N个最佳走子建议
    返回: [(x, y, score), ...]
    """
    try:
        predict = getPolicyNetResult(go, willPlayColor)
        
        # 转换为概率分布
        probs = torch.softmax(predict, dim=0)
        
        # 获取前N个位置
        top_indices = torch.topk(probs, top_n + 1).indices  # +1因为可能包含pass
        
        suggestions = []
        for idx in top_indices:
            x, y = toPosition(idx)
            if (x, y) == (None, None):
                continue  # 跳过pass
            
            # 检查是否合法
            test_go = go.clone()
            if test_go.move(willPlayColor, x, y):
                score = probs[idx].item()
                suggestions.append({
                    'x': x,
                    'y': y,
                    'score': score,
                    'color': willPlayColor
                })
                
                if len(suggestions) >= top_n:
                    break
        
        return suggestions
    except Exception as e:
        print(f"Error getting suggestions: {e}", file=sys.stderr)
        return []

