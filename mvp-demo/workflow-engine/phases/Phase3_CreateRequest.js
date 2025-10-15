/**
 * Phase 3: Create Validation Request
 */

import 'dotenv/config';
import { ethers } from 'ethers';
import { PhaseBase } from './PhaseBase.js';
import { ERC8004OfficialClient } from '../../erc8004-official-client.js';

export class Phase3_CreateRequest extends PhaseBase {
  constructor() {
    super(
      'Create Validation Request',
      'Create an ERC-8004 validation request for the migration task'
    );
  }

  async execute(context) {
    this.logSection('Phase 3: Create Validation Request');

    if (!context.phase1Result || !context.phase2Result) {
      throw new Error('Phase 1 and 2 must be completed first');
    }

    const validationProvider = new ethers.JsonRpcProvider(process.env.VALIDATION_NETWORK_RPC_URL);
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY, validationProvider);
    const validatorSigner = new ethers.Wallet(process.env.VALIDATOR_PRIVATE_KEY, validationProvider);

    const erc8004Client = new ERC8004OfficialClient(
      validationProvider,
      signer,
      process.env.AGENT_IDENTITY_ADDRESS,
      process.env.AGENT_VALIDATION_ADDRESS
    );

    const taskMetadata = erc8004Client.generateTaskMetadata(
      `Migrate ${context.phase2Result.uniqueCIDs.length} IPFS CIDs to Filecoin`,
      context.config.nftContract,
      context.phase2Result.scannedRange,
      context.phase2Result.uniqueCIDs
    );

    const taskURI = 'ipfs://QmTask' + Math.random().toString(36).substr(2);
    const validatorAddress = validatorSigner.address;

    this.log(`Agent ID: ${context.phase1Result.agentId}`);
    this.log(`Validator: ${validatorAddress}`);
    this.log(`Task: Migrate ${context.phase2Result.uniqueCIDs.length} IPFS CIDs`);

    const validationRequest = await erc8004Client.createValidationRequest(
      context.phase1Result.agentId,
      taskURI,
      validatorAddress
    );

    this.logSuccess('Validation request created');
    this.log(`Request Hash: ${validationRequest.requestHash}`);
    this.log(`Transaction: ${validationRequest.txHash}`);

    return {
      requestHash: validationRequest.requestHash,
      taskURI,
      taskMetadata,
      validatorAddress,
      agentId: context.phase1Result.agentId,
      txHash: validationRequest.txHash,
      timestamp: new Date().toISOString()
    };
  }
}
