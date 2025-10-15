# IPFS Availability Tracking System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         NFT Scanner Workflow                         │
└─────────────────────────────────────────────────────────────────────┘

    User initiates scan
           ↓
    ┌──────────────┐
    │ NFTScanner   │
    │ Constructor  │
    │              │
    │ • Initialize │──────┐
    │   tracker    │      │
    └──────────────┘      │
           ↓              │
    ┌──────────────────┐  │    ┌────────────────────────┐
    │ getContractInfo()│  │    │ IPFSAvailabilityTracker│
    │                  │  │    │                        │
    │ • Get name/symbol│  └───→│ • scanMetadata        │
    │ • Update tracker │       │ • failures[]          │
    └──────────────────┘       │ • attempts counter    │
           ↓                   │ • successes counter   │
    ┌──────────────────┐       └────────────────────────┘
    │ scanTokens()     │                  ↑
    │ (loop)           │                  │
    └──────────────────┘                  │
           ↓                              │
    ┌──────────────────┐                  │
    │ scanToken(id)    │                  │
    │                  │                  │
    │ • Get tokenURI   │                  │
    │ • Get owner      │                  │
    └──────────────────┘                  │
           ↓                              │
    ┌──────────────────────┐              │
    │ fetchMetadata()      │              │
    │                      │              │
    │ Try Gateway 1        │──Success────→│ recordSuccess()
    │    ↓ Fail            │              │
    │ Try Gateway 2        │──Success────→│ recordSuccess()
    │    ↓ Fail            │              │
    │ Try Gateway 3        │──Success────→│ recordSuccess()
    │    ↓ Fail            │              │
    │ Try Gateway 4        │──All Fail───→│ recordFailure({
    │                      │              │   cid,
    └──────────────────────┘              │   contentType,
           ↓                              │   nftToken,
    ┌──────────────────────┐              │   error,
    │ fetchAndVerifyImage()│              │   gatewayAttempts
    │                      │              │ })
    │ Try all gateways     │──────────────┘
    └──────────────────────┘
           ↓
    ┌──────────────────────┐
    │ scan() finalizes     │
    │                      │
    │ • Display stats      │
    │ • Export to JSON     │──────┐
    │ • Generate report    │      │
    └──────────────────────┘      │
                                  │
         ┌────────────────────────┴────────────────────────┐
         ↓                                                 ↓
    ┌─────────────────────────┐              ┌──────────────────────────┐
    │ JSON Output             │              │ Markdown Report          │
    │                         │              │                          │
    │ ipfs-failures-          │              │ ipfs-availability-       │
    │   scan-{id}.json        │              │   report-{id}.md         │
    │                         │              │                          │
    │ • Structured data       │              │ • Human-readable         │
    │ • All failure details   │              │ • IPFS education         │
    │ • Statistics            │              │ • Filecoin solution      │
    │ • Machine-readable      │              │ • Recommendations        │
    └─────────────────────────┘              └──────────────────────────┘
