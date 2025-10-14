#!/usr/bin/env node

/**
 * Filecoin MCP Server
 *
 * This MCP server provides tools for storing and retrieving data on Filecoin
 * using the Synapse SDK. It integrates with ERC-8004 agents to provide
 * decentralized storage capabilities.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { Synapse } from '@filoz/synapse-sdk';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import * as fs from 'fs/promises';
import * as path from 'path';

dotenv.config();

// Environment configuration
const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const RPC_URL = process.env.RPC_URL || 'https://api.calibration.node.glif.io/rpc/v1';
const STORAGE_ADDRESS = process.env.WARM_STORAGE_ADDRESS;

// Global Synapse instance
let synapseInstance: any = null;

/**
 * Initialize Synapse SDK
 */
async function initSynapse() {
  if (synapseInstance) {
    return synapseInstance;
  }

  if (!PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY environment variable is required');
  }

  try {
    synapseInstance = await Synapse.create({
      privateKey: PRIVATE_KEY,
      rpcURL: RPC_URL,
      ...(STORAGE_ADDRESS && { warmStorageAddress: STORAGE_ADDRESS })
    });

    console.error('✅ Synapse SDK initialized');
    return synapseInstance;
  } catch (error) {
    console.error('❌ Failed to initialize Synapse SDK:', error);
    throw error;
  }
}

/**
 * Upload data to Filecoin
 */
async function uploadToFilecoin(data: string | Buffer, filename: string): Promise<{
  pieceCid: string;
  carCid: string;
  size: number;
  providerAddress: string;
}> {
  const synapse = await initSynapse();

  console.error(`📤 Uploading ${filename} to Filecoin...`);

  const storageContext = await synapse.storage.createContext({
    withCDN: false,
    callbacks: {
      onProviderSelected: (provider: any) => {
        console.error(`✅ Provider selected: ${provider.address}`);
      },
      onDataSetResolved: (info: any) => {
        console.error(`✅ Dataset resolved: ${info.pieceCid}`);
      }
    }
  });

  let uploadedPieceCid = '';
  let uploadedCarCid = '';
  let providerAddress = '';

  const result = await storageContext.upload(data, {
    onUploadComplete: (pieceCid: string) => {
      uploadedPieceCid = pieceCid;
      console.error(`✅ Upload complete: ${pieceCid}`);
    },
    onPieceAdded: (transaction: any) => {
      uploadedCarCid = transaction.carCid;
      providerAddress = transaction.providerAddress;
      console.error(`✅ Piece added to provider: ${providerAddress}`);
    }
  });

  return {
    pieceCid: uploadedPieceCid || result.pieceCid,
    carCid: uploadedCarCid || result.carCid,
    size: data.length,
    providerAddress: providerAddress || result.providerAddress
  };
}

/**
 * Download data from Filecoin
 */
async function downloadFromFilecoin(pieceCid: string): Promise<Buffer> {
  const synapse = await initSynapse();

  console.error(`📥 Downloading ${pieceCid} from Filecoin...`);

  const data = await synapse.storage.download(pieceCid);

  console.error(`✅ Download complete: ${data.length} bytes`);

  return Buffer.from(data);
}

/**
 * Get storage deal status
 */
async function getStorageStatus(pieceCid: string): Promise<{
  exists: boolean;
  size?: number;
  provider?: string;
  timestamp?: number;
}> {
  const synapse = await initSynapse();

  try {
    // Try to get piece info
    const info = await synapse.storage.getPieceInfo(pieceCid);

    return {
      exists: true,
      size: info.size,
      provider: info.provider,
      timestamp: info.timestamp
    };
  } catch (error) {
    return {
      exists: false
    };
  }
}

/**
 * Upload file from path
 */
async function uploadFile(filePath: string): Promise<{
  pieceCid: string;
  carCid: string;
  size: number;
  providerAddress: string;
  filename: string;
}> {
  const data = await fs.readFile(filePath);
  const filename = path.basename(filePath);

  const result = await uploadToFilecoin(data, filename);

  return {
    ...result,
    filename
  };
}

/**
 * Create Agent metadata and upload to Filecoin
 */
async function createAgentMetadata(metadata: {
  name: string;
  description: string;
  endpoints: Array<{ type: string; uri: string }>;
  image?: string;
}): Promise<{
  pieceCid: string;
  carCid: string;
  metadata: any;
}> {
  const agentMetadata = {
    ...metadata,
    version: '1.0',
    supportedTrust: ['reputation', 'validation'],
    createdAt: new Date().toISOString()
  };

  const jsonData = JSON.stringify(agentMetadata, null, 2);

  const result = await uploadToFilecoin(
    Buffer.from(jsonData, 'utf-8'),
    'agent-metadata.json'
  );

  return {
    pieceCid: result.pieceCid,
    carCid: result.carCid,
    metadata: agentMetadata
  };
}

