/**
 * ERC-8004 Client Module
 * Interacts with ERC-8004 Agent Identity and Validation contracts
 */

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

// Minimal ABIs for ERC-8004 contracts
const AGENT_IDENTITY_ABI = [
  'function register(string calldata metadataURI) external payable returns (uint256)',
  'function getAgent(uint256 agentId) external view returns (address owner, string metadataURI, uint256 registeredAt, bool isActive)',
  'function updateMetadata(uint256 agentId, string calldata newMetadataURI) external',
  'function deactivate(uint256 agentId) external',
  'function registrationFee() external view returns (uint256)',
  'event AgentRegistered(uint256 indexed agentId, address indexed owner, string metadataURI, uint256 timestamp)'
];

const AGENT_VALIDATION_ABI = [
  'function requestValidation(uint256 agentId, string calldata taskURI) external returns (uint256)',
  'function submitProof(uint256 requestId, string calldata proofURI) external',
  'function approveValidation(uint256 requestId) external',
  'function rejectValidation(uint256 requestId, string calldata reason) external',
  'function getValidationRequest(uint256 requestId) external view returns (uint256 agentId, address requester, string taskURI, string proofURI, uint8 status, uint256 createdAt)',
  'event ValidationRequested(uint256 indexed requestId, uint256 indexed agentId, address indexed requester, string taskURI)',
  'event ProofSubmitted(uint256 indexed requestId, string proofURI)',
  'event ValidationApproved(uint256 indexed requestId)',
  'event ValidationRejected(uint256 indexed requestId, string reason)'
];

export class ERC8004Client {
  constructor(provider, signer, identityAddress, validationAddress) {
    this.provider = provider;
    this.signer = signer;
    this.identityAddress = identityAddress;
    this.validationAddress = validationAddress;

    // Initialize contracts
    this.identityContract = new ethers.Contract(
      identityAddress,
      AGENT_IDENTITY_ABI,
      signer
    );

    this.validationContract = new ethers.Contract(
      validationAddress,
      AGENT_VALIDATION_ABI,
      signer
    );

    this.registeredAgents = [];
    this.validationRequests = [];
  }

  /**
   * Get registration fee
   */
  async getRegistrationFee() {
    try {
      const fee = await this.identityContract.registrationFee();
      return fee;
    } catch (error) {
      console.error('Error getting registration fee:', error.message);
      return ethers.parseEther('0.01'); // Default fallback
    }
  }

