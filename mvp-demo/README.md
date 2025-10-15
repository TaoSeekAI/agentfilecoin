# NFT IPFS to Filecoin Migration MVP

Complete MVP demonstration of migrating NFT metadata from IPFS to Filecoin using **Synapse SDK** and **ERC-8004** Agent standard.

## 🎯 MVP Goals

1. ✅ Scan small NFT project (10-20 tokens)
2. ✅ Extract IPFS links from NFT metadata
3. ✅ Migrate IPFS data to Filecoin using Synapse SDK
4. ✅ Register agent with ERC-8004
5. ✅ Record migration work on-chain with validation proof
6. ✅ Demonstrate ERC-8004 value proposition

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     demo.js                              │
│            (Main Orchestration Script)                   │
└────────────┬───────────────┬─────────────┬──────────────┘
             │               │             │
    ┌────────▼──────┐  ┌────▼─────┐  ┌────▼──────────┐
    │ NFT Scanner   │  │ Filecoin │  │ ERC-8004      │
    │               │  │ Uploader │  │ Client        │
    │ - Scan NFTs   │  │          │  │               │
    │ - Extract CIDs│  │ - Synapse│  │ - Identity    │
    │               │  │   SDK    │  │ - Validation  │
    └───────────────┘  └──────────┘  └───────────────┘
```

## 📋 Prerequisites

### 1. Node.js
```bash
node --version  # >= 18.0.0
```

### 2. Filecoin Calibration Testnet Account
- Get test FIL: https://faucet.calibration.fildev.network/
- You'll need ~0.5 FIL for testing

### 3. Deployed ERC-8004 Contracts
The system requires these contracts deployed on Calibration testnet:
- `AgentIdentity` - Agent registration
- `AgentValidation` - Work validation

See the main project's deployment guide for instructions.

### 4. Test NFT Contract
You can either:
- Use an existing NFT contract on Calibration testnet
- Deploy a test NFT contract (see `Test NFT Contract` section below)

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
cd mvp-demo
npm install
```

### Step 2: Configure Environment

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```bash
# Network
RPC_URL=https://api.calibration.node.glif.io/rpc/v1
CHAIN_ID=314159

# Your wallet private key (with test FIL)
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# ERC-8004 Contract addresses (from deployment)
AGENT_IDENTITY_ADDRESS=0x...
AGENT_VALIDATION_ADDRESS=0x...

# NFT contract to scan
NFT_CONTRACT_ADDRESS=0x...
NFT_START_TOKEN_ID=1
NFT_END_TOKEN_ID=10

# IPFS Gateway
IPFS_GATEWAY=https://ipfs.io/ipfs/

# Proxy (if needed)
HTTP_PROXY=http://Clash:sNHwynoj@192.168.10.1:7890
HTTPS_PROXY=http://Clash:sNHwynoj@192.168.10.1:7890
```

### Step 3: Run the Demo

```bash
npm run demo
```

## 📖 What the Demo Does

The demo executes a complete 8-phase workflow:

### **Phase 1: Initialize Clients**
- Initialize NFT Scanner
- Initialize Filecoin Uploader (Synapse SDK)
- Initialize ERC-8004 Client

### **Phase 2: Register ERC-8004 Agent**
- Create agent metadata
- Register agent on-chain
- Receive Agent ID

### **Phase 3: Scan NFT Project**
- Detect contract type (ERC-721/ERC-1155)
- Scan tokens in specified range
- Extract IPFS CIDs from metadata and images
- Generate scan report

### **Phase 4: Create Validation Request**
- Generate task metadata (migration task description)
- Create on-chain validation request
- Receive Request ID

### **Phase 5: Migrate to Filecoin**
- Download each IPFS CID
- Upload to Filecoin using Synapse SDK
- Record Piece CID and CAR CID
- Generate migration report

### **Phase 6: Submit Proof**
- Generate proof metadata (migration results)
- Submit proof on-chain
- Link proof to validation request

### **Phase 7: Approve Validation**
- Approve the validation request (self-validation for MVP)
- Mark work as verified on-chain

### **Phase 8: Generate Final Report**
- Query final agent state
- Query validation state
- Generate comprehensive final report
- Save all outputs

## 📊 Output Files

After running the demo, you'll find these files in `./output/`:

1. **agent-metadata.json** - Agent registration metadata
2. **task-metadata.json** - Migration task description
3. **proof-metadata.json** - Proof of completed work
4. **nft-scan-report.json** - NFT scanning results
5. **migration-report.json** - Filecoin migration details
6. **final-report.json** - Complete summary with all transaction hashes

Downloaded IPFS files are saved to `./downloads/`

## 🎓 Understanding the Code

### nft-scanner.js
Handles NFT contract interaction:
- Supports ERC-721 and ERC-1155
- Extracts IPFS CIDs from various URI formats
- Fetches and parses metadata
- Identifies unique CIDs

```javascript
const scanner = new NFTScanner(contractAddress, provider, ipfsGateway);
const result = await scanner.scan(startTokenId, endTokenId);
```

### filecoin-uploader.js
Manages Filecoin storage via Synapse SDK:
- Downloads from IPFS
- Uploads to Filecoin with callbacks
- Tracks Piece CIDs and CAR CIDs
- Batch migration support

