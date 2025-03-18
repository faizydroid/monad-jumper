const { DefenderRelaySigner } = require('defender-relay-client/lib/ethers');
const { RelayClient } = require('@opengsn/provider');

async function main() {
  // Deploy the contract
  const MonadJumper = await ethers.getContractFactory("MonadJumperV2");
  const monadJumper = await MonadJumper.deploy(TRUSTED_FORWARDER_ADDRESS);
  await monadJumper.deployed();
  
  console.log("MonadJumperV2 deployed to:", monadJumper.address);
} 