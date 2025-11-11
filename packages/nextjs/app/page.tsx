"use client";

import { useState } from "react";
import type { NextPage } from "next";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { uploadToIPFS } from "~~/actions/uploadToIPFS";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const [message, setMessage] = useState("");

  const messageLength = message.length;
  const isValid = messageLength > 0 && messageLength <= 280;

  const { writeContractAsync, isPending } = useScaffoldWriteContract({ contractName: "SocialFeed" });

  const handlePost = async () => {
    if (!isValid) return;
    try {
      const data = { message };
      const cid = await uploadToIPFS(data);
      console.log("Uploaded to IPFS with CID:", cid);

      await writeContractAsync(
        {
          functionName: "post",
          args: [message],
        },
        {
          onBlockConfirmation: txnReceipt => {
            console.log("Post successful, txn hash:", txnReceipt.transactionHash);
            toast.success("Post submitted successfully!");
            setMessage("");
          },
        },
      );
    } catch (error) {
      console.error("Error posting message:", error);
      toast.error("Failed to post message. Please try again.");
    }
  };

  return (
    <>
      <div className="flex items-center flex-col grow pt-10">
        <div className="px-5">
          {!connectedAddress ? (
            <p className="text-center"> Connect your wallet to post</p>
          ) : (
            <>
              <div className="mb-1">
                <textarea
                  id="message"
                  placeholder="What's on your mind?"
                  className="textarea textarea-bordered w-full h-24 resize-none rounded-xl"
                  maxLength={280}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                />
                <div className="text-right text-sm mt-1">{messageLength}/280</div>
              </div>
              <button
                className="btn btn-primary w-full rounded-xl"
                disabled={!isValid || isPending}
                onClick={handlePost}
              >
                {isPending ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span> Posting...
                  </>
                ) : (
                  "Post"
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default Home;
