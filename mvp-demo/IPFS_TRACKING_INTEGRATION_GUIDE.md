# IPFS Availability Tracking Integration Guide

This guide explains how to integrate the IPFS availability tracking system into the NFT scanner.

## Overview

The tracking system consists of three main components:

1. **JSON Schema** (`ipfs-failure-schema.json`) - Defines the data structure for tracking failures
2. **Report Template** (`IPFS_AVAILABILITY_REPORT_TEMPLATE.md`) - Markdown template for human-readable reports
3. **Tracker Module** (`ipfs-tracker.js`) - JavaScript module for recording and reporting failures

## Files Created

```
mvp-demo/
├── ipfs-failure-schema.json              # JSON schema definition
├── ipfs-tracker.js                       # Tracker module
├── IPFS_AVAILABILITY_REPORT_TEMPLATE.md  # Report template
└── IPFS_TRACKING_INTEGRATION_GUIDE.md    # This file
```

## Integration Points in nft-scanner.js

### 1. Import the Tracker

Add at the top of `nft-scanner.js`:

```javascript
import { IPFSAvailabilityTracker } from './ipfs-tracker.js';
```

### 2. Initialize Tracker in Constructor

Modify the `NFTScanner` constructor:

```javascript
constructor(contractAddress, provider, ipfsGateway = 'https://ipfs.io/ipfs/') {
  this.contractAddress = contractAddress;
  this.provider = provider;
  this.ipfsGateway = ipfsGateway;
  this.contract = new ethers.Contract(contractAddress, ERC721_ABI, provider);

  // ADD THIS: Initialize availability tracker
  this.availabilityTracker = new IPFSAvailabilityTracker({
    contractAddress: contractAddress,
    gateways: [
      'https://ipfs.io/ipfs/',
      'https://gateway.pinata.cloud/ipfs/',
      'https://dweb.link/ipfs/',
      'https://cloudflare-ipfs.com/ipfs/'
    ]
  });
}
```

### 3. Update Contract Info Method

Modify `getContractInfo()` to set tracker metadata:

```javascript
async getContractInfo() {
  try {
    const name = await this.contract.name();
    const symbol = await this.contract.symbol();
    const type = await this.detectContractType();

    let totalSupply = 0;
    try {
      totalSupply = await this.contract.totalSupply();
      totalSupply = Number(totalSupply);
    } catch (error) {
      console.log('Note: totalSupply() not available, will scan by token IDs');
    }

    // ADD THIS: Update tracker metadata
    this.availabilityTracker.scanMetadata.contractName = name;
    this.availabilityTracker.scanMetadata.contractSymbol = symbol;

    return {
      address: this.contractAddress,
      name,
      symbol,
      type,
      totalSupply
    };
  } catch (error) {
    console.error('Error getting contract info:', error.message);
    throw error;
  }
}
```

### 4. Enhance fetchMetadata with Tracking

**REPLACE** the existing `fetchMetadata()` method with this enhanced version:

```javascript
async fetchMetadata(tokenURI, nftToken = {}) {
  const gatewayAttempts = [];
  let lastError = null;

  // Try primary gateway first
  try {
    let url = tokenURI;

    // Convert IPFS URI to HTTP gateway
    if (tokenURI.startsWith('ipfs://')) {
      const cid = tokenURI.replace('ipfs://', '').replace('ipfs/', '');
      url = `${this.ipfsGateway}${cid}`;
    }

    const startTime = Date.now();
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'NFT-Scanner-MVP/1.0'
      }
    });

    const responseTime = Date.now() - startTime;

    gatewayAttempts.push({
      gateway: this.ipfsGateway,
      attemptTime: new Date().toISOString(),
      result: 'success',
      responseTime
    });

    // Record success
    this.availabilityTracker.recordSuccess();

    return response.data;
  } catch (error) {
    lastError = error;

    // Record the failed attempt
    gatewayAttempts.push({
      gateway: this.ipfsGateway,
      attemptTime: new Date().toISOString(),
      result: this.classifyGatewayError(error),
      responseTime: null
    });
  }

  // Try alternative gateways
  const cid = this.extractIPFSCID(tokenURI);
  if (cid && this.availabilityTracker.gateways.length > 1) {
    for (const gateway of this.availabilityTracker.gateways) {
      if (gateway === this.ipfsGateway) continue; // Skip primary gateway

      try {
        const url = `${gateway}${cid}`;
        const startTime = Date.now();
        const response = await axios.get(url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'NFT-Scanner-MVP/1.0'
          }
        });

        const responseTime = Date.now() - startTime;

        gatewayAttempts.push({
          gateway: gateway,
          attemptTime: new Date().toISOString(),
          result: 'success',
          responseTime
        });

        console.log(`  ✅ Retrieved from fallback gateway: ${gateway}`);

        // Record success
        this.availabilityTracker.recordSuccess();

        return response.data;
      } catch (error) {
        lastError = error;

        gatewayAttempts.push({
          gateway: gateway,
          attemptTime: new Date().toISOString(),
          result: this.classifyGatewayError(error),
          responseTime: null
        });
      }
    }
  }

  // All gateways failed - record the failure
  console.error(`❌ Error fetching metadata from ${tokenURI}:`, lastError.message);

  this.availabilityTracker.recordFailure({
    cid: cid || 'unknown',
    contentType: 'metadata',
    nftToken: {
      contractAddress: this.contractAddress,
      tokenId: nftToken.tokenId || 'unknown',
      owner: nftToken.owner || null,
      tokenURI: tokenURI
    },
    error: lastError,
    gatewayAttempts,
    shouldExist: true,
    notes: `All ${gatewayAttempts.length} gateway(s) failed`
  });

  return null;
}

/**
 * Helper method to classify gateway errors
 */
classifyGatewayError(error) {
  if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
    return 'timeout';
  }
  if (error.response?.status === 404) {
    return '404';
  }
  if (error.response?.status >= 500) {
    return '500';
  }
  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    return 'network_error';
  }
  return 'other';
}
```