```

## Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Component Interactions                          │
└─────────────────────────────────────────────────────────────────────┘

NFTScanner                      IPFSAvailabilityTracker
┌──────────────┐               ┌─────────────────────────┐
│              │               │                         │
│ Properties:  │               │ Properties:             │
│ • contract   │               │ • failures[]            │
│ • provider   │               │ • attempts              │
│ • ipfsGateway│               │ • successes             │
│ • tracker    │──────────────→│ • scanMetadata          │
│              │               │ • gateways[]            │
└──────────────┘               └─────────────────────────┘
       │                                  │
       │ calls                            │ generates
       ↓                                  ↓
┌──────────────────┐           ┌───────────────────────┐
│ Methods:         │           │ Methods:              │
│                  │           │                       │
│ fetchMetadata()  │──────────→│ recordSuccess()       │
│       ↓          │           │ recordFailure()       │
│ classifyError()  │──────────→│ classifyError()       │
│       ↓          │           │ determineSeverity()   │
│ fetchAndVerify   │──────────→│ calculateStatistics() │
│   Image()        │           │ finalizeScan()        │
│       ↓          │           │ exportToJSON()        │
│ scan()           │──────────→│ generateReport()      │
└──────────────────┘           └───────────────────────┘
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Data Flow                                   │
└─────────────────────────────────────────────────────────────────────┘

1. Token Scanning
   ┌─────────────┐
   │ Token #1    │
   │ tokenURI    │
   │ owner       │
   └──────┬──────┘
          ↓
   ┌─────────────────────┐
   │ Extract IPFS CID    │
   │ QmYHNY...           │
   └──────┬──────────────┘
          ↓
   ┌─────────────────────┐
   │ Fetch from Gateway  │
   │ ipfs.io/ipfs/QmYHNY│
   └──────┬──────────────┘
          │
    ┌─────┴─────┐
    │           │
Success?      Fail
    │           │
    ↓           ↓
recordSuccess  Try Next Gateway
               │
         ┌─────┴─────┐
         │           │
     Success?      Fail
         │           │
         ↓           ↓
    recordSuccess  Try Next Gateway
                    │
              ┌─────┴─────┐
              │           │
          Success?      All Failed
              │           │
              ↓           ↓
         recordSuccess  recordFailure
                         │
                         └──→ Capture:
                              • CID
                              • Token info
                              • Error details
                              • All gateway attempts
                              • Timestamps

2. Failure Recording
   ┌──────────────────────┐
   │ Failure Data Input   │
   │                      │
   │ cid: QmYHNY...       │
   │ contentType: metadata│
   │ nftToken: {...}      │
   │ error: {...}         │
   │ gatewayAttempts: []  │
   └──────┬───────────────┘
          ↓
   ┌──────────────────────┐
   │ Error Classification │
   │                      │
   │ timeout? not_found?  │
   │ gateway_error?       │
   └──────┬───────────────┘
          ↓
   ┌──────────────────────┐
   │ Severity Determination│
   │                      │
   │ metadata → critical  │
   │ image+404 → high     │
   │ timeout → medium     │
   └──────┬───────────────┘
          ↓
   ┌──────────────────────┐
   │ Create Failure Object│
   │                      │
   │ failureId: fail-XXX  │
   │ timestamp: ISO 8601  │
   │ + all input data     │
   │ + classification     │
   │ + severity           │
   │ + retryable flag     │
   └──────┬───────────────┘
          ↓
   ┌──────────────────────┐
   │ Add to failures[]    │
   └──────────────────────┘

3. Report Generation
   ┌──────────────────────┐
   │ finalizeScan()       │
   │                      │
   │ • Set endTime        │
   │ • Calculate stats    │
   └──────┬───────────────┘
          ↓
   ┌──────────────────────┐
   │ Calculate Statistics │
   │                      │
   │ • By error type      │
   │ • By gateway         │
   │ • Unique CIDs        │
   │ • Success rate       │
   └──────┬───────────────┘
          ↓
    ┌─────┴─────┐
    │           │
    ↓           ↓
exportToJSON  generateReport
    │           │
    ↓           ↓
 JSON file    Read template
    │           │
    │           ↓
    │      Replace placeholders
    │           │
    │           ↓
    │      Format tables
    │           │
    │           ↓
    │      Markdown file
    │           │
    └─────┬─────┘
          ↓
    Output files saved
```

## Error Classification Logic

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Error Classification Flow                         │
└─────────────────────────────────────────────────────────────────────┘

  Error Object
       │
       ↓
  ┌────────────────┐
  │ Check error    │
  │ code/message   │
  └────────┬───────┘
           │
    ┌──────┴──────┬──────────┬───────────┬──────────┬─────────┐
    │             │          │           │          │         │
    ↓             ↓          ↓           ↓          ↓         ↓
ECONNABORTED   status=404  status≥500  ENOTFOUND  SyntaxError  Other
timeout msg                            ECONNREFUSED parse msg
    │             │          │           │          │         │
    ↓             ↓          ↓           ↓          ↓         ↓
 'timeout'   'not_found' 'gateway'   'network'  'parse'    'other'
                          '_error'    '_error'   '_error'
    │             │          │           │          │         │
    └─────────────┴──────────┴───────────┴──────────┴─────────┘
                              ↓
                    ┌──────────────────┐
                    │ Determine        │
                    │ Severity         │
                    └────────┬─────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
    content=metadata   content=image    timeout/gateway
    + not_found        + not_found         errors
            │                │                │
            ↓                ↓                ↓
        'critical'        'high'          'medium'/'low'
            │                │                │
            └────────────────┴────────────────┘
                             ↓
                    ┌──────────────────┐
                    │ Set retryable    │
                    │ flag             │
                    └────────┬─────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
        timeout/gateway/network       not_found
                │                         │
                ↓                         ↓
          retryable=true            retryable=false
