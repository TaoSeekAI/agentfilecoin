// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TestNFT
 * @dev Simple ERC-721 contract for testing the NFT migration demo
 *
 * Deploy this contract to Calibration testnet and mint some tokens
 * with IPFS URIs to test the migration MVP.
 */
contract TestNFT is ERC721URIStorage, Ownable {
    uint256 private _tokenIdCounter;

    event TokenMinted(uint256 indexed tokenId, address indexed to, string uri);

    constructor() ERC721("TestNFT", "TNFT") Ownable(msg.sender) {}

    /**
     * @dev Mint a single NFT with metadata URI
     */
    function mint(address to, string memory uri) public onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        emit TokenMinted(tokenId, to, uri);
        return tokenId;
    }

    /**
     * @dev Batch mint multiple NFTs with metadata URIs
     */
    function batchMint(string[] memory uris) public onlyOwner {
        for (uint256 i = 0; i < uris.length; i++) {
            mint(msg.sender, uris[i]);
        }
    }

    /**
     * @dev Get total number of minted tokens
     */
    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter;
    }
}
