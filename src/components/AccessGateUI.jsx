import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "../hooks/useWeb3";
import { useContract, useTransaction } from "../hooks/useContract";

const AccessGateUI = () => {
	const { signer, account } = useWeb3();
	const { contract: accessGate } = useContract("AccessGate", signer);
	const {
		isLoading: txLoading,
		hash: txHash,
		error: txError,
		executeTransaction,
	} = useTransaction();

	const [isVerified, setIsVerified] = useState(false);
	const [checkingStatus, setCheckingStatus] = useState(true);
	const [depositAmount, setDepositAmount] = useState("0.1");
	const [userBalance, setUserBalance] = useState("0");
	const [totalDeposits, setTotalDeposits] = useState("0");
	const [successMessage, setSuccessMessage] = useState("");

	// Check user verification status on load
	useEffect(() => {
		const checkStatus = async () => {
			if (!accessGate || !account) {
				setCheckingStatus(false);
				return;
			}

			try {
				const verified = await accessGate.isUserVerified(account);
				setIsVerified(verified);

				if (verified) {
					const balance = await accessGate.getBalance(account);
					setUserBalance(ethers.formatEther(balance));
				}

				const total = await accessGate.totalDeposits();
				setTotalDeposits(ethers.formatEther(total));
			} catch (err) {
				console.error("Error checking status:", err);
			} finally {
				setCheckingStatus(false);
			}
		};

		checkStatus();
		const interval = setInterval(checkStatus, 5000); // Refresh every 5 seconds
		return () => clearInterval(interval);
	}, [accessGate, account]);

	const handleDeposit = async (e) => {
		e.preventDefault();

		if (!accessGate || !depositAmount) {
			alert("Please enter a deposit amount");
			return;
		}

		try {
			const amountInWei = ethers.parseEther(depositAmount);
			await executeTransaction(
				accessGate.whitelistDeposit({ value: amountInWei }),
				() => {
					setSuccessMessage(`✅ Deposited ${depositAmount} ETH successfully`);
					setDepositAmount("0.1");
					// Refresh balance
					setTimeout(() => {
						const checkBalance = async () => {
							const balance = await accessGate.getBalance(account);
							setUserBalance(ethers.formatEther(balance));
						};
						checkBalance();
					}, 1000);
				},
			);
		} catch (err) {
			console.error("Deposit error:", err);
		}
	};

	const handleWithdraw = async (e) => {
		e.preventDefault();

		if (!accessGate || !depositAmount || parseFloat(depositAmount) <= 0) {
			alert("Please enter a valid withdrawal amount");
			return;
		}

		if (parseFloat(depositAmount) > parseFloat(userBalance)) {
			alert("Insufficient balance");
			return;
		}

		try {
			const amountInWei = ethers.parseEther(depositAmount);
			await executeTransaction(
				accessGate.whitelistWithdraw(amountInWei),
				() => {
					setSuccessMessage(`✅ Withdrew ${depositAmount} ETH successfully`);
					setDepositAmount("0.1");
					// Refresh balance
					setTimeout(() => {
						const checkBalance = async () => {
							const balance = await accessGate.getBalance(account);
							setUserBalance(ethers.formatEther(balance));
						};
						checkBalance();
					}, 1000);
				},
			);
		} catch (err) {
			console.error("Withdrawal error:", err);
		}
	};

	if (!account) {
		return (
			<div className='card'>
				<p className='text-gray-400'>Please connect your wallet first</p>
			</div>
		);
	}

	if (checkingStatus) {
		return (
			<div className='card'>
				<p className='text-gray-400'>Checking KYC status...</p>
			</div>
		);
	}

	return (
		<div className='space-y-6'>
			{/* Header */}
			<div className='card'>
				<h3 className='text-2xl font-bold gradient-text mb-2'>
					🏛️ Access Gate - KYC Protected Pool
				</h3>
				<p className='text-gray-400 text-sm'>
					Only wallets with valid KYC_PASSED credential can deposit and withdraw
				</p>
			</div>

			{/* Status Section */}
			<div
				className={`rounded-lg p-6 border-2 ${
					isVerified ?
						"bg-green-500/10 border-green-500/30"
					:	"bg-red-500/10 border-red-500/30"
				}`}>
				<div className='flex items-center justify-between'>
					<div>
						<p
							className={`text-lg font-semibold ${
								isVerified ? "text-green-400" : "text-red-400"
							}`}>
							{isVerified ? "✅ KYC Verified" : "🔒 Not KYC Verified"}
						</p>
						<p
							className={`text-sm ${
								isVerified ? "text-green-300" : "text-red-300"
							}`}>
							{isVerified ?
								"You can access the deposit pool"
							:	"You need a valid KYC_PASSED credential to access this feature"}
						</p>
					</div>
					<div className='text-4xl'>{isVerified ? "🔓" : "🔐"}</div>
				</div>
			</div>

			{successMessage && (
				<div className='bg-green-500/10 border border-green-500/30 rounded-lg p-4'>
					<p className='text-green-400 text-sm'>{successMessage}</p>
				</div>
			)}

			{txHash && (
				<div className='bg-blue-500/10 border border-blue-500/30 rounded-lg p-3'>
					<p className='text-xs font-mono text-blue-400 break-all'>
						📝 Tx Hash: {txHash}
					</p>
				</div>
			)}

			{txError && (
				<div className='bg-red-500/10 border border-red-500/30 rounded-lg p-3'>
					<p className='text-red-400 text-sm'>❌ Error: {txError}</p>
				</div>
			)}

			{isVerified ?
				<div className='space-y-6'>
					{/* Stats */}
					<div className='grid grid-cols-2 gap-4'>
						<div className='card-dark'>
							<p className='text-gray-400 text-sm mb-2'>Your Balance</p>
							<p className='text-2xl font-bold text-orange-400'>
								{parseFloat(userBalance).toFixed(4)} ETH
							</p>
						</div>
						<div className='card-dark'>
							<p className='text-gray-400 text-sm mb-2'>Pool Total</p>
							<p className='text-2xl font-bold text-purple-400'>
								{parseFloat(totalDeposits).toFixed(4)} ETH
							</p>
						</div>
					</div>

					{/* Deposit Form */}
					<form onSubmit={handleDeposit} className='card'>
						<h4 className='text-lg font-semibold text-green-400 mb-4'>
							💰 Deposit to Pool
						</h4>
						<div className='space-y-4'>
							<div>
								<label className='block text-sm font-semibold text-purple-300 mb-2'>
									Amount (ETH)
								</label>
								<input
									type='number'
									value={depositAmount}
									onChange={(e) => setDepositAmount(e.target.value)}
									placeholder='0.1'
									className='input-field'
									disabled={txLoading}
									step='0.01'
									min='0'
								/>
							</div>
							<button
								type='submit'
								disabled={txLoading}
								className='w-full btn-primary disabled:opacity-50'>
								{txLoading ? "Processing..." : "Deposit ETH"}
							</button>
						</div>
					</form>

					{/* Withdraw Form */}
					<form onSubmit={handleWithdraw} className='card'>
						<h4 className='text-lg font-semibold text-yellow-400 mb-4'>
							🏦 Withdraw from Pool
						</h4>
						<div className='space-y-4'>
							<div>
								<label className='block text-sm font-semibold text-purple-300 mb-2'>
									Withdrawal Amount (ETH)
								</label>
								<input
									type='number'
									value={depositAmount}
									onChange={(e) => setDepositAmount(e.target.value)}
									placeholder='0.1'
									className='input-field'
									disabled={txLoading}
									step='0.01'
									min='0'
									max={userBalance}
								/>
								<p className='text-xs text-gray-500 mt-1'>
									Max: {parseFloat(userBalance).toFixed(4)} ETH
								</p>
							</div>
							<button
								type='submit'
								disabled={txLoading || parseFloat(userBalance) === 0}
								className='w-full btn-secondary disabled:opacity-50'>
								{txLoading ? "Processing..." : "Withdraw ETH"}
							</button>
						</div>
					</form>

					{/* Info */}
					<div className='bg-blue-500/10 border border-blue-500/30 rounded-lg p-4'>
						<p className='text-blue-300 text-xs leading-relaxed'>
							💡 <strong>How it works:</strong> Your KYC_PASSED credential
							allows you to access this restricted pool. Deposits and
							withdrawals are gated by smart contract, ensuring only verified
							users can participate.
						</p>
					</div>
				</div>
			:	<div className='card border-red-500/30'>
					<div className='flex items-center gap-4'>
						<span className='text-4xl'>🔒</span>
						<div>
							<p className='text-red-400 font-semibold mb-2'>
								Access Restricted
							</p>
							<p className='text-gray-300 text-sm'>
								To use this feature, you need:
							</p>
							<ol className='list-decimal list-inside text-gray-400 text-sm mt-2 space-y-1'>
								<li>Register your identity (RegisterIdentity tab)</li>
								<li>
									Get your identity attested by an issuer (IssuerDashboard)
								</li>
								<li>Receive KYC_PASSED credential from the issuer</li>
							</ol>
						</div>
					</div>
				</div>
			}
		</div>
	);
};

export default AccessGateUI;
