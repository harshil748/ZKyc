import React, { useState } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "../hooks/useWeb3";
import { useContract, useTransaction } from "../hooks/useContract";

const IssuerDashboard = () => {
	const { signer, account } = useWeb3();
	const { contract: identityRegistry } = useContract(
		"IdentityRegistry",
		signer,
	);
	const { contract: credentialVerifier } = useContract(
		"CredentialVerifier",
		signer,
	);
	const {
		isLoading: txLoading,
		hash: txHash,
		error: txError,
		executeTransaction,
	} = useTransaction();

	const [userAddress, setUserAddress] = useState("");
	const [expiryDays, setExpiryDays] = useState("365");
	const [credentialType, setCredentialType] = useState("1");
	const [credentialData, setCredentialData] = useState("");
	const [status, setStatus] = useState("");
	const [successMessage, setSuccessMessage] = useState("");

	const credentialTypes = [
		{ value: "0", label: "AGE_VERIFIED" },
		{ value: "1", label: "KYC_PASSED" },
		{ value: "2", label: "ACCREDITED_INVESTOR" },
	];

	const handleAttest = async (e) => {
		e.preventDefault();
		if (!identityRegistry || !userAddress || !expiryDays) {
			setStatus("error");
			setSuccessMessage("Please fill in all fields");
			return;
		}

		// Validate address
		if (!ethers.isAddress(userAddress)) {
			setStatus("error");
			setSuccessMessage("Invalid Ethereum address");
			return;
		}

		try {
			setStatus("loading");
			await executeTransaction(
				identityRegistry.attestIdentity(userAddress, parseInt(expiryDays)),
				() => {
					setStatus("success");
					setSuccessMessage(
						`✅ Identity attested successfully for ${expiryDays} days`,
					);
					setUserAddress("");
					setExpiryDays("365");
				},
			);
		} catch (err) {
			setStatus("error");
			setSuccessMessage(`Error: ${err.message}`);
		}
	};

	const handleIssueCredential = async (e) => {
		e.preventDefault();
		if (!credentialVerifier || !userAddress || !credentialData || !expiryDays) {
			setStatus("error");
			setSuccessMessage("Please fill in all fields");
			return;
		}

		if (!ethers.isAddress(userAddress)) {
			setStatus("error");
			setSuccessMessage("Invalid Ethereum address");
			return;
		}

		try {
			setStatus("loading");
			const credentialHash = ethers.solidityPackedKeccak256(
				["string"],
				[credentialData],
			);

			await executeTransaction(
				credentialVerifier.issueCredential(
					userAddress,
					parseInt(credentialType),
					credentialHash,
					parseInt(expiryDays),
				),
				() => {
					setStatus("success");
					const typeName = credentialTypes.find(
						(t) => t.value === credentialType,
					).label;
					setSuccessMessage(
						`✅ ${typeName} credential issued for ${expiryDays} days`,
					);
					setUserAddress("");
					setCredentialData("");
					setExpiryDays("365");
				},
			);
		} catch (err) {
			setStatus("error");
			setSuccessMessage(`Error: ${err.message}`);
		}
	};

	const handleRevoke = async (e) => {
		e.preventDefault();
		if (!credentialVerifier || !userAddress) {
			setStatus("error");
			setSuccessMessage("Please enter a user address");
			return;
		}

		if (!ethers.isAddress(userAddress)) {
			setStatus("error");
			setSuccessMessage("Invalid Ethereum address");
			return;
		}

		try {
			setStatus("loading");
			await executeTransaction(
				credentialVerifier.revokeCredential(
					userAddress,
					parseInt(credentialType),
				),
				() => {
					const typeName = credentialTypes.find(
						(t) => t.value === credentialType,
					).label;
					setStatus("success");
					setSuccessMessage(`✅ ${typeName} credential revoked`);
					setUserAddress("");
				},
			);
		} catch (err) {
			setStatus("error");
			setSuccessMessage(`Error: ${err.message}`);
		}
	};

	if (!account) {
		return (
			<div className='card'>
				<p className='text-gray-400'>Please connect your wallet first</p>
			</div>
		);
	}

	return (
		<div className='space-y-6'>
			{/* Header */}
			<div className='card'>
				<h3 className='text-2xl font-bold gradient-text mb-2'>
					👨‍💼 Issuer Dashboard
				</h3>
				<p className='text-gray-400 text-sm'>
					Manage identity attestations and issue credentials
				</p>
				<p className='text-xs text-purple-300 mt-3'>
					Issuer Address: {account.slice(0, 6)}...{account.slice(-4)}
				</p>
			</div>

			{/* Status Messages */}
			{successMessage && (
				<div
					className={`rounded-lg p-4 border ${
						status === "success" ? "bg-green-500/10 border-green-500/30"
						: status === "error" ? "bg-red-500/10 border-red-500/30"
						: "bg-blue-500/10 border-blue-500/30"
					}`}>
					<p
						className={`text-sm ${
							status === "success" ? "text-green-400"
							: status === "error" ? "text-red-400"
							: "text-blue-400"
						}`}>
						{successMessage}
					</p>
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

			{/* Attest Identity */}
			<form onSubmit={handleAttest} className='card'>
				<h4 className='text-lg font-semibold text-orange-400 mb-4'>
					📋 Attest Identity
				</h4>
				<div className='space-y-4'>
					<div>
						<label className='block text-sm font-semibold text-purple-300 mb-2'>
							User Address
						</label>
						<input
							type='text'
							value={userAddress}
							onChange={(e) => setUserAddress(e.target.value)}
							placeholder='0x...'
							className='input-field'
							disabled={txLoading}
						/>
					</div>
					<div>
						<label className='block text-sm font-semibold text-purple-300 mb-2'>
							Expiry (Days)
						</label>
						<input
							type='number'
							value={expiryDays}
							onChange={(e) => setExpiryDays(e.target.value)}
							placeholder='365'
							className='input-field'
							disabled={txLoading}
							min='1'
						/>
					</div>
					<button
						type='submit'
						disabled={txLoading}
						className='w-full btn-primary disabled:opacity-50'>
						{txLoading ? "Processing..." : "Attest Identity"}
					</button>
				</div>
			</form>

			{/* Issue Credential */}
			<form onSubmit={handleIssueCredential} className='card'>
				<h4 className='text-lg font-semibold text-purple-400 mb-4'>
					🎫 Issue Credential
				</h4>
				<div className='space-y-4'>
					<div>
						<label className='block text-sm font-semibold text-purple-300 mb-2'>
							Credential Type
						</label>
						<select
							value={credentialType}
							onChange={(e) => setCredentialType(e.target.value)}
							className='input-field'
							disabled={txLoading}>
							{credentialTypes.map((type) => (
								<option key={type.value} value={type.value}>
									{type.label}
								</option>
							))}
						</select>
					</div>
					<div>
						<label className='block text-sm font-semibold text-purple-300 mb-2'>
							User Address
						</label>
						<input
							type='text'
							value={userAddress}
							onChange={(e) => setUserAddress(e.target.value)}
							placeholder='0x...'
							className='input-field'
							disabled={txLoading}
						/>
					</div>
					<div>
						<label className='block text-sm font-semibold text-purple-300 mb-2'>
							Credential Data (e.g., KYC verification ID)
						</label>
						<input
							type='text'
							value={credentialData}
							onChange={(e) => setCredentialData(e.target.value)}
							placeholder='KYC data identifier'
							className='input-field'
							disabled={txLoading}
						/>
					</div>
					<div>
						<label className='block text-sm font-semibold text-purple-300 mb-2'>
							Expiry (Days)
						</label>
						<input
							type='number'
							value={expiryDays}
							onChange={(e) => setExpiryDays(e.target.value)}
							placeholder='365'
							className='input-field'
							disabled={txLoading}
							min='1'
						/>
					</div>
					<button
						type='submit'
						disabled={txLoading}
						className='w-full btn-secondary disabled:opacity-50'>
						{txLoading ? "Processing..." : "Issue Credential"}
					</button>
				</div>
			</form>

			{/* Revoke Credential */}
			<form onSubmit={handleRevoke} className='card border-red-500/30'>
				<h4 className='text-lg font-semibold text-red-400 mb-4'>
					🚫 Revoke Credential
				</h4>
				<div className='space-y-4'>
					<div>
						<label className='block text-sm font-semibold text-purple-300 mb-2'>
							Credential Type
						</label>
						<select
							value={credentialType}
							onChange={(e) => setCredentialType(e.target.value)}
							className='input-field'
							disabled={txLoading}>
							{credentialTypes.map((type) => (
								<option key={type.value} value={type.value}>
									{type.label}
								</option>
							))}
						</select>
					</div>
					<div>
						<label className='block text-sm font-semibold text-purple-300 mb-2'>
							User Address to Revoke
						</label>
						<input
							type='text'
							value={userAddress}
							onChange={(e) => setUserAddress(e.target.value)}
							placeholder='0x...'
							className='input-field'
							disabled={txLoading}
						/>
					</div>
					<button
						type='submit'
						disabled={txLoading}
						className='w-full px-6 py-3 rounded-lg font-semibold bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white transition-all duration-300 shadow-lg hover:shadow-red-500/50 disabled:opacity-50'>
						{txLoading ? "Processing..." : "Revoke Credential"}
					</button>
				</div>
			</form>
		</div>
	);
};

export default IssuerDashboard;
