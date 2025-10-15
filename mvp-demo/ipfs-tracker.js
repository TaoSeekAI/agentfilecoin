/**
 * IPFS Availability Tracker
 * Tracks and documents IPFS content availability failures during NFT scanning
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export class IPFSAvailabilityTracker {
  constructor(options = {}) {
    this.failures = [];
    this.attempts = 0;
    this.successes = 0;
    this.scanMetadata = {
      scanId: this.generateScanId(),
      startTime: new Date().toISOString(),
      endTime: null,
      contractAddress: options.contractAddress || null,
      contractName: options.contractName || null,
      contractSymbol: options.contractSymbol || null,
      tokenRange: {
        start: options.tokenRangeStart || 0,
        end: options.tokenRangeEnd || 0
      }
    };
    this.gateways = options.gateways || [
      'https://ipfs.io/ipfs/',
      'https://gateway.pinata.cloud/ipfs/',
      'https://dweb.link/ipfs/',
      'https://cloudflare-ipfs.com/ipfs/'
    ];
  }

  /**
   * Generate a unique scan ID
   */
  generateScanId() {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '');
    const random = crypto.randomBytes(4).toString('hex');
    return `scan-${dateStr}-${timeStr}-${random}`;
  }

  /**
   * Generate a unique failure ID
   */
  generateFailureId() {
    return `fail-${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Classify error type from error object
   */
  classifyError(error) {
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return 'timeout';
    }
    if (error.response?.status === 404 || error.message.includes('404')) {
      return 'not_found';
    }
    if (error.response?.status >= 500) {
      return 'gateway_error';
    }
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return 'network_error';
    }
    if (error.name === 'SyntaxError' || error.message.includes('parse')) {
      return 'parse_error';
    }
    return 'other';
  }

  /**
   * Determine severity of failure
   */
  determineSeverity(contentType, errorType) {
    if (contentType === 'metadata') {
      return 'critical'; // Metadata is essential for NFT
    }
    if (contentType === 'image' && errorType === 'not_found') {
      return 'high'; // Permanent image loss
    }
    if (errorType === 'timeout' || errorType === 'gateway_error') {
      return 'medium'; // Potentially temporary
    }
    return 'low';
  }

  /**
   * Record a successful IPFS content retrieval
   */
  recordSuccess() {
    this.attempts++;
    this.successes++;
  }

  /**
   * Record an IPFS content retrieval failure
   */
  recordFailure(failureData) {
    this.attempts++;

    const {
      cid,
      contentType,
      nftToken,
      error,
      gatewayAttempts,
      shouldExist = true,
      notes = ''
    } = failureData;

    const errorType = this.classifyError(error);
    const severity = this.determineSeverity(contentType, errorType);

    const failure = {
      failureId: this.generateFailureId(),
      timestamp: new Date().toISOString(),
      cid,
      contentType,
      nftToken: {
        contractAddress: nftToken.contractAddress,
        tokenId: nftToken.tokenId,
        owner: nftToken.owner || null,
        tokenURI: nftToken.tokenURI || null
      },
      errorType,
      errorDetails: {
        message: error.message,
        statusCode: error.response?.status || null,
        errorCode: error.code || null,
        stack: error.stack || null
      },
      gatewayAttempts: gatewayAttempts.map(attempt => ({
        gateway: attempt.gateway,
        attemptTime: attempt.attemptTime || new Date().toISOString(),
        result: attempt.result,
        responseTime: attempt.responseTime || null
      })),
      shouldExist,
      retryable: errorType === 'timeout' || errorType === 'gateway_error' || errorType === 'network_error',
      severity,
      notes
    };

    this.failures.push(failure);
    return failure;
  }

  /**
   * Calculate statistics
   */
  calculateStatistics() {
    const failuresByType = {
      timeout: 0,
      not_found: 0,
      gateway_error: 0,
      network_error: 0,
      parse_error: 0,
      other: 0
    };

    const failuresByGateway = {};
    const uniqueCIDs = new Set();
    const affectedTokens = new Set();

    this.failures.forEach(failure => {
      // Count by type
      failuresByType[failure.errorType]++;

      // Count by gateway
      failure.gatewayAttempts.forEach(attempt => {
        failuresByGateway[attempt.gateway] = (failuresByGateway[attempt.gateway] || 0) + 1;
      });

      // Unique CIDs
      uniqueCIDs.add(failure.cid);

      // Affected tokens
      affectedTokens.add(`${failure.nftToken.contractAddress}-${failure.nftToken.tokenId}`);
    });

    return {
      totalAttempts: this.attempts,
      totalFailures: this.failures.length,
      successRate: this.attempts > 0 ? ((this.successes / this.attempts) * 100).toFixed(2) : 0,
      failuresByType,
      failuresByGateway,
      uniqueFailedCIDs: uniqueCIDs.size,
      affectedTokens: affectedTokens.size
    };
  }

  /**
   * Finalize the scan and prepare data for export
   */
  finalizeScan() {
    this.scanMetadata.endTime = new Date().toISOString();
    const statistics = this.calculateStatistics();

    return {
      schemaVersion: '1.0.0',
      scanMetadata: this.scanMetadata,
      failures: this.failures,
      statistics
    };
  }

  /**
   * Export tracking data to JSON file
   */
  async exportToJSON(outputDir = './output') {
    const data = this.finalizeScan();

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    const filename = `ipfs-failures-${this.scanMetadata.scanId}.json`;
    const filepath = path.join(outputDir, filename);

    await fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf8');

    console.log(`\n📊 IPFS Availability Report saved to: ${filepath}`);
    return filepath;
  }

  /**
   * Generate markdown report from tracking data
   */
  async generateReport(templatePath, outputDir = './output') {
    const data = this.finalizeScan();

    // Read template
    let template = await fs.readFile(templatePath, 'utf8');

    // Replace placeholders
    const replacements = {
      TIMESTAMP: new Date().toISOString(),
      SCAN_ID: data.scanMetadata.scanId,
      CONTRACT_NAME: data.scanMetadata.contractName || 'Unknown',
      CONTRACT_SYMBOL: data.scanMetadata.contractSymbol || 'N/A',
      CONTRACT_ADDRESS: data.scanMetadata.contractAddress || 'N/A',
      TOKEN_START: data.scanMetadata.tokenRange.start,
      TOKEN_END: data.scanMetadata.tokenRange.end,
      TOTAL_ATTEMPTS: data.statistics.totalAttempts,
      SUCCESSFUL_RETRIEVALS: data.statistics.totalAttempts - data.statistics.totalFailures,
      TOTAL_FAILURES: data.statistics.totalFailures,
      SUCCESS_RATE: data.statistics.successRate,
      FAILURE_RATE: (100 - parseFloat(data.statistics.successRate)).toFixed(2),
      UNIQUE_FAILED_CIDS: data.statistics.uniqueFailedCIDs,
      AFFECTED_TOKENS: data.statistics.affectedTokens,

      // Error type counts
      TIMEOUT_COUNT: data.statistics.failuresByType.timeout,
      TIMEOUT_PERCENT: this.calculatePercent(data.statistics.failuresByType.timeout, data.statistics.totalFailures),
      NOT_FOUND_COUNT: data.statistics.failuresByType.not_found,
      NOT_FOUND_PERCENT: this.calculatePercent(data.statistics.failuresByType.not_found, data.statistics.totalFailures),
      GATEWAY_ERROR_COUNT: data.statistics.failuresByType.gateway_error,
      GATEWAY_ERROR_PERCENT: this.calculatePercent(data.statistics.failuresByType.gateway_error, data.statistics.totalFailures),
      NETWORK_ERROR_COUNT: data.statistics.failuresByType.network_error,
      NETWORK_ERROR_PERCENT: this.calculatePercent(data.statistics.failuresByType.network_error, data.statistics.totalFailures),
      PARSE_ERROR_COUNT: data.statistics.failuresByType.parse_error,
      PARSE_ERROR_PERCENT: this.calculatePercent(data.statistics.failuresByType.parse_error, data.statistics.totalFailures),
      OTHER_COUNT: data.statistics.failuresByType.other,
      OTHER_PERCENT: this.calculatePercent(data.statistics.failuresByType.other, data.statistics.totalFailures),

      // Gateway-specific stats (for ipfs.io example)
      IPFS_IO_TIMEOUTS: this.countGatewayErrors('https://ipfs.io/ipfs/', 'timeout'),
      IPFS_IO_NOT_FOUND: this.countGatewayErrors('https://ipfs.io/ipfs/', 'not_found'),
      IPFS_IO_TOTAL_FAILURES: data.statistics.failuresByGateway['https://ipfs.io/ipfs/'] || 0,

      // Severity counts
      CRITICAL_COUNT: this.countBySeverity('critical'),
      HIGH_COUNT: this.countBySeverity('high'),
      MEDIUM_COUNT: this.countBySeverity('medium'),
      LOW_COUNT: this.countBySeverity('low'),

      // Retryable count
      RETRYABLE_COUNT: this.failures.filter(f => f.retryable).length,

      // Dynamic sections
      GATEWAY_FAILURE_TABLE: this.generateGatewayTable(data.statistics.failuresByGateway),
      SAMPLE_FAILURES_SECTION: this.generateSampleFailures(data.failures.slice(0, 5)),
      GATEWAY_LIST: this.generateGatewayList(),
      FAILED_CID_LIST: this.generateFailedCIDList(data.failures),

      // Config placeholders
      TIMEOUT_MS: 10000,
      RETRY_COUNT: 3,
      CONCURRENCY: 5,
      GATEWAY_ROTATION_ENABLED: true
    };

    // Replace all placeholders
    for (const [key, value] of Object.entries(replacements)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      template = template.replace(regex, value);
    }

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    const filename = `ipfs-availability-report-${this.scanMetadata.scanId}.md`;
    const filepath = path.join(outputDir, filename);

    await fs.writeFile(filepath, template, 'utf8');

    console.log(`📝 IPFS Availability Report (Markdown) saved to: ${filepath}`);
    return filepath;
  }

  /**
   * Helper: Calculate percentage
   */
  calculatePercent(part, total) {
    return total > 0 ? ((part / total) * 100).toFixed(1) : '0.0';
  }

  /**
   * Helper: Count gateway-specific errors
   */
  countGatewayErrors(gateway, errorType) {
    return this.failures.filter(f =>
      f.errorType === errorType &&
      f.gatewayAttempts.some(a => a.gateway === gateway)
    ).length;
  }

  /**
   * Helper: Count by severity
   */
  countBySeverity(severity) {
    return this.failures.filter(f => f.severity === severity).length;
  }

  /**
   * Helper: Generate gateway failure table
   */
  generateGatewayTable(failuresByGateway) {
    let table = '| Gateway | Failures | Percentage |\n';
    table += '|---------|----------|------------|\n';

    const total = this.failures.length;
    for (const [gateway, count] of Object.entries(failuresByGateway)) {
      const percent = this.calculatePercent(count, total);
      table += `| ${gateway} | ${count} | ${percent}% |\n`;
    }

    return table || '| No gateway failures recorded | - | - |\n';
  }

  /**
   * Helper: Generate sample failures section
   */
  generateSampleFailures(sampleFailures) {
    if (sampleFailures.length === 0) {
      return '**No failures recorded**\n';
    }

    let section = '';
    sampleFailures.forEach((failure, index) => {
      section += `#### Failure ${index + 1}: ${failure.errorType.toUpperCase()}\n\n`;
      section += `- **CID**: \`${failure.cid}\`\n`;
      section += `- **Content Type**: ${failure.contentType}\n`;
      section += `- **NFT Token**: ${failure.nftToken.tokenId} (${failure.nftToken.contractAddress})\n`;
      section += `- **Severity**: ${failure.severity}\n`;
      section += `- **Error**: ${failure.errorDetails.message}\n`;
      section += `- **Retryable**: ${failure.retryable ? 'Yes' : 'No'}\n`;
      section += `- **Gateways Attempted**: ${failure.gatewayAttempts.length}\n\n`;
    });

    return section;
  }

  /**
   * Helper: Generate gateway list
   */
  generateGatewayList() {
    return this.gateways.map((g, i) => `${i + 1}. ${g}`).join('\n');
  }

  /**
   * Helper: Generate failed CID list
   */
  generateFailedCIDList(failures) {
    const uniqueCIDs = [...new Set(failures.map(f => f.cid))];
    return uniqueCIDs.map((cid, i) => `${i + 1}. \`${cid}\``).join('\n');
  }

  /**
   * Get summary for console output
   */
  getSummary() {
    const stats = this.calculateStatistics();
    return {
      totalAttempts: stats.totalAttempts,
      totalFailures: stats.totalFailures,
      successRate: stats.successRate,
      uniqueFailedCIDs: stats.uniqueFailedCIDs,
      affectedTokens: stats.affectedTokens
    };
  }
}

export default IPFSAvailabilityTracker;
