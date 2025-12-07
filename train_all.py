"""
完整的训练脚本 - 按照README步骤执行所有训练
"""
import sys
import os

print("=" * 60)
print("围棋AI训练脚本")
print("=" * 60)

# 检查训练数据
print("\n[步骤1] 检查训练数据...")
if os.path.exists('policyData.pt'):
    print("✓ policyData.pt 已存在")
else:
    print("✗ policyData.pt 不存在，需要先运行 prepareData.py")
    sys.exit(1)

if os.path.exists('valueData.pt'):
    print("✓ valueData.pt 已存在")
else:
    print("✗ valueData.pt 不存在，需要先准备价值网络数据")
    response = input("是否现在准备valueData? (y/n): ")
    if response.lower() == 'y':
        print("正在准备valueData...")
        from prepareData import prepareValueData
        prepareValueData(20000, 'games/allValid.txt')
        print("✓ valueData.pt 已生成")
    else:
        print("请先运行: python -c \"from prepareData import prepareValueData; prepareValueData(20000, 'games/allValid.txt')\"")
        sys.exit(1)

# 训练策略网络
print("\n[步骤2] 训练策略网络 (policyNet)...")
if os.path.exists('policyNet.pt'):
    response = input("policyNet.pt 已存在，是否重新训练? (y/n): ")
    if response.lower() == 'y':
        os.system('python train.py policyNet')
    else:
        print("跳过策略网络训练")
else:
    os.system('python train.py policyNet')

# 训练快速策略网络
print("\n[步骤3] 训练快速策略网络 (playoutNet)...")
if os.path.exists('playoutNet.pt'):
    response = input("playoutNet.pt 已存在，是否重新训练? (y/n): ")
    if response.lower() == 'y':
        os.system('python train.py playoutNet')
    else:
        print("跳过快速策略网络训练")
else:
    os.system('python train.py playoutNet')

# 训练价值网络
print("\n[步骤4] 训练价值网络 (valueNet)...")
if os.path.exists('valueNet.pt'):
    response = input("valueNet.pt 已存在，是否重新训练? (y/n): ")
    if response.lower() == 'y':
        os.system('python train.py valueNet')
    else:
        print("跳过价值网络训练")
else:
    os.system('python train.py valueNet')

print("\n" + "=" * 60)
print("训练完成！所有模型文件:")
print("=" * 60)
for model in ['policyNet.pt', 'playoutNet.pt', 'valueNet.pt']:
    if os.path.exists(model):
        size = os.path.getsize(model) / (1024 * 1024)  # MB
        print(f"✓ {model} ({size:.2f} MB)")
    else:
        print(f"✗ {model} (未生成)")