  /**
   * Register an agent with ERC-8004
   */
  async registerAgent(metadataURI) {
    console.log('\n📝 Registering Agent with ERC-8004...');
    console.log('=' .repeat(60));
    console.log(`   Metadata URI: ${metadataURI}`);

    try {
      // Get registration fee
      const fee = await this.getRegistrationFee();
      console.log(`   Registration Fee: ${ethers.formatEther(fee)} FIL`);

      // Check balance
      const balance = await this.provider.getBalance(this.signer.address);
      console.log(`   Current Balance: ${ethers.formatEther(balance)} FIL`);

      if (balance < fee) {
        throw new Error(`Insufficient balance. Need ${ethers.formatEther(fee)} FIL`);
      }

      // Register
      console.log('\n   Sending registration transaction...');
      const tx = await this.identityContract.register(metadataURI, { value: fee });

      console.log(`   Transaction hash: ${tx.hash}`);
      console.log('   Waiting for confirmation...');

      const receipt = await tx.wait();

      // Parse events to get agent ID
      const event = receipt.logs
        .map(log => {
          try {
            return this.identityContract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find(e => e && e.name === 'AgentRegistered');

      const agentId = event ? Number(event.args.agentId) : null;

      console.log('\n✅ Agent Registered Successfully!');
      console.log(`   Agent ID: ${agentId}`);
      console.log(`   Transaction: ${tx.hash}`);
      console.log(`   Block: ${receipt.blockNumber}`);

      const result = {
        agentId,
        metadataURI,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        owner: this.signer.address,
        timestamp: Date.now()
      };

      this.registeredAgents.push(result);

      return result;
    } catch (error) {
      console.error('❌ Agent registration failed:', error.message);
      throw error;
    }
  }

  /**
   * Get agent information
   */
  async getAgent(agentId) {
    console.log(`\n🔍 Querying Agent #${agentId}...`);

    try {
      const agent = await this.identityContract.getAgent(agentId);

      const result = {
        agentId,
        owner: agent.owner,
        metadataURI: agent.metadataURI,
        registeredAt: Number(agent.registeredAt),
        isActive: agent.isActive
      };

      console.log('\n📋 Agent Information:');
      console.log(`   Owner: ${result.owner}`);
      console.log(`   Metadata URI: ${result.metadataURI}`);
      console.log(`   Registered: ${new Date(result.registeredAt * 1000).toISOString()}`);
      console.log(`   Active: ${result.isActive}`);

      return result;
    } catch (error) {
      console.error(`❌ Failed to get agent #${agentId}:`, error.message);
      throw error;
    }
  }

  /**
   * Create validation request
   */
  async createValidationRequest(agentId, taskURI) {
    console.log('\n📋 Creating Validation Request...');
    console.log('=' .repeat(60));
    console.log(`   Agent ID: ${agentId}`);
    console.log(`   Task URI: ${taskURI}`);

    try {
      console.log('\n   Sending transaction...');
      const tx = await this.validationContract.requestValidation(agentId, taskURI);

      console.log(`   Transaction hash: ${tx.hash}`);
      console.log('   Waiting for confirmation...');

      const receipt = await tx.wait();

      // Parse events to get request ID
      const event = receipt.logs
        .map(log => {
          try {
            return this.validationContract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find(e => e && e.name === 'ValidationRequested');

      const requestId = event ? Number(event.args.requestId) : null;

      console.log('\n✅ Validation Request Created!');
      console.log(`   Request ID: ${requestId}`);
      console.log(`   Transaction: ${tx.hash}`);
      console.log(`   Block: ${receipt.blockNumber}`);

      const result = {
        requestId,
        agentId,
        taskURI,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        timestamp: Date.now()
      };

      this.validationRequests.push(result);

      return result;
    } catch (error) {
      console.error('❌ Failed to create validation request:', error.message);
      throw error;
    }
  }

  /**
   * Submit proof for validation request
   */
  async submitProof(requestId, proofURI) {
    console.log('\n📤 Submitting Proof...');
    console.log('=' .repeat(60));
    console.log(`   Request ID: ${requestId}`);
    console.log(`   Proof URI: ${proofURI}`);

    try {
      console.log('\n   Sending transaction...');
      const tx = await this.validationContract.submitProof(requestId, proofURI);

      console.log(`   Transaction hash: ${tx.hash}`);
      console.log('   Waiting for confirmation...');

      const receipt = await tx.wait();

      console.log('\n✅ Proof Submitted!');
      console.log(`   Transaction: ${tx.hash}`);
      console.log(`   Block: ${receipt.blockNumber}`);

      return {
        requestId,
        proofURI,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('❌ Failed to submit proof:', error.message);
      throw error;
    }
  }

  /**
   * Approve validation request
   */
  async approveValidation(requestId) {
    console.log('\n✅ Approving Validation...');
    console.log('=' .repeat(60));
    console.log(`   Request ID: ${requestId}`);

    try {
      console.log('\n   Sending transaction...');
      const tx = await this.validationContract.approveValidation(requestId);

      console.log(`   Transaction hash: ${tx.hash}`);
      console.log('   Waiting for confirmation...');

      const receipt = await tx.wait();

      console.log('\n✅ Validation Approved!');
      console.log(`   Transaction: ${tx.hash}`);
      console.log(`   Block: ${receipt.blockNumber}`);

      return {
        requestId,
        approved: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('❌ Failed to approve validation:', error.message);
      throw error;
    }
  }

  /**
   * Get validation request details
   */
  async getValidationRequest(requestId) {
    console.log(`\n🔍 Querying Validation Request #${requestId}...`);

    try {
      const request = await this.validationContract.getValidationRequest(requestId);

      const statusNames = ['Pending', 'Approved', 'Rejected'];

      const result = {
        requestId,
        agentId: Number(request.agentId),
        requester: request.requester,
        taskURI: request.taskURI,
        proofURI: request.proofURI,
        status: statusNames[request.status] || 'Unknown',
        statusCode: Number(request.status),
        createdAt: Number(request.createdAt)
      };

      console.log('\n📋 Validation Request:');
      console.log(`   Agent ID: ${result.agentId}`);
      console.log(`   Requester: ${result.requester}`);
      console.log(`   Task URI: ${result.taskURI}`);
      console.log(`   Proof URI: ${result.proofURI || 'Not submitted'}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Created: ${new Date(result.createdAt * 1000).toISOString()}`);

      return result;
    } catch (error) {
      console.error(`❌ Failed to get validation request #${requestId}:`, error.message);
      throw error;
    }
  }

  /**
   * Generate metadata JSON for agent
   */
  generateAgentMetadata(name, description, endpoints, capabilities) {
    return {
      name,
      description,
      image: '', // Can be added later
      endpoints: endpoints || [],
      capabilities: capabilities || [],
      supportedTrust: ['validation'],
      version: '1.0.0',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate task metadata JSON
   */
  generateTaskMetadata(description, nftContract, tokenRange, ipfsCids) {
    return {
      task: 'NFT IPFS to Filecoin Migration',
      description,
      nftContract,
      tokenRange,
      ipfsCids: ipfsCids || [],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate proof metadata JSON
   */
  generateProofMetadata(taskURI, migrationResults) {
    const successful = migrationResults.filter(r => r.success);
    const failed = migrationResults.filter(r => !r.success);

    return {
      taskURI,
      proof: {
        type: 'FilecoinMigration',
        migrationResults: migrationResults.map(r => ({
          ipfsCid: r.ipfsCid,
          filecoinPieceCid: r.filecoinPieceCid,
          filecoinCarCid: r.filecoinCarCid,
          success: r.success,
          error: r.error || null
        })),
        summary: {
          total: migrationResults.length,
          successful: successful.length,
          failed: failed.length,
          successRate: (successful.length / migrationResults.length) * 100
        }
      },
      verificationMethod: 'On-chain storage proof via Synapse SDK',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get all registered agents
   */
  getRegisteredAgents() {
    return this.registeredAgents;
  }

  /**
   * Get all validation requests
   */
  getValidationRequests() {
    return this.validationRequests;
  }
}

export default ERC8004Client;