### 5. Track Image Fetch Failures

Add a new method to fetch and track image availability:

```javascript
/**
 * Fetch and verify image content
 */
async fetchAndVerifyImage(imageURI, nftToken) {
  const gatewayAttempts = [];
  let lastError = null;
  const cid = this.extractIPFSCID(imageURI);

  if (!cid) {
    console.log('  ⚠️  No IPFS CID found in image URI');
    return false;
  }

  // Try all gateways
  for (const gateway of this.availabilityTracker.gateways) {
    try {
      const url = `${gateway}${cid}`;
      const startTime = Date.now();

      const response = await axios.head(url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'NFT-Scanner-MVP/1.0'
        }
      });

      const responseTime = Date.now() - startTime;

      gatewayAttempts.push({
        gateway: gateway,
        attemptTime: new Date().toISOString(),
        result: 'success',
        responseTime
      });

      // Record success
      this.availabilityTracker.recordSuccess();

      return true;
    } catch (error) {
      lastError = error;

      gatewayAttempts.push({
        gateway: gateway,
        attemptTime: new Date().toISOString(),
        result: this.classifyGatewayError(error),
        responseTime: null
      });
    }
  }

  // All gateways failed - record the failure
  console.error(`  ❌ Image unavailable: ${imageURI}`);

  this.availabilityTracker.recordFailure({
    cid,
    contentType: 'image',
    nftToken: {
      contractAddress: this.contractAddress,
      tokenId: nftToken.tokenId,
      owner: nftToken.owner,
      tokenURI: nftToken.tokenURI
    },
    error: lastError,
    gatewayAttempts,
    shouldExist: true,
    notes: `Image CID from metadata.image field`
  });

  return false;
}
```

### 6. Update scanToken Method

Modify the `scanToken()` method to use enhanced metadata fetching:

```javascript
async scanToken(tokenId) {
  try {
    // Get token URI
    const tokenURI = await this.contract.tokenURI(tokenId);

    // Get owner
    let owner = null;
    try {
      owner = await this.contract.ownerOf(tokenId);
    } catch (error) {
      console.log(`Token ${tokenId} might not exist or is burned`);
      return null;
    }

    // Extract metadata CID
    const metadataCID = this.extractIPFSCID(tokenURI);

    // Fetch metadata with tracking
    const nftToken = {
      tokenId,
      owner,
      tokenURI
    };
    const metadata = await this.fetchMetadata(tokenURI, nftToken);

    // Extract and verify image CID from metadata
    let imageCID = null;
    let imageAvailable = false;
    if (metadata && metadata.image) {
      imageCID = this.extractIPFSCID(metadata.image);
      if (imageCID) {
        imageAvailable = await this.fetchAndVerifyImage(metadata.image, {
          ...nftToken,
          metadataCID
        });
      }
    }

    return {
      tokenId,
      owner,
      tokenURI,
      metadataCID,
      metadata,
      imageCID,
      imageAvailable,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error(`Error scanning token ${tokenId}:`, error.message);
    return null;
  }
}
```

### 7. Update scan Method to Set Token Range

Modify the `scan()` method to set token range and export reports:

