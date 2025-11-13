import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

export const SocialFeed = () => {
  // Fetch tail ID using useScaffoldReadContract
  const {
    data: tail,
    isLoading: isTailLoading,
    error: tailError,
  } = useScaffoldReadContract({
    contractName: "SocialFeed",
    functionName: "tail",
  });

  // Fetch posts using useScaffoldReadContract (now using data directly, no manual refetch)
  const {
    data: posts, // Renamed for clarity; directly use this instead of state
    isLoading: isPostsLoading,
    error: postsError,
  } = useScaffoldReadContract({
    contractName: "SocialFeed",
    functionName: "getPosts",
    args: [tail, 5n], // Fetch 5 posts starting from tail
    query: {
      enabled: tail !== undefined,
    },
  });

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
        <div className="space-y-3 sm:space-y-4">
          {posts && posts.length === 0 ? (
            <p className="text-center text-gray-500 text-sm sm:text-base py-8">No posts available.</p>
          ) : (
            posts?.map((post, idx) => (
              <div key={idx} className="card bg-base-100 shadow-lg p-3 sm:p-4">
                <div className="card-body p-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                    <Address address={post.author} format="short" />
                    <span className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-0">
                      {new Date(Number(post.timestamp) * 1000).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-base sm:text-lg break-words">
                    {post.cid ? `CID: ${post.cid}` : "Content unavailable"}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-400 break-all">Hash: {post.messageHash}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
