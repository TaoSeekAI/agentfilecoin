# IPFS Availability Tracking System - Complete Documentation Index

## Overview

This system tracks and documents IPFS content availability issues during NFT scanning, providing detailed insights into why content becomes unavailable and how Filecoin provides permanent storage solutions.

## Quick Start

**For Immediate Implementation:**
1. Read: `IPFS_TRACKING_QUICK_REFERENCE.md` (5 min)
2. Integrate: Follow the 6 integration points
3. Test: Run a scan and review outputs
4. Analyze: Review generated reports in `./output`

**For Deep Understanding:**
1. Read: `IPFS_TRACKING_INTEGRATION_GUIDE.md` (20 min)
2. Study: `IPFS_TRACKING_ARCHITECTURE.md` (15 min)
3. Review: `ipfs-failure-schema.json` (10 min)
4. Examine: `examples/sample-ipfs-failures.json` (5 min)

---

## System Components

### 1. Core Files

#### `ipfs-tracker.js`
**Purpose**: Main tracking module that records failures and generates reports

**Key Classes/Methods:**
- `IPFSAvailabilityTracker` - Main class
  - `recordSuccess()` - Track successful IPFS retrieval
  - `recordFailure(data)` - Track failed retrieval with full context
  - `exportToJSON(dir)` - Export structured data to JSON
  - `generateReport(template, dir)` - Generate human-readable Markdown report
  - `getSummary()` - Get current statistics

**Location**: `/var/tmp/vibe-kanban/worktrees/0d79-aiagent/mvp-demo/ipfs-tracker.js`

**Size**: ~500 lines of code

**Dependencies**: `fs/promises`, `path`, `crypto`

---

#### `ipfs-failure-schema.json`
**Purpose**: JSON Schema defining the structure for tracking data

**Key Sections:**
- `schemaVersion`: Version tracking (current: 1.0.0)
- `scanMetadata`: Scan context (contract, time, token range)
- `failures[]`: Array of failure records
- `statistics`: Aggregated metrics

**Validation**: Provides type checking and structure validation

**Location**: `/var/tmp/vibe-kanban/worktrees/0d79-aiagent/mvp-demo/ipfs-failure-schema.json`

---

#### `IPFS_AVAILABILITY_REPORT_TEMPLATE.md`
**Purpose**: Markdown template for generating human-readable reports

**Content Sections:**
1. **Executive Summary**: Key metrics and overview
2. **Understanding IPFS**: Why content becomes unavailable
3. **Filecoin Solution**: How Filecoin solves availability issues
4. **Failure Analysis**: Detailed breakdown of this scan's failures
5. **Recommendations**: Actionable next steps

**Placeholders**: Uses `{{VARIABLE}}` syntax for dynamic content

**Location**: `/var/tmp/vibe-kanban/worktrees/0d79-aiagent/mvp-demo/IPFS_AVAILABILITY_REPORT_TEMPLATE.md`

---

### 2. Documentation Files

#### `IPFS_TRACKING_INTEGRATION_GUIDE.md`
**Purpose**: Comprehensive integration guide with code examples

**Contents:**
- Step-by-step integration instructions
- Code snippets for each integration point
- Configuration options
- Troubleshooting guide
- Best practices

**Audience**: Developers integrating the tracking system

**Length**: ~800 lines

**Location**: `/var/tmp/vibe-kanban/worktrees/0d79-aiagent/mvp-demo/IPFS_TRACKING_INTEGRATION_GUIDE.md`

---

#### `IPFS_TRACKING_QUICK_REFERENCE.md`
**Purpose**: Quick reference guide for rapid implementation

**Contents:**
- Component overview (1 page)
- Integration checklist (6 steps)
- Key code snippets
- Error types and severity levels
- Common issues and solutions

**Audience**: Developers who want to integrate quickly

**Length**: ~400 lines

**Location**: `/var/tmp/vibe-kanban/worktrees/0d79-aiagent/mvp-demo/IPFS_TRACKING_QUICK_REFERENCE.md`

