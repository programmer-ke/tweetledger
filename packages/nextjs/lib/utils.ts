import { encodePacked, keccak256 } from "viem";

export function computeMessageHash(message: string, author: string, timestamp: bigint): `0x${string}` {
  return keccak256(encodePacked(["string", "address", "uint256"], [message, author, timestamp]));
}
