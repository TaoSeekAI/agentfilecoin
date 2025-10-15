# IPFS Availability Tracking - Quick Reference

## System Components

### 1. JSON Schema (`ipfs-failure-schema.json`)

Defines the data structure for tracking IPFS failures.

**Key Fields:**
- `scanMetadata`: Information about the scan (contract, time, tokens)
- `failures[]`: Array of failure records
- `statistics`: Aggregated metrics

**Failure Record Structure:**
```json
{
  "failureId": "fail-a7f3c2d9",
  "timestamp": "2025-01-15T14:30:22.000Z",
  "cid": "QmYourCID...",
  "contentType": "metadata|image|video|audio|other",
  "nftToken": {
    "contractAddress": "0x...",
    "tokenId": "123",
    "owner": "0x...",
    "tokenURI": "ipfs://..."
  },
  "errorType": "timeout|not_found|gateway_error|network_error|parse_error|other",
  "gatewayAttempts": [...],
  "severity": "critical|high|medium|low",
  "retryable": true|false
}
```

### 2. Tracker Module (`ipfs-tracker.js`)

JavaScript class for recording and reporting failures.

**Key Methods:**
- `recordSuccess()`: Track successful retrieval
- `recordFailure(data)`: Track failed retrieval
- `exportToJSON(dir)`: Export to JSON file
- `generateReport(template, dir)`: Generate Markdown report
- `getSummary()`: Get current statistics

### 3. Report Template (`IPFS_AVAILABILITY_REPORT_TEMPLATE.md`)

Markdown template with educational content and analysis.

**Sections:**
- Executive Summary
- IPFS limitations explained
- Filecoin solution explained
- Failure analysis
- Recommendations

## Integration Checklist

### Step 1: Import Tracker
```javascript
import { IPFSAvailabilityTracker } from './ipfs-tracker.js';
```

### Step 2: Initialize in Constructor
```javascript
constructor(contractAddress, provider, ipfsGateway) {
  // ... existing code ...

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

### Step 3: Update Contract Info
```javascript
async getContractInfo() {
  // ... existing code ...

  this.availabilityTracker.scanMetadata.contractName = name;
  this.availabilityTracker.scanMetadata.contractSymbol = symbol;

  return { address, name, symbol, type, totalSupply };
}
```

### Step 4: Track in fetchMetadata
```javascript
async fetchMetadata(tokenURI, nftToken = {}) {
  const gatewayAttempts = [];
  let lastError = null;

  // Try primary gateway
  try {
    const response = await axios.get(url, { timeout: 10000 });
    this.availabilityTracker.recordSuccess();
    return response.data;
  } catch (error) {
    lastError = error;
    gatewayAttempts.push({
      gateway: this.ipfsGateway,
      attemptTime: new Date().toISOString(),
      result: this.classifyGatewayError(error)
    });
  }

  // Try fallback gateways
  for (const gateway of this.availabilityTracker.gateways) {
    try {
      const response = await axios.get(`${gateway}${cid}`, { timeout: 10000 });
      this.availabilityTracker.recordSuccess();
      return response.data;
    } catch (error) {
      lastError = error;
      gatewayAttempts.push({
        gateway: gateway,
        attemptTime: new Date().toISOString(),
        result: this.classifyGatewayError(error)
      });
    }
  }

  // All failed - record
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
    gatewayAttempts
  });

  return null;
}
```

### Step 5: Add Error Classifier
```javascript
classifyGatewayError(error) {
  if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
    return 'timeout';
  }
  if (error.response?.status === 404) return '404';
  if (error.response?.status >= 500) return '500';
  if (error.code === 'ENOTFOUND') return 'network_error';
  return 'other';
}
```

### Step 6: Export Reports in scan()
```javascript
async scan(startTokenId, endTokenId) {
  // Set token range
  this.availabilityTracker.scanMetadata.tokenRange = {
    start: startTokenId,
    end: endTokenId
  };

  // ... run scan ...

  // Export reports
  await this.availabilityTracker.exportToJSON('./output');
  await this.availabilityTracker.generateReport(
    './IPFS_AVAILABILITY_REPORT_TEMPLATE.md',
    './output'
  );

  return results;
}
```

## Key Locations in nft-scanner.js

### Where to Catch Failures

1. **Line 118-139**: `fetchMetadata()` method
   - **Current**: Single try/catch with simple error logging
   - **New**: Multi-gateway attempts with detailed tracking
   - **Records**: Metadata retrieval failures

2. **Line 145-183**: `scanToken()` method
   - **Current**: Calls fetchMetadata without tracking
   - **New**: Pass nftToken data to fetchMetadata, track image failures
   - **Records**: Both metadata and image failures

3. **Line 248-288**: `scan()` method
   - **Current**: No tracking output
   - **New**: Export JSON and Markdown reports
   - **Records**: Final statistics and reports

### How to Record Failures

**Success:**
```javascript
this.availabilityTracker.recordSuccess();
```

**Failure:**
```javascript
this.availabilityTracker.recordFailure({
  cid: 'QmYourCID...',
  contentType: 'metadata|image',
  nftToken: {
    contractAddress: '0x...',
    tokenId: 123,
    owner: '0x...',
    tokenURI: 'ipfs://...'
  },
  error: errorObject,
  gatewayAttempts: [
    {
      gateway: 'https://ipfs.io/ipfs/',
      attemptTime: '2025-01-15T14:30:22.000Z',
      result: 'timeout|404|500|network_error|other',
      responseTime: 5000 // optional, in ms
    }
  ],
  shouldExist: true, // optional
  notes: 'Additional context' // optional
});
```

## Output Files

### File Naming

- **Scan ID**: `scan-YYYYMMDD-HHMMSS-XXXXXXXX`
- **JSON**: `ipfs-failures-{scanId}.json`
- **Report**: `ipfs-availability-report-{scanId}.md`

### Example Output

```
output/
├── ipfs-failures-scan-20250115-143022-a7f3c2d9.json
└── ipfs-availability-report-scan-20250115-143022-a7f3c2d9.md
```

## Error Types

| Type | Trigger | Example |
|------|---------|---------|
| `timeout` | Request exceeds timeout | ECONNABORTED, 10s timeout |
| `not_found` | HTTP 404 | Gateway returns 404 |
| `gateway_error` | HTTP 5xx | 500, 503 errors |
| `network_error` | Network issues | ENOTFOUND, ECONNREFUSED |
| `parse_error` | Invalid response | JSON.parse fails |
| `other` | Misc errors | Unknown errors |

## Severity Levels

| Severity | Condition | Impact |
|----------|-----------|--------|
| `critical` | Metadata unavailable | NFT non-functional |
| `high` | Image 404 (permanent) | Primary asset lost |
| `medium` | Timeout/gateway error | Temporary issue |
| `low` | Retryable errors | Minor issue |

## Statistics Included

```javascript
{
  totalAttempts: 150,
  totalFailures: 23,
  successRate: "84.67",
  failuresByType: {
    timeout: 12,
    not_found: 8,
    gateway_error: 2,
    network_error: 1,
    parse_error: 0,
    other: 0
  },
  failuresByGateway: {
    "https://ipfs.io/ipfs/": 15,
    "https://gateway.pinata.cloud/ipfs/": 8
  },
  uniqueFailedCIDs: 18,
  affectedTokens: 20
}
```

## Usage Pattern

```javascript
// 1. Import
import { NFTScanner } from './nft-scanner.js';

