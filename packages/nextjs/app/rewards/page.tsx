"use client";

import { formatEther } from "viem";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { useGlobalState } from "~~/services/store/store";

function wei2Usd(wei: bigint, ethPrice: number): number {
  const eth = wei / 10n ** 18n;
  return Number(eth) * ethPrice;
}

export default function RewardsPage() {
  const { data: awardRecords, isLoading } = useScaffoldReadContract({
    contractName: "SocialFeed",
    functionName: "getLastAwardRecords",
    args: [3n],
  });
  const ethPrice = useGlobalState(state => state.nativeCurrency.price);

  if (isLoading) return <div>Loading...</div>;

  // Create a reversed copy to show latest first
  const reversedRecords = awardRecords ? [...awardRecords].reverse() : [];

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Rewards History</h1>
      {reversedRecords.length > 0 ? (
        reversedRecords.map((record, idx) => (
          <div key={idx} className="mb-8">
            <h2 className="text-xl font-semibold mb-2">Round {record.periodId.toString()}</h2>
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Address</th>
                    <th>Posts </th>
                    <th>ETH Reward</th>
                  </tr>
                </thead>
                <tbody>
                  {record.addresses.map((addr, i) => (
                    <tr key={i}>
                      <td>{addr}</td>
                      <td>{record.postCounts[i].toString()}</td>
                      <td>
                        {ethPrice && ethPrice > 0
                          ? formatEther(record.amounts[i]) + ` ( $${wei2Usd(record.amounts[i], ethPrice).toFixed(2)} )`
                          : formatEther(record.amounts[i])}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      ) : (
        <p>No award history available.</p>
      )}
    </div>
  );
}
