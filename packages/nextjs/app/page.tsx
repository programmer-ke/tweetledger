"use client";

import Link from "next/link";
import { useState } from "react";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { BugAntIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const [message, setMessage] = useState("");

  const messageLength = message.length;  
  const isValid = messageLength > 0 && messageLength <= 280;  

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
		  onChange={(e) => setMessage(e.target.value) }
		/>                                                                                    
		<div className="text-right text-sm mt-1">                                             
		  {messageLength}/280                                                                 
		</div>                                                                                
              </div>                                                                                  
              <button                                                                                 
		className="btn btn-primary w-full rounded-xl"
		disabled={!isValid}
              >                                                                                       
		 Post
              </button>                                                                               
	    </>
	  )}
      </div>
    </div>
    </>
  );
};

export default Home;
