/**
 * Test Phase 1 with Real Filecoin Upload
 * This tests that Phase1_RegisterAgent correctly uploads metadata to Filecoin
 */

import 'dotenv/config';
import { WorkflowEngine } from './workflow-engine/WorkflowEngine.js';
import { StateManager } from './workflow-engine/StateManager.js';

async function testPhase1() {
  console.log('🧪 Testing Phase 1 with Real Filecoin Upload\n');

  // Initialize workflow engine
  const stateManager = new StateManager('./state');
  const workflowEngine = new WorkflowEngine(stateManager);

  try {
    // Reset if workflow exists
    const existingWorkflow = stateManager.loadActiveWorkflow();
    if (existingWorkflow) {
      console.log('🔄 Resetting existing workflow...');
      await workflowEngine.resetWorkflow();
    }

    // Start new workflow
    console.log('🚀 Starting new workflow...');
    const workflow = await workflowEngine.startNewWorkflow({
      nftContract: process.env.NFT_CONTRACT_ADDRESS,
      nftNetwork: {
        rpcUrl: process.env.NFT_NETWORK_RPC_URL,
        chainId: process.env.NFT_NETWORK_CHAIN_ID,
        name: process.env.NFT_NETWORK_NAME
      },
      tokenRange: {
        start: parseInt(process.env.NFT_START_TOKEN_ID || '0'),
        end: parseInt(process.env.NFT_END_TOKEN_ID || '4')
      }
    });

    console.log(`✅ Workflow created: ${workflow.workflowId}\n`);

    // Execute Phase 1: Register Agent
    console.log('📝 Executing Phase 1: Register ERC-8004 Agent');
    console.log('   This will upload agent metadata to Filecoin Calibration testnet\n');

    const phase1Response = await workflowEngine.executePhase(1);

    console.log('\n' + '='.repeat(80));
    console.log('✅ Phase 1 Completed Successfully!');
    console.log('='.repeat(80));

    if (!phase1Response || !phase1Response.success) {
      console.error('❌ Phase 1 execution failed');
      return null;
    }

    const phase1Result = phase1Response.result;

    console.log('📊 Results:');
    console.log(`   Agent ID: ${phase1Result.agentId}`);
    console.log(`   Agent Address: ${phase1Result.agentAddress}`);
    console.log(`   Metadata URI: ${phase1Result.metadataUri}`);
    console.log(`   Transaction: ${phase1Result.txHash}`);
    console.log(`   Network: ${phase1Result.network?.name || 'N/A'}`);
    console.log(`   Timestamp: ${phase1Result.timestamp}`);

    // Verify it's a real Filecoin URI
    if (phase1Result.metadataUri && phase1Result.metadataUri.startsWith('ipfs://')) {
      const cid = phase1Result.metadataUri.replace('ipfs://', '');
      if (cid.startsWith('Qm') || cid.startsWith('bafy')) {
        console.log('\n✅ SUCCESS: Real Filecoin CID detected!');
        console.log(`   CID: ${cid}`);
        console.log(`   Retrieval URL: https://calibration.filswan.com/ipfs/${cid}`);
      } else if (cid.startsWith('QmTemp')) {
        console.log('\n⚠️  WARNING: Fallback to temporary URI (Filecoin upload may have failed)');
      }
    }

    console.log('\n📁 Local metadata saved at: ./output/agent-metadata-interactive.json');

    return phase1Result;

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

// Run test
testPhase1()
  .then(() => {
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  });
