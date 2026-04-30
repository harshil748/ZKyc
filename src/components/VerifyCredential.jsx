import React, { useState } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "../hooks/useWeb3";
import { useContract } from "../hooks/useContract";

const VerifyCredential = () => {
	const { signer } = useWeb3();
	const { contract: credentialVerifier } = useContract(
		"CredentialVerifier",
		signer,
	);

	const [targetAddress, setTargetAddress] = useState("");
	const [credentialType, setCredentialType] = useState("1");
	const [verificationResult, setVerificationResult] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const credentialTypes = [
		{ value: "0", label: "AGE_VERIFIED" },
		{ value: "1", label: "KYC_PASSED" },
		{ value: "2", label: "ACCREDITED_INVESTOR" },
	];

	const handleVerify = async (e) => {
		e.preventDefault();
		if (!credentialVerifier || !targetAddress) {
			setError("Please enter an address");
			return;
		}

		if (!ethers.isAddress(targetAddress)) {
			setError("Invalid Ethereum address");
			return;
		}

		setLoading(true);
		setError("");
		setVerificationResult(null);

		try {
			const isValid = await credentialVerifier.hasValidCredential(
				targetAddress,
				parseInt(credentialType),
			);

			if (isValid) {
				const metadata = await credentialVerifier.getCredentialMetadata(
					targetAddress,
					parseInt(credentialType),
				);

				const typeName = credentialTypes.find(
					(t) => t.value === credentialType,
				).label;
				const expiresDate = new Date(Number(metadata.expiresAt) * 1000);
				const now = new Date();
				const daysRemaining = Math.floor(
					(metadata.expiresAt - BigInt(Math.floor(now.getTime() / 1000))) /
						BigInt(86400),
				);

				setVerificationResult({
					isValid: true,
					credentialType: typeName,
					address: targetAddress,
					issuedAt: new Date(Number(metadata.issuedAt) * 1000).toLocaleString(),
					expiresAt: expiresDate.toLocaleString(),
					daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
					revoked: metadata.revoked,
				});
			} else {
				setVerificationResult({
					isValid: false,
					credentialType: credentialTypes.find(
						(t) => t.value === credentialType,
					).label,
					address: targetAddress,
					message: "Credential not found, expired, or revoked",
				});
			}
		} catch (err) {
			setError(err.reason || err.message || "Verification failed");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className='card space-y-6'>
			<div>
				<h3 className='text-2xl font-bold gradient-text mb-2'>
					🔍 Verify Credential
				</h3>
				<p className='text-gray-400 text-sm'>
					Selectively verify if an address holds a valid credential without
					revealing personal data
				</p>
			</div>

			<form onSubmit={handleVerify} className='space-y-4'>
				<div>
					<label className='block text-sm font-semibold text-purple-300 mb-2'>
						Credential Type
					</label>
					<select
						value={credentialType}
						onChange={(e) => setCredentialType(e.target.value)}
						className='input-field'
						disabled={loading}>
						{credentialTypes.map((type) => (
							<option key={type.value} value={type.value}>
								{type.label}
							</option>
						))}
					</select>
				</div>

				<div>
					<label className='block text-sm font-semibold text-purple-300 mb-2'>
						Address to Verify
					</label>
					<input
						type='text'
						value={targetAddress}
						onChange={(e) => setTargetAddress(e.target.value)}
						placeholder='0x...'
						className='input-field'
						disabled={loading}
					/>
				</div>

				<button
					type='submit'
					disabled={loading}
					className='w-full btn-primary disabled:opacity-50'>
					{loading ? "Verifying..." : "Verify Credential"}
				</button>
			</form>

			{error && (
				<div className='bg-red-500/10 border border-red-500/30 rounded-lg p-4'>
					<p className='text-red-400 text-sm'>❌ {error}</p>
				</div>
			)}

			{verificationResult && (
				<div
					className={`rounded-lg p-6 border-2 ${
						verificationResult.isValid ?
							"bg-green-500/10 border-green-500/30"
						:	"bg-yellow-500/10 border-yellow-500/30"
					}`}>
					{verificationResult.isValid ?
						<div className='space-y-4'>
							<div className='flex items-center gap-3'>
								<span className='text-3xl'>✅</span>
								<div>
									<p className='status-success text-lg'>Credential Valid</p>
									<p className='text-green-300 text-sm'>
										{verificationResult.credentialType} verified for{" "}
										{targetAddress.slice(0, 6)}
										...
										{targetAddress.slice(-4)}
									</p>
								</div>
							</div>

							<div className='space-y-2 text-sm border-t border-green-500/20 pt-4'>
								<div className='flex justify-between'>
									<span className='text-gray-400'>Credential Type:</span>
									<span className='badge-green'>
										{verificationResult.credentialType}
									</span>
								</div>
								<div className='flex justify-between'>
									<span className='text-gray-400'>Issued:</span>
									<span className='text-green-300 font-mono text-xs'>
										{verificationResult.issuedAt}
									</span>
								</div>
								<div className='flex justify-between'>
									<span className='text-gray-400'>Expires:</span>
									<span className='text-green-300 font-mono text-xs'>
										{verificationResult.expiresAt}
									</span>
								</div>
								<div className='flex justify-between'>
									<span className='text-gray-400'>Days Remaining:</span>
									<span className='text-green-300 font-semibold'>
										{verificationResult.daysRemaining} days
									</span>
								</div>
							</div>

							<div className='bg-green-900/20 rounded p-3 border border-green-500/20'>
								<p className='text-green-300 text-xs'>
									💡 This address has a valid{" "}
									{verificationResult.credentialType} credential. No personal
									data is revealed in this verification.
								</p>
							</div>
						</div>
					:	<div className='space-y-4'>
							<div className='flex items-center gap-3'>
								<span className='text-3xl'>⚠️</span>
								<div>
									<p className='status-warning text-lg'>Credential Invalid</p>
									<p className='text-yellow-300 text-sm'>
										{verificationResult.message}
									</p>
								</div>
							</div>

							<div className='bg-yellow-900/20 rounded p-3 border border-yellow-500/20'>
								<p className='text-yellow-300 text-xs'>
									This address does not hold a valid{" "}
									{verificationResult.credentialType} credential, or it has
									expired/been revoked.
								</p>
							</div>
						</div>
					}
				</div>
			)}

			{/* Privacy Note */}
			<div className='bg-purple-500/10 border border-purple-500/30 rounded-lg p-4'>
				<p className='text-purple-300 text-xs leading-relaxed'>
					🔐 <strong>Privacy Note:</strong> This verification only checks if a
					valid credential exists. No personal information (name, age, KYC data)
					is revealed on-chain. The credential is stored as a hash, protecting
					user privacy.
				</p>
			</div>
		</div>
	);
};

export default VerifyCredential;
