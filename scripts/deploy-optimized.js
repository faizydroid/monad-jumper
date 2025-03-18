async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const OptimizedNFT = await ethers.getContractFactory("OptimizedMonadJumperNFT");
  const nft = await OptimizedNFT.deploy();

  await nft.deployed();
  console.log("OptimizedMonadJumperNFT deployed to:", nft.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 