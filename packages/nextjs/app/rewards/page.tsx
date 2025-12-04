"use client";

import { formatEther } from "viem";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

export default function RewardsPage() {
  const { data: awardRecords, isLoading } = useScaffoldReadContract({
    contractName: "SocialFeed",
    functionName: "getLastAwardRecords",
    args: [3n],
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Award History</h1>
      {awardRecords && awardRecords.length > 0 ? (
        awardRecords.map((record, idx) => (
          <div key={idx} className="mb-8">
            <h2 className="text-xl font-semibold mb-2">Period {record.periodId.toString()}</h2>
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Address</th>
                  <th>Post Count</th>
                  <th>Reward Amount (ETH)</th>
                </tr>
              </thead>
              <tbody>
                {record.addresses.map((addr, i) => (
                  <tr key={i}>
                    <td>{addr}</td>
                    <td>{record.postCounts[i].toString()}</td>
                    <td>{formatEther(record.amounts[i])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      ) : (
        <p>No award history available.</p>
      )}
    </div>
  );
}
