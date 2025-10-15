/**
 * Validation Script for IPFS Tracking Data
 * Validates JSON output against the schema and provides detailed error reporting
 *
 * Note: For full schema validation, install dependencies:
 *   npm install ajv ajv-formats
 *
 * This script will still perform semantic validation without ajv.
 */

import fs from 'fs/promises';

// Optional dependencies - will use basic validation if not available
let Ajv, addFormats;
try {
  const ajvModule = await import('ajv');
  const formatsModule = await import('ajv-formats');
  Ajv = ajvModule.default;
  addFormats = formatsModule.default;
} catch (error) {
  console.warn('⚠️  Note: ajv packages not installed. Schema validation will be skipped.');
  console.warn('   Install with: npm install ajv ajv-formats\n');
}

/**
 * Validate tracking data file against schema
 */
async function validateTrackingData(dataFilePath, schemaFilePath = './ipfs-failure-schema.json') {
  console.log('\n🔍 Validating IPFS Tracking Data...');
  console.log('='.repeat(60));

  try {
    // Load schema
    console.log(`\n📋 Loading schema from: ${schemaFilePath}`);
    const schemaContent = await fs.readFile(schemaFilePath, 'utf8');
    const schema = JSON.parse(schemaContent);
    console.log('✅ Schema loaded successfully');

    // Load data
    console.log(`\n📊 Loading data from: ${dataFilePath}`);
    const dataContent = await fs.readFile(dataFilePath, 'utf8');
    const data = JSON.parse(dataContent);
    console.log('✅ Data loaded successfully');

    // Initialize validator
    let valid = true;
    if (Ajv && addFormats) {
      const ajv = new Ajv({ allErrors: true, verbose: true });
      addFormats(ajv);
      const validate = ajv.compile(schema);

      // Validate
      console.log('\n🔎 Validating data against schema...');
      valid = validate(data);
    } else {
      console.log('\n⚠️  Skipping schema validation (ajv not installed)');
      console.log('   Proceeding with basic structure checks...\n');

      // Basic structure validation
      if (!data.schemaVersion || !data.scanMetadata || !data.failures || !data.statistics) {
        console.log('❌ Missing required top-level fields');
        valid = false;
      }
    }

    if (valid) {
      console.log('✅ Validation PASSED!\n');

      // Display summary
      console.log('📊 Data Summary:');
      console.log('='.repeat(60));
      console.log(`Schema Version: ${data.schemaVersion}`);
      console.log(`Scan ID: ${data.scanMetadata.scanId}`);
      console.log(`Contract: ${data.scanMetadata.contractName} (${data.scanMetadata.contractSymbol})`);
      console.log(`Contract Address: ${data.scanMetadata.contractAddress}`);
      console.log(`Token Range: ${data.scanMetadata.tokenRange.start} - ${data.scanMetadata.tokenRange.end}`);
      console.log(`Scan Duration: ${data.scanMetadata.startTime} → ${data.scanMetadata.endTime}`);
      console.log();
      console.log(`Total Failures: ${data.failures.length}`);
      console.log(`Total Attempts: ${data.statistics.totalAttempts}`);
      console.log(`Success Rate: ${data.statistics.successRate}%`);
      console.log(`Unique Failed CIDs: ${data.statistics.uniqueFailedCIDs}`);
      console.log(`Affected Tokens: ${data.statistics.affectedTokens}`);
      console.log();

      // Failure breakdown
      console.log('📋 Failure Breakdown by Type:');
      console.log('='.repeat(60));
      for (const [type, count] of Object.entries(data.statistics.failuresByType)) {
        if (count > 0) {
          const percent = ((count / data.statistics.totalFailures) * 100).toFixed(1);
          console.log(`  ${type.padEnd(15)} : ${count.toString().padStart(4)} (${percent}%)`);
        }
      }
      console.log();

      // Gateway breakdown
      console.log('🌐 Failure Breakdown by Gateway:');
      console.log('='.repeat(60));
      for (const [gateway, count] of Object.entries(data.statistics.failuresByGateway)) {
        const percent = ((count / data.statistics.totalFailures) * 100).toFixed(1);
        console.log(`  ${gateway}`);
        console.log(`    Failures: ${count} (${percent}%)`);
      }
      console.log();

      // Severity breakdown
      console.log('⚠️  Failure Breakdown by Severity:');
      console.log('='.repeat(60));
      const severityCounts = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      };
      data.failures.forEach(f => {
        severityCounts[f.severity]++;
      });
      for (const [severity, count] of Object.entries(severityCounts)) {
        if (count > 0) {
          const icon = severity === 'critical' ? '🔴' :
                      severity === 'high' ? '🟠' :
                      severity === 'medium' ? '🟡' : '🟢';
          const percent = ((count / data.statistics.totalFailures) * 100).toFixed(1);
          console.log(`  ${icon} ${severity.padEnd(10)} : ${count.toString().padStart(4)} (${percent}%)`);
        }
      }
      console.log();

      // Retryable count
      const retryableCount = data.failures.filter(f => f.retryable).length;
      const retryablePercent = ((retryableCount / data.statistics.totalFailures) * 100).toFixed(1);
      console.log(`🔄 Retryable Failures: ${retryableCount} (${retryablePercent}%)`);
      console.log();

      return true;
    } else {
      console.log('❌ Validation FAILED!\n');

      if (Ajv && addFormats) {
        console.log('🐛 Validation Errors:');
        console.log('='.repeat(60));
        validate.errors.forEach((error, index) => {
          console.log(`\nError ${index + 1}:`);
          console.log(`  Path: ${error.instancePath || '(root)'}`);
          console.log(`  Message: ${error.message}`);
          if (error.params) {
            console.log(`  Params: ${JSON.stringify(error.params, null, 2)}`);
          }
          if (error.data !== undefined) {
            console.log(`  Data: ${JSON.stringify(error.data, null, 2)}`);
          }
        });
        console.log();
      }

      return false;
    }
  } catch (error) {
    console.error('\n❌ Error during validation:');
    console.error(error.message);
    if (error.code === 'ENOENT') {
      console.error(`\n💡 File not found. Please check the path.`);
    }
    return false;
  }
}

