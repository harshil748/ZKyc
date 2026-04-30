// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

error ZeroAddressNotAllowed();
error CommitmentAlreadyExists();
error IdentityNotFound();
error NotAnIssuer();
error IdentityRevokedError();

contract IdentityRegistry is Ownable, ReentrancyGuard {
    struct Identity {
        bytes32 commitmentHash;
        address issuer;
        uint256 issuedAt;
        uint256 expiresAt;
        bool revoked;
    }

    mapping(address => Identity) public identities;
    mapping(address => bool) public issuers;
    mapping(bytes32 => address) public commitmentToAddress;

    event IdentityRegistered(address indexed user, bytes32 indexed commitmentHash, uint256 timestamp);
    event IssuerAdded(address indexed issuer);
    event IssuerRemoved(address indexed issuer);
    event IdentityAttested(address indexed user, address indexed issuer, uint256 expiresAt);
    event IdentityRevoked(address indexed user, address indexed issuer);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Register an identity with a commitment hash.
     * @param commitmentHash keccak256 hash of (secret + nullifier) computed off-chain
     */
    function registerIdentity(
        bytes32 commitmentHash
    ) external nonReentrant {
        if (commitmentHash == bytes32(0)) revert ZeroAddressNotAllowed();
        if (identities[msg.sender].commitmentHash != bytes32(0)) {
            revert CommitmentAlreadyExists();
        }
        if (commitmentToAddress[commitmentHash] != address(0)) {
            revert CommitmentAlreadyExists();
        }

        identities[msg.sender] = Identity({
            commitmentHash: commitmentHash,
            issuer: address(0),
            issuedAt: 0,
            expiresAt: 0,
            revoked: false
        });

        commitmentToAddress[commitmentHash] = msg.sender;

        emit IdentityRegistered(msg.sender, commitmentHash, block.timestamp);
    }

    /**
     * @dev Attest an identity (issuer verifies the user's identity off-chain).
     * @param user Address of the user whose identity is being attested
     * @param expiryDays Number of days the attestation is valid
     */
    function attestIdentity(
        address user,
        uint256 expiryDays
    ) external nonReentrant {
        if (user == address(0)) revert ZeroAddressNotAllowed();
        if (!issuers[msg.sender]) revert NotAnIssuer();
        if (identities[user].commitmentHash == bytes32(0)) {
            revert IdentityNotFound();
        }
        if (identities[user].revoked) revert IdentityRevokedError();

        uint256 expiresAt = block.timestamp + (expiryDays * 1 days);

        identities[user].issuer = msg.sender;
        identities[user].issuedAt = block.timestamp;
        identities[user].expiresAt = expiresAt;

        emit IdentityAttested(user, msg.sender, expiresAt);
    }

    /**
     * @dev Revoke an identity attestation.
     * @param user Address of the user whose identity is being revoked
     */
    function revokeIdentity(address user) external nonReentrant {
        if (user == address(0)) revert ZeroAddressNotAllowed();
        if (!issuers[msg.sender]) revert NotAnIssuer();
        if (identities[user].commitmentHash == bytes32(0)) {
            revert IdentityNotFound();
        }

        identities[user].revoked = true;

        emit IdentityRevoked(user, msg.sender);
    }

    /**
     * @dev Add an issuer address.
     */
    function addIssuer(address issuer) external onlyOwner {
        if (issuer == address(0)) revert ZeroAddressNotAllowed();
        issuers[issuer] = true;
        emit IssuerAdded(issuer);
    }

    /**
     * @dev Remove an issuer address.
     */
    function removeIssuer(address issuer) external onlyOwner {
        if (issuer == address(0)) revert ZeroAddressNotAllowed();
        issuers[issuer] = false;
        emit IssuerRemoved(issuer);
    }

    /**
     * @dev Check if an identity is valid (registered, attested, not revoked, not expired).
     */
    function isIdentityValid(address user) external view returns (bool) {
        Identity storage identity = identities[user];
        if (identity.commitmentHash == bytes32(0)) return false;
        if (identity.revoked) return false;
        if (identity.expiresAt < block.timestamp) return false;
        return true;
    }

    /**
     * @dev Get identity details.
     */
    function getIdentity(
        address user
    )
        external
        view
        returns (address issuer, uint256 expiresAt, bool revoked)
    {
        Identity storage identity = identities[user];
        return (identity.issuer, identity.expiresAt, identity.revoked);
    }
}
