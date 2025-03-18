// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract OptimizedMonadJumperNFT is ERC721, Ownable {
    using Strings for uint256;
    
    // Mint price (1 MON)
    uint256 public constant MINT_PRICE = 1 ether;
    
    // IPFS CID
    string public constant CID = "bafkreigbsj23mozts5zowhot6ra3lq5mudcbttawevzoopfxmwk273h42u";
    
    // Token counter
    uint256 private _tokenIdCounter;
    
    // Events
    event NFTMinted(address indexed minter, uint256 tokenId);
    
    constructor() ERC721("Monad Jumper", "JUMPER") Ownable(msg.sender) {
        _tokenIdCounter = 1; // Start from token ID 1
    }
    
    /**
     * @dev Mints a new NFT
     * Main optimizations:
     * 1. Removed auto-withdrawal to save gas
     * 2. No ERC721Enumerable
     * 3. Store minted status in mapping instead of using balanceOf check
     */
    mapping(address => bool) public hasMinted;
    
    function mint() external payable {
        // Check if the wallet has already minted
        require(!hasMinted[msg.sender], "Limit 1 NFT per wallet");
        
        // Check correct payment
        require(msg.value >= MINT_PRICE, "Insufficient payment");
        
        // Mint the NFT
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(msg.sender, tokenId);
        
        // Mark as minted
        hasMinted[msg.sender] = true;
        
        emit NFTMinted(msg.sender, tokenId);
    }
    
    /**
     * @dev Separate withdrawal function instead of auto-withdraw
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Transfer failed");
    }
    
    /**
     * @dev Returns if a wallet has minted - optimized version
     */
    function walletHasMinted(address wallet) external view returns (bool) {
        return hasMinted[wallet];
    }
    
    /**
     * @dev Override to return metadata using existing CID format
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        
        return string(abi.encodePacked(
            "data:application/json;base64,",
            Base64.encode(bytes(abi.encodePacked(
                '{"name":"Monad Jumper #', 
                tokenId.toString(),
                '","description":"A unique character for the Monad Jumper game","image":"ipfs://',
                CID,
                '","attributes":[{"trait_type":"Type","value":"Jumper"}]}'
            )))
        ));
    }
}

/**
 * @dev Base64 encoding library (same as original contract)
 */
library Base64 {
    bytes internal constant TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    function encode(bytes memory data) internal pure returns (string memory) {
        uint256 len = data.length;
        if (len == 0) return "";

        // multiply by 4/3 rounded up
        uint256 encodedLen = 4 * ((len + 2) / 3);

        // Add some extra buffer at the end
        bytes memory result = new bytes(encodedLen + 32);

        bytes memory table = TABLE;

        assembly {
            let tablePtr := add(table, 1)
            let resultPtr := add(result, 32)

            for {
                let i := 0
            } lt(i, len) {

            } {
                i := add(i, 3)
                let input := and(mload(add(data, i)), 0xffffff)

                let out := mload(add(tablePtr, and(shr(18, input), 0x3F)))
                out := shl(8, out)
                out := add(out, and(mload(add(tablePtr, and(shr(12, input), 0x3F))), 0xFF))
                out := shl(8, out)
                out := add(out, and(mload(add(tablePtr, and(shr(6, input), 0x3F))), 0xFF))
                out := shl(8, out)
                out := add(out, and(mload(add(tablePtr, and(input, 0x3F))), 0xFF))
                out := shl(224, out)

                mstore(resultPtr, out)

                resultPtr := add(resultPtr, 4)
            }

            switch mod(len, 3)
            case 1 {
                mstore(sub(resultPtr, 2), shl(240, 0x3d3d))
            }
            case 2 {
                mstore(sub(resultPtr, 1), shl(248, 0x3d))
            }

            mstore(result, encodedLen)
        }

        return string(result);
    }
} 