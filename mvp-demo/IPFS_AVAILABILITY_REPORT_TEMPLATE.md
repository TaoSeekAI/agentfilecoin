# IPFS Content Availability Report

**Generated:** {{TIMESTAMP}}
**Scan ID:** {{SCAN_ID}}
**Contract:** {{CONTRACT_NAME}} ({{CONTRACT_SYMBOL}})
**Contract Address:** `{{CONTRACT_ADDRESS}}`
**Token Range:** {{TOKEN_START}} - {{TOKEN_END}}

---

## Executive Summary

This report documents IPFS content availability issues discovered during NFT metadata and asset scanning. It provides insights into why content becomes unavailable and how Filecoin can provide a permanent storage solution.

### Key Metrics

| Metric | Value |
|--------|-------|
| Total Content Items Scanned | {{TOTAL_ATTEMPTS}} |
| Successful Retrievals | {{SUCCESSFUL_RETRIEVALS}} |
| Failed Retrievals | {{TOTAL_FAILURES}} |
| Success Rate | {{SUCCESS_RATE}}% |
| Unique Failed CIDs | {{UNIQUE_FAILED_CIDS}} |
| Affected NFT Tokens | {{AFFECTED_TOKENS}} |

---

## Understanding IPFS Content Availability

### What is IPFS?

IPFS (InterPlanetary File System) is a distributed, content-addressed storage network. Content is identified by its cryptographic hash (CID - Content Identifier) rather than its location. While this provides several advantages:

- **Content Authenticity**: CIDs guarantee content integrity
- **Decentralization**: Content can be served from any node
- **Deduplication**: Identical content shares the same CID

However, IPFS has a critical limitation: **content availability is not guaranteed**.

### Why IPFS Content Becomes Unavailable

#### 1. Unpinning by Content Providers

**Problem**: Content on IPFS is temporary by default. When a file is added to IPFS, it's only guaranteed to be available as long as at least one node "pins" it (keeps it in storage).

- **Scenario**: An NFT project uploads metadata and images to IPFS during minting
- **What Happens**: If the project's IPFS node goes offline or unpins the content (to save storage costs), the content becomes unavailable
- **Real Impact**: NFT holders lose access to their token metadata, images, and attributes

**Example**: A collection mints 10,000 NFTs with images hosted on IPFS. Six months later, the project team unpins the content to reduce costs. All 10,000 NFTs now point to inaccessible content.

#### 2. Gateway Reliability Issues

**Problem**: Most users access IPFS through HTTP gateways (like ipfs.io, gateway.pinata.cloud). These gateways have limitations:

- **Rate Limiting**: Public gateways throttle requests
- **Downtime**: Gateways can be temporarily offline
- **Geographic Restrictions**: Some gateways are region-specific
- **Content Caching**: Gateways may not have unpopular content cached

**Example from this scan**:
```
Gateway: https://ipfs.io/ipfs/
- Timeouts: {{IPFS_IO_TIMEOUTS}}
- 404 Errors: {{IPFS_IO_NOT_FOUND}}
- Total Failures: {{IPFS_IO_TOTAL_FAILURES}}
```

#### 3. Network Propagation Delays

**Problem**: When content is first added to IPFS, it takes time to propagate across the network. During this period, the content may appear unavailable even though it exists.

#### 4. Insufficient Replication

**Problem**: Content with few or no additional pinners (beyond the original uploader) is at high risk of becoming unavailable.

- **No Redundancy**: If only one node pins the content, that node becomes a single point of failure
- **No Incentive**: IPFS provides no built-in economic incentive for others to pin content
- **Discovery Issue**: Other nodes may not discover or request the content

---

## How Filecoin Solves These Problems

### Permanent Storage with Economic Guarantees

Filecoin builds on IPFS but adds critical features for permanent storage:

#### 1. Storage Deals with Cryptographic Proof

**Solution**: Content is stored through formal contracts (deals) with storage providers who:
- **Commit Resources**: Pledge collateral to guarantee storage
- **Prove Storage**: Submit cryptographic proofs regularly (Proof-of-Spacetime)
- **Face Penalties**: Lose collateral if they fail to maintain the data

**Result**: Content availability is economically guaranteed for the deal duration (can be years).

#### 2. Built-in Redundancy

**Solution**: Content can be stored with multiple storage providers simultaneously:
- **Replication**: Same content stored in multiple locations
- **Geographic Distribution**: Providers in different regions
- **Provider Diversity**: Different storage provider companies

**Result**: Even if one provider fails, content remains accessible from others.

#### 3. Retrieval Market

**Solution**: Filecoin has a dedicated retrieval market where:
- **Incentivized Retrieval**: Providers earn FIL for serving content
- **Fast Access**: Multiple retrieval providers cache popular content
- **Automatic Fallback**: Clients can try multiple providers

**Result**: Content is both available and efficiently retrievable.

#### 4. Long-term Cost Predictability

**Solution**: Storage costs are paid upfront for a defined period:
- **No Surprise Costs**: Know exact storage costs for multi-year periods
- **Renewal Options**: Deals can be extended before expiration
- **Price Competition**: Multiple providers compete on price

**Result**: Projects can budget for permanent storage without ongoing operational costs.

---

## Failure Analysis for This Scan

### Failures by Error Type