```javascript
async scan(startTokenId = 1, endTokenId = 10) {
  console.log('\n🔍 Starting NFT Scan with IPFS Availability Tracking...');
  console.log('='.repeat(60));

  // Set token range in tracker
  this.availabilityTracker.scanMetadata.tokenRange.start = startTokenId;
  this.availabilityTracker.scanMetadata.tokenRange.end = endTokenId;

  // Get contract info
  const contractInfo = await this.getContractInfo();
  console.log('\n📝 Contract Information:');
  console.log(`   Name: ${contractInfo.name}`);
  console.log(`   Symbol: ${contractInfo.symbol}`);
  console.log(`   Type: ${contractInfo.type}`);
  console.log(`   Address: ${contractInfo.address}`);
  if (contractInfo.totalSupply > 0) {
    console.log(`   Total Supply: ${contractInfo.totalSupply}`);
  }

  // Scan tokens
  const scanResults = await this.scanTokens(startTokenId, endTokenId);

  // Get unique CIDs
  const uniqueCIDs = this.getUniqueIPFSCIDs(scanResults);

  console.log('\n📊 Scan Summary:');
  console.log('='.repeat(60));
  console.log(`   Total Tokens Scanned: ${scanResults.summary.total}`);
  console.log(`   Successful: ${scanResults.summary.success}`);
  console.log(`   Failed: ${scanResults.summary.failed}`);
  console.log(`   Unique IPFS CIDs Found: ${uniqueCIDs.length}`);

  // Display availability statistics
  const availabilityStats = this.availabilityTracker.getSummary();
  console.log('\n📡 IPFS Availability Statistics:');
  console.log('='.repeat(60));
  console.log(`   Total Fetch Attempts: ${availabilityStats.totalAttempts}`);
  console.log(`   Successful Retrievals: ${availabilityStats.totalAttempts - availabilityStats.totalFailures}`);
  console.log(`   Failed Retrievals: ${availabilityStats.totalFailures}`);
  console.log(`   Success Rate: ${availabilityStats.successRate}%`);
  console.log(`   Unique Failed CIDs: ${availabilityStats.uniqueFailedCIDs}`);
  console.log(`   Affected Tokens: ${availabilityStats.affectedTokens}`);

  if (uniqueCIDs.length > 0) {
    console.log('\n📦 Unique IPFS CIDs:');
    uniqueCIDs.forEach((cid, index) => {
      console.log(`   ${index + 1}. ${cid}`);
    });
  }

  // Export tracking data
  console.log('\n💾 Exporting IPFS availability reports...');
  try {
    const jsonPath = await this.availabilityTracker.exportToJSON('./output');
    const reportPath = await this.availabilityTracker.generateReport(
      './IPFS_AVAILABILITY_REPORT_TEMPLATE.md',
      './output'
    );

    console.log(`\n✅ Reports generated successfully:`);
    console.log(`   JSON: ${jsonPath}`);
    console.log(`   Report: ${reportPath}`);
  } catch (error) {
    console.error(`\n❌ Error generating reports: ${error.message}`);
  }

  return {
    contractInfo,
    scanResults,
    uniqueCIDs,
    availabilityStats
  };
}
```

## Output Files

After running a scan with tracking enabled, the following files will be generated in the `./output` directory:

1. **JSON Data File**: `ipfs-failures-scan-YYYYMMDD-HHMMSS-XXXXXXXX.json`
   - Contains structured failure data conforming to the schema
   - Can be programmatically processed
   - Includes all metadata, failures, and statistics

2. **Markdown Report**: `ipfs-availability-report-scan-YYYYMMDD-HHMMSS-XXXXXXXX.md`
   - Human-readable analysis report
   - Includes explanations of IPFS limitations
   - Details how Filecoin solves availability issues
   - Provides actionable recommendations

## Usage Example

```javascript
import { NFTScanner } from './nft-scanner.js';
import { ethers } from 'ethers';

// Setup provider
const provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/YOUR_KEY');

// Create scanner (tracker is initialized automatically)
const scanner = new NFTScanner(
  '0xYourContractAddress',
  provider
);

// Run scan (reports will be generated automatically)
const results = await scanner.scan(1, 100);

// Access availability statistics
console.log('Availability Stats:', results.availabilityStats);
```

## File Naming Convention

All output files follow a consistent naming pattern:

- **Scan ID Format**: `scan-YYYYMMDD-HHMMSS-XXXXXXXX`
  - `YYYYMMDD`: Date (e.g., 20250115)
  - `HHMMSS`: Time (e.g., 143022)
  - `XXXXXXXX`: 8-character random hex (e.g., a7f3c2d9)

- **JSON File**: `ipfs-failures-{scanId}.json`
- **Report File**: `ipfs-availability-report-{scanId}.md`

## Error Classification

The tracker automatically classifies errors into the following types:

