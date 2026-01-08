import { useEffect, useState } from "react";
import Link from "next/link";
import EmojiPicker from "emoji-picker-react";
import toast from "react-hot-toast";
import { Address } from "viem";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { uploadToIPFS } from "~~/actions/uploadToIPFS";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

type PostFormProps = {
  connectedAddress?: Address;
};

export const PostForm = ({ connectedAddress }: PostFormProps) => {
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

          {/* Flex container for icon and counter */}
          <div className="flex justify-between items-center mt-2">
            {/* Info icon with tooltip */}
            <div
              className="tooltip tooltip-right tooltip-primary cursor-pointer"
              data-tip={`A few USD cents worth of ETH is sent with each post for spam mitigation and contributes to the reward pool`}
            >
              <InformationCircleIcon className="h-4 w-4 text-gray-500 hover:text-gray-700" />
            </div>

            {/* Existing character counter */}
            <div className="text-right text-xs sm:text-sm text-gray-600">{messageLength}/280</div>
          </div>

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
  );
};
