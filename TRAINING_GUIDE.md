# 训练指南 - 按README步骤执行

## 当前状态检查

✅ **步骤1: 依赖安装** - 已完成
- torch 已安装
- numpy 已安装  
- sgfmill 已安装

✅ **步骤2: 数据准备** - 已完成
- games目录存在
- allValid.txt 已生成（42,604个有效棋谱）
- policyData.pt 已生成（约2.3GB）

✅ **步骤3: 训练数据检查**
- policyData.pt ✓
- valueData.pt - 需要准备（用于价值网络训练）

## 训练步骤

根据README，需要训练三个网络：

### 1. 训练策略网络（Policy Network）
```bash
python train.py policyNet
```
- 训练40个epoch
- 输出: policyNet.pt
- 状态: ⚠️ 文件已存在，可能需要重新训练

### 2. 训练快速策略网络（Playout Network）
```bash
python train.py playoutNet
```
- 训练5个epoch
- 输出: playoutNet.pt
- 状态: ⚠️ 文件已存在，可能需要重新训练

### 3. 训练价值网络（Value Network）
```bash
python train.py valueNet
```
- 训练8个epoch
- 输出: valueNet.pt
- 状态: ❌ 需要先准备valueData.pt

## 注意事项

1. **价值网络数据**: valueData.pt需要从`jgdb/allValid.txt`准备，但当前只有`games/allValid.txt`
2. **训练时间**: 
   - 策略网络（40 epochs）可能需要数小时
   - 快速策略网络（5 epochs）较快
   - 价值网络（8 epochs）中等时间
3. **GPU加速**: 如果有CUDA GPU，训练会更快

## 训练参数说明

- **策略网络**: 使用SGD优化器，学习率0.01，批量大小100
- **快速策略网络**: 同样使用策略网络训练函数，5个epoch
- **价值网络**: 使用Adam优化器，学习率0.001，批量大小100



