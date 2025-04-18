const fs = require('fs');
const path = require('path');

// Create metadata directory if it doesn't exist
const metadataDir = path.join(__dirname, 'metadata');
if (!fs.existsSync(metadataDir)) {
  fs.mkdirSync(metadataDir);
}

// Badge definitions
const badges = [
  {
    id: 1,
    name: "Rookie Jumper",
    description: "Completed 1,000 jumps in JumpNads",
    image: "jumps_1000.png",
    category: "Jump Count",
    rarity: "Common",
    requirement: "1000 Jumps"
  },
  {
    id: 2,
    name: "Skilled Jumper",
    description: "Completed 2,000 jumps in JumpNads",
    image: "jumps_2000.png",
    category: "Jump Count",
    rarity: "Uncommon",
    requirement: "2000 Jumps"
  },
  {
    id: 3,
    name: "Expert Jumper",
    description: "Completed 5,000 jumps in JumpNads",
    image: "jumps_5000.png",
    category: "Jump Count",
    rarity: "Rare",
    requirement: "5000 Jumps"
  },
  {
    id: 4,
    name: "Master Jumper",
    description: "Completed 10,000 jumps in JumpNads",
    image: "jumps_10000.png",
    category: "Jump Count",
    rarity: "Epic",
    requirement: "10000 Jumps"
  },
  {
    id: 5,
    name: "Legendary Jumper",
    description: "Completed 20,000 jumps in JumpNads",
    image: "jumps_20000.png",
    category: "Jump Count",
    rarity: "Legendary",
    requirement: "20000 Jumps"
  },
  {
    id: 6,
    name: "Mythic Jumper",
    description: "Completed 30,000 jumps in JumpNads",
    image: "jumps_30000.png",
    category: "Jump Count",
    rarity: "Mythic",
    requirement: "30000 Jumps"
  },
  {
    id: 7,
    name: "Godlike Jumper",
    description: "Completed 50,000 jumps in JumpNads",
    image: "jumps_50000.png",
    category: "Jump Count",
    rarity: "Divine",
    requirement: "50000 Jumps"
  },
  {
    id: 8,
    name: "Immortal Jumper",
    description: "Completed 100,000 jumps in JumpNads",
    image: "jumps_100000.png",
    category: "Jump Count",
    rarity: "Immortal",
    requirement: "100000 Jumps"
  },
  {
    id: 101,
    name: "Top 100 Elite",
    description: "Reached the Top 100 on JumpNads leaderboard",
    image: "top_100.png",
    category: "Ranking",
    rarity: "Uncommon",
    requirement: "Top 100 Rank"
  },
  {
    id: 102,
    name: "Top 10 Legend",
    description: "Reached the Top 10 on JumpNads leaderboard",
    image: "top_10.png",
    category: "Ranking",
    rarity: "Rare",
    requirement: "Top 10 Rank"
  },
  {
    id: 103,
    name: "Bronze Podium",
    description: "Reached the Top 3 on JumpNads leaderboard",
    image: "top_3.png",
    category: "Ranking",
    rarity: "Epic",
    requirement: "Top 3 Rank"
  },
  {
    id: 104,
    name: "Champion of JumpNads",
    description: "Reached #1 on JumpNads leaderboard",
    image: "champion.png",
    category: "Ranking",
    rarity: "Legendary",
    requirement: "Rank #1"
  },
  {
    id: 201,
    name: "Score Hunter",
    description: "Reached 1,000 points in JumpNads",
    image: "score_1000.png",
    category: "Score",
    rarity: "Common",
    requirement: "1000 Points"
  },
  {
    id: 202,
    name: "Point Master",
    description: "Reached 2,000 points in JumpNads",
    image: "score_2000.png",
    category: "Score",
    rarity: "Uncommon",
    requirement: "2000 Points"
  },
  {
    id: 203,
    name: "Score Legend",
    description: "Reached 5,000 points in JumpNads",
    image: "score_5000.png",
    category: "Score",
    rarity: "Rare",
    requirement: "5000 Points"
  },
  {
    id: 204,
    name: "Score God",
    description: "Reached 10,000 points in JumpNads",
    image: "score_10000.png",
    category: "Score",
    rarity: "Epic",
    requirement: "10000 Points"
  }
];

// Replace with your IPFS CID after uploading the images
const IPFS_CID = "bafybeifsa2reuozpmvj25ifhlsswkzmbnyy5suzhzdtqzmfkjhhym6edfy";

// Create JSON files for each badge
badges.forEach(badge => {
  const metadata = {
    name: badge.name,
    description: badge.description,
    image: `ipfs://${IPFS_CID}/${badge.image}`,
    attributes: [
      {
        trait_type: "Category",
        value: badge.category
      },
      {
        trait_type: "Rarity",
        value: badge.rarity
      },
      {
        trait_type: "Requirement",
        value: badge.requirement
      }
    ]
  };

  // Write to file
  fs.writeFileSync(
    path.join(metadataDir, `${badge.id}.json`),
    JSON.stringify(metadata, null, 2)
  );

  console.log(`Created metadata for ${badge.name} (ID: ${badge.id})`);
});

console.log(`\nAll metadata files created in ${metadataDir}`);
console.log(`Remember to replace "YOUR_IPFS_CID_HERE" with your actual IPFS CID after uploading images.`);