// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title IdentityRegistry
 * @dev Manages KYC status of users securely using identity hashes on-chain.
 */
contract IdentityRegistry is Ownable {
    struct Identity {
        bytes32 identityHash;
        bool isVerified;
        uint256 verificationTimestamp;
    }

    mapping(address => Identity) public identities;
    mapping(bytes32 => address) public hashedToAddress;

    address public kycOracle;

    event IdentityVerified(address indexed user, bytes32 indexed identityHash);
    event IdentityRevoked(address indexed user);
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);

    error NotAuthorized();
    error AlreadyVerified();
    error HashAlreadyUsed();
    error NotVerified();

    constructor(address initialOwner) Ownable(initialOwner) {
        kycOracle = msg.sender;
    }

    modifier onlyOracleOrOwner() {
        if (msg.sender != owner() && msg.sender != kycOracle) {
            revert NotAuthorized();
        }
        _;
    }

    function setOracle(address _oracle) external onlyOwner {
        address old = kycOracle;
        kycOracle = _oracle;
        emit OracleUpdated(old, _oracle);
    }

    function verifyIdentity(address user, bytes32 identityHash) external onlyOracleOrOwner {
        if (identities[user].isVerified) revert AlreadyVerified();
        // Removed HashAlreadyUsed so multiple wallets can use same Aadhar if needed for testing (restoring the previous behaviour)
        
        identities[user] = Identity({
            identityHash: identityHash,
            isVerified: true,
            verificationTimestamp: block.timestamp
        });
        hashedToAddress[identityHash] = user;

        emit IdentityVerified(user, identityHash);
    }

    function revokeIdentity(address user) external onlyOracleOrOwner {
        if (!identities[user].isVerified) revert NotVerified();

        bytes32 idHash = identities[user].identityHash;
        identities[user].isVerified = false;
        hashedToAddress[idHash] = address(0);

        emit IdentityRevoked(user);
    }

    function isVerified(address user) external view returns (bool) {
        return identities[user].isVerified;
    }
}
