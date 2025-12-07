"""
快速测试脚本 - 验证训练好的模型是否可以正常工作
"""
from go import Go
from genMove import genMovePolicy
import sys

def test_models():
    print("=" * 60)
    print("围棋AI模型测试")
    print("=" * 60)
    
    # 检查模型文件
    import os
    required_files = ['policyNet.pt', 'playoutNet.pt', 'valueNet.pt']
    print("\n[1] 检查模型文件...")
    all_exists = True
    for f in required_files:
        if os.path.exists(f):
            size = os.path.getsize(f) / 1024  # KB
            print(f"  ✓ {f} ({size:.1f} KB)")
        else:
            print(f"  ✗ {f} (缺失)")
            all_exists = False
    
    if not all_exists:
        print("\n错误：缺少必要的模型文件！")
        return False
    
    # 测试模型加载
    print("\n[2] 测试模型加载...")
    try:
        from net import PolicyNetwork, PlayoutNetwork, ValueNetwork
        import torch
        
        policy_net = PolicyNetwork()
        policy_net.load_state_dict(torch.load('policyNet.pt'))
        policy_net.eval()
        print("  ✓ 策略网络加载成功")
        
        playout_net = PlayoutNetwork()
        playout_net.load_state_dict(torch.load('playoutNet.pt'))
        playout_net.eval()
        print("  ✓ 快速策略网络加载成功")
        
        value_net = ValueNetwork()
        value_net.load_state_dict(torch.load('valueNet.pt'))
        value_net.eval()
        print("  ✓ 价值网络加载成功")
    except Exception as e:
        print(f"  ✗ 模型加载失败: {e}")
        return False
    
    # 测试生成走子
    print("\n[3] 测试生成走子...")
    try:
        go = Go()
        
        # 测试空棋盘
        print("  测试空棋盘...")
        result = genMovePolicy(go, 1)
        print(f"  ✓ 空棋盘生成走子成功 (输出到stderr)")
        
        # 测试已有棋子的棋盘
        print("  测试已有棋子的棋盘...")
        go.move(1, 3, 3)  # 黑棋下在3,3
        go.move(-1, 15, 15)  # 白棋下在15,15
        result = genMovePolicy(go, 1)
        print(f"  ✓ 已有棋子棋盘生成走子成功")
        
    except Exception as e:
        print(f"  ✗ 生成走子失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    print("\n" + "=" * 60)
    print("✓ 所有测试通过！模型可以正常使用。")
    print("=" * 60)
    print("\n下一步：")
    print("  1. 运行 'python gtp.py' 启动GTP服务器")
    print("  2. 或运行 'python gtp.py MCTS' 使用MCTS模式")
    print("  3. 在Sabaki等客户端中连接使用")
    
    return True

if __name__ == '__main__':
    success = test_models()
    sys.exit(0 if success else 1)



