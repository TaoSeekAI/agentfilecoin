// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Script.sol";
import "../src/AgentIdentity.sol";
import "../src/AgentReputation.sol";
import "../src/AgentValidation.sol";

/**
 * @title Deploy
 * @notice Deployment script for ERC-8004 Agent contracts
 */
contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        uint256 registrationFee = vm.envOr("REGISTRATION_FEE", uint256(0));

        vm.startBroadcast(deployerPrivateKey);

        // Deploy Identity Registry
        console.log("Deploying AgentIdentity...");
        AgentIdentity identity = new AgentIdentity(registrationFee);
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

        // Write deployment addresses to file
        string memory deploymentInfo = string(
            abi.encodePacked(
                "# Deployment Addresses\n\n",
                "Network: ",
                vm.toString(block.chainid),
                "\n\n",
                "AgentIdentity: ",
                vm.toString(address(identity)),
                "\n",
                "AgentReputation: ",
                vm.toString(address(reputation)),
                "\n",
                "AgentValidation: ",
                vm.toString(address(validation)),
                "\n"
            )
        );

        vm.writeFile("deployment.md", deploymentInfo);

        console.log("\n=== Deployment Complete ===");
        console.log("Network Chain ID:", block.chainid);
        console.log("Registration Fee:", registrationFee);
    }
}
