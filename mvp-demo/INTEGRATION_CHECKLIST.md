# IPFS Availability Tracking - Integration Checklist

Use this checklist to ensure complete and correct integration of the IPFS tracking system.

## Pre-Integration

- [ ] Read `IPFS_TRACKING_QUICK_REFERENCE.md` (5 min)
- [ ] Review `IPFS_TRACKING_INTEGRATION_GUIDE.md` (15 min)
- [ ] Backup current `nft-scanner.js` file
- [ ] Create `output/` directory for reports

## Step 1: Import Tracker Module

**File**: `nft-scanner.js` (Line ~6)

- [ ] Add import statement:
  ```javascript
  import { IPFSAvailabilityTracker } from './ipfs-tracker.js';
  ```

**Verification**:
- [ ] No import errors when running the file
- [ ] ESLint/linter checks pass

---

## Step 2: Initialize Tracker in Constructor

**File**: `nft-scanner.js` (Line ~24-29)

- [ ] Add tracker initialization in `constructor()`:
  ```javascript
  this.availabilityTracker = new IPFSAvailabilityTracker({
    contractAddress: contractAddress,
    gateways: [
      'https://ipfs.io/ipfs/',
      'https://gateway.pinata.cloud/ipfs/',
      'https://dweb.link/ipfs/',
      'https://cloudflare-ipfs.com/ipfs/'
    ]
  });
  ```

**Verification**:
- [ ] Tracker initializes without errors
- [ ] Default gateways are set
- [ ] Contract address is passed correctly

---

## Step 3: Update Contract Info Method

**File**: `nft-scanner.js` (Line ~56-81)

- [ ] Add metadata update in `getContractInfo()`:
  ```javascript
  // After getting name and symbol
  this.availabilityTracker.scanMetadata.contractName = name;
  this.availabilityTracker.scanMetadata.contractSymbol = symbol;
  ```

**Verification**:
- [ ] Contract name and symbol are captured
- [ ] No errors when calling `getContractInfo()`

---

## Step 4: Add Error Classifier Helper

**File**: `nft-scanner.js` (New method after `extractIPFSCID`)

- [ ] Add `classifyGatewayError()` method:
  ```javascript
  classifyGatewayError(error) {
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return 'timeout';
    }
    if (error.response?.status === 404) return '404';
    if (error.response?.status >= 500) return '500';
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return 'network_error';
    }
    return 'other';
  }
  ```

**Verification**:
- [ ] Method is accessible from other methods
- [ ] Returns correct error types
- [ ] Test with different error objects

---

## Step 5: Replace fetchMetadata Method

**File**: `nft-scanner.js` (Line ~118-140)

- [ ] Replace entire `fetchMetadata()` method with enhanced version
- [ ] Update method signature to accept `nftToken` parameter:
  ```javascript
  async fetchMetadata(tokenURI, nftToken = {})
  ```
- [ ] Implement multi-gateway fallback logic
- [ ] Record success on successful fetch
- [ ] Record failure after all gateways fail

**Verification**:
- [ ] Primary gateway is tried first
- [ ] Fallback gateways are tried on failure
- [ ] Success is recorded for successful fetches
- [ ] Failures are recorded with complete context
- [ ] Gateway attempts array is populated
- [ ] Method returns data on success, null on failure

**Test Cases**:
- [ ] Valid IPFS CID → should succeed and record success
- [ ] Invalid CID → should fail and record failure
- [ ] Slow gateway → should timeout and try fallback

---

## Step 6: Add Image Verification Method

**File**: `nft-scanner.js` (New method after `fetchMetadata`)

- [ ] Add `fetchAndVerifyImage()` method:
  ```javascript
  async fetchAndVerifyImage(imageURI, nftToken) {
    // Implementation from integration guide
  }
  ```

