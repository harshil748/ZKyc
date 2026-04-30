// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./CredentialVerifier.sol";

error UnauthorizedAccess();
error GateZeroAddressNotAllowed();

contract AccessGate is ReentrancyGuard {
    CredentialVerifier public credentialVerifier;
    mapping(address => uint256) public deposits;
    uint256 public totalDeposits;

    event DepositWhitelisted(address indexed user, uint256 amount);
    event WithdrawalExecuted(address indexed user, uint256 amount);

    constructor(address credentialVerifierAddress) {
        if (credentialVerifierAddress == address(0)) {
            revert GateZeroAddressNotAllowed();
        }
        credentialVerifier = CredentialVerifier(credentialVerifierAddress);
    }

    /**
     * @dev Modifier: only allow users with KYC_PASSED credential.
     */
    modifier onlyKYCPassed() {
        if (
            !credentialVerifier.hasValidCredential(msg.sender, 1) // 1 = KYC_PASSED
        ) {
            revert UnauthorizedAccess();
        }
        _;
    }

    /**
     * @dev Restricted function: only KYC-passed users can deposit.
     */
    function whitelistDeposit() external payable nonReentrant onlyKYCPassed {
        require(msg.value > 0, "Deposit must be > 0");

        deposits[msg.sender] += msg.value;
        totalDeposits += msg.value;

        emit DepositWhitelisted(msg.sender, msg.value);
    }

    /**
     * @dev Restricted function: only KYC-passed users can withdraw.
     */
    function whitelistWithdraw(uint256 amount) external nonReentrant onlyKYCPassed {
        require(amount > 0, "Withdrawal must be > 0");
        require(deposits[msg.sender] >= amount, "Insufficient balance");

        deposits[msg.sender] -= amount;
        totalDeposits -= amount;

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Withdrawal failed");

        emit WithdrawalExecuted(msg.sender, amount);
    }

    /**
     * @dev Get user's deposit balance.
     */
    function getBalance(address user) external view returns (uint256) {
        return deposits[user];
    }

    /**
     * @dev Check if user is KYC-verified.
     */
    function isUserVerified(address user) external view returns (bool) {
        return credentialVerifier.hasValidCredential(user, 1); // 1 = KYC_PASSED
    }

    /// @dev Receive ETH
    receive() external payable {}
}
