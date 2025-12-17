"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import EmojiPicker from "emoji-picker-react";
import type { NextPage } from "next";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { uploadToIPFS } from "~~/actions/uploadToIPFS";
import { SocialFeed } from "~~/components/SocialFeed";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pickerSize, setPickerSize] = useState({ width: 320, height: 400 });

  useEffect(() => {
    const updatePickerSize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setPickerSize({ width: 280, height: 350 });
      } else if (width < 1024) {
        setPickerSize({ width: 320, height: 400 });
      } else {
        setPickerSize({ width: 400, height: 450 });
      }
    };

    updatePickerSize();
    window.addEventListener("resize", updatePickerSize);
    return () => window.removeEventListener("resize", updatePickerSize);
  }, []);

  const messageLength = message.length;
  const isValid = messageLength > 0 && messageLength <= 280;

  const { data: postCost } = useScaffoldReadContract({
    contractName: "SocialFeed",
    functionName: "getPostCostInWei",
  });

  const { data: awardsHistoryLength } = useScaffoldReadContract({
    contractName: "SocialFeed",
    functionName: "getAwardHistoryLength",
  });

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
          value: postCost,
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

  const handleEmojiClick = (emojiData: any) => {
    setMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-6 sm:pt-8 md:pt-10 px-4 sm:px-5 md:px-6">
        <div className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl mb-4 sm:mb-6 md:mb-8">
          {!connectedAddress ? (
            <p className="text-center text-sm sm:text-base mb-4">Connect your wallet to post</p>
          ) : (
            <>
              {awardsHistoryLength != undefined && awardsHistoryLength > 0n && (
                <div className="mb-3 text-left">
                  <Link href="/rewards" className="text-sm hover:underline">
                    Latest rewards &gt;&gt;
                  </Link>
                </div>
              )}
              <div className="mb-3 sm:mb-4 relative">
                <textarea
                  id="message"
                  placeholder="Gm, what are you up to today? 😊"
                  className="textarea textarea-bordered w-full h-20 sm:h-24 resize-none rounded-xl text-sm sm:text-base"
                  maxLength={280}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                />
                <button
                  className="absolute bottom-2 right-2 btn btn-ghost btn-xs"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  type="button"
                >
                  😀
                </button>
                {showEmojiPicker && (
                  <div className="absolute top-full mt-1 z-10">
                    <EmojiPicker
                      onEmojiClick={handleEmojiClick}
                      width={pickerSize.width}
                      height={pickerSize.height}
                      theme={"auto" as any}
                      style={
                        {
                          "--epr-bg-color": "var(--color-base-300)",
                          "--epr-category-label-bg-color": "var(--color-base-300)",
                        } as any
                      }
                    />
                  </div>
                )}
              </div>
              <div className="text-right text-xs sm:text-sm mt-1 text-gray-600">{messageLength}/280</div>
              <div className="flex justify-end">
                <button
                  className="btn btn-primary w-full sm:w-auto sm:min-w-32 rounded-xl text-sm sm:text-base"
                  disabled={!isValid || isPending || postCost === undefined}
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
