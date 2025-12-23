"use client";

import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { PostForm } from "~~/components/PostForm";
import { SocialFeed } from "~~/components/SocialFeed";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-6 sm:pt-8 md:pt-10 px-4 sm:px-5 md:px-6">
        <PostForm connectedAddress={connectedAddress} />
        <SocialFeed />
      </div>
    </>
  );
};

export default Home;
