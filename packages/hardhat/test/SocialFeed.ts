import { expect } from "chai";
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

  describe("getHead", function () {
    it("Should return the tail ID (initially 0)", async function () {
      expect(await socialFeed.getHead()).to.equal(0);
    });
  });
});
