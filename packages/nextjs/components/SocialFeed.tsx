import { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWatchContractEvent } from "~~/hooks/scaffold-eth";
import { censorProfanity, detectProfanity, verifyPostIntegrity } from "~~/lib/utils";

export const SocialFeed = () => {
  const { address: connectedAddress } = useAccount();
  const ipfsGateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY;
  const bottomRef = useRef<HTMLDivElement>(null);

  const [count, setCount] = useState(5n);
  const [messageCache, setMessageCache] = useState<{ [cid: string]: string | null }>({});
  const [shouldScroll, setShouldScroll] = useState(false);
  const [displayedPosts, setDisplayedPosts] = useState<any[]>([]);
  const [hasNewPosts, setHasNewPosts] = useState(false);
  const [profaneCIDs, setProfaneCIDs] = useState<Set<string>>(new Set());
  const [censoredPosts, setCensoredPosts] = useState<{ [key: string]: boolean }>({});

  // Fetch tail ID using useScaffoldReadContract
  const {
    data: tail,
    isLoading: isTailLoading,
    error: tailError,
    refetch: refetchTail,
  } = useScaffoldReadContract({
    contractName: "SocialFeed",
    functionName: "tail",
    watch: false,
  });

  const {
    data: posts,
    isLoading: isPostsLoading,
    error: postsError,
    refetch: refetchPosts,
  } = useScaffoldReadContract({
    contractName: "SocialFeed",
    functionName: "getPosts",
    args: [tail, count],
    watch: false,
    query: {
      enabled: tail !== undefined,
    },
  });

  const displayedPostsRef = useRef<any[]>([]);
  const connectedAddressRef = useRef<string | undefined>(connectedAddress);

  useEffect(() => {
    displayedPostsRef.current = displayedPosts;
  }, [displayedPosts]);

  useEffect(() => {
    connectedAddressRef.current = connectedAddress;
  }, [connectedAddress]);

  useScaffoldWatchContractEvent({
    contractName: "SocialFeed",
    eventName: "PostCreated",

    // Monitor's contract for new posts
    onLogs: logs => {
      try {
        logs.forEach(log => {
          console.log(log.args);
          const currentPosts = displayedPostsRef.current;
          if (currentPosts.length > 0) {
            // we have displayed posts
            const latestDisplayedPost = currentPosts[0];
            if (latestDisplayedPost["id"] !== log.args["id"]) {
              // We have a new post
              if (log.args["author"]?.toLowerCase() === connectedAddressRef.current?.toLowerCase()) {
                // event from currently connected user
                // update feed
                refetchTail();
              } else {
                setHasNewPosts(true);
              }
            }
          } else {
            // No posts so far, reload
            refetchTail();
          }
        });
      } catch (error) {
        console.error("Error watching events", error);
      }
    },
  });

  useEffect(() => {
    if (!posts) return;
    setDisplayedPosts([...posts]);
    setHasNewPosts(false);
  }, [posts]);

  useEffect(() => {
    if (tail !== undefined) {
      refetchPosts();
    }
  }, [tail, refetchPosts]);

  const hasUnloadedPosts = displayedPosts.length > 0 && displayedPosts[displayedPosts.length - 1].id > 1;

  useEffect(() => {
    if (!displayedPosts || displayedPosts.length === 0) return;
    const fetchMessages = async () => {
      const promises = displayedPosts
        .filter(post => !(post.cid in messageCache && messageCache[post.cid] !== null)) // only fetch non existing messages
        .map(async post => {
          try {
            const response = await fetch(`https://${ipfsGateway}/ipfs/${post.cid}`);
            if (!response.ok) throw new Error("Fetch failed");
            const data = await response.json();
            const message = data.message;
            if (verifyPostIntegrity(post, message)) {
              if (detectProfanity(message)) {
                setProfaneCIDs(prev => new Set(prev).add(post.cid));
              }
              return { cid: post.cid, message };
            } else {
              console.warn(`Hash mismatch for CID ${post.cid}`);
              return { cid: post.cid, message: null };
            }
          } catch (error) {
            console.error(`Error fetching CID ${post.cid}:`, error);
            return { cid: post.cid, message: null };
          }
        });
      const results = await Promise.all(promises);
      const newEntries: { [cid: string]: string | null } = {};
      results.forEach(({ cid, message }) => {
        newEntries[cid] = message;
      });
      setMessageCache(prev => ({ ...prev, ...newEntries }));
    };

    (async () => {
      await fetchMessages();

      // scroll to the bottom if necessary
      if (shouldScroll) {
        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 1000);
        setShouldScroll(false);
      }
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayedPosts, ipfsGateway, shouldScroll]);

  if (tailError || postsError) {
    return (
      <div className="alert alert-error mx-4 sm:mx-6 md:mx-8">
        <span className="text-sm sm:text-base">Error loading feed: {tailError?.message || postsError?.message}</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl mx-auto">
      {isTailLoading || isPostsLoading ? (
        <div className="flex justify-center py-8">
          <span className="loading loading-spinner loading-md sm:loading-lg"></span>
        </div>
      ) : (
        <>
          <div className="space-y-3 sm:space-y-4">
            {hasNewPosts && (
              <div className="flex justify-center mt-4">
                <button
                  className="btn btn-outline btn-sm"
                  disabled={isTailLoading || isPostsLoading}
                  onClick={() => {
                    refetchTail();
                  }}
                >
                  {" "}
                  {isTailLoading || isPostsLoading ? "Loading.." : "Load new posts"}
                </button>
              </div>
            )}

            {displayedPosts && displayedPosts.length === 0 ? (
              <p className="text-center text-gray-500 text-sm sm:text-base py-8">No posts available.</p>
            ) : (
              displayedPosts?.map(post => {
                const isProfane = profaneCIDs.has(post.cid);
                const censoredKey = post.cid;
                const isCensored = censoredPosts[censoredKey] ?? (isProfane ? true : false);
                const rawMessage = messageCache[post.cid];
                const displayMessage =
                  rawMessage !== undefined
                    ? isCensored
                      ? censorProfanity(rawMessage || "")
                      : rawMessage || "[Message unavailable]"
                    : "Loading...";
                return (
                  <div key={post.id} className="card bg-base-100 shadow-lg p-3 sm:p-4">
                    <div className="card-body p-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                        <Address address={post.author} format="short" />
                        <span className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-0">
                          {new Date(Number(post.timestamp) * 1000).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-base sm:text-lg break-words whitespace-pre-wrap">{displayMessage}</p>
                      {isProfane && (
                        <button
                          className="btn btn-xs btn-outline mt-2"
                          onClick={() => setCensoredPosts(prev => ({ ...prev, [censoredKey]: !isCensored }))}
                        >
                          {isCensored ? "Show Uncensored" : "Show Censored"}
                        </button>
                      )}
                      <p className="text-xs sm:text-sm text-gray-400 break-all mt-2">
                        #{post.id} |{" "}
                        <a
                          target="_blank"
                          href={`https://ipfs.io/ipfs/${post.cid}`}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          IPFS
                        </a>
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div ref={bottomRef} />

          {hasUnloadedPosts && (
            <div className="flex justify-center mt-4">
              <button
                className="btn btn-outline btn-sm"
                disabled={isTailLoading || isPostsLoading}
                onClick={() => {
                  setCount(BigInt(displayedPosts.length) + 5n);
                  setShouldScroll(true);
                }}
              >
                {isTailLoading || isPostsLoading ? "Loading.." : "Load more"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
