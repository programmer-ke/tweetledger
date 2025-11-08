import { expect } from "chai";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { ethers } from "hardhat";
import { SocialFeed } from "../typechain-types";

describe("SocialFeed", function () {
  // We define a fixture to reuse the same setup in every test.
  let socialFeed: SocialFeed;
  before(async () => {
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

  describe("Posting", () => {
    it("Should create a post successfully", async () => {
      const [user] = await ethers.getSigners();
      const message = "Hello, world!"; // <= 280 chars
      await expect(socialFeed.connect(user).post(message))
	.to.emit(socialFeed, "PostCreated")
	.withArgs(1, user.address, anyValue);
      
    });
  });

});
