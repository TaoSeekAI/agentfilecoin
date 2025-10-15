/**
 * Phase 7: Generate Final Report
 */

import 'dotenv/config';
import { ethers } from 'ethers';
import { PhaseBase } from './PhaseBase.js';
import { ERC8004OfficialClient } from '../../erc8004-official-client.js';

export class Phase7_FinalReport extends PhaseBase {
  constructor() {
    super(
      'Generate Final Report',
      'Query final state and generate comprehensive workflow report'
    );
  }

  async execute(context) {
    this.logSection('Phase 7: Generate Final Report');

    const validationProvider = new ethers.JsonRpcProvider(process.env.VALIDATION_NETWORK_RPC_URL);
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY, validationProvider);

    const erc8004Client = new ERC8004OfficialClient(
      validationProvider,
      signer,
      process.env.AGENT_IDENTITY_ADDRESS,
      process.env.AGENT_VALIDATION_ADDRESS
    );

    const agentInfo = await erc8004Client.getAgent(context.phase1Result.agentId);
    const validationInfo = await erc8004Client.getValidationRequest(context.phase3Result.requestHash);

    const report = {
      title: 'NFT IPFS to Filecoin Migration - Complete Report',
      workflowId: context.workflow.workflowId,
      completedAt: new Date().toISOString(),
      agent: {
        agentId: context.phase1Result.agentId,
        address: context.phase1Result.agentAddress,
        metadataUri: context.phase1Result.metadataUri,
        registrationTx: context.phase1Result.txHash
      },
      nftScan: {
        contract: context.phase2Result.contractInfo,
        scannedTokens: context.phase2Result.scanSummary.total,
        uniqueCIDs: context.phase2Result.uniqueCIDs.length
      },
      validation: {
        requestHash: context.phase3Result.requestHash,
        validator: context.phase3Result.validatorAddress,
        status: validationInfo.status,
        approved: context.phase6Result.approved,
        requestTx: context.phase3Result.txHash,
        responseTx: context.phase6Result.txHash
      },
      migration: {
        total: context.phase4Result.summary.total,
        successful: context.phase4Result.summary.successful,
        failed: context.phase4Result.summary.failed,
        successRate: context.phase4Result.summary.successRate
      },
      networks: {
        nft: process.env.NFT_NETWORK_NAME,
        validation: process.env.VALIDATION_NETWORK_NAME,
        filecoin: process.env.FILECOIN_NETWORK_NAME
      }
    };

    this.logSuccess('Final report generated');
    this.log(`Agent ID: ${report.agent.agentId}`);
    this.log(`Validation Status: ${report.validation.status}`);
    this.log(`Migration Success Rate: ${report.migration.successRate}`);

    return report;
  }
}
