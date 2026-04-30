import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import contractsConfig from "../config/contracts.json";

export const useContract = (contractName, signer) => {
	const [contract, setContract] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		if (!signer || !contractsConfig?.contracts?.[contractName]) {
			setError(`Contract ${contractName} not found in config`);
			setLoading(false);
			return;
		}

		try {
			const contractData = contractsConfig.contracts[contractName];
			const contractInstance = new ethers.Contract(
				contractData.address,
				JSON.parse(contractData.abi),
				signer,
			);

			setContract(contractInstance);
			setError(null);
		} catch (err) {
			setError(err.message);
			console.error(`Error loading contract ${contractName}:`, err);
		} finally {
			setLoading(false);
		}
	}, [contractName, signer]);

	return { contract, loading, error };
};

// Hook for transaction handling
export const useTransaction = () => {
	const [isLoading, setIsLoading] = useState(false);
	const [hash, setHash] = useState(null);
	const [error, setError] = useState(null);

	const executeTransaction = useCallback(
		async (transactionPromise, onSuccess) => {
			setIsLoading(true);
			setError(null);
			setHash(null);

			try {
				const tx = await transactionPromise;
				setHash(tx.hash);

				const receipt = await tx.wait();

				if (receipt.status === 0) {
					throw new Error("Transaction failed");
				}

				if (onSuccess) {
					onSuccess(receipt);
				}

				return receipt;
			} catch (err) {
				const errorMessage = err.reason || err.message || "Unknown error";
				setError(errorMessage);
				console.error("Transaction error:", err);
				throw err;
			} finally {
				setIsLoading(false);
			}
		},
		[],
	);

	return { isLoading, hash, error, executeTransaction };
};