**Verification**:
- [ ] Method extracts CID from image URI
- [ ] Tries all gateways using HEAD requests
- [ ] Records success/failure appropriately
- [ ] Returns boolean (true/false)
- [ ] Handles missing or invalid image URIs

---

## Step 7: Update scanToken Method

**File**: `nft-scanner.js` (Line ~145-183)

- [ ] Update `fetchMetadata()` call to pass `nftToken` object:
  ```javascript
  const nftToken = { tokenId, owner, tokenURI };
  const metadata = await this.fetchMetadata(tokenURI, nftToken);
  ```

- [ ] Add image verification after metadata fetch:
  ```javascript
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
  ```

- [ ] Add `imageAvailable` to return object

**Verification**:
- [ ] NFT token data is passed to fetchMetadata
- [ ] Image verification runs after successful metadata fetch
- [ ] Image availability is tracked
- [ ] Return object includes imageAvailable field

---

## Step 8: Update scan Method

**File**: `nft-scanner.js` (Line ~248-288)

- [ ] Set token range in tracker:
  ```javascript
  this.availabilityTracker.scanMetadata.tokenRange.start = startTokenId;
  this.availabilityTracker.scanMetadata.tokenRange.end = endTokenId;
  ```

- [ ] Display availability statistics after scan:
  ```javascript
  const availabilityStats = this.availabilityTracker.getSummary();
  console.log('\n📡 IPFS Availability Statistics:');
  console.log('='.repeat(60));
  console.log(`   Total Fetch Attempts: ${availabilityStats.totalAttempts}`);
  console.log(`   Failed Retrievals: ${availabilityStats.totalFailures}`);
  console.log(`   Success Rate: ${availabilityStats.successRate}%`);
  ```

- [ ] Export reports:
  ```javascript
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
  ```

- [ ] Include availability stats in return object

**Verification**:
- [ ] Token range is set correctly
- [ ] Statistics are displayed in console
- [ ] JSON file is created in ./output
- [ ] Markdown report is created in ./output
- [ ] File paths are displayed
- [ ] Errors are caught and logged

---

## Post-Integration Testing

### Test 1: Basic Functionality
- [ ] Run a small scan (tokens 1-5)
- [ ] Verify console output shows statistics
- [ ] Check that 2 files are created in ./output
- [ ] Review JSON file structure
- [ ] Review Markdown report content

### Test 2: Success Recording
- [ ] Scan tokens with valid IPFS metadata
- [ ] Verify success count increases
- [ ] Check success rate is calculated correctly

### Test 3: Failure Recording
- [ ] Scan tokens with invalid/unavailable content
- [ ] Verify failures are recorded
- [ ] Check failure details are complete
- [ ] Verify gateway attempts are logged

### Test 4: Multi-Gateway Fallback
- [ ] Create a scenario where primary gateway fails
- [ ] Verify fallback gateways are tried
- [ ] Check that success is recorded on fallback

### Test 5: Error Classification
- [ ] Trigger different error types (timeout, 404, etc.)
- [ ] Verify errors are classified correctly
- [ ] Check severity levels are appropriate

### Test 6: Report Generation
- [ ] Run a complete scan
- [ ] Validate JSON against schema:
  ```bash
  node validate-tracking-data.js output/ipfs-failures-scan-{id}.json
  ```
- [ ] Review Markdown report for completeness
- [ ] Verify all placeholders are replaced

---

## Validation

### Schema Validation
- [ ] Install validation dependencies (optional):
  ```bash
  npm install ajv ajv-formats
  ```
- [ ] Run validation script:
  ```bash
  node validate-tracking-data.js output/ipfs-failures-scan-{id}.json
  ```
- [ ] Verify all validations pass

### Code Quality
- [ ] Run linter (if configured)
- [ ] Check for console errors
- [ ] Verify no memory leaks
- [ ] Test with large token ranges (100+)

### Output Quality
- [ ] JSON is valid and parseable
- [ ] Markdown renders correctly
- [ ] Statistics are accurate
- [ ] File timestamps are correct

