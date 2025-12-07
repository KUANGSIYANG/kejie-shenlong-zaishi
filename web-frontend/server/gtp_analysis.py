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

def get_evaluation(go, willPlayColor):
    """
    获取当前局面的评估（胜率、子力数等）
    返回: {winrate, blackStones, whiteStones, territory}
    """
    try:
        from genMove import getValueResult
        
        # 计算子力数
        blackStones = np.sum(go.board == 1)
        whiteStones = np.sum(go.board == -1)
        
        # 计算评估值（子力差）
        value = getValueResult(go, willPlayColor)
        
        # 简单的胜率估算（基于子力差）
        # 这里可以后续改进为使用valueNet
        totalStones = blackStones + whiteStones
        if totalStones == 0:
            winrate = 0.5
        else:
            # 基于子力差的简单估算
            stoneDiff = value
            # 归一化到0-1范围（假设最大差值为100）
            winrate = 0.5 + (stoneDiff / 200.0)
            winrate = max(0.0, min(1.0, winrate))
        
        return {
            'winrate': winrate,
            'blackStones': int(blackStones),
            'whiteStones': int(whiteStones),
            'territory': {
                'black': 0,  # 需要更复杂的算法计算领地
                'white': 0
            },
            'value': float(value)
        }
    except Exception as e:
        print(f"Error getting evaluation: {e}", file=sys.stderr)
        return {
            'winrate': 0.5,
            'blackStones': 0,
            'whiteStones': 0,
            'territory': {'black': 0, 'white': 0},
            'value': 0.0
        }


    """
    获取当前局面的评估（胜率、子力数等）
    返回: {winrate, blackStones, whiteStones, territory}
    """
    try:
        from genMove import getValueResult
        
        # 计算子力数
        blackStones = np.sum(go.board == 1)
        whiteStones = np.sum(go.board == -1)
        
        # 计算评估值（子力差）
        value = getValueResult(go, willPlayColor)
        
        # 简单的胜率估算（基于子力差）
        # 这里可以后续改进为使用valueNet
        totalStones = blackStones + whiteStones
        if totalStones == 0:
            winrate = 0.5
        else:
            # 基于子力差的简单估算
            stoneDiff = value
            # 归一化到0-1范围（假设最大差值为100）
            winrate = 0.5 + (stoneDiff / 200.0)
            winrate = max(0.0, min(1.0, winrate))
        
        return {
            'winrate': winrate,
            'blackStones': int(blackStones),
            'whiteStones': int(whiteStones),
            'territory': {
                'black': 0,  # 需要更复杂的算法计算领地
                'white': 0
            },
            'value': float(value)
        }
    except Exception as e:
        print(f"Error getting evaluation: {e}", file=sys.stderr)
        return {
            'winrate': 0.5,
            'blackStones': 0,
            'whiteStones': 0,
            'territory': {'black': 0, 'white': 0},
            'value': 0.0
        }


    """
    获取当前局面的评估（胜率、子力数等）
    返回: {winrate, blackStones, whiteStones, territory}
    """
    try:
        from genMove import getValueResult
        
        # 计算子力数
        blackStones = np.sum(go.board == 1)
        whiteStones = np.sum(go.board == -1)
        
        # 计算评估值（子力差）
        value = getValueResult(go, willPlayColor)
        
        # 简单的胜率估算（基于子力差）
        # 这里可以后续改进为使用valueNet
        totalStones = blackStones + whiteStones
        if totalStones == 0:
            winrate = 0.5
        else:
            # 基于子力差的简单估算
            stoneDiff = value
            # 归一化到0-1范围（假设最大差值为100）
            winrate = 0.5 + (stoneDiff / 200.0)
            winrate = max(0.0, min(1.0, winrate))
        
        return {
            'winrate': winrate,
            'blackStones': int(blackStones),
            'whiteStones': int(whiteStones),
            'territory': {
                'black': 0,  # 需要更复杂的算法计算领地
                'white': 0
            },
            'value': float(value)
        }
    except Exception as e:
        print(f"Error getting evaluation: {e}", file=sys.stderr)
        return {
            'winrate': 0.5,
            'blackStones': 0,
            'whiteStones': 0,
            'territory': {'black': 0, 'white': 0},
            'value': 0.0
        }


    """
    获取当前局面的评估（胜率、子力数等）
    返回: {winrate, blackStones, whiteStones, territory}
    """
    try:
        from genMove import getValueResult
        
        # 计算子力数
        blackStones = np.sum(go.board == 1)
        whiteStones = np.sum(go.board == -1)
        
        # 计算评估值（子力差）
        value = getValueResult(go, willPlayColor)
        
        # 简单的胜率估算（基于子力差）
        # 这里可以后续改进为使用valueNet
        totalStones = blackStones + whiteStones
        if totalStones == 0:
            winrate = 0.5
        else:
            # 基于子力差的简单估算
            stoneDiff = value
            # 归一化到0-1范围（假设最大差值为100）
            winrate = 0.5 + (stoneDiff / 200.0)
            winrate = max(0.0, min(1.0, winrate))
        
        return {
            'winrate': winrate,
            'blackStones': int(blackStones),
            'whiteStones': int(whiteStones),
            'territory': {
                'black': 0,  # 需要更复杂的算法计算领地
                'white': 0
            },
            'value': float(value)
        }
    except Exception as e:
        print(f"Error getting evaluation: {e}", file=sys.stderr)
        return {
            'winrate': 0.5,
            'blackStones': 0,
            'whiteStones': 0,
            'territory': {'black': 0, 'white': 0},
            'value': 0.0
        }


    """
    获取当前局面的评估（胜率、子力数等）
    返回: {winrate, blackStones, whiteStones, territory}
    """
    try:
        from genMove import getValueResult
        
        # 计算子力数
        blackStones = np.sum(go.board == 1)
        whiteStones = np.sum(go.board == -1)
        
        # 计算评估值（子力差）
        value = getValueResult(go, willPlayColor)
        
        # 简单的胜率估算（基于子力差）
        # 这里可以后续改进为使用valueNet
        totalStones = blackStones + whiteStones
        if totalStones == 0:
            winrate = 0.5
        else:
            # 基于子力差的简单估算
            stoneDiff = value
            # 归一化到0-1范围（假设最大差值为100）
            winrate = 0.5 + (stoneDiff / 200.0)
            winrate = max(0.0, min(1.0, winrate))
        
        return {
            'winrate': winrate,
            'blackStones': int(blackStones),
            'whiteStones': int(whiteStones),
            'territory': {
                'black': 0,  # 需要更复杂的算法计算领地
                'white': 0
            },
            'value': float(value)
        }
    except Exception as e:
        print(f"Error getting evaluation: {e}", file=sys.stderr)
        return {
            'winrate': 0.5,
            'blackStones': 0,
            'whiteStones': 0,
            'territory': {'black': 0, 'white': 0},
            'value': 0.0
        }


    """
    获取当前局面的评估（胜率、子力数等）
    返回: {winrate, blackStones, whiteStones, territory}
    """
    try:
        from genMove import getValueResult
        
        # 计算子力数
        blackStones = np.sum(go.board == 1)
        whiteStones = np.sum(go.board == -1)
        
        # 计算评估值（子力差）
        value = getValueResult(go, willPlayColor)
        
        # 简单的胜率估算（基于子力差）
        # 这里可以后续改进为使用valueNet
        totalStones = blackStones + whiteStones
        if totalStones == 0:
            winrate = 0.5
        else:
            # 基于子力差的简单估算
            stoneDiff = value
            # 归一化到0-1范围（假设最大差值为100）
            winrate = 0.5 + (stoneDiff / 200.0)
            winrate = max(0.0, min(1.0, winrate))
        
        return {
            'winrate': winrate,
            'blackStones': int(blackStones),
            'whiteStones': int(whiteStones),
            'territory': {
                'black': 0,  # 需要更复杂的算法计算领地
                'white': 0
            },
            'value': float(value)
        }
    except Exception as e:
        print(f"Error getting evaluation: {e}", file=sys.stderr)
        return {
            'winrate': 0.5,
            'blackStones': 0,
            'whiteStones': 0,
            'territory': {'black': 0, 'white': 0},
            'value': 0.0
        }


    """
    获取当前局面的评估（胜率、子力数等）
    返回: {winrate, blackStones, whiteStones, territory}
    """
    try:
        from genMove import getValueResult
        
        # 计算子力数
        blackStones = np.sum(go.board == 1)
        whiteStones = np.sum(go.board == -1)
        
        # 计算评估值（子力差）
        value = getValueResult(go, willPlayColor)
        
        # 简单的胜率估算（基于子力差）
        # 这里可以后续改进为使用valueNet
        totalStones = blackStones + whiteStones
        if totalStones == 0:
            winrate = 0.5
        else:
            # 基于子力差的简单估算
            stoneDiff = value
            # 归一化到0-1范围（假设最大差值为100）
            winrate = 0.5 + (stoneDiff / 200.0)
            winrate = max(0.0, min(1.0, winrate))
        
        return {
            'winrate': winrate,
            'blackStones': int(blackStones),
            'whiteStones': int(whiteStones),
            'territory': {
                'black': 0,  # 需要更复杂的算法计算领地
                'white': 0
            },
            'value': float(value)
        }
    except Exception as e:
        print(f"Error getting evaluation: {e}", file=sys.stderr)
        return {
            'winrate': 0.5,
            'blackStones': 0,
            'whiteStones': 0,
            'territory': {'black': 0, 'white': 0},
            'value': 0.0
        }


    """
    获取当前局面的评估（胜率、子力数等）
    返回: {winrate, blackStones, whiteStones, territory}
    """
    try:
        from genMove import getValueResult
        
        # 计算子力数
        blackStones = np.sum(go.board == 1)
        whiteStones = np.sum(go.board == -1)
        
        # 计算评估值（子力差）
        value = getValueResult(go, willPlayColor)
        
        # 简单的胜率估算（基于子力差）
        # 这里可以后续改进为使用valueNet
        totalStones = blackStones + whiteStones
        if totalStones == 0:
            winrate = 0.5
        else:
            # 基于子力差的简单估算
            stoneDiff = value
            # 归一化到0-1范围（假设最大差值为100）
            winrate = 0.5 + (stoneDiff / 200.0)
            winrate = max(0.0, min(1.0, winrate))
        
        return {
            'winrate': winrate,
            'blackStones': int(blackStones),
            'whiteStones': int(whiteStones),
            'territory': {
                'black': 0,  # 需要更复杂的算法计算领地
                'white': 0
            },
            'value': float(value)
        }
    except Exception as e:
        print(f"Error getting evaluation: {e}", file=sys.stderr)
        return {
            'winrate': 0.5,
            'blackStones': 0,
            'whiteStones': 0,
            'territory': {'black': 0, 'white': 0},
            'value': 0.0
        }