// MCP Server setup
const server = new Server(
  {
    name: 'filecoin-storage',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
const tools: Tool[] = [
  {
    name: 'upload_to_filecoin',
    description: 'Upload data to Filecoin network using Synapse SDK. Returns piece CID for later retrieval.',
    inputSchema: {
      type: 'object',
      properties: {
        data: {
          type: 'string',
          description: 'Data to upload (text or base64 encoded binary)'
        },
        filename: {
          type: 'string',
          description: 'Filename for the data'
        }
      },
      required: ['data', 'filename']
    }
  },
  {
    name: 'upload_file_to_filecoin',
    description: 'Upload a file from local filesystem to Filecoin network',
    inputSchema: {
      type: 'object',
      properties: {
        filepath: {
          type: 'string',
          description: 'Path to file to upload'
        }
      },
      required: ['filepath']
    }
  },
  {
    name: 'download_from_filecoin',
    description: 'Download data from Filecoin network using piece CID',
    inputSchema: {
      type: 'object',
      properties: {
        piece_cid: {
          type: 'string',
          description: 'Piece CID to download'
        }
      },
      required: ['piece_cid']
    }
  },
  {
    name: 'get_storage_status',
    description: 'Check storage deal status for a piece CID',
    inputSchema: {
      type: 'object',
      properties: {
        piece_cid: {
          type: 'string',
          description: 'Piece CID to check status'
        }
      },
      required: ['piece_cid']
    }
  },
  {
    name: 'create_agent_metadata',
    description: 'Create and upload ERC-8004 agent metadata to Filecoin',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Agent name'
        },
        description: {
          type: 'string',
          description: 'Agent description'
        },
        endpoints: {
          type: 'array',
          description: 'Agent endpoints (MCP, A2A, etc.)',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              uri: { type: 'string' }
            }
          }
        },
        image: {
          type: 'string',
          description: 'Agent avatar image URL or piece CID'
        }
      },
      required: ['name', 'description', 'endpoints']
    }
  }
];

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'upload_to_filecoin': {
        const { data, filename } = args as { data: string; filename: string };

        // Check if data is base64
        let buffer: Buffer;
        try {
          buffer = Buffer.from(data, 'base64');
          // Verify it was valid base64
          if (buffer.toString('base64') !== data) {
            // Not valid base64, treat as text
            buffer = Buffer.from(data, 'utf-8');
          }
        } catch {
          buffer = Buffer.from(data, 'utf-8');
        }

        const result = await uploadToFilecoin(buffer, filename);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                pieceCid: result.pieceCid,
                carCid: result.carCid,
                size: result.size,
                providerAddress: result.providerAddress,
                message: `Successfully uploaded ${filename} to Filecoin`
              }, null, 2)
            }
          ]
        };
      }

      case 'upload_file_to_filecoin': {
        const { filepath } = args as { filepath: string };

        const result = await uploadFile(filepath);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                ...result,
                message: `Successfully uploaded ${result.filename} to Filecoin`
              }, null, 2)
            }
          ]
        };
      }

      case 'download_from_filecoin': {
        const { piece_cid } = args as { piece_cid: string };

        const data = await downloadFromFilecoin(piece_cid);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                pieceCid: piece_cid,
                size: data.length,
                data: data.toString('base64'),
                dataPreview: data.toString('utf-8', 0, Math.min(100, data.length)),
                message: `Successfully downloaded ${piece_cid} from Filecoin`
              }, null, 2)
            }
          ]
        };
      }

      case 'get_storage_status': {
        const { piece_cid } = args as { piece_cid: string };

        const status = await getStorageStatus(piece_cid);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                pieceCid: piece_cid,
                ...status,
                message: status.exists
                  ? `Piece ${piece_cid} exists on Filecoin`
                  : `Piece ${piece_cid} not found`
              }, null, 2)
            }
          ]
        };
      }

      case 'create_agent_metadata': {
        const { name, description, endpoints, image } = args as {
          name: string;
          description: string;
          endpoints: Array<{ type: string; uri: string }>;
          image?: string;
        };

        const result = await createAgentMetadata({
          name,
          description,
          endpoints,
          image
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                pieceCid: result.pieceCid,
                carCid: result.carCid,
                metadata: result.metadata,
                message: `Successfully created and uploaded agent metadata for ${name}`
              }, null, 2)
            }
          ]
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: `Unknown tool: ${name}`
              })
            }
          ],
          isError: true
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error executing ${name}:`, error);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: errorMessage,
            tool: name
          })
        }
      ],
      isError: true
    };
  }
});

// Start server
async function main() {
  console.error('🚀 Starting Filecoin MCP Server...');
  console.error(`📡 RPC URL: ${RPC_URL}`);
  console.error(`🔑 Private Key: ${PRIVATE_KEY ? '***' + PRIVATE_KEY.slice(-4) : 'Not set'}`);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('✅ Filecoin MCP Server running');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
