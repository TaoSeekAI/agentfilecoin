# 🚀 交互式NFT迁移工作流 - 快速开始指南

## ⚡ 5分钟快速体验

### 1. 环境准备（1分钟）

```bash
cd mvp-demo

# 确保 .env 已配置
cat .env | grep -E "PRIVATE_KEY|VALIDATOR_PRIVATE_KEY"
```

### 2. 启动交互式CLI（30秒）

```bash
node interactive-cli.js
```

你会看到：

```
================================================================================
🚀 NFT IPFS to Filecoin Migration - Interactive Mode
================================================================================

📊 No active workflow

📝 Available Commands:
   start         - Start new workflow
   status        - Show current status
   continue      - Continue to next phase
   ...

>
```

### 3. 开始工作流（3分钟）

#### 步骤 1: 创建工作流

```
> start
✅ Workflow created: workflow-xxx
```

#### 步骤 2: 注册 Agent (Phase 1)

```
> phase 1
⚠️  Execute Phase 1? (y/n): y

────────────────────────────────────────────────────────────
📋 Phase 1: Register ERC-8004 Agent
────────────────────────────────────────────────────────────
   Agent Owner: 0x1D62...9613
   Network: Ethereum Sepolia

   ...注册中...

✅ Agent registered!
   Agent ID: 76
   Transaction: 0xa191f...
```

#### 步骤 3: 扫描 NFT (Phase 2)

```
> continue
⚠️  Execute Phase 2? (y/n): y

────────────────────────────────────────────────────────────
📋 Phase 2: Scan NFT Project
────────────────────────────────────────────────────────────
   Contract: 0xED5AF...C544
   Token Range: 0 - 4

   ...扫描中...

✅ Phase 2 completed!
   Scanned: 5 tokens
   Unique IPFS CIDs: 2
```

#### 步骤 4: 查看结果

```
> results

────────────────────────────────────────────────────────────
📋 Phase Results
────────────────────────────────────────────────────────────

✅ Phase 1: completed
   Agent ID: 76
   TX: 0xa191f...

✅ Phase 2: completed
   Unique IPFS CIDs: 2

⭕ Phase 3: pending
⭕ Phase 4: pending
...
```

#### 步骤 5: 继续后续阶段

```
> continue
y
✅ Phase 3 completed!

> continue
y
✅ Phase 4 completed!

> continue
y
✅ Phase 5 completed!

> continue
y
✅ Phase 6 completed!

> continue
y
✅ Phase 7 completed!

🎉 Workflow completed!
```

### 4. 查看最终报告

```
> results
```

或者查看文件：

```bash
cat workflows/phase-outputs/phase7-output.json
```

## 📋 常用操作

### 暂停和恢复

```bash
# 任何时候都可以退出
> exit

# 稍后重新启动，自动恢复
node interactive-cli.js
> status
📊 Current Workflow: workflow-xxx
   Progress: 3/7 phases
   Current Phase: 3

> continue  # 从 Phase 4 继续
```

### 重试失败的阶段

```bash
> phase 4
y
❌ Phase 4 failed: Network timeout

# 检查网络后重试
> retry
y
✅ Phase 4 completed!
```

### 跳转到指定阶段

```bash
# 如果 Phase 1-3 已完成，可以直接执行 Phase 4
> phase 4
y
```

### 重置工作流

```bash
> reset
⚠️  Reset workflow? (y/n): y
✅ Workflow reset.

> start  # 开始新的工作流
```

## 🎯 实际使用场景

### 场景 1: 快速自动化（适合测试）

```bash
node interactive-cli.js

> start
> phase 1
y
> continue
y
> continue
y
> continue
y
> continue
y
> continue
y
> continue
y
> results
> exit
```

### 场景 2: 谨慎审查模式（适合生产）

```bash
node interactive-cli.js

> start

# Phase 1: 注册 Agent
> phase 1
y
> results  # 检查 Agent ID

# Phase 2: 扫描 NFT
> phase 2
y
> results  # 审查扫描到的 CID

# 检查 workflows/phase-outputs/phase2-output.json
# 确认 CID 列表正确

> continue  # Phase 3
y

> continue  # Phase 4 - 迁移
y
> results  # 检查迁移结果

# Phase 5-6: 生成证明和验证
> continue
y
> continue
y

# 最终报告
> phase 7
y
> results
```

### 场景 3: 程序化调用（适合集成）

```javascript
// test-my-workflow.js
import { WorkflowEngine } from './workflow-engine/WorkflowEngine.js';

async function runMyWorkflow() {
  const engine = new WorkflowEngine();

  // 创建工作流
  await engine.startNewWorkflow();

  // 执行所有阶段
  for (let phase = 1; phase <= 7; phase++) {
    console.log(`Executing Phase ${phase}...`);
    const result = await engine.executePhase(phase);

    if (!result.success) {
      console.error(`Phase ${phase} failed:`, result.error);
      break;
    }

    console.log(`Phase ${phase} completed!`);
  }

  // 获取最终报告
  const report = await engine.generateFullReport();
  console.log('Final Report:', report);
}

runMyWorkflow();
```

## 🐛 常见问题

### Q: 无法连接到网络？
```bash
# 检查代理设置
echo $http_proxy

# 设置代理（如果需要）
export http_proxy="http://proxy:port"
export https_proxy="http://proxy:port"
```

### Q: 私钥错误？
```bash
# 检查 .env 文件
cat .env | grep PRIVATE_KEY

# 确保格式正确（0x开头）
PRIVATE_KEY=0x...
VALIDATOR_PRIVATE_KEY=0x...
```

### Q: 测试币不足？
```bash
# Sepolia 水龙头
https://sepoliafaucet.com/

# Filecoin Calibration 水龙头
https://faucet.calibration.fildev.network/
```

### Q: 工作流卡住了？
```bash
# 查看状态
> status

# 查看详细错误
cat workflows/active-workflow.json | jq '.errors'

# 重试当前阶段
> retry
y

# 或重置重新开始
> reset
y
> start
```

## 📚 进一步学习

- **详细设计**: `INTERACTIVE_DESIGN.md`
- **完整指南**: `INTERACTIVE_GUIDE.md`
- **系统总结**: `INTERACTIVE_SYSTEM_SUMMARY.md`

## 🎉 恭喜！

你已经掌握了交互式NFT迁移工作流系统的基本使用！

现在你可以：
- ✅ 分阶段执行NFT迁移任务
- ✅ 在每个阶段审查结果
- ✅ 随时暂停和恢复工作流
- ✅ 处理错误并重试
- ✅ 查看完整的操作记录

**开始你的第一个迁移任务吧！** 🚀
