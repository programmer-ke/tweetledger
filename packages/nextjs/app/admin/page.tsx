"use client";

import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

export default function AdminPage() {
  const { address } = useAccount();
  const [newPrice, setNewPrice] = useState("");
  const [newWinnerCount, setNewWinnerCount] = useState("");
  const [newCentsPerPost, setNewCentsPerPost] = useState("");
  const [newRewardPercentage, setNewRewardPercentage] = useState("");
  const [showWinners, setShowWinners] = useState(false);

  const { data: isAdmin } = useScaffoldReadContract({
    contractName: "SocialFeed",
    functionName: "admins",
    args: [address],
  });

  const { data: currentPrice } = useScaffoldReadContract({
    contractName: "SocialFeed",
    functionName: "usdPricePerEth",
  });

  const { data: currentWinnerCount } = useScaffoldReadContract({
    contractName: "SocialFeed",
    functionName: "winnersPerRound",
  });

  const { data: currentCentsPerPost } = useScaffoldReadContract({
    contractName: "SocialFeed",
    functionName: "usdCentsPerPost",
  });

  const { data: currentRewardPercentage } = useScaffoldReadContract({
    contractName: "SocialFeed",
    functionName: "userRewardPercentage",
  });

  const { data: currentPeriodId } = useScaffoldReadContract({
    contractName: "SocialFeed",
    functionName: "rewardPeriodId",
  });

  const { data: periodData, isLoading: isPeriodLoading } = useScaffoldReadContract({
    contractName: "SocialFeed",
    functionName: "getPeriodData",
    args: [currentPeriodId],
    query: {
      enabled: showWinners, // Only fetch when showWinners is true
    },
  });

  const { writeContractAsync } = useScaffoldWriteContract("SocialFeed");

  const topWinners = useMemo(() => {
    if (!periodData || !currentWinnerCount) return [];
    const [users, data] = periodData;
    const combined = users.map((user, i) => ({
      user,
      count: data[i].count,
      timestamp: data[i].latestTimestamp,
    }));
    combined.sort((a, b) => {
      const countDiff = Number(b.count) - Number(a.count);
      if (countDiff !== 0) return countDiff;
      return Number(a.timestamp) - Number(b.timestamp);
    });
    return combined.slice(0, Number(currentWinnerCount));
  }, [periodData, currentWinnerCount]);

  const handleUpdatePrice = async () => {
    if (!newPrice || isNaN(Number(newPrice))) return;
    try {
      await writeContractAsync({
        functionName: "setUsdPricePerEth",
        args: [BigInt(newPrice)],
      });
      notification.success("Price updated successfully");
      setNewPrice("");
    } catch (error) {
      console.log("error updating price", error);
      notification.error("Failed to update price");
    }
  };

  const handleUpdateWinners = async () => {
    if (!newWinnerCount || isNaN(Number(newWinnerCount))) return;
    try {
      await writeContractAsync({
        functionName: "setWinnersPerRound",
        args: [BigInt(newWinnerCount)],
      });
      notification.success("Winners per round updated successfully");
      setNewWinnerCount("");
    } catch (error) {
      console.log("error updating winners", error);
      notification.error("Failed to update winners per round");
    }
  };

  const handleUpdateCents = async () => {
    if (!newCentsPerPost || isNaN(Number(newCentsPerPost))) return;
    try {
      await writeContractAsync({
        functionName: "setUsdCentsPerPost",
        args: [BigInt(newCentsPerPost)],
      });
      notification.success("Cents per post updated successfully");
      setNewCentsPerPost("");
    } catch (error) {
      console.log("error updating cents", error);
      notification.error("Failed to update cents per post");
    }
  };

  const handleUpdatePercentage = async () => {
    if (!newRewardPercentage || isNaN(Number(newRewardPercentage)) || Number(newRewardPercentage) > 100) return;
    try {
      await writeContractAsync({
        functionName: "setUserRewardPercentage",
        args: [BigInt(newRewardPercentage)],
      });
      notification.success("Reward percentage updated successfully");
      setNewRewardPercentage("");
    } catch (error) {
      console.log("error updating percentage", error);
      notification.error("Failed to update reward percentage");
    }
  };

  if (!isAdmin) return <div>Access denied: Only admins can access this page.</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>
      <div className="mb-4">
        <p>Current USD Price per ETH: {currentPrice ? currentPrice.toString() : "Loading..."}</p>
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          value={newPrice}
          onChange={e => setNewPrice(e.target.value)}
          placeholder="Enter new price"
          className="input input-bordered"
        />
        <button onClick={handleUpdatePrice} className="btn btn-primary" disabled={!newPrice}>
          Update Price
        </button>
      </div>
      <div className="mb-4">
        <p>Current Winners per Round: {currentWinnerCount ? currentWinnerCount.toString() : "Loading..."}</p>
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          value={newWinnerCount}
          onChange={e => setNewWinnerCount(e.target.value)}
          placeholder="Enter new winners per round"
          className="input input-bordered"
        />
        <button onClick={handleUpdateWinners} className="btn btn-primary" disabled={!newWinnerCount}>
          Update Winners
        </button>
      </div>
      <div className="mb-4">
        <p>Current USD Cents per Post: {currentCentsPerPost ? currentCentsPerPost.toString() : "Loading..."}</p>
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          value={newCentsPerPost}
          onChange={e => setNewCentsPerPost(e.target.value)}
          placeholder="Enter cents per post"
          className="input input-bordered"
        />
        <button onClick={handleUpdateCents} className="btn btn-primary" disabled={!newCentsPerPost}>
          Update Cents
        </button>
      </div>
      <div className="mb-4">
        <p>
          Current User Reward Percentage: {currentRewardPercentage ? currentRewardPercentage.toString() : "Loading..."}%
        </p>
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          value={newRewardPercentage}
          onChange={e => setNewRewardPercentage(e.target.value)}
          placeholder="Enter reward percentage (0-100)"
          className="input input-bordered"
        />
        <button onClick={handleUpdatePercentage} className="btn btn-primary" disabled={!newRewardPercentage}>
          Update Percentage
        </button>
      </div>
      <div className="mt-8">
        <button onClick={() => setShowWinners(true)} className="btn btn-secondary" disabled={showWinners}>
          Load Top Winners
        </button>
        {showWinners && (
          <>
            <h2 className="text-xl font-bold mb-4 mt-4">Top Winners for Period {currentPeriodId}</h2>
            {isPeriodLoading ? (
              <p>Loading...</p>
            ) : topWinners.length > 0 ? (
              <ul className="list-disc pl-5">
                {topWinners.map((winner, idx) => (
                  <li key={winner.user}>
                    {idx + 1}. {winner.user} - Posts: {winner.count}, Latest:{" "}
                    {new Date(Number(winner.timestamp) * 1000).toLocaleString()}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No winners yet.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
