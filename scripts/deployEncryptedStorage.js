// Script to deploy the EncryptedGameStorage contract

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(
    "Deploying EncryptedGameStorage contract with the account:",
    deployer.address
  );

  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy the contract
  const EncryptedGameStorage = await ethers.getContractFactory("EncryptedGameStorage");
  const encryptedStorage = await EncryptedGameStorage.deploy();

  // Wait for deployment to complete
  await encryptedStorage.deployed();

  console.log("EncryptedGameStorage deployed to:", encryptedStorage.address);
  console.log("Transaction hash:", encryptedStorage.deployTransaction.hash);
  
  // Verify the contract on Etherscan if we're on a supported network
  // Note: This will work only on networks that support verification like Ethereum Mainnet, testnets, etc.
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for block confirmations...");
    // Wait for 6 confirmations to ensure the contract is deployed
    await encryptedStorage.deployTransaction.wait(6);
    
    console.log("Verifying contract on Etherscan...");
    // Run the verification process
    await hre.run("verify:verify", {
      address: encryptedStorage.address,
      constructorArguments: [],
    });
    
    console.log("Contract verified on Etherscan!");
  }
  
  return {
    contractAddress: encryptedStorage.address,
    txHash: encryptedStorage.deployTransaction.hash
  };
}

// Execute the main function
main()
  .then((result) => {
    console.log("Deployment successful!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  }); 