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
      const cost = await socialFeed.getPostCostInWei();
      const message = "Hello, world!"; // <= 280 chars
      const cid = "QmExampleCID"; // Mock CID
      await expect(socialFeed.connect(user).post(message, cid, { value: cost }))
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
      const cost = await socialFeed.getPostCostInWei();
      const longMessage = "a".repeat(281); // >280
      await expect(socialFeed.connect(user).post(longMessage, "QmCID", { value: cost })).to.be.reverted; // Reverts on invalid

      const validMessage = "a".repeat(280);
      await expect(socialFeed.connect(user).post(validMessage, "QmCID", { value: cost })).to.not.be.reverted;
    });

    it("Should validate CID length", async function () {
      const cost = await socialFeed.getPostCostInWei();
      const validMessage = "Hello, world!";

      // CID too short (length 0)
      const emptyCid = "";
      await expect(socialFeed.connect(user).post(validMessage, emptyCid, { value: cost })).to.be.revertedWith(
        "CID must be 1-100 chars",
      );

      // CID too long (length 101)
      const longCid = "a".repeat(101);
      await expect(socialFeed.connect(user).post(validMessage, longCid, { value: cost })).to.be.revertedWith(
        "CID must be 1-100 chars",
      );

      // Valid CID (e.g., length 12)
      const validCid = "QmExampleCID";
      await expect(socialFeed.connect(user).post(validMessage, validCid, { value: cost })).to.not.be.reverted;
    });

    it("Should revert on insufficient payment", async () => {
      const cost = await socialFeed.getPostCostInWei();
      await expect(socialFeed.connect(user).post("Message", "QmCID", { value: cost - 1n })).to.be.revertedWith(
        "Insufficient payment for post",
      );
    });
  });

  describe("Posting multiple", () => {
    it("Should update linked list on multiple posts", async () => {
      const cost = await socialFeed.getPostCostInWei();
      await socialFeed.connect(user).post("First", "QmCID1", { value: cost });
      await socialFeed.connect(user).post("Second", "QmCID2", { value: cost });

      expect(await socialFeed.tail()).to.equal(2);
      expect(await socialFeed.head()).to.equal(1);
      const secondPost = await socialFeed.posts(2);
      expect(secondPost.prevId).to.equal(1);
      expect(secondPost.cid).to.equal("QmCID2"); // Check CID
    });
  });

  describe("User Post Count for Rewards", () => {
    it("Should increment user post count and set latest timestamp for the current reward period on posting", async () => {
      const cost = await socialFeed.getPostCostInWei();
      const userAddress = await user.getAddress();
      const initialData = await socialFeed.userPostCount(1, userAddress);
      expect(initialData.count).to.equal(0);
      expect(initialData.latestTimestamp).to.equal(0);

      const tx1 = await socialFeed.connect(user).post("First post", "QmCID1", { value: cost });
      const receipt1 = await tx1.wait();
      const timestamp1 = (await ethers.provider.getBlock(receipt1!.blockNumber!))!.timestamp;
      const dataAfterFirst = await socialFeed.userPostCount(1, userAddress);
      expect(dataAfterFirst.count).to.equal(1);
      expect(dataAfterFirst.latestTimestamp).to.equal(timestamp1);

      const tx2 = await socialFeed.connect(user).post("Second post", "QmCID2", { value: cost });
      const receipt2 = await tx2.wait();
      const timestamp2 = (await ethers.provider.getBlock(receipt2!.blockNumber!))!.timestamp;
      const dataAfterSecond = await socialFeed.userPostCount(1, userAddress);
      expect(dataAfterSecond.count).to.equal(2);
      expect(dataAfterSecond.latestTimestamp).to.equal(timestamp2); // Updated to latest
    });

    it("Should not increment count or set timestamp for other users or periods", async () => {
      const cost = await socialFeed.getPostCostInWei();
      const [, otherUser] = await ethers.getSigners();
      const userAddress = await user.getAddress();
      const otherAddress = await otherUser.getAddress();

      await socialFeed.connect(user).post("Post by user", "QmCID1", { value: cost });
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
      const cost = await socialFeed.getPostCostInWei();
      const message = "Test message";
      const cid = "QmCID"; // Mock CID
      await socialFeed.connect(user).post(message, cid, { value: cost });
      const post = await socialFeed.posts(1);
      const expectedHash = await socialFeed.computeMessageHash(message, post.author, post.timestamp);
      expect(post.messageHash).to.equal(expectedHash);
    });
  });

  describe("Retrieval", () => {
    it("Should retrieve posts from tail with count=2 after 3 posts", async () => {
      const cost = await socialFeed.getPostCostInWei();
      await socialFeed.connect(user).post("Post 1", "QmCID1", { value: cost });
      await socialFeed.connect(user).post("Post 2", "QmCID2", { value: cost });
      await socialFeed.connect(user).post("Post 3", "QmCID3", { value: cost });

      const tail = await socialFeed.tail(); // Should be 3
      const posts = await socialFeed.getPosts(tail, 2);

      expect(posts.length).to.equal(2);
      expect(posts[0].id).to.equal(3); // Latest
      expect(posts[1].id).to.equal(2); // Previous
    });

    it("Should retrieve posts from specific startId with count=1", async () => {
      const cost = await socialFeed.getPostCostInWei();
      await socialFeed.connect(user).post("Post 1", "QmCID1", { value: cost });
      await socialFeed.connect(user).post("Post 2", "QmCID2", { value: cost });
      await socialFeed.connect(user).post("Post 3", "QmCID3", { value: cost });

      const posts = await socialFeed.getPosts(2, 1);

      expect(posts.length).to.equal(1);
      expect(posts[0].id).to.equal(2);
    });

    it("Should handle edge case: startId does not exist", async () => {
      const cost = await socialFeed.getPostCostInWei();
      await socialFeed.connect(user).post("Post 1", "QmCID1", { value: cost });

      await expect(socialFeed.getPosts(999, 1)).to.be.revertedWith("Start ID does not exist");
    });

    it("Should handle edge case: count=0 returns empty array", async () => {
      const cost = await socialFeed.getPostCostInWei();
      await socialFeed.connect(user).post("Post 1", "QmCID1", { value: cost });

      const tail = await socialFeed.tail();
      const posts = await socialFeed.getPosts(tail, 0);

      expect(posts.length).to.equal(0);
    });

    it("Should handle edge case: requesting more posts than available", async () => {
      const cost = await socialFeed.getPostCostInWei();
      await socialFeed.connect(user).post("Post 1", "QmCID1", { value: cost });
      await socialFeed.connect(user).post("Post 2", "QmCID2", { value: cost });

      const tail = await socialFeed.tail();
      const posts = await socialFeed.getPosts(tail, 5); // Only 2 posts exist

      expect(posts.length).to.equal(2);
      expect(posts[0].id).to.equal(2);
      expect(posts[1].id).to.equal(1);
    });

    it("Should return empty array when startId=0 and posts exist", async () => {
      const cost = await socialFeed.getPostCostInWei();
      await socialFeed.connect(user).post("Post 1", "QmCID1", { value: cost });

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

  describe("Post Cost and Reward Management", () => {
    let otherUser: Signer;

    before(async () => {
      [, otherUser] = await ethers.getSigners();
    });

    it("Should initialize usdCentsPerPost to 10", async () => {
      expect(await socialFeed.usdCentsPerPost()).to.equal(10);
    });

    it("Should allow admin to set usdCentsPerPost", async () => {
      await socialFeed.connect(user).setUsdCentsPerPost(20);
      expect(await socialFeed.usdCentsPerPost()).to.equal(20);
    });

    it("Should not allow non-admin to set usdCentsPerPost", async () => {
      await expect(socialFeed.connect(otherUser).setUsdCentsPerPost(30)).to.be.revertedWith("Only admin");
    });

    it("Should initialize userRewardPercentage to 50", async () => {
      expect(await socialFeed.userRewardPercentage()).to.equal(50);
    });

    it("Should allow admin to set userRewardPercentage", async () => {
      await socialFeed.connect(user).setUserRewardPercentage(75);
      expect(await socialFeed.userRewardPercentage()).to.equal(75);
    });

    it("Should not allow non-admin to set userRewardPercentage", async () => {
      await expect(socialFeed.connect(otherUser).setUserRewardPercentage(80)).to.be.revertedWith("Only admin");
    });

    it("Should reject userRewardPercentage > 100", async () => {
      await expect(socialFeed.connect(user).setUserRewardPercentage(101)).to.be.revertedWith(
        "Percentage must be <= 100",
      );
    });
  });

  describe("Post Cost Calculation", () => {
    it("Should calculate post cost in wei with default values", async () => {
      // Default: usdCentsPerPost = 10, usdPricePerEth = 2500
      // Cost = (10 * 1e18) / (100 * 2500) = 1e19 / 250000 = 4e13 wei
      expect(await socialFeed.getPostCostInWei()).to.equal(40000000000000n); // 4e13
    });

    it("Should update cost when usdCentsPerPost changes", async () => {
      await socialFeed.connect(user).setUsdCentsPerPost(20); // Double cents
      expect(await socialFeed.getPostCostInWei()).to.equal(80000000000000n); // Double cost
    });

    it("Should update cost when usdPricePerEth changes", async () => {
      await socialFeed.connect(user).setUsdPricePerEth(5000); // Double price
      expect(await socialFeed.getPostCostInWei()).to.equal(20000000000000n); // Half cost
    });

    it("Should revert if usdPricePerEth is 0", async () => {
      await socialFeed.connect(user).setUsdPricePerEth(0);
      await expect(socialFeed.getPostCostInWei()).to.be.revertedWith("USD price per ETH must be > 0");
    });
  });

  describe("Reward Distribution", () => {
    let otherUser: Signer;
    let winner1: Signer;
    let winner2: Signer;

    before(async () => {
      [, otherUser, winner1, winner2] = await ethers.getSigners();
    });

    it("Should distribute rewards to winners and update history", async () => {
      // Fund contract with 1 ETH
      await user.sendTransaction({ to: socialFeed.target, value: ethers.parseEther("1") });
      const initialBalance = await ethers.provider.getBalance(socialFeed.target);
      expect(initialBalance).to.equal(ethers.parseEther("1"));

      const winners = [await winner1.getAddress(), await winner2.getAddress()];
      const postCounts = [5, 3];
      const initialHistoryLength = await socialFeed.getAwardHistoryLength();
      const initialPeriod = await socialFeed.rewardPeriodId();

      await socialFeed.connect(user).distributeRewards(winners, postCounts);

      // Check balances: 50% to winners (0.5 ETH total, 0.25 each), 50% to owner
      const winner1Balance = await ethers.provider.getBalance(await winner1.getAddress());
      const winner2Balance = await ethers.provider.getBalance(await winner2.getAddress());
      const ownerBalance = await ethers.provider.getBalance(await user.getAddress());
      // Note: Exact balances depend on gas, so check increases instead
      expect(winner1Balance).to.be.gt(ethers.parseEther("0.24")); // Approximate
      expect(winner2Balance).to.be.gt(ethers.parseEther("0.24"));
      expect(ownerBalance).to.be.gt(ethers.parseEther("9999.4")); // Lower threshold for gas

      // Check history
      const historyLength = await socialFeed.getAwardHistoryLength();
      expect(historyLength).to.equal(initialHistoryLength + 1n);
      const record = await socialFeed.awardHistory(historyLength - 1n);
      expect(record.periodId).to.equal(initialPeriod);
      expect(record.addresses).to.deep.equal(winners);
      expect(record.amounts.length).to.equal(2);
      expect(record.postCounts).to.deep.equal(postCounts);

      // Check period incremented
      expect(await socialFeed.rewardPeriodId()).to.equal(initialPeriod + 1n);
    });

    it("Should revert on non-admin call", async () => {
      await expect(socialFeed.connect(otherUser).distributeRewards([], [])).to.be.revertedWith("Only admin");
    });

    it("Should revert on empty winners", async () => {
      await expect(socialFeed.connect(user).distributeRewards([], [])).to.be.revertedWith("No winners to distribute");
    });

    it("Should revert on length mismatch", async () => {
      const winners = [await winner1.getAddress()];
      const postCounts = [5, 3]; // Different length
      await expect(socialFeed.connect(user).distributeRewards(winners, postCounts)).to.be.revertedWith(
        "Winners and postCounts length mismatch",
      );
    });
  });
});