| Error Type | Count | Percentage | Description |
|------------|-------|------------|-------------|
| Timeout | {{TIMEOUT_COUNT}} | {{TIMEOUT_PERCENT}}% | Request exceeded timeout limit (typically 10s) |
| Not Found (404) | {{NOT_FOUND_COUNT}} | {{NOT_FOUND_PERCENT}}% | Content not available on any attempted gateway |
| Gateway Error (5xx) | {{GATEWAY_ERROR_COUNT}} | {{GATEWAY_ERROR_PERCENT}}% | Gateway server errors |
| Network Error | {{NETWORK_ERROR_COUNT}} | {{NETWORK_ERROR_PERCENT}}% | Network connectivity issues |
| Parse Error | {{PARSE_ERROR_COUNT}} | {{PARSE_ERROR_PERCENT}}% | Content retrieved but invalid format |
| Other | {{OTHER_COUNT}} | {{OTHER_PERCENT}}% | Miscellaneous errors |

### Failures by Gateway

{{GATEWAY_FAILURE_TABLE}}

### Failure Severity Distribution

| Severity | Count | Impact |
|----------|-------|--------|
| Critical | {{CRITICAL_COUNT}} | NFT completely non-functional (metadata unavailable) |
| High | {{HIGH_COUNT}} | Primary asset unavailable (image/video) |
| Medium | {{MEDIUM_COUNT}} | Secondary asset unavailable |
| Low | {{LOW_COUNT}} | Temporary or retryable error |

---

## Detailed Failure Records

### Sample Failures

{{SAMPLE_FAILURES_SECTION}}

---

## Recommendations

### Immediate Actions

1. **Retry Failed Requests**
   - Many failures ({{RETRYABLE_COUNT}}/{{TOTAL_FAILURES}}) are potentially retryable
   - Use exponential backoff and multiple gateways
   - Consider time-of-day variations in gateway availability

2. **Multi-Gateway Strategy**
   - Implement fallback logic with multiple IPFS gateways:
     - ipfs.io
     - gateway.pinata.cloud
     - dweb.link
     - cloudflare-ipfs.com
   - Rotate gateways on failure to avoid rate limiting

3. **Content Verification**
   - Verify CID format before attempting retrieval
   - Check if content type matches expected format
   - Validate parsed metadata structure

### Long-term Solutions

1. **Migrate to Filecoin Storage**
   - **For High-Value Content**: Migrate metadata and primary assets
   - **Redundancy**: Use 2-3 storage providers per CID
   - **Duration**: Minimum 1-year deals, renewable
   - **Cost**: ~$0.01-0.10 per GB per year (varies by provider)

2. **Implement ERC-8004 Standard**
   - Update NFT contracts to use ERC-8004
   - Provide on-chain Filecoin CID references
   - Enable seamless content retrieval from Filecoin

3. **Hybrid IPFS/Filecoin Strategy**
   - Keep content on IPFS for fast public access
   - Store permanent copies on Filecoin as backup
   - Implement automatic failover from IPFS to Filecoin

4. **Content Pinning Service**
   - If full Filecoin migration is not feasible
   - Use commercial pinning services (Pinata, NFT.Storage, Web3.Storage)
   - Note: Still requires trust in the pinning service

### Monitoring and Alerting

1. **Continuous Monitoring**
   - Implement regular IPFS availability checks
   - Alert when success rate drops below threshold (e.g., 95%)
   - Track gateway performance over time

2. **Automated Recovery**
   - Automatically re-pin content when availability drops
   - Implement content backup and restoration workflows
   - Schedule regular content availability audits

---

## Technical Implementation Notes

### Integration with ERC-8004

The ERC-8004 standard provides a standardized way to reference Filecoin-stored content:

```solidity
interface IERC8004 {
    function contentURI(uint256 tokenId) external view returns (string memory);
    function setContentURI(uint256 tokenId, string memory uri) external;
}
```

Benefits:
- **Backward Compatible**: Existing `tokenURI()` continues to work
- **Dual Storage**: Can reference both IPFS and Filecoin CIDs
- **Flexible**: Supports migration without breaking existing integrations

### Migration Process

1. **Scan Phase** (Current)
   - Identify all IPFS CIDs in use
   - Document availability issues
   - Prioritize content for migration

2. **Upload Phase**
   - Upload content to Filecoin storage providers
   - Verify successful storage with Proof-of-Spacetime
   - Record Filecoin CIDs (deal IDs)

3. **Update Phase**
   - Update NFT contract with ERC-8004 interface
   - Add `contentURI()` function pointing to Filecoin CIDs
   - Maintain `tokenURI()` for backward compatibility

4. **Verification Phase**
   - Test content retrieval from Filecoin
   - Verify all NFTs have accessible content
   - Monitor for any issues

---

## Appendix: Technical Details

### IPFS Gateway URLs Used

{{GATEWAY_LIST}}

### Scan Configuration

```json
{
  "timeout": {{TIMEOUT_MS}}ms,
  "retries": {{RETRY_COUNT}},
  "concurrency": {{CONCURRENCY}},
  "gatewayRotation": {{GATEWAY_ROTATION_ENABLED}}
}
```

### Failed CID List

Total: {{UNIQUE_FAILED_CIDS}} unique CIDs

{{FAILED_CID_LIST}}

---

## Conclusion

IPFS provides content-addressed storage but does not guarantee availability. This scan identified **{{TOTAL_FAILURES}}** failures out of **{{TOTAL_ATTEMPTS}}** attempts (**{{FAILURE_RATE}}% failure rate**).

Key takeaways:
1. **Unpinning is common**: Many NFT projects do not maintain long-term IPFS pinning
2. **Gateway reliability varies**: Public gateways have significant reliability issues
3. **Filecoin solves this**: Economic guarantees and cryptographic proofs ensure availability
4. **Migration is feasible**: ERC-8004 provides a clear migration path

**Recommendation**: Migrate high-value NFT content to Filecoin storage with 2-3 provider redundancy to ensure permanent availability.

---

**Report Generated By**: NFT Scanner with IPFS Availability Tracking
**Tool Version**: 1.0.0
**Timestamp**: {{TIMESTAMP}}
