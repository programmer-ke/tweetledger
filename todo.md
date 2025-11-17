# Implementation TODO List: On-Chain Social Feed POC

This TODO list follows vertical feature slicing, where each task
delivers a thin, end-to-end slice of functionality. Slices build
evolutionarily: starting with setup, then layering in core business
logic (pure functions for post creation, hash computation, list
traversal—side-effect free, testable in isolation) and imperative
shell (app layer handling wallet txs, IPFS calls, event subs via
wagmi/ethers). Core logic lives in shared utils (e.g., `lib/core.ts`
for hash/validate; Solidity pure/view funcs). Shell orchestrates in
React components and contract interactions.

Tasks are ordered for incremental value: deployable after each major
slice. Status uses markdown checkboxes:
- [ ] **Todo** (initial state)
- [>] **In Progress** (update to this during work)
- [x] **Done** (mark complete with notes if needed)

## Setup & Foundation

- [x] **1. Initialize Project with Scaffold-ETH 2**  
  End-to-end: Clone Scaffold-ETH 2 repo, run `yarn install && yarn
  chain` for local Hardhat node + basic React app. Core: Pure setup
  script validating env. Shell: App layer boots dApp with wallet
  connect (wagmi). Deliverable: Local dev server at localhost:3000
  with "Hello Scaffold-ETH" page and console-logged wallet address.

- [x] **2. Deploy Minimal Contract Skeleton**  
  End-to-end: Add basic Solidity contract (`SocialFeed.sol`) with
  constructor, `head`/`tail` pointers, and empty `Post` struct. Core:
  Pure view `getHead()` returning tail ID. Shell: Hardhat deploy
  script + wagmi ABI import. Deliverable: Contract deployed locally;
  frontend queries `getHead()` via `useReadContract` and displays
  "Chain ready: Head ID 0".

## Posting Flow

- [x] **3. Implement Basic On-Chain Posting (No IPFS/Hash)**  
  End-to-end: Add `post(string memory message) external` fn: Validate
  length on-chain, mint ID, store minimal `Post {id, author,
  timestamp, prevId}` in mapping, update tail, emit empty
  `PostCreated`. Core: Pure Solidity fn `validateMessageLength(string
  memory msg) pure returns (bool)`. Shell: React form with
  textarea/counter, `useWriteContract` call. Deliverable: Post message
  via wallet; view shows on-chain author/timestamp (no content yet).

- [x] **4. Add Message Hash Binding to Posting**  
  End-to-end: Update `post` to compute/store `messageHash =
  keccak256(abi.encodePacked(message, msg.sender,
  block.timestamp))`. Core: Pure JS util `computeMessageHash(message:
  string, author: string, timestamp: bigint): string` for off-chain
  verify. Shell: Pass raw message in tx; post-success, log recomputed
  hash match. Deliverable: Post includes hash; console verifies
  integrity without IPFS.

- [x] **5. Integrate Client-Side IPFS Upload to Posting**  
  End-to-end: Before tx, bundle `{"message": message}` JSON, upload
  via `@chainsafe/ipfs-http-client` to get CID, pass CID to updated
  `post(string message, string cid)`. Core: Pure util
  `bundlePostJson(message: string): string` (JSON stringify). Shell:
  Async flow in React: upload → tx with CID. Deliverable: Post stores
  CID on-chain; console logs fetched JSON from `ipfs.io/ipfs/{CID}`.

## Retrieval & Feed

- [x] **6. Implement On-Chain Linked List Traversal View**  
  End-to-end: Add `getPosts(uint startId, uint count) view returns
  (Post[] memory)`: Traverse backward from startId (default tail) via
  prevId. Core: Pure Solidity loop logic (gas-unbounded). Shell:
  `useReadContract` hook fetches batch (count=5). Deliverable: Button
  triggers query; display raw Post structs
  (ID/author/timestamp/CID/hash) in simple list—no resolution yet.

- [x] **7. Add Eager IPFS Resolution & Hash Verification to Feed**  
  End-to-end: On `getPosts` success, parallel-fetch CIDs to JSON,
  recompute hash via core util, flag mismatches. Core: Pure
  `verifyPostIntegrity(post: Post, fetchedMessage: string):
  boolean`. Shell: React `useEffect` for batch `fetch`, update state
  with verified messages or degraded UI. Deliverable: Feed renders
  messages (or "Unavailable—verify CID" fallbacks); all show verified.

## Real-Time & Polish

- [x] **8. Enable Event-Driven Real-Time Feed Updates**
  Use Scaffold-ETH's `useReadContract` hook to receive new posts
  when new blocks are generated.

- [>] **9. Add functionlity for loading more historical posts***
  Currently, only the latest 5 posts are displayed. We need functionality
  to allow a user to navigate past these to more historical posts

## Testing & Deployment

- [ ] **11. Deploy to Test environment**
  Deploy the contract to Sepolia and web app to Vercel/Akash