/**
 * Perform additional semantic validation
 */
async function semanticValidation(dataFilePath) {
  console.log('\n🧪 Performing Semantic Validation...');
  console.log('='.repeat(60));

  try {
    const dataContent = await fs.readFile(dataFilePath, 'utf8');
    const data = JSON.parse(dataContent);

    const issues = [];

    // Check 1: Scan duration makes sense
    const startTime = new Date(data.scanMetadata.startTime);
    const endTime = new Date(data.scanMetadata.endTime);
    const durationMinutes = (endTime - startTime) / 1000 / 60;

    if (durationMinutes < 0) {
      issues.push('⚠️  End time is before start time');
    } else if (durationMinutes > 1440) { // 24 hours
      issues.push(`⚠️  Scan duration is very long: ${durationMinutes.toFixed(1)} minutes`);
    }

    // Check 2: Statistics consistency
    const calculatedTotal = data.statistics.totalAttempts;
    const calculatedFailures = data.failures.length;

    if (calculatedFailures !== data.statistics.totalFailures) {
      issues.push(`⚠️  Failure count mismatch: failures.length=${calculatedFailures}, statistics.totalFailures=${data.statistics.totalFailures}`);
    }

    // Check 3: Failure type counts
    const typeCountSum = Object.values(data.statistics.failuresByType).reduce((a, b) => a + b, 0);
    if (typeCountSum !== data.statistics.totalFailures) {
      issues.push(`⚠️  Failure type counts don't sum to total: sum=${typeCountSum}, total=${data.statistics.totalFailures}`);
    }

    // Check 4: Success rate calculation
    const expectedSuccessRate = ((calculatedTotal - calculatedFailures) / calculatedTotal * 100).toFixed(2);
    if (calculatedTotal > 0 && expectedSuccessRate !== data.statistics.successRate) {
      issues.push(`⚠️  Success rate mismatch: expected=${expectedSuccessRate}%, actual=${data.statistics.successRate}%`);
    }

    // Check 5: Unique CIDs
    const actualUniqueCIDs = new Set(data.failures.map(f => f.cid)).size;
    if (actualUniqueCIDs !== data.statistics.uniqueFailedCIDs) {
      issues.push(`⚠️  Unique CID count mismatch: actual=${actualUniqueCIDs}, reported=${data.statistics.uniqueFailedCIDs}`);
    }

    // Check 6: Affected tokens
    const actualAffectedTokens = new Set(
      data.failures.map(f => `${f.nftToken.contractAddress}-${f.nftToken.tokenId}`)
    ).size;
    if (actualAffectedTokens !== data.statistics.affectedTokens) {
      issues.push(`⚠️  Affected tokens count mismatch: actual=${actualAffectedTokens}, reported=${data.statistics.affectedTokens}`);
    }

    // Check 7: All failures have valid gateway attempts
    data.failures.forEach((failure, index) => {
      if (!failure.gatewayAttempts || failure.gatewayAttempts.length === 0) {
        issues.push(`⚠️  Failure ${index + 1} (${failure.failureId}) has no gateway attempts`);
      }
    });

    // Check 8: CID format validation
    const cidRegex = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[A-Za-z2-7]{58,})$/;
    data.failures.forEach((failure, index) => {
      if (failure.cid !== 'unknown' && !cidRegex.test(failure.cid)) {
        issues.push(`⚠️  Failure ${index + 1} (${failure.failureId}) has invalid CID format: ${failure.cid}`);
      }
    });

    // Report results
    if (issues.length === 0) {
      console.log('✅ All semantic checks passed!');
    } else {
      console.log(`❌ Found ${issues.length} semantic issue(s):\n`);
      issues.forEach(issue => console.log(issue));
    }
    console.log();

    return issues.length === 0;
  } catch (error) {
    console.error('❌ Error during semantic validation:', error.message);
    return false;
  }
}

/**
 * Main validation function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node validate-tracking-data.js <data-file.json> [schema-file.json]');
    console.log('\nExample:');
    console.log('  node validate-tracking-data.js output/ipfs-failures-scan-20250115-143022-a7f3c2d9.json');
    console.log('  node validate-tracking-data.js examples/sample-ipfs-failures.json ipfs-failure-schema.json');
    process.exit(1);
  }

  const dataFile = args[0];
  const schemaFile = args[1] || './ipfs-failure-schema.json';

  console.log('\n╔═════════════════════════════════════════════════════════════╗');
  console.log('║     IPFS Availability Tracking Data Validator              ║');
  console.log('╚═════════════════════════════════════════════════════════════╝');

  // Schema validation
  const schemaValid = await validateTrackingData(dataFile, schemaFile);

  // Semantic validation
  const semanticValid = await semanticValidation(dataFile);

  // Final result
  console.log('═'.repeat(60));
  if (schemaValid && semanticValid) {
    console.log('✅ Overall Result: VALIDATION PASSED');
    console.log('   All checks completed successfully!');
    process.exit(0);
  } else {
    console.log('❌ Overall Result: VALIDATION FAILED');
    if (!schemaValid) console.log('   Schema validation failed');
    if (!semanticValid) console.log('   Semantic validation failed');
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { validateTrackingData, semanticValidation };