// 2. Create scanner (tracker auto-initializes)
const scanner = new NFTScanner(contractAddress, provider);

// 3. Run scan (reports auto-generate)
const results = await scanner.scan(1, 100);

// 4. Check availability stats
console.log(results.availabilityStats);

// 5. Review reports in ./output directory
```

## Testing the Integration

### Test 1: Successful Retrieval
```javascript
// Should increment attempts and successes
await scanner.fetchMetadata('ipfs://QmValidCID...');
// Check: tracker.attempts++, tracker.successes++
```

### Test 2: Failed Retrieval
```javascript
// Should record failure with details
await scanner.fetchMetadata('ipfs://QmInvalidCID...');
// Check: tracker.failures.length++, failure object created
```

### Test 3: Multi-Gateway Fallback
```javascript
// Should try multiple gateways
await scanner.fetchMetadata('ipfs://QmSlowCID...');
// Check: gatewayAttempts.length > 1
```

### Test 4: Report Generation
```javascript
// Should create both JSON and MD files
await scanner.scan(1, 10);
// Check: ./output directory has 2 new files
```

## Common Issues

### Issue: Tracker not initialized
**Symptom**: `Cannot read property 'recordSuccess' of undefined`
**Fix**: Add tracker initialization in constructor

### Issue: Reports not generated
**Symptom**: No files in ./output
**Fix**: Ensure output directory exists and is writable

### Issue: Missing gateway attempts
**Symptom**: gatewayAttempts array is empty
**Fix**: Record attempt before each try/catch

### Issue: Incorrect error classification
**Symptom**: All errors marked as 'other'
**Fix**: Check classifyGatewayError() logic

## Advanced Features

### Custom Gateways
```javascript
scanner.availabilityTracker.gateways = [
  'https://your-gateway.com/ipfs/',
  'https://backup-gateway.com/ipfs/'
];
```

### Custom Output Directory
```javascript
await tracker.exportToJSON('./custom-dir');
await tracker.generateReport(template, './custom-dir');
```

### Programmatic Analysis
```javascript
const data = tracker.finalizeScan();
const criticalFailures = data.failures.filter(f => f.severity === 'critical');
const retryableFailures = data.failures.filter(f => f.retryable);
```

## Quick Reference: Integration Summary

**3 Files Created:**
1. `ipfs-failure-schema.json` - Data structure definition
2. `ipfs-tracker.js` - Tracking module
3. `IPFS_AVAILABILITY_REPORT_TEMPLATE.md` - Report template

**6 Integration Points in nft-scanner.js:**
1. Import tracker module
2. Initialize in constructor
3. Update contract info
4. Enhance fetchMetadata with tracking
5. Add error classifier helper
6. Export reports in scan method

**2 Output Files per Scan:**
1. JSON data file (machine-readable)
2. Markdown report (human-readable)

**4 Error Categories:**
1. Temporary (timeout, gateway_error, network_error) - Retryable
2. Permanent (not_found) - Requires migration
3. Data issues (parse_error) - Content corrupted
4. Unknown (other) - Needs investigation

**Next Steps:**
1. Integrate tracker into nft-scanner.js
2. Run test scan
3. Review generated reports
4. Plan Filecoin migration based on failure data
