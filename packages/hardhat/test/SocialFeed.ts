import { expect } from "chai";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { ethers, Signer } from "hardhat";
import { SocialFeed } from "../typechain-types";

describe("SocialFeed", function () {
  let socialFeed: SocialFeed;
  let user: Signer;

  before(async () => {
    [user] = await ethers.getSigners();
  });

  // We define a fixture to reuse the same setup in every test.
  beforeEach(async () => {
    const socialFeedFactory = await ethers.getContractFactory("SocialFeed");
    socialFeed = (await socialFeedFactory.deploy()) as SocialFeed;
    await socialFeed.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should initialize head and tail to 0", async function () {
      expect(await socialFeed.head()).to.equal(0);
      expect(await socialFeed.tail()).to.equal(0);
    });
  });

  describe("Post", () => {
    it("Should create a post successfully", async () => {
      const message = "Hello, world!"; // <= 280 chars
      const cid = "QmExampleCID"; // Mock CID
      await expect(socialFeed.connect(user).post(message, cid))
        .to.emit(socialFeed, "PostCreated")
        .withArgs(1, cid, await user.getAddress(), anyValue, anyValue); // Include CID in event

      expect(await socialFeed.tail()).to.equal(1);
      const post = await socialFeed.posts(1);
      expect(post.id).to.equal(1);
      expect(post.author).to.equal(await user.getAddress());
      expect(post.prevId).to.equal(0); // First post
      expect(post.cid).to.equal(cid); // Check CID
    });

    it("Should validate message length", async function () {
      const longMessage = "a".repeat(281); // >280
      await expect(socialFeed.connect(user).post(longMessage, "QmCID")).to.be.reverted; // Reverts on invalid

      const validMessage = "a".repeat(280);
      await expect(socialFeed.connect(user).post(validMessage, "QmCID")).to.not.be.reverted;
    });

    it("Should validate CID length", async function () {
      const validMessage = "Hello, world!";

      // CID too short (length 0)
      const emptyCid = "";
      await expect(socialFeed.connect(user).post(validMessage, emptyCid)).to.be.revertedWith("CID must be 1-100 chars");

      // CID too long (length 101)
      const longCid = "a".repeat(101);
      await expect(socialFeed.connect(user).post(validMessage, longCid)).to.be.revertedWith("CID must be 1-100 chars");

      // Valid CID (e.g., length 12)
      const validCid = "QmExampleCID";
      await expect(socialFeed.connect(user).post(validMessage, validCid)).to.not.be.reverted;
    });
  });

  describe("Posting multiple", () => {
    it("Should update linked list on multiple posts", async () => {
      await socialFeed.connect(user).post("First", "QmCID1");
      await socialFeed.connect(user).post("Second", "QmCID2");

      expect(await socialFeed.tail()).to.equal(2);
      expect(await socialFeed.head()).to.equal(1);
      const secondPost = await socialFeed.posts(2);
      expect(secondPost.prevId).to.equal(1);
      expect(secondPost.cid).to.equal("QmCID2"); // Check CID
    });
  });

  describe("Hashing", () => {
    it("Should compute correct message hash via pure function", async () => {
      const message = "Test message";
      const author = await user.getAddress();
      const timestamp = 1234567890; // Example timestamp
      const expectedHash = ethers.keccak256(
        ethers.solidityPacked(["string", "address", "uint256"], [message, author, timestamp]),
      );
      expect(await socialFeed.computeMessageHash(message, author, timestamp)).to.equal(expectedHash);
    });

    it("Should store correct message hash in posts after posting", async () => {
      const message = "Test message";
      const cid = "QmCID"; // Mock CID
      await socialFeed.connect(user).post(message, cid);
      const post = await socialFeed.posts(1);
      const expectedHash = await socialFeed.computeMessageHash(message, post.author, post.timestamp);
      expect(post.messageHash).to.equal(expectedHash);
    });
  });
});
