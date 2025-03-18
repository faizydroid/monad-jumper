import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';

export default function TransactionDashboard() {
  const { account } = useWeb3();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (account) {
      fetchTransactions();
    }
  }, [account]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      // You'll need to connect to a blockchain explorer API or RPC endpoint
      // For example, if you have a backend or use Monad's explorer:
      const response = await fetch(`https://api.monad.xyz/addresses/${account}/transactions`);
      const data = await response.json();
      setTransactions(data.transactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="transaction-dashboard">
      <h2>Recent Transactions</h2>
      {loading ? (
        <p>Loading transactions...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Hash</th>
              <th>Value</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => (
              <tr key={tx.hash}>
                <td>{tx.hash.substring(0, 10)}...</td>
                <td>{tx.value} MON</td>
                <td>{new Date(tx.timestamp).toLocaleTimeString()}</td>
                <td>{tx.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button onClick={fetchTransactions}>Refresh</button>
    </div>
  );
} 