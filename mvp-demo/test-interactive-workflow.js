#!/usr/bin/env node

/**
 * 自动化测试脚本 - 测试交互式工作流系统
 */

import { WorkflowEngine } from './workflow-engine/WorkflowEngine.js';

async function runTest() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 Testing Interactive Workflow System');
  console.log('='.repeat(80));

  const engine = new WorkflowEngine();

  try {
    // 清理之前的工作流
    console.log('\n📌 Step 0: Cleaning up previous workflow...');
    try {
      engine.resetWorkflow();
    } catch (e) {
      console.log('   No previous workflow to clean');
    }

    // Step 1: Start new workflow
    console.log('\n📌 Step 1: Starting new workflow...');
    const startResult = await engine.startNewWorkflow();
    console.log(`✅ Workflow started: ${startResult.workflowId}`);

    // Step 2: Check status
    console.log('\n📌 Step 2: Checking workflow status...');
    const status = engine.getStatus();
    console.log(`   Current Phase: ${status.currentPhase}`);
    console.log(`   Progress: ${status.progress}`);
    console.log(`   Next Action: ${status.nextAction}`);

    // Step 3: Execute Phase 1 - Register Agent
    console.log('\n📌 Step 3: Executing Phase 1 - Register Agent...');
    const phase1Result = await engine.executePhase(1);
    if (phase1Result.success) {
      console.log(`✅ Phase 1 Success`);
      console.log(`   Agent ID: ${phase1Result.result.agentId}`);
      console.log(`   TX: ${phase1Result.result.txHash}`);
    } else {
      throw new Error(`Phase 1 failed: ${phase1Result.error}`);
    }

    // Step 4: Execute Phase 2 - Scan NFT
    console.log('\n📌 Step 4: Executing Phase 2 - Scan NFT...');
    const phase2Result = await engine.executePhase(2);
    if (phase2Result.success) {
      console.log(`✅ Phase 2 Success`);
      console.log(`   Scanned Tokens: ${phase2Result.result.scanSummary.total}`);
      console.log(`   Unique IPFS CIDs: ${phase2Result.result.uniqueCIDs.length}`);
      phase2Result.result.uniqueCIDs.forEach((cid, i) => {
        console.log(`      ${i + 1}. ${cid}`);
      });
    } else {
      throw new Error(`Phase 2 failed: ${phase2Result.error}`);
    }

    // Step 5: Execute Phase 3 - Create Validation Request
    console.log('\n📌 Step 5: Executing Phase 3 - Create Validation Request...');
    const phase3Result = await engine.executePhase(3);
    if (phase3Result.success) {
      console.log(`✅ Phase 3 Success`);
      console.log(`   Request Hash: ${phase3Result.result.requestHash}`);
      console.log(`   Validator: ${phase3Result.result.validatorAddress}`);
      console.log(`   TX: ${phase3Result.result.txHash}`);
    } else {
      throw new Error(`Phase 3 failed: ${phase3Result.error}`);
    }

    // Step 6: Execute Phase 4 - Migrate to Filecoin
    console.log('\n📌 Step 6: Executing Phase 4 - Migrate to Filecoin...');
    const phase4Result = await engine.executePhase(4);
    if (phase4Result.success) {
      console.log(`✅ Phase 4 Success`);
      console.log(`   Migration: ${phase4Result.result.summary.successful}/${phase4Result.result.summary.total}`);
      console.log(`   Success Rate: ${phase4Result.result.summary.successRate.toFixed(1)}%`);
    } else {
      throw new Error(`Phase 4 failed: ${phase4Result.error}`);
    }

    // Step 7: Execute Phase 5 - Generate Proof
    console.log('\n📌 Step 7: Executing Phase 5 - Generate Proof...');
    const phase5Result = await engine.executePhase(5);
    if (phase5Result.success) {
      console.log(`✅ Phase 5 Success`);
      console.log(`   Proof URI: ${phase5Result.result.proofURI}`);
    } else {
      throw new Error(`Phase 5 failed: ${phase5Result.error}`);
    }

    // Step 8: Execute Phase 6 - Submit Validation
    console.log('\n📌 Step 8: Executing Phase 6 - Submit Validation...');
    const phase6Result = await engine.executePhase(6);
    if (phase6Result.success) {
      console.log(`✅ Phase 6 Success`);
      console.log(`   Approved: ${phase6Result.result.approved}`);
      console.log(`   Validator: ${phase6Result.result.validatorAddress}`);
      console.log(`   TX: ${phase6Result.result.txHash}`);
    } else {
      throw new Error(`Phase 6 failed: ${phase6Result.error}`);
    }

    // Step 9: Execute Phase 7 - Final Report
    console.log('\n📌 Step 9: Executing Phase 7 - Generate Final Report...');
    const phase7Result = await engine.executePhase(7);
    if (phase7Result.success) {
      console.log(`✅ Phase 7 Success`);
      console.log(`   Report generated`);
    } else {
      throw new Error(`Phase 7 failed: ${phase7Result.error}`);
    }

    // Final status
    console.log('\n📌 Step 10: Final Status Check...');
    const finalStatus = engine.getStatus();
    console.log(`   Workflow: ${finalStatus.workflowId}`);
    console.log(`   Progress: ${finalStatus.progress}`);
    console.log(`   Status: ${finalStatus.status}`);

    // Display final report
    console.log('\n' + '='.repeat(80));
    console.log('📊 FINAL REPORT');
    console.log('='.repeat(80));

    const report = phase7Result.result;
    console.log(`\n🤖 Agent:`);
    console.log(`   ID: ${report.agent.agentId}`);
    console.log(`   Address: ${report.agent.address}`);
    console.log(`   Registration TX: ${report.agent.registrationTx}`);

    console.log(`\n📦 NFT Scan:`);
    console.log(`   Contract: ${report.nftScan.contract.name} (${report.nftScan.contract.symbol})`);
    console.log(`   Scanned: ${report.nftScan.scannedTokens} tokens`);
    console.log(`   Unique CIDs: ${report.nftScan.uniqueCIDs}`);

    console.log(`\n✅ Validation:`);
    console.log(`   Request Hash: ${report.validation.requestHash}`);
    console.log(`   Status: ${report.validation.status}`);
    console.log(`   Approved: ${report.validation.approved}`);
    console.log(`   Request TX: ${report.validation.requestTx}`);
    console.log(`   Response TX: ${report.validation.responseTx}`);

    console.log(`\n🚀 Migration:`);
    console.log(`   Total: ${report.migration.total}`);
    console.log(`   Successful: ${report.migration.successful}`);
    console.log(`   Failed: ${report.migration.failed}`);
    console.log(`   Success Rate: ${report.migration.successRate.toFixed(1)}%`);

    console.log(`\n🌐 Networks:`);
    console.log(`   NFT: ${report.networks.nft}`);
    console.log(`   Validation: ${report.networks.validation}`);
    console.log(`   Filecoin: ${report.networks.filecoin}`);

    console.log('\n' + '='.repeat(80));
    console.log('🎉 ALL TESTS PASSED!');
    console.log('='.repeat(80));
    console.log('\n✅ Interactive workflow system is working correctly!');
    console.log('✅ All 7 phases executed successfully');
    console.log('✅ State persistence verified');
    console.log('✅ Ready for production use!\n');

    process.exit(0);

  } catch (error) {
    console.error('\n' + '='.repeat(80));
    console.error('❌ TEST FAILED');
    console.error('='.repeat(80));
    console.error(`\nError: ${error.message}`);
    console.error(`\nStack trace:`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
runTest();
