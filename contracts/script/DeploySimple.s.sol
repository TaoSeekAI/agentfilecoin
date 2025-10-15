// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Script.sol";
import "../src/AgentIdentity.sol";
import "../src/AgentReputation.sol";
import "../src/AgentValidation.sol";

/**
 * @title DeploySimple
 * @notice Simple deployment script without file writing
 */
contract DeploySimple is Script {
    function run() external {
        vm.startBroadcast();

        // Deploy Identity Registry (0 fee for MVP)
        console.log("Deploying AgentIdentity...");
        AgentIdentity identity = new AgentIdentity(0);
        console.log("AgentIdentity deployed at:", address(identity));

        // Deploy Reputation Registry
        console.log("Deploying AgentReputation...");
        AgentReputation reputation = new AgentReputation(address(identity));
        console.log("AgentReputation deployed at:", address(reputation));

        // Deploy Validation Registry
        console.log("Deploying AgentValidation...");
        AgentValidation validation = new AgentValidation(address(identity));
        console.log("AgentValidation deployed at:", address(validation));

        vm.stopBroadcast();

        console.log("\n=== Deployment Complete ===");
        console.log("Network Chain ID:", block.chainid);
        console.log("Registration Fee: 0");
    }
}
