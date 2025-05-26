// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract HealthID is ERC721, Ownable {
    uint256 private _tokenIdCounter;
    mapping(address => uint256) public addressToTokenId;

    constructor(address initialOwner) 
        ERC721("MediChainHealthID", "MCHID") 
        Ownable(initialOwner) 
    {}

    function mintHealthID(address user) external onlyOwner returns (uint256) {
        require(balanceOf(user) == 0, "Already has HealthID");
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(user, tokenId);
        addressToTokenId[user] = tokenId;
        return tokenId;
    }

    // For OpenZeppelin ERC721 v5.x
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address) {
        // Only allow minting (from == address(0)) and burning (to == address(0))
        address from = _ownerOf(tokenId);
        require(
            from == address(0) || to == address(0),
            "Soulbound: Non-Transferable"
        );
        return super._update(to, tokenId, auth);
    }
}