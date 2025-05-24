import React from 'react';

const Leaderboard = ({ inMobilePanel = false }) => {
  // Mock leaderboard data
  const leaderboardData = [
    { rank: 1, username: 'Player1', score: 5240, address: '0x123...abc' },
    { rank: 2, username: 'Player2', score: 4950, address: '0x456...def' },
    { rank: 3, username: 'Player3', score: 4820, address: '0x789...ghi' },
    { rank: 4, username: 'Player4', score: 4720, address: '0xabc...jkl' },
    { rank: 5, username: 'Player5', score: 4550, address: '0xdef...mno' },
    { rank: 6, username: 'Player6', score: 4390, address: '0xghi...pqr' },
    { rank: 7, username: 'Player7', score: 4200, address: '0xjkl...stu' },
    { rank: 8, username: 'Player8', score: 4050, address: '0xmno...vwx' },
    { rank: 9, username: 'Player9', score: 3980, address: '0xpqr...yz1' },
    { rank: 10, username: 'Player10', score: 3850, address: '0xstu...234' },
  ];

  return (
    <div className={`leaderboard-container ${inMobilePanel ? 'p-4' : 'p-6'} bg-indigo-900/80 backdrop-blur-md h-full`}>
      <h2 className="text-2xl font-bold text-white mb-6 text-center">Leaderboard</h2>
      
      <div className="overflow-y-auto max-h-[70vh]">
        <table className="w-full text-white">
          <thead className="text-white/70 border-b border-white/20">
            <tr>
              <th className="py-2 text-left pl-2">Rank</th>
              <th className="py-2 text-left">Player</th>
              <th className="py-2 text-right pr-2">Score</th>
            </tr>
          </thead>
          <tbody>
            {leaderboardData.map((player) => (
              <tr key={player.rank} className="border-b border-white/10 hover:bg-white/5">
                <td className="py-3 pl-2">{player.rank}</td>
                <td className="py-3">{player.username}</td>
                <td className="py-3 text-right pr-2">{player.score.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Leaderboard; 