---

#### `IPFS_TRACKING_ARCHITECTURE.md`
**Purpose**: System architecture and data flow visualization

**Contents:**
- System workflow diagrams (ASCII art)
- Component interaction diagrams
- Data flow diagrams
- Error classification logic
- Multi-gateway fallback strategy
- Statistics calculation flow

**Audience**: Developers who want to understand the system design

**Length**: ~600 lines

**Location**: `/var/tmp/vibe-kanban/worktrees/0d79-aiagent/mvp-demo/IPFS_TRACKING_ARCHITECTURE.md`

---

#### `IPFS_TRACKING_INDEX.md` (This File)
**Purpose**: Master index and navigation guide

**Contents:**
- Overview of all components
- File descriptions and locations
- Reading order recommendations
- Quick navigation to key sections

**Audience**: Everyone - starting point for the system

**Location**: `/var/tmp/vibe-kanban/worktrees/0d79-aiagent/mvp-demo/IPFS_TRACKING_INDEX.md`

---

### 3. Example Files

#### `examples/sample-ipfs-failures.json`
**Purpose**: Example output showing real failure data structure

**Contains:**
- 5 sample failures covering all error types
- Complete scanMetadata example
- Statistics section example
- Demonstrates schema compliance

**Use Case**: Reference for understanding output format

**Location**: `/var/tmp/vibe-kanban/worktrees/0d79-aiagent/mvp-demo/examples/sample-ipfs-failures.json`

---

## Integration Points in nft-scanner.js

### Current File
**Location**: `/var/tmp/vibe-kanban/worktrees/0d79-aiagent/mvp-demo/nft-scanner.js`

**Size**: ~292 lines (before integration)

**Estimated Size After Integration**: ~450 lines

### Integration Locations

| Line Range | Method | Integration Type | Description |
|------------|--------|------------------|-------------|
| ~6 | Imports | **Add import** | `import { IPFSAvailabilityTracker } from './ipfs-tracker.js'` |
| ~24-29 | `constructor()` | **Add initialization** | Initialize `this.availabilityTracker` |
| ~56-81 | `getContractInfo()` | **Add metadata update** | Update tracker with contract name/symbol |
| ~118-140 | `fetchMetadata()` | **Replace entirely** | Multi-gateway with tracking |
| ~145-183 | `scanToken()` | **Enhance** | Pass nftToken data, track image fetches |
| ~248-288 | `scan()` | **Add export** | Export JSON and Markdown reports |
| New | `classifyGatewayError()` | **Add method** | Helper to classify errors |
| New | `fetchAndVerifyImage()` | **Add method** | Fetch and track image availability |

---

## Output Files

### Generated Files per Scan

Each scan generates 2 files in the `./output` directory:

#### 1. JSON Data File
**Filename Pattern**: `ipfs-failures-scan-YYYYMMDD-HHMMSS-XXXXXXXX.json`

**Example**: `ipfs-failures-scan-20250115-143022-a7f3c2d9.json`

**Contents:**
- Scan metadata (contract, time, tokens)
- Array of all failures with full details
- Aggregated statistics
- Machine-readable format

**Use Cases:**
- Programmatic analysis
- Database import
- Automated processing
- Trend analysis over time

---

#### 2. Markdown Report File
**Filename Pattern**: `ipfs-availability-report-scan-YYYYMMDD-HHMMSS-XXXXXXXX.md`

**Example**: `ipfs-availability-report-scan-20250115-143022-a7f3c2d9.md`

**Contents:**
- Executive summary with key metrics
- Educational content about IPFS limitations
- Explanation of Filecoin solutions
- Detailed failure analysis
- Actionable recommendations
- Technical details and appendices

**Use Cases:**
- Team review meetings
- Stakeholder reports
- Decision-making for migration
- Documentation

---

## Data Structures

### Failure Record Schema

