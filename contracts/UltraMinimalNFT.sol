// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract UltraMinimalNFT is ERC721, Ownable {
    // Mint price (1 MON)
    uint256 public constant MINT_PRICE = 1 ether;
    
    // Base URI for metadata - much simpler than Base64 encoding
    string public baseTokenURI;
    
    // Token counter
    uint256 private _tokenIdCounter;
    
    // Tracking who has minted
    mapping(address => bool) public hasMinted;
    
    constructor(string memory baseURI) ERC721("Monad Jumper", "JUMPER") Ownable(msg.sender) {
        _tokenIdCounter = 1;
        baseTokenURI = baseURI;
    }
    
    // Ultra gas-optimized mint function
    function mint() external payable {
        require(!hasMinted[msg.sender], "Already minted");
        require(msg.value >= MINT_PRICE, "Insufficient payment");
        
        uint256 tokenId = _tokenIdCounter++;
        
        // Use _mint instead of _safeMint to save gas
        _mint(msg.sender, tokenId);
        
        hasMinted[msg.sender] = true;
    }
    
    // Simple withdrawal - not included in mint to save gas
    function withdraw() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Transfer failed");
    }
    
    // Simplified metadata handling
    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }
    
    // Check for NFT ownership
    function walletHasMinted(address wallet) external view returns (bool) {
        return hasMinted[wallet];
    }
} 