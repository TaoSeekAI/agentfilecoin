/**
 * Phase 5: Generate Proof
 */

import 'dotenv/config';
import { ethers } from 'ethers';
import { PhaseBase } from './PhaseBase.js';
import { ERC8004OfficialClient } from '../../erc8004-official-client.js';

export class Phase5_GenerateProof extends PhaseBase {
  constructor() {
    super(
      'Generate Proof',
      'Generate proof metadata for validation response'
    );
  }

  async execute(context) {
    this.logSection('Phase 5: Generate Proof');

    if (!context.phase3Result || !context.phase4Result) {
      throw new Error('Phase 3 and 4 must be completed first');
    }

    const validationProvider = new ethers.JsonRpcProvider(process.env.VALIDATION_NETWORK_RPC_URL);
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY, validationProvider);

    const erc8004Client = new ERC8004OfficialClient(
      validationProvider,
      signer,
      process.env.AGENT_IDENTITY_ADDRESS,
      process.env.AGENT_VALIDATION_ADDRESS
    );

    const proofMetadata = erc8004Client.generateProofMetadata(
      context.phase3Result.taskURI,
      context.phase4Result.results
    );

    const proofURI = 'ipfs://QmProof' + Math.random().toString(36).substr(2);

    this.logSuccess('Proof metadata generated');
    this.log(`Migration Success: ${context.phase4Result.summary.successful}/${context.phase4Result.summary.total}`);
    this.log(`Proof URI: ${proofURI}`);

    return {
      proofMetadata,
      proofURI,
      migrationSummary: context.phase4Result.summary,
      timestamp: new Date().toISOString()
    };
  }
}
