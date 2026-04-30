// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

error ZeroAddressNotAllowed();
error CredentialNotFound();
error CredentialExpiredError();
error CredentialRevokedError();
error NotAnIssuer();
error InvalidCredentialType();

contract CredentialVerifier is Ownable, ReentrancyGuard {
    enum CredentialType {
        AGE_VERIFIED,
        KYC_PASSED,
        ACCREDITED_INVESTOR
    }

    struct Credential {
        bytes32 credentialHash;
        uint256 issuedAt;
        uint256 expiresAt;
        bool revoked;
    }

    mapping(address => mapping(CredentialType => Credential)) public credentials;
    mapping(address => bool) public issuers;

    event CredentialIssued(address indexed user, CredentialType indexed credentialType, uint256 expiresAt);
    event CredentialRevoked(address indexed user, CredentialType indexed credentialType);
    event IssuerAuthorized(address indexed issuer);
    event IssuerRemoved(address indexed issuer);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Issue a credential to a user.
     * @param user Address of the user receiving the credential
     * @param credentialType Type of credential (0=AGE, 1=KYC, 2=INVESTOR)
     * @param credentialHash Keccak256 hash of credential data (never raw PII)
     * @param expiryDays Days until credential expires
     */
    function issueCredential(
        address user,
        uint8 credentialType,
        bytes32 credentialHash,
        uint256 expiryDays
    ) external nonReentrant {
        if (user == address(0)) revert ZeroAddressNotAllowed();
        if (!issuers[msg.sender]) revert NotAnIssuer();
        if (credentialType > 2) revert InvalidCredentialType();
        if (credentialHash == bytes32(0)) revert ZeroAddressNotAllowed();

        CredentialType cType = CredentialType(credentialType);
        uint256 expiresAt = block.timestamp + (expiryDays * 1 days);

        credentials[user][cType] = Credential({
            credentialHash: credentialHash,
            issuedAt: block.timestamp,
            expiresAt: expiresAt,
            revoked: false
        });

        emit CredentialIssued(user, cType, expiresAt);
    }

    /**
     * @dev Verify a credential exists and is valid (selective disclosure).
     * @param user Address of the user
     * @param credentialType Type of credential to verify
     * @return true if credential is valid, not revoked, and not expired
     */
    function verifyCredential(
        address user,
        uint8 credentialType
    ) external view returns (bool) {
        if (credentialType > 2) revert InvalidCredentialType();

        CredentialType cType = CredentialType(credentialType);
        Credential storage cred = credentials[user][cType];

        if (cred.credentialHash == bytes32(0)) revert CredentialNotFound();
        if (cred.revoked) revert CredentialRevokedError();
        if (cred.expiresAt < block.timestamp) revert CredentialExpiredError();

        return true;
    }

    /**
     * @dev Check credential validity without reverting.
     * @param user Address of the user
     * @param credentialType Type of credential
     * @return true if credential is valid and not expired
     */
    function hasValidCredential(
        address user,
        uint8 credentialType
    ) external view returns (bool) {
        if (credentialType > 2) return false;

        CredentialType cType = CredentialType(credentialType);
        Credential storage cred = credentials[user][cType];

        if (cred.credentialHash == bytes32(0)) return false;
        if (cred.revoked) return false;
        if (cred.expiresAt < block.timestamp) return false;

        return true;
    }

    /**
     * @dev Revoke a credential.
     * @param user Address of the user
     * @param credentialType Type of credential to revoke
     */
    function revokeCredential(
        address user,
        uint8 credentialType
    ) external nonReentrant {
        if (user == address(0)) revert ZeroAddressNotAllowed();
        if (!issuers[msg.sender]) revert NotAnIssuer();
        if (credentialType > 2) revert InvalidCredentialType();

        CredentialType cType = CredentialType(credentialType);
        if (credentials[user][cType].credentialHash == bytes32(0)) {
            revert CredentialNotFound();
        }

        credentials[user][cType].revoked = true;

        emit CredentialRevoked(user, cType);
    }

    /**
     * @dev Authorize an issuer.
     */
    function authorizeIssuer(address issuer) external onlyOwner {
        if (issuer == address(0)) revert ZeroAddressNotAllowed();
        issuers[issuer] = true;
        emit IssuerAuthorized(issuer);
    }

    /**
     * @dev Remove issuer authorization.
     */
    function removeIssuer(address issuer) external onlyOwner {
        if (issuer == address(0)) revert ZeroAddressNotAllowed();
        issuers[issuer] = false;
        emit IssuerRemoved(issuer);
    }

    /**
     * @dev Get credential details (without revealing hash).
     */
    function getCredentialMetadata(
        address user,
        uint8 credentialType
    )
        external
        view
        returns (uint256 issuedAt, uint256 expiresAt, bool revoked)
    {
        if (credentialType > 2) revert InvalidCredentialType();
        CredentialType cType = CredentialType(credentialType);
        Credential storage cred = credentials[user][cType];

        return (cred.issuedAt, cred.expiresAt, cred.revoked);
    }

    /**
     * @dev Convert credential type to string (for frontend).
     */
    function credentialTypeToString(uint8 credentialType)
        external
        pure
        returns (string memory)
    {
        if (credentialType == 0) return "AGE_VERIFIED";
        if (credentialType == 1) return "KYC_PASSED";
        if (credentialType == 2) return "ACCREDITED_INVESTOR";
        revert InvalidCredentialType();
    }
}