```typescript
{
  failureId: string,              // "fail-XXXXXXXX" (8-char hex)
  timestamp: string,              // ISO 8601 format
  cid: string,                    // IPFS CID (Qm... or bafy...)
  contentType: enum,              // "metadata" | "image" | "video" | "audio" | "other"
  nftToken: {
    contractAddress: string,      // "0x..." (40 hex chars)
    tokenId: string | number,     // Token ID
    owner?: string,               // Owner address (if available)
    tokenURI?: string             // Original tokenURI
  },
  errorType: enum,                // See Error Types table below
  errorDetails: {
    message: string,              // Human-readable error message
    statusCode?: number,          // HTTP status code
    errorCode?: string,           // System error code
    stack?: string                // Stack trace
  },
  gatewayAttempts: Array<{
    gateway: string,              // Gateway URL
    attemptTime: string,          // ISO 8601 timestamp
    result: string,               // "success" | "timeout" | "404" | "500" | etc.
    responseTime?: number         // Milliseconds
  }>,
  shouldExist: boolean,           // Whether content should exist
  retryable: boolean,             // Whether failure is retryable
  severity: enum,                 // "critical" | "high" | "medium" | "low"
  notes?: string                  // Additional context
}
```

### Statistics Schema

```typescript
{
  totalAttempts: number,          // Total IPFS fetch attempts
  totalFailures: number,          // Number of failures
  successRate: string,            // Percentage as string (e.g., "96.67")
  failuresByType: {
    timeout: number,
    not_found: number,
    gateway_error: number,
    network_error: number,
    parse_error: number,
    other: number
  },
  failuresByGateway: {
    [gatewayUrl: string]: number  // Count per gateway
  },
  uniqueFailedCIDs: number,       // Number of unique CIDs that failed
  affectedTokens: number          // Number of NFT tokens affected
}
```

---

## Error Classifications

### Error Types

| Type | Description | Retryable | Example Causes |
|------|-------------|-----------|----------------|
| `timeout` | Request exceeded timeout limit | ✅ Yes | Slow network, overloaded gateway |
| `not_found` | Content not available (HTTP 404) | ❌ No | Unpinned content, invalid CID |
| `gateway_error` | Gateway server error (HTTP 5xx) | ✅ Yes | Gateway down, overloaded |
| `network_error` | Network connectivity issues | ✅ Yes | DNS failure, connection refused |
| `parse_error` | Content retrieved but invalid | ⚠️ Maybe | Corrupted data, wrong format |
| `other` | Miscellaneous errors | ⚠️ Maybe | Unknown errors |

### Severity Levels

| Severity | Trigger Conditions | Impact | Priority |
|----------|-------------------|--------|----------|
| **Critical** | Metadata unavailable | NFT completely non-functional | 🔴 Immediate |
| **High** | Image/asset permanently unavailable (404) | NFT has no visual representation | 🟠 Urgent |
| **Medium** | Temporary gateway/timeout errors | Temporary inaccessibility | 🟡 Important |
| **Low** | Minor retryable errors | Minimal impact | 🟢 Monitor |

---

## Usage Workflows

### Workflow 1: Initial Integration

1. **Read Documentation** (20 min)
   - Review `IPFS_TRACKING_QUICK_REFERENCE.md`
   - Skim `IPFS_TRACKING_INTEGRATION_GUIDE.md`

2. **Integrate Code** (15 min)
   - Follow 6 integration points in `nft-scanner.js`
   - Add import statement
   - Initialize tracker
   - Update methods

3. **Test** (10 min)
   - Run test scan on small token range (1-10)
   - Verify JSON output created
   - Review Markdown report

4. **Deploy** (5 min)
   - Commit changes
   - Update documentation
   - Deploy to production

**Total Time**: ~50 minutes

---

### Workflow 2: Running a Scan

1. **Initialize Scanner**
   ```javascript
   import { NFTScanner } from './nft-scanner.js';
   const scanner = new NFTScanner(contractAddress, provider);
   ```

