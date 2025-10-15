# Deployment Guide for MVP Demo

Complete guide to deploy and run the NFT IPFS to Filecoin migration MVP.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Deploy ERC-8004 Contracts](#deploy-erc-8004-contracts)
3. [Deploy Test NFT Contract](#deploy-test-nft-contract)
4. [Configure MVP Demo](#configure-mvp-demo)
5. [Run the Demo](#run-the-demo)
6. [Verify Results](#verify-results)

## Prerequisites

### 1. Install Dependencies

```bash
# Node.js (>= 18.0.0)
node --version

# Foundry (for contract deployment)
curl -L https://foundry.paradigm.xyz | bash
foundryup
forge --version

# Install Node.js dependencies
cd mvp-demo
npm install
```

### 2. Get Test FIL

1. Generate a wallet or use existing wallet
2. Visit: https://faucet.calibration.fildev.network/
3. Enter your address
4. Receive test FIL (~1 FIL recommended)

### 3. Set Environment Variables

```bash
export PRIVATE_KEY="your_private_key_here"
export RPC_URL="https://api.calibration.node.glif.io/rpc/v1"
```

### 4. (Optional) Configure Proxy

If you're in a region with network restrictions:

```bash
export http_proxy="http://Clash:sNHwynoj@192.168.10.1:7890"
export https_proxy="http://Clash:sNHwynoj@192.168.10.1:7890"
```

## Deploy ERC-8004 Contracts

### Step 1: Navigate to Contracts Directory

```bash
cd ../contracts  # From mvp-demo/, go to contracts/
```

### Step 2: Install Dependencies

```bash
forge install
```

### Step 3: Compile Contracts

```bash
# With proxy (if needed)
export http_proxy="http://Clash:sNHwynoj@192.168.10.1:7890"
export https_proxy="http://Clash:sNHwynoj@192.168.10.1:7890"

# Compile
forge build
```

Expected output:
```
[⠊] Compiling...
[⠊] Compiling 20 files with 0.8.20
[⠒] Solc 0.8.20 finished in 2.34s
Compiler run successful!
```

### Step 4: Deploy ERC-8004 Contracts

```bash
forge script script/Deploy.s.sol \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key "calibration" \
  -vvvv
```

### Step 5: Record Contract Addresses

After deployment, you'll see output like:

```
== Logs ==
Deploying to network: Calibration Testnet
Deployer: 0xYourAddress

Deploying AgentIdentity...
AgentIdentity deployed at: 0x1234...

Deploying AgentReputation...
AgentReputation deployed at: 0x5678...

Deploying AgentValidation...
AgentValidation deployed at: 0x9abc...
```

**Save these addresses!** You'll need them for the MVP configuration.

## Deploy Test NFT Contract

### Option A: Deploy via Forge Script

Create `script/DeployTestNFT.s.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../mvp-demo/TestNFT.sol";

contract DeployTestNFT is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        TestNFT testNFT = new TestNFT();
        console.log("TestNFT deployed at:", address(testNFT));

        vm.stopBroadcast();
    }
}
```

Deploy:
```bash
forge script script/DeployTestNFT.s.sol \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  -vvvv
```

### Option B: Deploy via Cast

```bash
# Create the contract
cd mvp-demo

# Deploy
forge create TestNFT.sol:TestNFT \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY

# Save the deployed address
export NFT_CONTRACT="0x..."  # Address from output
```

### Mint Test NFTs

After deployment, mint some NFTs with IPFS URIs:

```bash
# Example IPFS URIs (use real ones for actual testing)
IPFS_URIS='["ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG","ipfs://QmPAg1mjxcEQPPtqsLoEcauVedaeMH81WXDPvPx3VC5zUz","ipfs://QmRZxt2b1FVZPNqd8hsiykDL3TdBDeTSPX9Kv46HmX4Gx8","ipfs://QmT5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxX","ipfs://QmZfpdmLv5N4KPWJhM5Pp5GkE3fS9xSrY1fSNdL7e1TjB7"]'

cast send $NFT_CONTRACT \
  "batchMint(string[])" \
  "$IPFS_URIS" \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

Verify minting:
```bash
cast call $NFT_CONTRACT "totalSupply()(uint256)" --rpc-url $RPC_URL
# Should return: 5
```

## Configure MVP Demo

### Step 1: Create .env File

```bash
cd mvp-demo
cp .env.example .env
```

### Step 2: Edit .env

```bash
nano .env  # or vim, or your preferred editor
```

Update with your deployed contract addresses:

```env
# Network Configuration
RPC_URL=https://api.calibration.node.glif.io/rpc/v1
CHAIN_ID=314159

# Wallet Configuration
PRIVATE_KEY=your_private_key_here

# Contract Addresses (from deployment)
AGENT_IDENTITY_ADDRESS=0x1234...  # AgentIdentity address
AGENT_REPUTATION_ADDRESS=0x5678...  # AgentReputation address
AGENT_VALIDATION_ADDRESS=0x9abc...  # AgentValidation address

# NFT Configuration
NFT_CONTRACT_ADDRESS=0x...  # TestNFT address
NFT_START_TOKEN_ID=0
NFT_END_TOKEN_ID=4

# IPFS Gateway
IPFS_GATEWAY=https://ipfs.io/ipfs/

# Proxy (if needed)
HTTP_PROXY=http://Clash:sNHwynoj@192.168.10.1:7890
HTTPS_PROXY=http://Clash:sNHwynoj@192.168.10.1:7890
```

### Step 3: Verify Configuration

```bash
cat .env | grep -v "^#" | grep -v "^$"
```

Ensure all required addresses are filled in.

## Run the Demo

### Quick Test

```bash
npm run demo
```

### Expected Output

You should see output similar to:

```
================================================================================
🚀 NFT IPFS to Filecoin Migration MVP
    ERC-8004 Agent Integration Demo
================================================================================

🔧 Validating Configuration...
✅ Configuration valid

🔐 Initializing Ethers...
✅ Wallet: 0xYourAddress

💰 Checking Balance...
   Balance: 0.5 FIL

================================================================================
PHASE 1: Initialize Clients
================================================================================

================================================================================
PHASE 2: Register ERC-8004 Agent
================================================================================

📝 Registering Agent with ERC-8004...
   Registration Fee: 0.01 FIL
   Sending transaction...
   Transaction hash: 0x...
   Waiting for confirmation...

✅ Agent Registered Successfully!
   Agent ID: 1

================================================================================
PHASE 3: Scan NFT Project
================================================================================

🔍 Starting NFT Scan...
📝 Contract Information:
   Name: TestNFT
   Symbol: TNFT
   Type: ERC721

📡 Scanning NFT tokens 0 to 4...

  Scanning token #0...
  ✅ Token #0:
     Owner: 0xYourAddress
     Metadata CID: QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG
     Image CID: QmXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx

📊 Scan Summary:
   Total Tokens Scanned: 5
   Successful: 5
   Failed: 0
   Unique IPFS CIDs Found: 8

================================================================================
PHASE 4: Create ERC-8004 Validation Request
================================================================================
...

================================================================================
🎉 MVP DEMO COMPLETED SUCCESSFULLY!
================================================================================

📊 Summary:
   ERC-8004 Agent ID: 1
   Validation Request ID: 1
   Validation Status: Approved
   NFT Contract: 0x...
   Tokens Scanned: 5
   Unique IPFS CIDs: 8
   Migrated to Filecoin: 8/8
   Success Rate: 100.0%

🔗 Transactions:
   Agent Registration: 0x...
   Validation Request: 0x...
   Proof Submission: 0x...
   Validation Approval: 0x...
```

## Verify Results

### 1. Check Output Files

```bash
ls -la output/
cat output/final-report.json | jq
```

### 2. Verify Agent Registration

```bash
cast call $AGENT_IDENTITY_ADDRESS \
  "getAgent(uint256)(address,string,uint256,bool)" \
  1 \
  --rpc-url $RPC_URL
```

Expected output:
```
0xYourAddress
file:///path/to/output/agent-metadata.json
1234567890
true
```

### 3. Verify Validation Request

```bash
cast call $AGENT_VALIDATION_ADDRESS \
  "getValidationRequest(uint256)(uint256,address,string,string,uint8,uint256)" \
  1 \
  --rpc-url $RPC_URL
```

Expected status: `1` (Approved)

### 4. Check Transactions on Block Explorer

Visit: https://calibration.filscan.io/

Paste transaction hashes from the output to see on-chain confirmation.

### 5. Verify Filecoin Storage

Check the migration report:
```bash
cat output/migration-report.json | jq '.filecoinCIDs'
```

You'll see Piece CIDs and CAR CIDs for each migrated file.

## Troubleshooting

### Error: "Insufficient balance"

**Solution:** Get more test FIL from faucet
```bash
# Check balance
cast balance $YOUR_ADDRESS --rpc-url $RPC_URL

# Get more FIL
# Visit: https://faucet.calibration.fildev.network/
```

### Error: "Contract not found"

**Solution:** Ensure contracts are deployed
```bash
# Verify contract exists
cast code $AGENT_IDENTITY_ADDRESS --rpc-url $RPC_URL

# Should return bytecode, not "0x"
```

### Error: "Token does not exist"

**Solution:** Check NFT was minted
```bash
cast call $NFT_CONTRACT "totalSupply()(uint256)" --rpc-url $RPC_URL
cast call $NFT_CONTRACT "tokenURI(uint256)(string)" 0 --rpc-url $RPC_URL
```

### Error: "Network timeout"

**Solution:** Configure proxy
```bash
export http_proxy="http://your-proxy:port"
export https_proxy="http://your-proxy:port"
```

### Error: "IPFS gateway timeout"

**Solution:** Try alternative gateway
```env
IPFS_GATEWAY=https://cloudflare-ipfs.com/ipfs/
# or
IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/
```

## Next Steps

After successful MVP demo:

1. **Analyze Results**: Review `output/final-report.json`
2. **Verify Storage**: Check Filecoin storage status
3. **Test Queries**: Query agent and validation data from other accounts
4. **Extend**: Add more tokens, test with real NFT projects
5. **Integrate**: Connect with the full Rust backend for production use

## Production Considerations

For production deployment:

1. **Security**:
   - Never commit private keys
   - Use hardware wallets or key management services
   - Audit smart contracts

2. **Storage**:
   - Upload metadata to IPFS/Filecoin (not local files)
   - Use proper CID references
   - Consider redundancy and pinning services

3. **Scalability**:
   - Batch operations efficiently
   - Handle large NFT collections
   - Implement proper error handling and retries

4. **Monitoring**:
   - Log all operations
   - Track gas costs
   - Monitor storage deals

5. **Integration**:
   - Use the full Rust backend
   - Implement proper MCP server
   - Add authentication and authorization

---

**Need Help?**

- Check the main README.md
- Review code comments in source files
- Examine test results in output files
- Consult ERC-8004 and Synapse SDK documentation