```

## Multi-Gateway Fallback Strategy

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Gateway Fallback Logic                            │
└─────────────────────────────────────────────────────────────────────┘

Request for CID: QmYHNY...

    ┌───────────────────────┐
    │ Gateway 1 (Primary)   │
    │ ipfs.io/ipfs/         │
    └───────┬───────────────┘
            │
       Try fetch
            │
     ┌──────┴──────┐
     │             │
  Success?       Fail
     │             │
     ↓             ↓
  Return        Record attempt
  data          gatewayAttempts.push({
     │            gateway: "ipfs.io",
     │            result: "timeout|404|500|..."
     │          })
     │             │
     │             ↓
     │          ┌───────────────────────┐
     │          │ Gateway 2 (Fallback)  │
     │          │ gateway.pinata.cloud  │
     │          └───────┬───────────────┘
     │                  │
     │             Try fetch
     │                  │
     │           ┌──────┴──────┐
     │           │             │
     │        Success?       Fail
     │           │             │
     │           ↓             ↓
     │        Return        Record attempt
     │        data             │
     │           │             ↓
     │           │          ┌───────────────────────┐
     │           │          │ Gateway 3 (Fallback)  │
     │           │          │ dweb.link             │
     │           │          └───────┬───────────────┘
     │           │                  │
     │           │             Try fetch
     │           │                  │
     │           │           ┌──────┴──────┐
     │           │           │             │
     │           │        Success?       Fail
     │           │           │             │
     │           │           ↓             ↓
     │           │        Return        Record attempt
     │           │        data             │
     │           │           │             ↓
     │           │           │          ┌───────────────────────┐
     │           │           │          │ Gateway 4 (Fallback)  │
     │           │           │          │ cloudflare-ipfs.com   │
     │           │           │          └───────┬───────────────┘
     │           │           │                  │
     │           │           │             Try fetch
     │           │           │                  │
     │           │           │           ┌──────┴──────┐
     │           │           │           │             │
     │           │           │        Success?       All Failed
     │           │           │           │             │
     │           │           │           ↓             ↓
     │           │           │        Return     recordFailure({
     │           │           │        data         cid,
     │           │           │           │         nftToken,
     │           │           │           │         error,
     └───────────┴───────────┴───────────┘         gatewayAttempts: [
                                                     {gateway1: fail},
                                                     {gateway2: fail},
                                                     {gateway3: fail},
                                                     {gateway4: fail}
                                                   ]
                                                 })
```

## Statistics Calculation

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Statistics Generation                             │
└─────────────────────────────────────────────────────────────────────┘

  Input: failures[] array
     │
     ↓
  ┌──────────────────────────┐
  │ Initialize counters      │
  │                          │
  │ failuresByType = {}      │
  │ failuresByGateway = {}   │
  │ uniqueCIDs = new Set()   │
  │ affectedTokens = new Set()│
  └──────────┬───────────────┘
             │
    ┌────────┴────────┐
    │ For each        │
    │ failure         │
    └────────┬────────┘
             │
    ┌────────┴────────────────┐
    │ failuresByType[         │
    │   failure.errorType     │
    │ ]++                     │
    └────────┬────────────────┘
             │
    ┌────────┴────────────────┐
    │ For each gateway        │
    │ in gatewayAttempts:     │
    │   failuresByGateway[    │
    │     gateway             │
    │   ]++                   │
    └────────┬────────────────┘
             │
    ┌────────┴────────────────┐
    │ uniqueCIDs.add(         │
    │   failure.cid           │
    │ )                       │
    └────────┬────────────────┘
             │
    ┌────────┴────────────────┐
    │ affectedTokens.add(     │
    │   contract-tokenId      │
    │ )                       │
    └────────┬────────────────┘
             │
    ┌────────┴────────────────┐
    │ Calculate:              │
    │                         │
    │ successRate =           │
    │   (successes / attempts)│
    │   * 100                 │
    └────────┬────────────────┘
             │
             ↓
  ┌──────────────────────────┐
  │ Return statistics object │
  │                          │
  │ • totalAttempts          │
  │ • totalFailures          │
  │ • successRate            │
  │ • failuresByType         │
  │ • failuresByGateway      │
  │ • uniqueFailedCIDs       │
  │ • affectedTokens         │
  └──────────────────────────┘
