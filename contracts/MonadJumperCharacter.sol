// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract MonadJumperCharacter is ERC721, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;
    
    // Price is 1 MON
    uint256 public constant MINT_PRICE = 1 ether;
    
    // IPFS metadata URI
    string public constant CHARACTER_URI = "https://bafkreigbsj23mozts5zowhot6ra3lq5mudcbttawevzoopfxmwk273h42u.ipfs.flk-ipfs.xyz";
    
    // Mapping to track mints per address
    mapping(address => bool) public hasMinted;
    
    constructor() ERC721("MonadJumperCharacter", "MJC") Ownable(msg.sender) {}
    
    function mintCharacter() external payable {
        // Check if the wallet has already minted
        require(!hasMinted[msg.sender], "Already minted: Limit 1 per wallet");
        
        // Check payment
        require(msg.value >= MINT_PRICE, "Insufficient payment: 1 MON required");
        
        // Record that this wallet has minted
        hasMinted[msg.sender] = true;
        
        // Mint the NFT
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(msg.sender, tokenId);
    }
    
    function tokenURI(uint256) public pure override returns (string memory) {
        return CHARACTER_URI;
    }
    
    // Withdraw function for owner
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        payable(owner()).transfer(balance);
    }
} 