```javascript
const uploader = new FilecoinUploader(privateKey, rpcUrl);
await uploader.initialize();
const result = await uploader.migrateIPFSToFilecoin(ipfsCid);
```

**Key Pattern** (from synapse-sdk E2E example):
```javascript
// Create storage context
const storageContext = await synapse.storage.createContext({
  withCDN: false,
  callbacks: { onProviderSelected, onDataSetResolved }
});

// Upload with callbacks
await storageContext.upload(data, {
  onUploadComplete: (cid) => { pieceCid = cid; },
  onPieceAdded: (tx) => { carCid = tx.carCid; }
});
```

### erc8004-client.js
Interacts with ERC-8004 contracts:
- Agent registration
- Validation request creation
- Proof submission
- Validation approval

```javascript
const client = new ERC8004Client(provider, signer, identityAddr, validationAddr);
const agentId = await client.registerAgent(metadataURI);
const requestId = await client.createValidationRequest(agentId, taskURI);
await client.submitProof(requestId, proofURI);
await client.approveValidation(requestId);
```

### demo.js
Main orchestration script that ties everything together in 8 phases.

## 🧪 Test NFT Contract

If you need a test NFT contract, deploy this simple ERC-721:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TestNFT is ERC721URIStorage, Ownable {
    uint256 private _tokenIdCounter;

    constructor() ERC721("TestNFT", "TNFT") Ownable(msg.sender) {}

    function mint(address to, string memory uri) public onlyOwner {
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    function batchMint(string[] memory uris) public onlyOwner {
        for (uint256 i = 0; i < uris.length; i++) {
            mint(msg.sender, uris[i]);
        }
    }
}
```

Example token URIs with IPFS:
```javascript
[
  "ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
  "ipfs://QmPAg1mjxcEQPPtqsLoEcauVedaeMH81WXDPvPx3VC5zUz",
  // ... add more
]
```

## 💡 ERC-8004 Value Proposition

This demo demonstrates how ERC-8004 provides value for AI agents:

### 1. **Decentralized Identity**
- Agent registered on-chain with immutable ID
- Anyone can verify agent ownership and metadata
- No centralized registry required

### 2. **Work Validation**
- Migration task recorded on-chain
- Proof of work submitted and verified
- Immutable audit trail

### 3. **Trust Layer**
- Other agents can query validation status
- Composable trust - agents can build on verified work
- Reputation can be built over multiple tasks

### 4. **Interoperability**
- Standard interface (ERC-8004)
- Any agent can verify any other agent's work
- Cross-agent collaboration enabled

## 🔍 Verification

After running the demo, you can verify on-chain:

### View Agent Registration
```bash
cast call $AGENT_IDENTITY_ADDRESS \
  "getAgent(uint256)(address,string,uint256,bool)" \
  $AGENT_ID \
  --rpc-url $RPC_URL
```

### View Validation Request
```bash
cast call $AGENT_VALIDATION_ADDRESS \
  "getValidationRequest(uint256)(uint256,address,string,string,uint8,uint256)" \
  $REQUEST_ID \
  --rpc-url $RPC_URL
```

### View on Block Explorer
Visit: https://calibration.filscan.io/
Search for transaction hashes from the output.

## 🛠️ Troubleshooting

### "Insufficient balance"
Get test FIL: https://faucet.calibration.fildev.network/

### "Cannot connect to IPFS gateway"
- Check your proxy settings
- Try alternative gateway: `https://cloudflare-ipfs.com/ipfs/`

### "Contract not deployed"
Ensure you've deployed the ERC-8004 contracts and updated `.env`

### "Token does not exist"
- Check the NFT contract has minted tokens
- Adjust `NFT_START_TOKEN_ID` and `NFT_END_TOKEN_ID`

### Network issues (China/restricted regions)
Configure proxy in `.env`:
```bash
HTTP_PROXY=http://your-proxy:port
HTTPS_PROXY=http://your-proxy:port
```

## 📚 Additional Resources

- **ERC-8004 Specification**: https://eips.ethereum.org/EIPS/eip-8004
- **Synapse SDK**: https://github.com/FilOzone/synapse-sdk
- **Synapse SDK E2E Example**: https://github.com/FilOzone/synapse-sdk/blob/master/utils/example-storage-e2e.js
- **Filecoin Calibration Testnet**: https://docs.filecoin.io/networks/calibration/
- **Filecoin Faucet**: https://faucet.calibration.fildev.network/
- **Block Explorer**: https://calibration.filscan.io/

## 🤝 Integration with Main Project

This MVP is part of the larger ERC-8004 + Filecoin Agent system:

```
aiagent/
├── contracts/          # ERC-8004 Solidity contracts
├── backend/           # Rust backend (full implementation)
├── mvp-demo/          # This MVP (Node.js)
└── docs/              # Documentation
```

The MVP demonstrates the core concepts in a simple, understandable way. For production use, refer to the main backend implementation.

## 📝 License

MIT

## 👥 Contributing

This is a demo project. For contributions to the main project, see the root README.

---

**Need Help?**
- Check the troubleshooting section above
- Review the code comments in each module
- Examine the output JSON files for debugging
- Check transaction status on block explorer
