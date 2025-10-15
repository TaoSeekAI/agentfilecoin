/**
 * ERC-8004 Client Module
 * Interacts with ERC-8004 Agent Identity and Validation contracts
 */

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

// Minimal ABIs for our simplified ERC-8004 contracts
const AGENT_IDENTITY_ABI = [
  // ERC-8004 Registration (simplified interface)
  'function register(string calldata metadataURI) external payable returns (uint256 agentId)',
  'function getAgent(uint256 agentId) external view returns (address owner, string metadataURI, uint256 registeredAt, bool isActive)',
  'function registrationFee() external view returns (uint256)',

  // ERC-721 Standard Functions
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function tokenURI(uint256 tokenId) external view returns (string)',
  'function balanceOf(address owner) external view returns (uint256)',
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',

  // Events
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'event AgentRegistered(uint256 indexed agentId, address indexed owner, string metadataURI, uint256 timestamp)'
];

const AGENT_VALIDATION_ABI = [
  'function requestValidation(uint256 agentId, string calldata workURI, address validator) external returns (bytes32 requestHash)',
  'function submitValidation(bytes32 requestHash, bool isValid, string calldata proofURI) external',
  'function getValidationRequest(bytes32 requestHash) external view returns (uint256, address, address, string, uint8, bool, string, uint256, uint256)',
  'function getValidationStatus(bytes32 requestHash) external view returns (uint8, bool)',
  'event ValidationRequested(bytes32 indexed requestHash, uint256 indexed agentId, address indexed requester, address validator, string workURI, uint256 timestamp)',
  'event ValidationSubmitted(bytes32 indexed requestHash, uint256 indexed agentId, address indexed validator, bool isValid, string proofURI, uint256 timestamp)'
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
   * Get registration fee from contract
   */
  async getRegistrationFee() {
    return await this.identityContract.registrationFee();
  }

  /**
   * Register an agent with ERC-8004 (simplified interface)
   */
  async registerAgent(metadataURI) {
    console.log('\n📝 Registering Agent with ERC-8004...');
    console.log('=' .repeat(60));
    console.log(`   Metadata URI: ${metadataURI}`);

    try {
      // Get registration fee
      const fee = await this.getRegistrationFee();
      console.log(`   Registration Fee: ${ethers.formatEther(fee)} FIL (NFT mint)`);

      // Check balance for gas
      const balance = await this.provider.getBalance(this.signer.address);
      console.log(`   Current Balance: ${ethers.formatEther(balance)} FIL`);

      // Register with simplified interface
      console.log('\n   Sending registration transaction...');
      const tx = await this.identityContract.register(metadataURI, { value: fee });

      console.log(`   Transaction hash: ${tx.hash}`);
      console.log('   Waiting for confirmation...');

      const receipt = await tx.wait();

      // Parse AgentRegistered event to get agent ID
      const agentRegisteredEvent = receipt.logs
        .map(log => {
          try {
            return this.identityContract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find(e => e && e.name === 'AgentRegistered');

      const agentId = agentRegisteredEvent ? Number(agentRegisteredEvent.args.agentId) : null;

      console.log('\n✅ Agent Registered Successfully!');
      console.log(`   Agent ID (Token ID): ${agentId}`);
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
   * Get agent information (using ERC-721 functions)
   */
  async getAgent(agentId) {
    console.log(`\n🔍 Querying Agent #${agentId}...`);

    try {
      // Use ERC-721 standard functions
      const owner = await this.identityContract.ownerOf(agentId);
      const metadataURI = await this.identityContract.tokenURI(agentId);

      const result = {
        agentId,
        owner,
        metadataURI,
        isActive: true // If ownerOf doesn't revert, the token exists
      };

      console.log('\n📋 Agent Information:');
      console.log(`   Token ID: ${result.agentId}`);
      console.log(`   Owner: ${result.owner}`);
      console.log(`   Metadata URI: ${result.metadataURI}`);
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
  async createValidationRequest(agentId, taskURI, validator = null) {
    console.log('\n📋 Creating Validation Request...');
    console.log('=' .repeat(60));
    console.log(`   Agent ID: ${agentId}`);
    console.log(`   Task URI: ${taskURI}`);

    // Default validator to a different address (use a well-known testnet address)
    // In a real scenario, this would be the address of an actual validator
    const validatorAddress = validator || this.signer.address;
    console.log(`   Validator: ${validatorAddress}`);

    try {
      console.log('\n   Sending transaction...');
      const tx = await this.validationContract.requestValidation(agentId, taskURI, validatorAddress);

      console.log(`   Transaction hash: ${tx.hash}`);
      console.log('   Waiting for confirmation...');

      const receipt = await tx.wait();

      // Parse events to get request hash
      const event = receipt.logs
        .map(log => {
          try {
            return this.validationContract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find(e => e && e.name === 'ValidationRequested');

      const requestHash = event ? event.args.requestHash : null;

      console.log('\n✅ Validation Request Created!');
      console.log(`   Request Hash: ${requestHash}`);
      console.log(`   Transaction: ${tx.hash}`);
      console.log(`   Block: ${receipt.blockNumber}`);

      const result = {
        requestHash,
        agentId,
        taskURI,
        validator: validatorAddress,
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
   * Submit validation (as validator)
   */
  async submitValidation(requestHash, isValid, proofURI) {
    console.log('\n📤 Submitting Validation...');
    console.log('=' .repeat(60));
    console.log(`   Request Hash: ${requestHash}`);
    console.log(`   Is Valid: ${isValid}`);
    console.log(`   Proof URI: ${proofURI}`);

    try {
      console.log('\n   Sending transaction...');
      const tx = await this.validationContract.submitValidation(requestHash, isValid, proofURI);

      console.log(`   Transaction hash: ${tx.hash}`);
      console.log('   Waiting for confirmation...');

      const receipt = await tx.wait();

      console.log('\n✅ Validation Submitted!');
      console.log(`   Transaction: ${tx.hash}`);
      console.log(`   Block: ${receipt.blockNumber}`);

      return {
        requestHash,
        isValid,
        proofURI,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('❌ Failed to submit validation:', error.message);
      throw error;
    }
  }

  /**
   * Get validation request details
   */
  async getValidationRequest(requestHash) {
    console.log(`\n🔍 Querying Validation Request ${requestHash.substring(0, 10)}...`);

    try {
      const request = await this.validationContract.getValidationRequest(requestHash);

      const statusNames = ['Pending', 'Completed', 'Expired'];

      const result = {
        requestHash,
        agentId: Number(request[0]),
        requester: request[1],
        validator: request[2],
        workURI: request[3],
        status: statusNames[Number(request[4])] || 'Unknown',
        statusCode: Number(request[4]),
        isValid: request[5],
        proofURI: request[6],
        requestedAt: Number(request[7]),
        completedAt: Number(request[8])
      };

      console.log('\n📋 Validation Request:');
      console.log(`   Request Hash: ${result.requestHash}`);
      console.log(`   Agent ID: ${result.agentId}`);
      console.log(`   Requester: ${result.requester}`);
      console.log(`   Validator: ${result.validator}`);
      console.log(`   Work URI: ${result.workURI}`);
      console.log(`   Proof URI: ${result.proofURI || 'Not submitted'}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Is Valid: ${result.isValid}`);
      console.log(`   Requested: ${new Date(result.requestedAt * 1000).toISOString()}`);

      return result;
    } catch (error) {
      console.error(`❌ Failed to get validation request:`, error.message);
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
