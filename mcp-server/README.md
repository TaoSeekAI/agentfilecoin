# Filecoin MCP Server

MCP (Model Context Protocol) server for storing and retrieving data on Filecoin network using the Synapse SDK.

## Features

- **Upload to Filecoin**: Store files and data with cryptographic proof
- **Download from Filecoin**: Retrieve stored data using Piece CID
- **Storage Status**: Check deal status and provider information
- **Agent Metadata**: Create ERC-8004 compliant agent metadata
- **Synapse SDK Integration**: Uses official Filecoin Onchain Cloud SDK

## Installation

```bash
npm install
npm run build
```

## Configuration

Create `.env` file:

```env
PRIVATE_KEY=0x...  # Your Ethereum private key
RPC_URL=https://api.calibration.node.glif.io/rpc/v1  # Filecoin RPC
WARM_STORAGE_ADDRESS=0x...  # Optional: custom storage contract
```

## Usage

### Start Server

```bash
npm start
```

The server runs in stdio mode and accepts JSON-RPC requests.

### Available Tools

#### 1. upload_to_filecoin

Upload data to Filecoin network.

```json
{
  "tool": "upload_to_filecoin",
  "arguments": {
    "data": "SGVsbG8gRmlsZWNvaW4h",  // base64 or plain text
    "filename": "hello.txt"
  }
}
```

Response:
```json
{
  "success": true,
  "pieceCid": "bafk2bzaceb...",
  "carCid": "bafy2bzace...",
  "size": 1024,
  "providerAddress": "0x...",
  "message": "Successfully uploaded hello.txt to Filecoin"
}
```

#### 2. upload_file_to_filecoin

Upload a file from local filesystem.

```json
{
  "tool": "upload_file_to_filecoin",
  "arguments": {
    "filepath": "/path/to/file.json"
  }
}
```

#### 3. download_from_filecoin

Download data using Piece CID.

```json
{
  "tool": "download_from_filecoin",
  "arguments": {
    "piece_cid": "bafk2bzaceb..."
  }
}
```

Response:
```json
{
  "success": true,
  "pieceCid": "bafk2bzaceb...",
  "size": 1024,
  "data": "SGVsbG8gRmlsZWNvaW4h",  // base64 encoded
  "dataPreview": "Hello Filecoin!",
  "message": "Successfully downloaded from Filecoin"
}
```

#### 4. get_storage_status

Check storage deal status.

```json
{
  "tool": "get_storage_status",
  "arguments": {
    "piece_cid": "bafk2bzaceb..."
  }
}
```

Response:
```json
{
  "success": true,
  "pieceCid": "bafk2bzaceb...",
  "exists": true,
  "size": 1024,
  "provider": "0x...",
  "timestamp": 1640000000,
  "message": "Piece exists on Filecoin"
}
```

#### 5. create_agent_metadata

Create and upload ERC-8004 agent metadata.

```json
{
  "tool": "create_agent_metadata",
  "arguments": {
    "name": "My Agent",
    "description": "An AI agent",
    "endpoints": [
      {"type": "mcp", "uri": "stdio://..."}
    ],
    "image": "ipfs://QmXxx..."
  }
}
```

Response:
```json
{
  "success": true,
  "pieceCid": "bafk2bzaceb...",
  "carCid": "bafy2bzace...",
  "metadata": {
    "name": "My Agent",
    "description": "An AI agent",
    "version": "1.0",
    "endpoints": [...],
    "supportedTrust": ["reputation", "validation"],
    "createdAt": "2025-10-14T10:30:00Z"
  },
  "message": "Successfully created and uploaded agent metadata"
}
```

## Development

### Build

```bash
npm run build
```

### Watch Mode

```bash
npm run dev
```

### Test

```bash
npm test
```

## Integration with ERC-8004 Agents

This MCP server is designed to work with ERC-8004 compliant agents:

1. **Agent Registration**: Use `create_agent_metadata` to create metadata, then register on-chain with the returned Piece CID
2. **Work Storage**: Agents can store their work results using `upload_to_filecoin`
3. **Verification**: Validators can download work results using `download_from_filecoin`
4. **Feedback**: Detailed feedback can be stored using `upload_to_filecoin`

## Architecture

```
┌─────────────────────────────────────┐
│      MCP Client (Rust/TS)           │
│      (Your Agent Application)       │
└────────────────┬────────────────────┘
                 │ JSON-RPC over stdio
┌────────────────▼────────────────────┐
│      Filecoin MCP Server            │
│      (This Server)                  │
├─────────────────────────────────────┤
│  Tools:                             │
│  - upload_to_filecoin               │
│  - upload_file_to_filecoin          │
│  - download_from_filecoin           │
│  - get_storage_status               │
│  - create_agent_metadata            │
└────────────────┬────────────────────┘
                 │
┌────────────────▼────────────────────┐
│      Synapse SDK                    │
│      (@filoz/synapse-sdk)           │
└────────────────┬────────────────────┘
                 │
┌────────────────▼────────────────────┐
│      Filecoin Network               │
│      (Calibration / Mainnet)        │
└─────────────────────────────────────┘
```

## Error Handling

All tools return a consistent response format:

Success:
```json
{
  "success": true,
  "...": "result data",
  "message": "Success message"
}
```

Error:
```json
{
  "success": false,
  "error": "Error message",
  "tool": "tool_name"
}
```

## Requirements

- Node.js >= 20
- Filecoin Calibration testnet account with test FIL
- Private key with permissions to sign transactions

## Security

- Never commit `.env` file with real private keys
- Use environment variables in production
- Limit private key permissions to necessary operations only
- Monitor transaction costs on mainnet

## Resources

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Synapse SDK](https://github.com/FilOzone/synapse-sdk)
- [Filecoin Docs](https://docs.filecoin.io/)
- [ERC-8004 Specification](https://eips.ethereum.org/EIPS/eip-8004)

## License

MIT OR Apache-2.0
