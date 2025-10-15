/**
 * Phase 4: Migrate IPFS to Filecoin
 */

import 'dotenv/config';
import { PhaseBase } from './PhaseBase.js';
import { FilecoinUploader } from '../../filecoin-uploader.js';

export class Phase4_MigrateFilecoin extends PhaseBase {
  constructor() {
    super(
      'Migrate IPFS to Filecoin',
      'Download IPFS content and upload to Filecoin using Synapse SDK'
    );
  }

  async execute(context) {
    this.logSection('Phase 4: Migrate IPFS to Filecoin');

    if (!context.phase2Result) {
      throw new Error('Phase 2 must be completed first');
    }

    const cidList = context.phase2Result.uniqueCIDs;
    this.log(`Migrating ${cidList.length} IPFS CIDs to Filecoin`);

    const uploader = new FilecoinUploader(
      process.env.PRIVATE_KEY,
      process.env.FILECOIN_NETWORK_RPC_URL
    );

    await uploader.initialize();

    const migrationResult = await uploader.batchMigrate(cidList);

    this.logSuccess(`Migration completed: ${migrationResult.summary.successful}/${migrationResult.summary.total}`);
    this.log(`Success Rate: ${migrationResult.summary.successRate.toFixed(1)}%`);

    return {
      summary: migrationResult.summary,
      results: migrationResult.results,
      timestamp: new Date().toISOString()
    };
  }
}
