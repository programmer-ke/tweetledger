import { expect } from "chai";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { ethers } from "hardhat";
import { SocialFeed } from "../typechain-types";

describe("SocialFeed", function () {
  let socialFeed: SocialFeed;

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
      const [user] = await ethers.getSigners();
      const message = "Hello, world!"; // <= 280 chars
      await expect(socialFeed.connect(user).post(message))
        .to.emit(socialFeed, "PostCreated")
        .withArgs(1, user.address, anyValue);

      expect(await socialFeed.tail()).to.equal(1);
      const post = await socialFeed.posts(1);
      expect(post.id).to.equal(1);
      expect(post.author).to.equal(user.address);
      expect(post.prevId).to.equal(0); // First post
    });

    it("Should validate message length", async function () {
      const [user] = await ethers.getSigners();
      const longMessage = "a".repeat(281); // >280
      await expect(socialFeed.connect(user).post(longMessage)).to.be.reverted; // Reverts on invalid

      const validMessage = "a".repeat(280);
      await expect(socialFeed.connect(user).post(validMessage)).to.not.be.reverted;
    });
  });

  describe("Posting multiple", () => {
    it("Should update linked list on multiple posts", async () => {
      const [user] = await ethers.getSigners();
      await socialFeed.connect(user).post("First");
      await socialFeed.connect(user).post("Second");

      expect(await socialFeed.tail()).to.equal(2);
      expect(await socialFeed.head()).to.equal(1);
      const secondPost = await socialFeed.posts(2);
      expect(secondPost.prevId).to.equal(1);
    });
  });
});