| Error Type | Description | Examples |
|------------|-------------|----------|
| `timeout` | Request exceeded timeout limit | ECONNABORTED, timeout errors |
| `not_found` | Content not available (HTTP 404) | Gateway returns 404 |
| `gateway_error` | Gateway server error (HTTP 5xx) | 500, 503 errors |
| `network_error` | Network connectivity issues | ENOTFOUND, ECONNREFUSED |
| `parse_error` | Content retrieved but invalid | JSON parse errors |
| `other` | Other unclassified errors | Miscellaneous |

## Severity Levels

Failures are assigned severity levels based on content type and error type:

- **Critical**: Metadata unavailable (NFT is non-functional)
- **High**: Primary asset permanently unavailable (image 404)
- **Medium**: Temporary gateway or timeout issues
- **Low**: Minor or retryable errors

## Multi-Gateway Fallback

The tracker supports multiple IPFS gateways with automatic fallback:

1. **Primary Gateway**: Configured in NFTScanner constructor
2. **Fallback Gateways**: Configured in tracker options

Default gateways (in order):
1. https://ipfs.io/ipfs/
2. https://gateway.pinata.cloud/ipfs/
3. https://dweb.link/ipfs/
4. https://cloudflare-ipfs.com/ipfs/

## Customization

### Custom Gateways

```javascript
const scanner = new NFTScanner(contractAddress, provider);

// Override default gateways
scanner.availabilityTracker.gateways = [
  'https://your-custom-gateway.com/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://gateway.pinata.cloud/ipfs/'
];
```

### Custom Timeouts

Modify the timeout in `fetchMetadata()`:

```javascript
const response = await axios.get(url, {
  timeout: 15000, // 15 seconds instead of 10
  headers: {
    'User-Agent': 'NFT-Scanner-MVP/1.0'
  }
});
```

### Custom Output Directory

```javascript
await this.availabilityTracker.exportToJSON('./custom-output-dir');
await this.availabilityTracker.generateReport(
  './IPFS_AVAILABILITY_REPORT_TEMPLATE.md',
  './custom-output-dir'
);
```

## Analyzing Results

### JSON Analysis

The JSON output can be analyzed programmatically:

```javascript
import fs from 'fs/promises';

const data = JSON.parse(await fs.readFile('output/ipfs-failures-scan-....json', 'utf8'));

// Find all critical failures
const criticalFailures = data.failures.filter(f => f.severity === 'critical');

// Find failures by specific CID
const cidFailures = data.failures.filter(f => f.cid === 'QmYourCID...');

// Get most problematic gateway
const gatewayStats = data.statistics.failuresByGateway;
const worstGateway = Object.entries(gatewayStats)
  .sort((a, b) => b[1] - a[1])[0];
```

### Report Analysis

The Markdown report provides:

1. **Executive Summary**: High-level metrics
2. **IPFS Education**: Why content becomes unavailable
3. **Filecoin Solution**: How Filecoin solves these issues
4. **Failure Analysis**: Detailed breakdown by type and gateway
5. **Recommendations**: Actionable next steps

## Best Practices

1. **Always Review Reports**: Check the Markdown report for insights
2. **Monitor Success Rates**: Track trends over time
3. **Rotate Gateways**: If one gateway consistently fails, remove it
4. **Retry Failures**: Many failures are temporary and retryable
5. **Plan Migration**: Use failure data to prioritize Filecoin migration

## Troubleshooting

### No Reports Generated

**Issue**: Output files not created

**Solutions**:
- Ensure `./output` directory is writable
- Check file permissions
- Verify template file exists at specified path

### High Failure Rates

**Issue**: More than 20% of requests fail

**Solutions**:
- Check network connectivity
- Try different gateways
- Increase timeout values
- Verify IPFS gateway availability (visit in browser)

### Missing Statistics

**Issue**: Some statistics show as 0 or undefined

**Solutions**:
- Ensure scanner methods are called in correct order
- Verify tracker is initialized before scanning
- Check that `recordSuccess()` and `recordFailure()` are called

## Next Steps

After integrating the tracking system:

1. **Run Initial Scan**: Establish baseline availability metrics
2. **Analyze Results**: Review the generated reports
3. **Identify Patterns**: Look for common failure types
4. **Plan Migration**: Prioritize content for Filecoin migration
5. **Implement ERC-8004**: Add contentURI() function to NFT contract
6. **Upload to Filecoin**: Use filecoin-uploader.js for migration
7. **Update Contract**: Point contentURI() to Filecoin CIDs
8. **Verify**: Re-scan to confirm 100% availability

## Support

For questions or issues:
- Review the JSON schema: `ipfs-failure-schema.json`
- Check the tracker module: `ipfs-tracker.js`
- Read the report template: `IPFS_AVAILABILITY_REPORT_TEMPLATE.md`
