#!/usr/bin/env node

/**
 * Interactive CLI for NFT IPFS to Filecoin Migration Workflow
 * 人工可以分阶段操作的交互式命令行界面
 */

import { WorkflowEngine } from './workflow-engine/WorkflowEngine.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const engine = new WorkflowEngine();

// 辅助函数：提问
function question(prompt) {
  return new Promise(resolve => rl.question(prompt, resolve));
}

// 显示主菜单
function showMenu(status) {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 NFT IPFS to Filecoin Migration - Interactive Mode');
  console.log('='.repeat(80));

  if (status.hasActiveWorkflow) {
    console.log(`\n📊 Current Workflow: ${status.workflowId}`);
    console.log(`   Status: ${status.status}`);
    console.log(`   Progress: ${status.progress} phases`);
    console.log(`   Current Phase: ${status.currentPhase}`);
    console.log(`   Next Action: ${status.nextAction}`);
  } else {
    console.log('\n📊 No active workflow');
  }

  console.log('\n📝 Available Commands:');
  console.log('   start         - Start new workflow');
  console.log('   status        - Show current status');
  console.log('   continue      - Continue to next phase');
  console.log('   phase <1-7>   - Execute specific phase');
  console.log('   retry         - Retry current phase');
  console.log('   results       - Show phase results');
  console.log('   reset         - Reset workflow');
  console.log('   help          - Show this help');
  console.log('   exit          - Exit program');
  console.log('');
}

// 显示阶段结果
function showPhaseResults(status) {
  console.log('\n' + '─'.repeat(60));
  console.log('📋 Phase Results');
  console.log('─'.repeat(60));

  Object.entries(status.phases).forEach(([phaseKey, phaseData]) => {
    const phaseNum = phaseKey.replace('phase', '');
    const statusIcon = phaseData.status === 'completed' ? '✅' :
                       phaseData.status === 'in_progress' ? '⏳' :
                       phaseData.status === 'failed' ? '❌' : '⭕';

    console.log(`\n${statusIcon} Phase ${phaseNum}: ${phaseData.status}`);

    if (phaseData.result) {
      // 显示关键结果摘要
      if (phaseNum === '1' && phaseData.result.agentId) {
        console.log(`   Agent ID: ${phaseData.result.agentId}`);
        console.log(`   TX: ${phaseData.result.txHash}`);
      }
      if (phaseNum === '2' && phaseData.result.uniqueCIDs) {
        console.log(`   Unique IPFS CIDs: ${phaseData.result.uniqueCIDs.length}`);
      }
      if (phaseNum === '3' && phaseData.result.requestHash) {
        console.log(`   Request Hash: ${phaseData.result.requestHash}`);
      }
      if (phaseNum === '4' && phaseData.result.summary) {
        console.log(`   Migration: ${phaseData.result.summary.successful}/${phaseData.result.summary.total}`);
      }
      if (phaseNum === '6' && phaseData.result.approved !== undefined) {
        console.log(`   Approved: ${phaseData.result.approved ? 'Yes' : 'No'}`);
      }
    }
  });
  console.log('');
}

// 确认执行
async function confirmExecution(phaseName) {
  const answer = await question(`\n⚠️  Execute ${phaseName}? (y/n): `);
  return answer.toLowerCase() === 'y';
}

// 主循环
async function main() {
  console.log('\n🎉 Welcome to Interactive Migration Workflow!\n');

  while (true) {
    try {
      const status = engine.getStatus();
      showMenu(status);

      const cmd = await question('> ');
      const parts = cmd.trim().split(' ');
      const command = parts[0].toLowerCase();

      if (command === 'exit' || command === 'quit') {
        console.log('\n👋 Goodbye!\n');
        rl.close();
        process.exit(0);
      }

      else if (command === 'start') {
        console.log('\n🚀 Starting new workflow...');
        const result = await engine.startNewWorkflow();
        console.log(`✅ ${result.message}`);
        console.log(`   Workflow ID: ${result.workflowId}`);
        console.log(`\n💡 Next: Type 'continue' or 'phase 1' to begin`);
      }

      else if (command === 'status') {
        showPhaseResults(status);
      }

      else if (command === 'continue') {
        if (!status.hasActiveWorkflow) {
          console.log('\n❌ No active workflow. Use "start" first.');
          continue;
        }

        const nextPhase = status.currentPhase + 1;
        if (nextPhase > 7) {
          console.log('\n✅ Workflow already completed!');
          continue;
        }

        const confirm = await confirmExecution(`Phase ${nextPhase}`);
        if (confirm) {
          const result = await engine.executePhase(nextPhase);
          if (result.success) {
            console.log(`\n✅ Phase ${nextPhase} completed!`);
            if (result.nextAction === 'workflow_completed') {
              console.log('\n🎉 Workflow completed! Use "results" to see full report.');
            }
          } else {
            console.log(`\n❌ Phase ${nextPhase} failed: ${result.error}`);
          }
        }
      }

      else if (command === 'phase' && parts[1]) {
        const phaseNum = parseInt(parts[1]);
        if (isNaN(phaseNum) || phaseNum < 1 || phaseNum > 7) {
          console.log('\n❌ Invalid phase number. Use 1-7.');
          continue;
        }

        if (!status.hasActiveWorkflow && phaseNum !== 1) {
          console.log('\n❌ No active workflow. Start with "start" or "phase 1".');
          continue;
        }

        const confirm = await confirmExecution(`Phase ${phaseNum}`);
        if (confirm) {
          const result = await engine.executePhase(phaseNum);
          if (result.success) {
            console.log(`\n✅ Phase ${phaseNum} completed!`);
          } else {
            console.log(`\n❌ Phase ${phaseNum} failed: ${result.error}`);
          }
        }
      }

      else if (command === 'retry') {
        if (!status.hasActiveWorkflow) {
          console.log('\n❌ No active workflow.');
          continue;
        }

        const currentPhase = status.currentPhase || 1;
        const confirm = await confirmExecution(`Retry Phase ${currentPhase}`);
        if (confirm) {
          const result = await engine.retryCurrentPhase();
          if (result.success) {
            console.log(`\n✅ Phase ${result.phase} completed!`);
          } else {
            console.log(`\n❌ Phase ${result.phase} failed: ${result.error}`);
          }
        }
      }

      else if (command === 'results') {
        showPhaseResults(status);
      }

      else if (command === 'reset') {
        const confirm = await question('\n⚠️  Reset workflow? All progress will be lost. (y/n): ');
        if (confirm.toLowerCase() === 'y') {
          engine.resetWorkflow();
          console.log('\n✅ Workflow reset. Use "start" to begin new workflow.');
        }
      }

      else if (command === 'help') {
        // Menu will show again in next iteration
        continue;
      }

      else {
        console.log(`\n❌ Unknown command: ${command}`);
        console.log('   Type "help" for available commands');
      }

    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
      console.error('\n📋 Stack trace:', error.stack);
    }
  }
}

// 启动
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
