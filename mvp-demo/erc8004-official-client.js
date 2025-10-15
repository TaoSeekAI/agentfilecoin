/**
 * Official ERC-8004 Client Module
 * Uses official deployed contracts on Sepolia with actual ABIs from compilation
 */

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

// Official ERC-8004 IdentityRegistry ABI (compiled from source)
const IDENTITY_REGISTRY_ABI = [
  // Register functions (3 overloads)
  'function register() external returns (uint256 agentId)',
  'function register(string calldata tokenURI_) external returns (uint256 agentId)',
  'function register(string calldata tokenURI_, tuple(string key, bytes value)[] calldata metadata) external returns (uint256 agentId)',

  // Metadata management
  'function setMetadata(uint256 agentId, string calldata key, bytes calldata value) external',
  'function getMetadata(uint256 agentId, string calldata key) external view returns (bytes memory value)',

  // Query functions
  'function agentExists(uint256 agentId) external view returns (bool exists)',
  'function totalAgents() external view returns (uint256 count)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function tokenURI(uint256 tokenId) external view returns (string)',

  // Events
  'event Registered(uint256 indexed agentId, string tokenURI, address indexed owner)',
  'event MetadataSet(uint256 indexed agentId, string indexed indexedKey, string key, bytes value)'
];

// Official ERC-8004 ValidationRegistry ABI (compiled from source)
const VALIDATION_REGISTRY_ABI = [
  // Validation request/response
  'function validationRequest(address validatorAddress, uint256 agentId, string calldata requestUri, bytes32 requestHash) external',
  'function validationResponse(bytes32 requestHash, uint8 response, string calldata responseUri, bytes32 responseHash, bytes32 tag) external',

  // Query functions
  'function getValidationStatus(bytes32 requestHash) external view returns (address requester, uint256 agentId, uint8 status, bytes32 responseHash, uint256 timestamp)',
  'function getRequest(bytes32 requestHash) external view returns (address validatorAddress, uint256 agentId, string memory requestUri, uint256 timestamp)',
  'function requestExists(bytes32 requestHash) external view returns (bool)',
  'function getAgentValidations(uint256 agentId) external view returns (bytes32[] memory)',

  // Events
  'event ValidationRequested(bytes32 indexed requestHash, uint256 indexed agentId, address indexed requester, address validatorAddress, string requestUri, uint256 timestamp)',
  'event ValidationResponse(bytes32 indexed requestHash, address indexed validator, uint8 response, string responseUri, bytes32 responseHash, bytes32 tag, uint256 timestamp)'
];

export class ERC8004OfficialClient {
  constructor(provider, signer, identityAddress, validationAddress) {
    this.provider = provider;
    this.signer = signer;
    this.identityAddress = identityAddress;
    this.validationAddress = validationAddress;

    this.identityRegistry = new ethers.Contract(
      identityAddress,
      IDENTITY_REGISTRY_ABI,
      signer
    );

    this.validationRegistry = new ethers.Contract(
      validationAddress,
      VALIDATION_REGISTRY_ABI,
      signer
    );

    this.registeredAgents = [];
    this.validationRequests = [];
  }

