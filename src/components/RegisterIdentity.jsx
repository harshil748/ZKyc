import React, { useState } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "../hooks/useWeb3";
import { useContract, useTransaction } from "../hooks/useContract";

const RegisterIdentity = () => {
	const { signer, account } = useWeb3();
	const { contract: identityRegistry } = useContract(
		"IdentityRegistry",
		signer,
	);
	const {
		isLoading,
		hash,
		error: txError,
		executeTransaction,
	} = useTransaction();

	const [secret, setSecret] = useState("");
	const [showSecret, setShowSecret] = useState(false);
	const [registered, setRegistered] = useState(false);
	const [commitmentHash, setCommitmentHash] = useState("");
	const [verifying, setVerifying] = useState(false);
	const [verificationStatus, setVerificationStatus] = useState(null);

	const generateCommitmentHash = () => {
		if (!secret || !account) {
			alert("Please enter a secret and connect wallet");
			return;
		}

		try {
			const hash = ethers.solidityPackedKeccak256(
				["bytes32", "address"],
				[ethers.id(secret), account],
			);
			setCommitmentHash(hash);
		} catch (err) {
			console.error("Error generating hash:", err);
			alert("Error generating commitment hash");
		}
	};

	const handleRegister = async (e) => {
		e.preventDefault();

		if (!commitmentHash) {
			alert("Please generate commitment hash first");
			return;
		}

		if (!identityRegistry) {
			alert("Contract not loaded");
			return;
		}

		try {
			await executeTransaction(
				identityRegistry.registerIdentity(commitmentHash),
				(receipt) => {
					setRegistered(true);
					setSecret("");
					setCommitmentHash("");
					console.log("Registration successful:", receipt);
				},
			);
		} catch (err) {
			console.error("Registration error:", err);
		}
	};

	const verifyRegistration = async () => {
		if (!identityRegistry || !account) return;

		setVerifying(true);
		try {
			const identity = await identityRegistry.identities(account);
			if (identity.commitmentHash === ethers.ZeroHash) {
				setVerificationStatus("not-registered");
			} else {
				setVerificationStatus("registered");
			}
		} catch (err) {
			console.error("Verification error:", err);
			setVerificationStatus("error");
		} finally {
			setVerifying(false);
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
		<div className='card space-y-6'>
			<div>
				<h3 className='text-2xl font-bold gradient-text mb-2'>
					🔐 Register Identity
				</h3>
				<p className='text-gray-400 text-sm'>
					Create a private commitment hash without exposing your secret on-chain
				</p>
			</div>

			{registered && (
				<div className='bg-green-500/10 border border-green-500/30 rounded-lg p-4'>
					<p className='status-success'>✅ Identity registered successfully!</p>
					<p className='text-gray-300 text-sm mt-2'>
						Your commitment hash has been stored on-chain. An issuer can now
						attest your identity.
					</p>
				</div>
			)}

			<form onSubmit={handleRegister} className='space-y-4'>
				{/* Secret Input */}
				<div>
					<label className='block text-sm font-semibold text-purple-300 mb-2'>
						🔑 Secret Phrase
					</label>
					<div className='relative'>
						<input
							type={showSecret ? "text" : "password"}
							value={secret}
							onChange={(e) => setSecret(e.target.value)}
							placeholder='Enter your secret phrase (never stored)'
							className='input-field pr-12'
							disabled={isLoading}
						/>
						<button
							type='button'
							onClick={() => setShowSecret(!showSecret)}
							className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-orange-400 transition'>
							{showSecret ? "👁️" : "👁️‍🗨️"}
						</button>
					</div>
					<p className='text-xs text-gray-500 mt-1'>
						💡 This secret never leaves your browser
					</p>
				</div>

				{/* Commitment Hash Display */}
				<div>
					<label className='block text-sm font-semibold text-purple-300 mb-2'>
						# Commitment Hash
					</label>
					<div className='bg-black/30 rounded-lg p-3 border border-white/10 font-mono text-xs break-all max-h-24 overflow-y-auto'>
						{commitmentHash ?
							<span className='text-orange-400'>{commitmentHash}</span>
						:	<span className='text-gray-500'>Hash will appear here...</span>}
					</div>
				</div>

				{/* Buttons */}
				<div className='flex gap-3'>
					<button
						type='button'
						onClick={generateCommitmentHash}
						disabled={isLoading || !secret}
						className='flex-1 btn-secondary disabled:opacity-50'>
						Generate Hash
					</button>
					<button
						type='submit'
						disabled={isLoading || !commitmentHash}
						className='flex-1 btn-primary disabled:opacity-50'>
						{isLoading ? "Registering..." : "Register on-chain"}
					</button>
				</div>
			</form>

			{/* Transaction Hash Display */}
			{hash && (
				<div className='bg-blue-500/10 border border-blue-500/30 rounded-lg p-3'>
					<p className='text-xs font-mono text-blue-400 break-all'>
						📝 Tx Hash: {hash}
					</p>
				</div>
			)}

			{txError && (
				<div className='bg-red-500/10 border border-red-500/30 rounded-lg p-3'>
					<p className='text-red-400 text-sm'>❌ Error: {txError}</p>
				</div>
			)}

			{/* Verification Section */}
			<div className='border-t border-white/10 pt-4'>
				<button
					type='button'
					onClick={verifyRegistration}
					disabled={verifying}
					className='w-full btn-outline disabled:opacity-50'>
					{verifying ? "Checking..." : "Verify Registration Status"}
				</button>

				{verificationStatus === "registered" && (
					<p className='status-success text-center mt-3'>
						✅ Your identity is registered on-chain
					</p>
				)}
				{verificationStatus === "not-registered" && (
					<p className='status-warning text-center mt-3'>
						⚠️ Your identity is not registered yet
					</p>
				)}
			</div>
		</div>
	);
};

export default RegisterIdentity;
