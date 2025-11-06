# Product Requirements Document (PRD): On-Chain Social Feed POC

## Version History
- **Version**: 1.0
- **Date**: November 05, 2025
- **Authors**: Senior Software Engineer (in collaboration with
  stakeholder)
- **Status**: Draft for Review

## Introduction
### Project Idea
This Proof of Concept (POC) builds a Twitter-like decentralized
application (dApp) on Ethereum where post data achieves full
sovereignty and censorship resistance. Users with a compatible wallet
can post short status messages (≤280 characters) directly to the
blockchain. The raw message content is stored off-chain on IPFS for
scalability, while immutable metadata (including a content integrity
hash) and structural links are committed on-chain in a smart
contract. Posts are emitted via events to trigger real-time updates in
the frontend, enabling a chronological feed without reliance on
centralized servers or indexers.

The POC demonstrates a fully on-chain social primitive: tamper-proof,
append-only, and accessible to anyone with ETH for gas, emphasizing
economic incentives over permissions.

## Goals
### Primary Goal
Demonstrate data sovereignty and censorship resistance through:
- **On-chain immutability**: Metadata and hashes stored directly in
  Ethereum storage, verifiable by anyone.
- **Decentralized content**: IPFS for message payloads, with
  client-side verification to prevent tampering.
- **No gatekeepers**: Wallet-based posting with no restrictions,
  relying on gas costs to deter abuse.

### Secondary Goals
- Provide a minimal, demo-ready dApp for web3 developers to fork,
  deploy, and experiment.
- Highlight trade-offs in on-chain social (e.g., gas vs. scalability)
  without over-engineering.

## Target Users
- **Primary**: Web3 developers interested in exploring decentralized
  social protocols, on-chain data structures, and IPFS-Ethereum
  integrations.
- **Use Case**: Rapid prototyping of sovereign apps, testing
  event-driven UIs, or educating on censorship-resistant designs.

## Core Features
Prioritized for the POC to showcase sovereignty:

1. **Posting Immutable Posts**:
   - Wallet-connected users enter a message (≤280 characters;
     client-side validation with counter, on-chain enforcement).
   - No media support.
   - Flow: Client-side IPFS upload of minimal JSON `{"message":
     "..."}` → Tx submits raw message + CID to contract → On-chain:
     Compute bound `messageHash`, append to linked list, emit event.

2. **Retrieving Historical Posts**:
   - Chronological global feed via on-chain linked list traversal.
   - Paginated view function `getPosts(uint startId, uint count)`
     (unbounded for simplicity; frontend caps recommended).
   - Eager batch resolution of CIDs to fetch/verify messages during
     feed load.

3. **Wallet-Based Authentication**:
   - Pure Ethereum: `msg.sender` as author; no restrictions or rate
     limits—relies on gas/economic incentives.

4. **Event-Driven Real-Time Feeds**:
   - Native Ethereum event listening for `PostCreated` (full payload
     emitted).
   - Minor gaps accepted; manual refresh button for full re-sync from
     chain tail.
   - Feed state managed via React `useState` array (historical batch +
     event appends).

### Non-Features (Scoped Out for POC)
- User profiles or following (author shown as wallet address only).
- Media uploads.
- End-to-end browser testing.
- Gas limits or advanced optimizations.
- Success metrics tracking.
- Detailed security audits.

## Architecture Overview
In this POC, users interact via a React frontend connected to an
Ethereum smart contract. To post, a user enters a message (≤280 chars)
in the UI; the frontend validates length client-side, bundles the raw
message as minimal JSON `{"message": "..."}`, uploads it to IPFS to
get a CID, then calls the contract's `post(string message, string
cid)` external function. On-chain, the contract computes a bound
`messageHash` (keccak256 of message + author + block.timestamp),
appends the post to a global linked list (updating tail/prevId),
stores the `Post` struct (id, cid, author, timestamp, prevId,
messageHash), and emits a full `PostCreated` event. For retrieval, the
frontend loads an initial feed batch via the `getPosts(uint startId,
uint count)` view (traversing the linked list backward), eagerly
resolves CIDs to fetch/verify messages (recomputing hashes off-chain
for integrity), and subscribes to events for real-time appends. A
manual refresh re-fetches from the chain's tail, ensuring
censorship-resistant, sovereign data flow entirely on-chain for
metadata and events, with IPFS for content.

### Key Components
- **Smart Contract**: Solidity (global linked list storage, view for
  pagination, external post fn, full event emission).
- **Frontend**: React with wallet connectivity; client-side IPFS
  upload/resolution; simple pending spinner for txs, generic error
  toasts, subtle success feedback.
- **Data Flow**: Message → IPFS (CID) → Ethereum (metadata/hash/link)
  → Events (live) + Views (historical) → IPFS resolve + hash verify →
  UI feed.

## Technical Stack
- **Scaffold-ETH 2**: A full-stack TypeScript Ethereum dApp framework
  bundling React, wagmi (wallet/events), ethers.js (interactions),
  Hardhat/Foundry (testing/deploy), Tailwind CSS (styling), and more
  for rapid prototyping and deployment to local Hardhat or remote
  networks like Sepolia.

## Deployment & Testing
- **Deployment**: Via Scaffold-ETH 2—local Hardhat for iteration;
  Sepolia testnet for public demos (easy wallet access, low-cost txs).
- **Testing**: Unit/integration tests for contract only (e.g.,
  Foundry/Chai for linked list, events, hash verification, edge cases
  like empty chain). Manual smoke tests for full flow documented in
  README.
- **Gas Monitoring**: Post-deployment via Etherscan/Tenderly; no hard
  limits enforced.

## Limitations & Risks
To transparently guide web3 devs on real-world trade-offs:

- **IPFS Content Persistence**: Relies on public gateways (e.g.,
  ipfs.io) without automatic pinning—content may be temporarily
  unavailable if not replicated. Mitigation: Graceful degraded UI
  (show metadata/CID for manual verification); users can pin via
  services like Pinata post-POC.
- **Ethereum Storage/Retrieval Scalability**: Linked list traversal is
  O(n) gas for historical queries (e.g., ~15k gas per post beyond the
  first 20)—deep feeds become expensive/slow. Mitigation: Frontend
  pagination caps (e.g., load 20 at a time); POC scale limited to <1k
  posts for demo.

These highlight sovereignty's strengths (immutability) while noting
decentralization costs.

## Future Enhancements
- **Direct Messaging via XMTP**: Extend sovereignty to private
  wallet-to-wallet chats with E2E encryption. Users initiate by
  address; optionally commit conversation hashes to the contract for
  integrity, integrating XMTP's JS SDK for seamless frontend support.

## Next Steps
- Review & iterate on this draft.
- Implement POC using outlined specs.
- Deploy to Sepolia for hands-on testing.