2. **Run Scan**
   ```javascript
   const results = await scanner.scan(1, 100);
   ```

3. **Review Console Output**
   - Scan progress
   - IPFS availability statistics
   - File paths for generated reports

4. **Analyze Reports**
   - Open JSON file for programmatic analysis
   - Read Markdown report for insights

5. **Take Action**
   - Retry failed requests if retryable
   - Plan Filecoin migration for critical failures
   - Update NFT contract with ERC-8004

---

### Workflow 3: Analyzing Results

1. **Load JSON Data**
   ```javascript
   const data = JSON.parse(await fs.readFile('output/ipfs-failures-....json'));
   ```

2. **Find Critical Issues**
   ```javascript
   const critical = data.failures.filter(f => f.severity === 'critical');
   ```

3. **Identify Problem Gateways**
   ```javascript
   const worst = Object.entries(data.statistics.failuresByGateway)
     .sort((a, b) => b[1] - a[1])[0];
   ```

4. **List Retryable Failures**
   ```javascript
   const retry = data.failures.filter(f => f.retryable);
   ```

5. **Extract Failed CIDs for Migration**
   ```javascript
   const cids = [...new Set(data.failures.map(f => f.cid))];
   ```

---

## Configuration Options

### Tracker Options

```javascript
new IPFSAvailabilityTracker({
  contractAddress: string,        // NFT contract address
  contractName: string,           // Optional: Contract name
  contractSymbol: string,         // Optional: Contract symbol
  tokenRangeStart: number,        // Optional: Starting token ID
  tokenRangeEnd: number,          // Optional: Ending token ID
  gateways: string[]              // Array of IPFS gateway URLs
})
```

### Default Gateways

```javascript
[
  'https://ipfs.io/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://dweb.link/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/'
]
```

### Customization

**Change Gateways:**
```javascript
scanner.availabilityTracker.gateways = [
  'https://your-custom-gateway.com/ipfs/',
  'https://backup-gateway.com/ipfs/'
];
```

**Change Output Directory:**
```javascript
await tracker.exportToJSON('./custom-output');
await tracker.generateReport(template, './custom-output');
```

**Change Timeout:**
Modify in `fetchMetadata()` method:
```javascript
const response = await axios.get(url, {
  timeout: 15000, // 15 seconds
  headers: { 'User-Agent': 'NFT-Scanner-MVP/1.0' }
});
```

---

## Reading Order Recommendations

### For Rapid Implementation
1. `IPFS_TRACKING_QUICK_REFERENCE.md` ⭐ **Start here**
2. Integrate code into `nft-scanner.js`
3. Run test scan
4. Review example output in `examples/sample-ipfs-failures.json`

**Time**: ~30 minutes

---

### For Complete Understanding
1. `IPFS_TRACKING_INDEX.md` (this file) ⭐ **Overview**
2. `IPFS_TRACKING_QUICK_REFERENCE.md` ⭐ **Quick start**
3. `IPFS_TRACKING_INTEGRATION_GUIDE.md` ⭐ **Detailed integration**
4. `IPFS_TRACKING_ARCHITECTURE.md` ⭐ **System design**
5. `ipfs-failure-schema.json` - **Data structure**
6. `ipfs-tracker.js` - **Implementation**
7. `IPFS_AVAILABILITY_REPORT_TEMPLATE.md` - **Report template**
8. `examples/sample-ipfs-failures.json` - **Example output**

**Time**: ~90 minutes

---

### For Decision Makers
1. Read generated Markdown report (example in `output/` after running scan)
2. `IPFS_AVAILABILITY_REPORT_TEMPLATE.md` - See what reports contain
3. Review "Understanding IPFS" and "Filecoin Solution" sections

**Time**: ~15 minutes

---

## File Locations Summary