  /**
   * Register an agent (official ERC-8004 - FREE registration)
   */
  async registerAgent(tokenURI) {
    console.log('\n📝 Registering Agent with Official ERC-8004...');
    console.log('=' .repeat(60));
    console.log(`   Token URI: ${tokenURI}`);

    try {
      console.log('   Registration Fee: FREE (0 ETH)');

      const balance = await this.provider.getBalance(this.signer.address);
      console.log(`   Current Balance: ${ethers.formatEther(balance)} ETH`);

      // Use the single-parameter overload
      console.log('\n   Sending registration transaction...');
      const tx = await this.identityRegistry['register(string)'](tokenURI);

      console.log(`   Transaction hash: ${tx.hash}`);
      console.log('   Waiting for confirmation...');

      const receipt = await tx.wait();

      // Parse Registered event
      const registeredEvent = receipt.logs
        .map(log => {
          try {
            return this.identityRegistry.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find(e => e && e.name === 'Registered');

      const agentId = registeredEvent ? Number(registeredEvent.args.agentId) : null;

      console.log('\n✅ Agent Registered Successfully!');
      console.log(`   Agent ID: ${agentId}`);
      console.log(`   Transaction: ${tx.hash}`);
      console.log(`   Block: ${receipt.blockNumber}`);

      const result = {
        agentId,
        owner: this.signer.address,
        tokenURI,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
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
   * Create validation request (official ERC-8004 interface)
   * Note: Official contract requires pre-computed requestHash
   */
  async createValidationRequest(agentId, requestUri, validatorAddress) {
    console.log('\n📋 Creating Validation Request...');
    console.log('=' .repeat(60));
    console.log(`   Agent ID: ${agentId}`);
    console.log(`   Request URI: ${requestUri}`);
    console.log(`   Validator: ${validatorAddress}`);

    try {
      // Compute requestHash (keccak256 of request data)
      const requestHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['address', 'uint256', 'string', 'uint256'],
          [validatorAddress, agentId, requestUri, Date.now()]
        )
      );

      console.log(`   Request Hash: ${requestHash}`);

      console.log('\n   Sending transaction...');
      const tx = await this.validationRegistry.validationRequest(
        validatorAddress,
        agentId,
        requestUri,
        requestHash
      );

      console.log(`   Transaction hash: ${tx.hash}`);
      console.log('   Waiting for confirmation...');

      const receipt = await tx.wait();

      console.log('\n✅ Validation Request Created!');
      console.log(`   Request Hash: ${requestHash}`);
      console.log(`   Transaction: ${tx.hash}`);
      console.log(`   Block: ${receipt.blockNumber}`);

      const result = {
        requestHash,
        agentId,
        requestUri,
        validatorAddress,
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
   * Submit validation response (as validator)
   */
  async submitValidationResponse(requestHash, isValid, responseUri) {
    console.log('\n📤 Submitting Validation Response...');
    console.log('=' .repeat(60));
    console.log(`   Request Hash: ${requestHash}`);
    console.log(`   Is Valid: ${isValid}`);
    console.log(`   Response URI: ${responseUri}`);

    try {
      // Response: 0=Pending, 1=Approved, 2=Rejected
      const response = isValid ? 1 : 2;

      // Compute responseHash
      const responseHash = ethers.keccak256(ethers.toUtf8Bytes(responseUri));

      // Tag (optional metadata)
      const tag = ethers.ZeroHash;

      console.log('\n   Sending transaction...');
      const tx = await this.validationRegistry.validationResponse(
        requestHash,
        response,
        responseUri,
        responseHash,
        tag
      );

      console.log(`   Transaction hash: ${tx.hash}`);
      console.log('   Waiting for confirmation...');

      const receipt = await tx.wait();

      console.log('\n✅ Validation Response Submitted!');
      console.log(`   Transaction: ${tx.hash}`);
      console.log(`   Block: ${receipt.blockNumber}`);

      return {
        requestHash,
        response: isValid ? 'Approved' : 'Rejected',
        responseUri,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('❌ Failed to submit validation response:', error.message);
      throw error;
    }
  }

  /**
   * Get agent information
   */
  async getAgent(agentId) {
    try {
      const exists = await this.identityRegistry.agentExists(agentId);

      if (!exists) {
        throw new Error(`Agent ${agentId} does not exist`);
      }

      const owner = await this.identityRegistry.ownerOf(agentId);
      const metadataURI = await this.identityRegistry.tokenURI(agentId);

      return {
        agentId,
        owner,
        metadataURI,
        isActive: exists
      };
    } catch (error) {
      console.error(`❌ Failed to get agent info:`, error.message);
      throw error;
    }
  }

  /**
   * Get validation request details
   */
  async getValidationRequest(requestHash) {
    try {
      const exists = await this.validationRegistry.requestExists(requestHash);

      if (!exists) {
        throw new Error(`Validation request ${requestHash} does not exist`);
      }

      const request = await this.validationRegistry.getRequest(requestHash);
      const status = await this.validationRegistry.getValidationStatus(requestHash);

      const statusNames = ['Pending', 'Approved', 'Rejected'];

      return {
        requestHash,
        validatorAddress: request[0],
        agentId: Number(request[1]),
        requestUri: request[2],
        requestedAt: Number(request[3]),
        requester: status[0],
        status: statusNames[Number(status[2])] || 'Unknown',
        statusCode: Number(status[2]),
        responseHash: status[3]
      };
    } catch (error) {
      console.error(`❌ Failed to get validation request:`, error.message);
      throw error;
    }
  }

  /**
   * Get validation status
   */
  async getValidationStatus(requestHash) {
    console.log(`\n🔍 Querying Validation Status ${requestHash.substring(0, 10)}...`);

    try {
      const status = await this.validationRegistry.getValidationStatus(requestHash);

      const statusNames = ['Pending', 'Approved', 'Rejected'];

      const result = {
        requestHash,
        requester: status[0],
        agentId: Number(status[1]),
        status: statusNames[Number(status[2])] || 'Unknown',
        statusCode: Number(status[2]),
        responseHash: status[3],
        timestamp: Number(status[4])
      };

      console.log('\n📋 Validation Status:');
      console.log(`   Request Hash: ${result.requestHash}`);
      console.log(`   Agent ID: ${result.agentId}`);
      console.log(`   Requester: ${result.requester}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Timestamp: ${new Date(result.timestamp * 1000).toISOString()}`);

      return result;
    } catch (error) {
      console.error(`❌ Failed to get validation status:`, error.message);
      throw error;
    }
  }

  /**
   * Generate agent metadata JSON
   */
  generateAgentMetadata(name, description, capabilities) {
    return {
      name,
      description,
      capabilities,
      type: 'AI Agent',
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      owner: this.signer.address
    };
  }

  /**
   * Generate task metadata JSON
   */
  generateTaskMetadata(description, nftContract, tokenRange, ipfsCIDs) {
    return {
      task: description,
      nft: {
        contract: nftContract,
        tokenRange
      },
      ipfsCIDs,
      createdAt: new Date().toISOString(),
      requester: this.signer.address
    };
  }

  /**
   * Generate proof metadata JSON
   */
  generateProofMetadata(taskURI, migrationResults) {
    return {
      taskURI,
      results: migrationResults,
      summary: {
        total: migrationResults.length,
        successful: migrationResults.filter(r => r.success).length,
        failed: migrationResults.filter(r => !r.success).length
      },
      createdAt: new Date().toISOString()
    };
  }
}
