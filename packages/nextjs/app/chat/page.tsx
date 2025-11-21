'use client';

import { useState, useEffect, useCallback } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { Client, type Conversation, Signer, ConsentState } from "@xmtp/browser-sdk";
import { RainbowKitCustomConnectButton, AddressInput, Address } from "~~/components/scaffold-eth";

export default function ChatPage() {
  const { address: userAddress, isConnected } = useAccount();
  const [client, setClient] = useState<Client | null>(null);
  const [recipientAddress, setRecipientAddress] = useState("");
  const [recipientInboxId, setRecipientInboxId] = useState("");
  const [isRecipientReachable, setIsRecipientReachable] = useState<boolean | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [allConvos, setConvos] = useState([]);
  const { signMessageAsync } = useSignMessage();
  
  // Initialize XMTP client when wallet is connected
  const initializeClient = useCallback(async () => {
    try {
      const signer: Signer = {
        type: "EOA" as const,
        getIdentifier: () => ({
          identifier: userAddress!,
          identifierKind: "Ethereum",
        }),
        signMessage: async (message: string): Promise<Uint8Array<ArrayBufferLike>> => {
          // Use wagmi or ethers to sign the message
          // Convert to Uint8Array as needed
	  const signature = await signMessageAsync({ message });
	  return new Uint8Array(Buffer.from(signature.slice(2), "hex"));
        },
      };
      const xmtpClient = await Client.create(
	signer, {
	  env: process.env.NEXT_PUBLIC_XMTP_ENV,
	  appVersion: process.env.NEXT_PUBLIC_XMTP_APP_VERSION,
      });
      console.log("inbox id:", xmtpClient.inboxId);
      setClient(xmtpClient);
    } catch (error) {
      console.error("Failed to initialize XMTP client:", error);
    }

    // sync conversations
    if (client) {
      try  {
	await client.conversations.sync();
      } catch (error) {
	console.error("failed to sync conversations", error)
      }
    }

    // list conversations
    if (client) {
      try  {
	console.log("listing convos");
	const convos = await client.conversations.list({
	  consentStates: [ConsentState.Allowed],
	})
	setConvos(convos);
      } catch (error) {
	console.error("failed to sync conversations", error)
      } finally {
	console.log("conversations", allConvos);
      }
    }
    

  }, [userAddress]);

  useEffect(() => {
    if (isConnected && userAddress) {
      initializeClient();
    }
  }, [isConnected, userAddress, initializeClient]);

  // Check if recipient is reachable
  const checkRecipient = async () => {
    if (!client || !recipientAddress) return;
    try {
      const response = await Client.canMessage([
        { identifier: recipientAddress, identifierKind: "Ethereum" },
      ]);
      const reachable = response.get(recipientAddress.toLowerCase()) || false;
      setIsRecipientReachable(reachable);
      if (reachable) {
	// Get recipients inboxId
	const recipientInboxId = await client.findInboxIdByIdentifier({
	  identifier: recipientAddress,
	  identifierKind: "Ethereum",
	});
	setRecipientInboxId(recipientInboxId);
	console.log("inbox id:", recipientInboxId);
        // Create or get existing DM conversation
        const dm = await client.conversations.newDm(recipientAddress);
        setConversation(dm);
        // Load prior messages
        await loadMessages(dm);
      }
    } catch (error) {
      console.error("Error checking recipient:", error);
      setIsRecipientReachable(false);
    }
  };

  // Load messages from the conversation
  const loadMessages = async (conv: Conversation) => {
    try {
      await conv.sync()
    } catch (error) {
      console.error("Unable to sync dm", error);
    }
    
    try {
      const msgs = await conv.messages();
      setMessages(msgs);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  // Send a message
  const sendMessage = async () => {
    if (!conversation || !messageText.trim()) return;
    setLoading(true);
    try {
      await conversation.send(messageText);
      setMessageText("");
      // Reload messages to include the new one
      await loadMessages(conversation);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex justify-center items-center h-screen">
        <RainbowKitCustomConnectButton />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">One-to-One Chat</h1>

      {/* Recipient Input */}
      <div className="mb-4">
        <AddressInput
          onChange={setRecipientAddress}
          value={recipientAddress}
          placeholder="Enter recipient Ethereum address or ENS"
        />
        <button
          onClick={checkRecipient}
          className="btn btn-primary mt-2"
          disabled={!recipientAddress}
        >
          Check Recipient
        </button>
        {isRecipientReachable === true && <p className="text-green-500">Recipient is reachable!</p>}
        {isRecipientReachable === false && <p className="text-red-500">Recipient not reachable.</p>}
      </div>

      {/* Message Input and Send */}
      {conversation && (
        <>
          <div className="mb-4">
            <textarea
              placeholder="Type your message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="textarea textarea-bordered w-full"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !messageText.trim()}
              className="btn btn-primary mt-2"
            >
              {loading ? "Sending..." : "Send"}
            </button>
          </div>

          {/* Messages List */}
          {/*<div className="space-y-2">
	    
            {messages.map((msg, index) => (
              <div key={index} className="card bg-base-100 shadow">
                <div className="card-body p-3">
                  <div className="flex justify-between items-center mb-2">
                    {<Address address={msg.senderInboxId} format="short" />}
                    <span className="text-xs text-gray-500">
                      {new Date(msg.sentAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm">{msg.content}</p>
                </div>
              </div>
            ))}
            </div>*/}
        </>
      )}

      {/*convo*/}
      {allConvos && (
	<>
	  <div className="">
	    {allConvos.map((convo, index) => (
	      <div key={index}>{ convo.id() }</div>
	    ))}
	  </div>
	</>
	)}
    </div>
  );
}