---

## Documentation

- [ ] Update project README with tracking system info
- [ ] Document any custom configurations
- [ ] Note any issues encountered during integration
- [ ] Record any deviations from integration guide

---

## Deployment

### Pre-Deployment
- [ ] All tests pass
- [ ] Validation succeeds
- [ ] Code reviewed (if team process requires)
- [ ] Backup of production data

### Deployment
- [ ] Deploy updated nft-scanner.js
- [ ] Deploy ipfs-tracker.js
- [ ] Deploy schema and template files
- [ ] Create output directory on server

### Post-Deployment
- [ ] Run initial production scan
- [ ] Verify reports are generated
- [ ] Monitor for errors
- [ ] Review initial statistics

---

## Troubleshooting

### Common Issues

**Issue**: Tracker not initialized
- [ ] Check import statement
- [ ] Verify constructor initialization
- [ ] Check for typos in property name

**Issue**: Reports not generated
- [ ] Verify ./output directory exists
- [ ] Check file permissions
- [ ] Verify template path is correct

**Issue**: High failure rates
- [ ] Check network connectivity
- [ ] Verify gateway URLs are correct
- [ ] Increase timeout values if needed

**Issue**: Invalid JSON output
- [ ] Run validation script
- [ ] Check for encoding issues
- [ ] Verify data types are correct

---

## Final Verification

### Integration Complete When:
- [ ] ✅ All 8 integration steps completed
- [ ] ✅ All tests pass
- [ ] ✅ Validation succeeds
- [ ] ✅ Reports generate correctly
- [ ] ✅ Statistics are accurate
- [ ] ✅ No console errors
- [ ] ✅ Documentation updated
- [ ] ✅ Team notified

### Success Criteria:
- [ ] Scanner runs without errors
- [ ] Multi-gateway fallback works
- [ ] Failures are tracked with full context
- [ ] JSON and Markdown reports are generated
- [ ] Statistics are accurate and useful
- [ ] System is production-ready

---

## Next Steps After Integration

1. **Immediate** (Week 1)
   - [ ] Run baseline scan on main NFT collection
   - [ ] Review and share generated reports with team
   - [ ] Identify critical failures (severity: critical)
   - [ ] Retry retryable failures

2. **Short-term** (Month 1)
   - [ ] Set up regular scanning schedule
   - [ ] Track failure trends over time
   - [ ] Optimize gateway configuration
   - [ ] Document common failure patterns

3. **Long-term** (Months 2-3)
   - [ ] Plan Filecoin migration for critical content
   - [ ] Implement ERC-8004 standard
   - [ ] Upload failed content to Filecoin
   - [ ] Update NFT contract with Filecoin CIDs
   - [ ] Verify 100% content availability

---

## Resources

**Documentation**:
- `IPFS_TRACKING_INDEX.md` - Master index
- `IPFS_TRACKING_QUICK_REFERENCE.md` - Quick guide
- `IPFS_TRACKING_INTEGRATION_GUIDE.md` - Detailed integration
- `IPFS_TRACKING_ARCHITECTURE.md` - System design
- `IPFS_TRACKING_SUMMARY.md` - Complete overview

**Code**:
- `ipfs-tracker.js` - Tracker module
- `ipfs-failure-schema.json` - JSON schema
- `validate-tracking-data.js` - Validation script

**Examples**:
- `examples/sample-ipfs-failures.json` - Sample output

**Templates**:
- `IPFS_AVAILABILITY_REPORT_TEMPLATE.md` - Report template

---

## Completion

**Integration Started**: ___________
**Integration Completed**: ___________
**Completed By**: ___________
**Review By**: ___________

**Notes**:
```
[Add any notes, issues, or observations here]
```

---

**Checklist Version**: 1.0.0
**Last Updated**: 2025-01-15
**Status**: Ready for Use