```

## Report Template Processing

```
┌─────────────────────────────────────────────────────────────────────┐
│                  Report Generation Flow                              │
└─────────────────────────────────────────────────────────────────────┘

  ┌────────────────────────┐
  │ Read template file     │
  │ IPFS_AVAILABILITY_     │
  │ REPORT_TEMPLATE.md     │
  └──────────┬─────────────┘
             │
  ┌──────────┴─────────────┐
  │ Create replacements    │
  │ object with all        │
  │ placeholder values     │
  │                        │
  │ TIMESTAMP → ISO date   │
  │ SCAN_ID → scan-XXX     │
  │ CONTRACT_NAME → name   │
  │ TOTAL_ATTEMPTS → 150   │
  │ SUCCESS_RATE → 96.67%  │
  │ ...                    │
  └──────────┬─────────────┘
             │
  ┌──────────┴─────────────┐
  │ Generate dynamic       │
  │ sections               │
  │                        │
  │ • Gateway table        │
  │ • Sample failures      │
  │ • Failed CID list      │
  └──────────┬─────────────┘
             │
  ┌──────────┴─────────────┐
  │ Replace all            │
  │ {{PLACEHOLDER}}        │
  │ with actual values     │
  │                        │
  │ template.replace(      │
  │   /{{KEY}}/g,          │
  │   value                │
  │ )                      │
  └──────────┬─────────────┘
             │
  ┌──────────┴─────────────┐
  │ Write to output file   │
  │ ipfs-availability-     │
  │ report-{scanId}.md     │
  └────────────────────────┘
```

## File Output Structure

```
mvp-demo/
├── nft-scanner.js (enhanced with tracking)
├── ipfs-tracker.js (new tracker module)
├── ipfs-failure-schema.json (schema definition)
├── IPFS_AVAILABILITY_REPORT_TEMPLATE.md (report template)
└── output/
    ├── ipfs-failures-scan-20250115-143022-a7f3c2d9.json
    │   {
    │     "schemaVersion": "1.0.0",
    │     "scanMetadata": { ... },
    │     "failures": [ ... ],
    │     "statistics": { ... }
    │   }
    │
    └── ipfs-availability-report-scan-20250115-143022-a7f3c2d9.md
        # IPFS Content Availability Report

        ## Executive Summary
        ...

        ## Understanding IPFS Content Availability
        ...

        ## How Filecoin Solves These Problems
        ...

        ## Failure Analysis for This Scan
        ...

        ## Recommendations
        ...
```

## Integration Timeline

```
Phase 1: Setup (5 minutes)
  ├─ Create ipfs-tracker.js
  ├─ Create schema file
  └─ Create report template

Phase 2: Integration (15 minutes)
  ├─ Import tracker in nft-scanner.js
  ├─ Initialize in constructor
  ├─ Update getContractInfo()
  ├─ Enhance fetchMetadata()
  ├─ Add fetchAndVerifyImage()
  └─ Update scan() method

Phase 3: Testing (10 minutes)
  ├─ Run test scan
  ├─ Verify JSON output
  ├─ Review Markdown report
  └─ Check statistics accuracy

Phase 4: Deployment (5 minutes)
  ├─ Commit changes
  ├─ Update documentation
  └─ Deploy to production
```

## Summary

The IPFS Availability Tracking System provides:

1. **Comprehensive Tracking**: Records every IPFS fetch attempt with full context
2. **Multi-Gateway Support**: Automatic fallback across multiple IPFS gateways
3. **Intelligent Classification**: Categorizes errors by type and severity
4. **Detailed Reporting**: Both machine-readable JSON and human-readable Markdown
5. **Educational Content**: Explains IPFS limitations and Filecoin solutions
6. **Actionable Insights**: Provides specific recommendations for migration

This system enables informed decision-making about NFT content migration to Filecoin permanent storage.
