import {
  type CensorContext,
  RegExpMatcher,
  TextCensor,
  type TextCensorStrategy,
  englishDataset,
  englishRecommendedTransformers,
} from "obscenity";
import { Address, encodePacked, keccak256 } from "viem";

export type Post = {
  id: bigint;
  author: Address;
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

// Profanity detection utility
const profanityMatcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

export function detectProfanity(text: string): boolean {
  return profanityMatcher.hasMatch(text);
}

// Censoring utility using TextCensor
const asteriskStrategy: TextCensorStrategy = (ctx: CensorContext) => "*".repeat(ctx.matchLength);
const textCensor = new TextCensor().setStrategy(asteriskStrategy);

export function censorProfanity(text: string, strategy?: TextCensorStrategy): string {
  const censor = strategy ? new TextCensor().setStrategy(strategy) : textCensor;
  const matches = profanityMatcher.getAllMatches(text);
  return censor.applyTo(text, matches);
}
