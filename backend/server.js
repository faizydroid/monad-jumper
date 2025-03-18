const ethers = require('ethers');

app.post('/api/game/signature', async (req, res) => {
  const { player, score, jumps } = req.body;
  
  // Create message hash
  const messageHash = ethers.utils.solidityKeccak256(
    ['address', 'uint256', 'uint256'],
    [player, score, jumps]
  );
  
  // Sign with private key
  const signature = await wallet.signMessage(ethers.utils.arrayify(messageHash));
  
  res.json({ signature });
}); 