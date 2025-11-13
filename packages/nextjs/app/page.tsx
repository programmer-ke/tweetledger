"use client";

import { useState } from "react";
import type { NextPage } from "next";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { uploadToIPFS } from "~~/actions/uploadToIPFS";
import { SocialFeed } from "~~/components/SocialFeed";
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
          args: [message, cid],
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
      <div className="flex items-center flex-col grow pt-6 sm:pt-8 md:pt-10 px-4 sm:px-5 md:px-6">
        <div className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl mb-4 sm:mb-6 md:mb-8">
          {!connectedAddress ? (
            <p className="text-center text-sm sm:text-base mb-4">Connect your wallet to post</p>
          ) : (
            <>
              <div className="mb-3 sm:mb-4">
                <textarea
                  id="message"
                  placeholder="What's on your mind?"
                  className="textarea textarea-bordered w-full h-20 sm:h-24 resize-none rounded-xl text-sm sm:text-base"
                  maxLength={280}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                />
                <div className="text-right text-xs sm:text-sm mt-1 text-gray-600">{messageLength}/280</div>
              </div>
              <div className="flex justify-end">
                <button
                  className="btn btn-primary w-full sm:w-auto sm:min-w-32 rounded-xl text-sm sm:text-base"
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
              </div>
            </>
          )}
        </div>
        <SocialFeed />
      </div>
    </>
  );
};

export default Home;
