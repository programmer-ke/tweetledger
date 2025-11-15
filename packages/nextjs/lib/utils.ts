import { Address, encodePacked, keccak256 } from "viem";

export type Post = {
  id: bigint;
  author: string;
  timestamp: bigint;
  prevId: bigint;
  cid: string;
  messageHash: `0x${string}`;
};

export function computeMessageHash(message: string, author: Address, timestamp: bigint): `0x${string}` {
  return keccak256(encodePacked(["string", "address", "uint256"], [message, author, timestamp]));
}

export function verifyPostIntegrity(post: Post, fetchedMessage: string): boolean {
  const recomputedHash = computeMessageHash(fetchedMessage, post.author, post.timestamp);
  return recomputedHash === post.messageHash;
}
