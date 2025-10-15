/**
 * Phase 6: Submit Validation Response
 */

import 'dotenv/config';
import { ethers } from 'ethers';
import { PhaseBase } from './PhaseBase.js';
import { ERC8004OfficialClient } from '../../erc8004-official-client.js';

export class Phase6_SubmitValidation extends PhaseBase {
  constructor() {
    super(
      'Submit Validation Response',
      'Validator reviews proof and submits validation response on-chain'
    );
  }

  async execute(context) {
    this.logSection('Phase 6: Submit Validation Response');

    if (!context.phase3Result || !context.phase5Result) {
      throw new Error('Phase 3 and 5 must be completed first');
    }

    const validationProvider = new ethers.JsonRpcProvider(process.env.VALIDATION_NETWORK_RPC_URL);
    const validatorSigner = new ethers.Wallet(process.env.VALIDATOR_PRIVATE_KEY, validationProvider);

    const validatorClient = new ERC8004OfficialClient(
      validationProvider,
      validatorSigner,
      process.env.AGENT_IDENTITY_ADDRESS,
      process.env.AGENT_VALIDATION_ADDRESS
    );

    const isApproved = context.params.approved !== undefined 
      ? context.params.approved 
      : context.phase5Result.migrationSummary.successful > 0;

    this.log(`Validator: ${validatorSigner.address}`);
    this.log(`Request Hash: ${context.phase3Result.requestHash}`);
    this.log(`Decision: ${isApproved ? 'APPROVED' : 'REJECTED'}`);

    const validationSubmission = await validatorClient.submitValidationResponse(
      context.phase3Result.requestHash,
      isApproved,
      context.phase5Result.proofURI
    );

    this.logSuccess('Validation response submitted');
    this.log(`Transaction: ${validationSubmission.txHash}`);

    return {
      approved: isApproved,
      requestHash: context.phase3Result.requestHash,
      proofURI: context.phase5Result.proofURI,
      validatorAddress: validatorSigner.address,
      txHash: validationSubmission.txHash,
      timestamp: new Date().toISOString()
    };
  }
}
