"use client";

import { type NextPage } from "next";
import { WrenchScrewdriverIcon } from "@heroicons/react/24/outline";

const Inbox: NextPage = () => {
  return (
    <div className="flex items-center flex-col flex-grow pt-6 sm:pt-8 md:pt-10 px-4 sm:px-5 md:px-6">
      <div className="flex items-center flex-col flex-grow w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl mb-4 sm:mb-6 md:mb-8">
        <WrenchScrewdriverIcon className="h-15 w-15" />
        <p className="block text-4xl font-bold"> Coming Soon !</p>
        <p>
          Encrypted Chats with any address/ENS name, powered by{" "}
          <a
            href="https://xmtp.org/"
            target="_blank"
            className="text-blue-500 hover:text-blue-700 underline hover:no-underline transition"
          >
            XMTP
          </a>
        </p>
      </div>
    </div>
  );
};

export default Inbox;
