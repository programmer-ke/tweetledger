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
    socialFeed = (await socialFeedFactory.deploy(await user.getAddress())) as SocialFeed;
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
        .withArgs(1, cid, await user.getAddress(), 0, anyValue, anyValue);

      expect(await socialFeed.tail()).to.equal(1);
      const post = await socialFeed.posts(1);
      expect(post.id).to.equal(1);
      expect(post.author).to.equal(await user.getAddress());
      expect(post.prevId).to.equal(0); // First post
      expect(post.cid).to.equal(cid);
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

  describe("User Post Count for Rewards", () => {
    it("Should increment user post count and set latest timestamp for the current reward period on posting", async () => {
      const userAddress = await user.getAddress();
      const initialData = await socialFeed.userPostCount(1, userAddress);
      expect(initialData.count).to.equal(0);
      expect(initialData.latestTimestamp).to.equal(0);

      const tx1 = await socialFeed.connect(user).post("First post", "QmCID1");
      const receipt1 = await tx1.wait();
      const timestamp1 = (await ethers.provider.getBlock(receipt1!.blockNumber!))!.timestamp;
      const dataAfterFirst = await socialFeed.userPostCount(1, userAddress);
      expect(dataAfterFirst.count).to.equal(1);
      expect(dataAfterFirst.latestTimestamp).to.equal(timestamp1);

      const tx2 = await socialFeed.connect(user).post("Second post", "QmCID2");
      const receipt2 = await tx2.wait();
      const timestamp2 = (await ethers.provider.getBlock(receipt2!.blockNumber!))!.timestamp;
      const dataAfterSecond = await socialFeed.userPostCount(1, userAddress);
      expect(dataAfterSecond.count).to.equal(2);
      expect(dataAfterSecond.latestTimestamp).to.equal(timestamp2); // Updated to latest
    });

    it("Should not increment count or set timestamp for other users or periods", async () => {
      const [, otherUser] = await ethers.getSigners();
      const userAddress = await user.getAddress();
      const otherAddress = await otherUser.getAddress();

      await socialFeed.connect(user).post("Post by user", "QmCID1");
      const userData = await socialFeed.userPostCount(1, userAddress);
      expect(userData.count).to.equal(1);
      expect(userData.latestTimestamp).to.be.gt(0);

      const otherData = await socialFeed.userPostCount(1, otherAddress);
      expect(otherData.count).to.equal(0);
      expect(otherData.latestTimestamp).to.equal(0);

      const differentPeriodData = await socialFeed.userPostCount(2, userAddress);
      expect(differentPeriodData.count).to.equal(0);
      expect(differentPeriodData.latestTimestamp).to.equal(0);
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

  describe("Retrieval", () => {
    it("Should retrieve posts from tail with count=2 after 3 posts", async () => {
      await socialFeed.connect(user).post("Post 1", "QmCID1");
      await socialFeed.connect(user).post("Post 2", "QmCID2");
      await socialFeed.connect(user).post("Post 3", "QmCID3");

      const tail = await socialFeed.tail(); // Should be 3
      const posts = await socialFeed.getPosts(tail, 2);

      expect(posts.length).to.equal(2);
      expect(posts[0].id).to.equal(3); // Latest
      expect(posts[1].id).to.equal(2); // Previous
    });

    it("Should retrieve posts from specific startId with count=1", async () => {
      await socialFeed.connect(user).post("Post 1", "QmCID1");
      await socialFeed.connect(user).post("Post 2", "QmCID2");
      await socialFeed.connect(user).post("Post 3", "QmCID3");

      const posts = await socialFeed.getPosts(2, 1);

      expect(posts.length).to.equal(1);
      expect(posts[0].id).to.equal(2);
    });

    it("Should handle edge case: startId does not exist", async () => {
      await socialFeed.connect(user).post("Post 1", "QmCID1");

      await expect(socialFeed.getPosts(999, 1)).to.be.revertedWith("Start ID does not exist");
    });

    it("Should handle edge case: count=0 returns empty array", async () => {
      await socialFeed.connect(user).post("Post 1", "QmCID1");

      const tail = await socialFeed.tail();
      const posts = await socialFeed.getPosts(tail, 0);

      expect(posts.length).to.equal(0);
    });

    it("Should handle edge case: requesting more posts than available", async () => {
      await socialFeed.connect(user).post("Post 1", "QmCID1");
      await socialFeed.connect(user).post("Post 2", "QmCID2");

      const tail = await socialFeed.tail();
      const posts = await socialFeed.getPosts(tail, 5); // Only 2 posts exist

      expect(posts.length).to.equal(2);
      expect(posts[0].id).to.equal(2);
      expect(posts[1].id).to.equal(1);
    });

    it("Should return empty array when startId=0 and posts exist", async () => {
      await socialFeed.connect(user).post("Post 1", "QmCID1");

      const posts = await socialFeed.getPosts(0, 5);

      expect(posts.length).to.equal(0);
    });

    it("Should return empty array when no posts exist", async () => {
      const tail = await socialFeed.tail(); // Should be 0
      const posts = await socialFeed.getPosts(tail, 5);

      expect(posts.length).to.equal(0);
    });
  });

  describe("Admin Management", () => {
    let otherUser: Signer;

    before(async () => {
      [, otherUser] = await ethers.getSigners();
    });

    it("Should allow owner to add an admin", async () => {
      await socialFeed.connect(user).addAdmin(await otherUser.getAddress());
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(await socialFeed.admins(await otherUser.getAddress())).to.be.true;
    });

    it("Should allow owner to remove an admin", async () => {
      await socialFeed.connect(user).addAdmin(await otherUser.getAddress());
      await socialFeed.connect(user).removeAdmin(await otherUser.getAddress());
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(await socialFeed.admins(await otherUser.getAddress())).to.be.false;
    });

    it("Should not allow non-owner to add an admin", async () => {
      await expect(socialFeed.connect(otherUser).addAdmin(await user.getAddress()))
        .to.be.revertedWithCustomError(socialFeed, "OwnableUnauthorizedAccount")
        .withArgs(await otherUser.getAddress());
    });

    it("Should not allow non-owner to remove an admin", async () => {
      await socialFeed.connect(user).addAdmin(await otherUser.getAddress());
      await expect(socialFeed.connect(otherUser).removeAdmin(await otherUser.getAddress()))
        .to.be.revertedWithCustomError(socialFeed, "OwnableUnauthorizedAccount")
        .withArgs(await otherUser.getAddress());
    });
  });

  describe("USD Price Management", () => {
    let otherUser: Signer;

    before(async () => {
      [, otherUser] = await ethers.getSigners();
    });

    it("Should initialize usdPricePerEth to 2500", async () => {
      expect(await socialFeed.usdPricePerEth()).to.equal(2500);
    });

    it("Should allow admin to set usdPricePerEth", async () => {
      await socialFeed.connect(user).setUsdPricePerEth(3000);
      expect(await socialFeed.usdPricePerEth()).to.equal(3000);
    });

    it("Should not allow non-admin to set usdPricePerEth", async () => {
      await expect(socialFeed.connect(otherUser).setUsdPricePerEth(3000)).to.be.revertedWith("Only admin");
    });
  });

  describe("Winner Count Management", () => {
    let otherUser: Signer;

    before(async () => {
      [, otherUser] = await ethers.getSigners();
    });

    it("Should initialize winnersPerRound to 3", async () => {
      expect(await socialFeed.winnersPerRound()).to.equal(3);
    });

    it("Should allow admin to set winnersPerRound", async () => {
      await socialFeed.connect(user).setWinnersPerRound(5);
      expect(await socialFeed.winnersPerRound()).to.equal(5);
    });

    it("Should not allow non-admin to set winnersPerRound", async () => {
      await expect(socialFeed.connect(otherUser).setWinnersPerRound(8)).to.be.revertedWith("Only admin");
    });
  });
});
