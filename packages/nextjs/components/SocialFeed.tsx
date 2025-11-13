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
    args: [tail || 0n, 5n], // Fetch 5 posts starting from tail
  });

  if (tailError || postsError) {
    return (
      <div className="alert alert-error">
        <span>Error loading feed: {tailError?.message || postsError?.message}</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Social Feed</h2>

      {isTailLoading || isPostsLoading ? (
        <div className="flex justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : (
        <div className="space-y-4">
          {posts && posts.length === 0 ? (
            <p className="text-center text-gray-500">No posts available.</p>
          ) : (
            posts?.map((post, idx) => (
              <div key={idx} className="card bg-base-100 shadow-lg">
                <div className="card-body">
                  <div className="flex items-center justify-between">
                    <Address address={post.author} format="short" />
                    <span className="text-sm text-gray-500">
                      {new Date(Number(post.timestamp) * 1000).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-lg">{post.cid ? `CID: ${post.cid}` : "Content unavailable"}</p>
                  <p className="text-sm text-gray-400">Hash: {post.messageHash}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
