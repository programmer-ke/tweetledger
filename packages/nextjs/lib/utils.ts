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

/**
 * Verify that a Post's stored messageHash matches the hash computed from a provided message, the post's author, and timestamp.
 *
 * @param post - The Post object containing author, timestamp, and stored `messageHash`
 * @param fetchedMessage - The message content to use when recomputing the hash
 * @returns `true` if the recomputed hash equals `post.messageHash`, `false` otherwise.
 */
export function verifyPostIntegrity(post: Post, fetchedMessage: string): boolean {
  const recomputedHash = computeMessageHash(fetchedMessage, post.author, post.timestamp);
  return recomputedHash === post.messageHash;
}

// Profanity detection utility
const profanityMatcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

/**
 * Check whether a text contains profane words or phrases.
 *
 * @returns `true` if the text contains profanity, `false` otherwise.
 */
export function detectProfanity(text: string): boolean {
  return profanityMatcher.hasMatch(text);
}

// Censoring utility using TextCensor
const asteriskStrategy: TextCensorStrategy = (ctx: CensorContext) => "*".repeat(ctx.matchLength);
const textCensor = new TextCensor().setStrategy(asteriskStrategy);

/**
 * Censors profane words in the given text using the default or provided censoring strategy.
 *
 * @param strategy - Optional TextCensorStrategy to use instead of the default asterisk-based strategy
 * @returns The input `text` with profane segments replaced according to the selected censor strategy
 */
export function censorProfanity(text: string, strategy?: TextCensorStrategy): string {
  const censor = strategy ? new TextCensor().setStrategy(strategy) : textCensor;
  const matches = profanityMatcher.getAllMatches(text);
  return censor.applyTo(text, matches);
}