#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { setupTools } from './tools/setup.js';
import { uploadTools } from './tools/upload.js';
import { nftTools } from './tools/nft.js';
import { validationTools } from './tools/validation.js';
import { resourceProviders } from './resources/index.js';
import { promptTemplates } from './prompts/index.js';

/**
 * MCP Server Daemon for NFT IPFS to Filecoin Migration
 *
 * Runs as a standalone daemon process, independent of Claude Code Desktop.
 * Uses HTTP/SSE transport for client connections.
 */
class NFTMigrationDaemon {
  private server: Server;
  private startTime: number;

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-nft-migration-daemon',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.startTime = Date.now();
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List all available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          ...setupTools.getToolDefinitions(),
          ...uploadTools.getToolDefinitions(),
          ...nftTools.getToolDefinitions(),
          ...validationTools.getToolDefinitions(),
        ],
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        // Route to appropriate tool handler
        if (setupTools.hasHandler(name)) {
          return await setupTools.handleTool(name, args || {});
        }
        if (uploadTools.hasHandler(name)) {
          return await uploadTools.handleTool(name, args || {});
        }
        if (nftTools.hasHandler(name)) {
          return await nftTools.handleTool(name, args || {});
        }
        if (validationTools.hasHandler(name)) {
          return await validationTools.handleTool(name, args || {});
        }

        throw new Error(`Unknown tool: ${name}`);
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${error.message}\n\nStack: ${error.stack}`,
            },
          ],
          isError: true,
        };
      }
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: resourceProviders.getResourceList(),
      };
    });

    // Read resource content
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      try {
        const content = await resourceProviders.readResource(uri);
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(content, null, 2),
            },
          ],
        };
      } catch (error: any) {
        throw new Error(`Failed to read resource ${uri}: ${error.message}`);
      }
    });

    // List available prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: promptTemplates.getPromptList(),
      };
    });

    // Get prompt template
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        const prompt = await promptTemplates.getPrompt(name, args || {});
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: prompt,
              },
            },
          ],
        };
      } catch (error: any) {
        throw new Error(`Failed to get prompt ${name}: ${error.message}`);
      }
    });
  }

  async run(): Promise<void> {
    const app = express();

    // CORS middleware for Claude Code Desktop
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      next();
    });

    // Request logging
    app.use((req, res, next) => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ${req.method} ${req.url}`);
      next();
    });

    // SSE endpoint for MCP communication
    const transport = new SSEServerTransport('/message', app);
    await this.server.connect(transport);

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: Date.now(),
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        pid: process.pid,
      });
    });

    // Info endpoint
    app.get('/info', (req, res) => {
      res.json({
        name: 'mcp-nft-migration-daemon',
        version: '1.0.0',
        mode: 'daemon',
        transport: 'SSE',
        startTime: this.startTime,
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        env: {
          walletAddress: process.env.WALLET_ADDRESS || 'Not configured',
          ethereumRpc: process.env.ETHEREUM_NETWORK_RPC_URL ? 'Configured' : 'Not configured',
          filecoinRpc: process.env.FILECOIN_NETWORK_RPC_URL ? 'Configured' : 'Not configured',
        },
      });
    });

    // Root endpoint
    app.get('/', (req, res) => {
      res.json({
        name: 'MCP NFT Migration Daemon',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          info: '/info',
          sse: '/message',
        },
        docs: 'https://github.com/TaoSeekAI/agentfilecoin',
      });
    });

    // Error handling
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Express error:', err);
      res.status(500).json({
        error: 'Internal server error',
        message: err.message,
      });
    });

    // Start HTTP server
    const PORT = parseInt(process.env.PORT || '3000', 10);
    const HOST = process.env.HOST || 'localhost';

    app.listen(PORT, HOST, () => {
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('  MCP NFT Migration Daemon Started');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`  Mode:          Daemon (HTTP/SSE)`);
      console.log(`  URL:           http://${HOST}:${PORT}`);
      console.log(`  SSE Endpoint:  http://${HOST}:${PORT}/message`);
      console.log(`  Health Check:  http://${HOST}:${PORT}/health`);
      console.log(`  Info:          http://${HOST}:${PORT}/info`);
      console.log(`  PID:           ${process.pid}`);
      console.log(`  Node Version:  ${process.version}`);
      console.log(`  Platform:      ${process.platform}`);
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('  Configure Claude Code with:');
      console.log(`  {`);
      console.log(`    "mcpServers": {`);
      console.log(`      "nft-migration": {`);
      console.log(`        "url": "http://${HOST}:${PORT}/message"`);
      console.log(`      }`);
      console.log(`    }`);
      console.log(`  }`);
      console.log('═══════════════════════════════════════════════════════════════');
    });

    // Graceful shutdown
    const shutdown = (signal: string) => {
      console.log(`\nReceived ${signal}, shutting down gracefully...`);
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}

// Start the daemon
const daemon = new NFTMigrationDaemon();
daemon.run().catch((error) => {
  console.error('Fatal error in MCP daemon:', error);
  process.exit(1);
});
