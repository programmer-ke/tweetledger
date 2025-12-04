"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

export default function AdminPage() {
  const { address } = useAccount();
  const [newPrice, setNewPrice] = useState("");
  const [newWinnerCount, setNewWinnerCount] = useState("");

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

  const { writeContractAsync } = useScaffoldWriteContract("SocialFeed");

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
    </div>
  );
}