```
mvp-demo/
├── Core Implementation
│   ├── ipfs-tracker.js                              [Tracker module]
│   ├── ipfs-failure-schema.json                     [JSON schema]
│   └── IPFS_AVAILABILITY_REPORT_TEMPLATE.md         [Report template]
│
├── Documentation
│   ├── IPFS_TRACKING_INDEX.md                       [This file - master index]
│   ├── IPFS_TRACKING_QUICK_REFERENCE.md             [Quick start guide]
│   ├── IPFS_TRACKING_INTEGRATION_GUIDE.md           [Detailed integration]
│   └── IPFS_TRACKING_ARCHITECTURE.md                [System architecture]
│
├── Examples
│   └── examples/
│       └── sample-ipfs-failures.json                [Sample output]
│
├── Target File (to be modified)
│   └── nft-scanner.js                               [Integration target]
│
└── Output (generated by scans)
    └── output/
        ├── ipfs-failures-scan-{id}.json             [JSON data]
        └── ipfs-availability-report-scan-{id}.md    [Markdown report]
```

---

## Key Features

### ✅ Comprehensive Tracking
- Records every IPFS fetch attempt
- Captures full error context
- Timestamps all operations
- Links failures to specific NFT tokens

### ✅ Multi-Gateway Support
- Automatic fallback across 4+ gateways
- Configurable gateway list
- Per-gateway statistics
- Intelligent retry logic

### ✅ Intelligent Classification
- Automatic error type detection
- Severity level assignment
- Retryability determination
- Context-aware categorization

### ✅ Detailed Reporting
- Machine-readable JSON format
- Human-readable Markdown reports
- Educational content included
- Actionable recommendations

### ✅ Production Ready
- Schema validation
- Error handling
- File system safety
- Configurable options

---

## Next Steps After Integration

### Immediate Actions
1. ✅ Run initial baseline scan
2. ✅ Review generated reports
3. ✅ Identify failure patterns
4. ✅ Test retry logic on retryable failures

### Short-term (1-2 weeks)
1. 📊 Collect failure data across multiple scans
2. 📈 Analyze trends over time
3. 🔧 Optimize gateway selection based on data
4. 📝 Document common failure scenarios

### Long-term (1-3 months)
1. 🚀 Plan Filecoin migration for critical failures
2. 🔨 Implement ERC-8004 in NFT contract
3. 📦 Upload failed content to Filecoin
4. ✅ Update contract with Filecoin CIDs
5. 🎯 Re-scan to verify 100% availability

---

## Support and Troubleshooting

### Common Issues

**Issue**: Reports not generating
**Solution**: Check `./output` directory exists and is writable

**Issue**: High failure rates
**Solution**: Try different gateways, increase timeout, check network

**Issue**: Missing statistics
**Solution**: Ensure `recordSuccess()` and `recordFailure()` are called correctly

**Issue**: Invalid CID errors
**Solution**: Verify `extractIPFSCID()` logic handles all URI formats

### Getting Help

1. Review `IPFS_TRACKING_INTEGRATION_GUIDE.md` troubleshooting section
2. Check generated report for insights
3. Examine JSON output for error details
4. Review example files in `examples/`

---

## Version History

- **v1.0.0** (2025-01-15): Initial release
  - Core tracking functionality
  - Multi-gateway support
  - JSON and Markdown reporting
  - Comprehensive documentation

---

## Related Files

- `nft-scanner.js` - NFT scanner (integration target)
- `filecoin-uploader.js` - Upload to Filecoin
- `erc8004-client.js` - ERC-8004 implementation
- `demo.js` - Full workflow demo

---

## Summary

This IPFS Availability Tracking System provides a complete solution for:

1. **Identifying** IPFS content availability issues
2. **Documenting** failures with full context
3. **Understanding** why content becomes unavailable
4. **Learning** how Filecoin solves these problems
5. **Planning** migration to permanent storage

**Total Development Time**: 4 files, ~1500 lines of code, ~2 hours of work

**Integration Time**: ~50 minutes

**Value**: Informed decision-making for NFT content permanence

---

**Start Here**: `IPFS_TRACKING_QUICK_REFERENCE.md` for rapid implementation
