const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Shop", function () {
  let Shop;
  let shop;
  let owner;
  let addr1;
  let addr2;
  let erc20Token;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a mock ERC20 token for testing
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    erc20Token = await MockERC20.deploy("Mock Token", "MTK");

    Shop = await ethers.getContractFactory("Shop");
    shop = await Shop.deploy([await erc20Token.getAddress()]);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await shop.owner()).to.equal(await owner.getAddress());
    });

    it("Should support the initial token", async function () {
      const supportedTokens = await shop.getSupportedTokens();
      expect(supportedTokens).to.include(await erc20Token.getAddress());
    });
  });

  describe("Token management", function () {
    it("Should add a new supported token", async function () {
      await shop.addSupportedToken(await addr1.getAddress());
      expect(await shop.supportedTokens(await addr1.getAddress())).to.deep.equal(true);
    });

    it("Should remove a supported token", async function () {
      await shop.removeSupportedToken(await erc20Token.getAddress());
      expect(await shop.supportedTokens(await erc20Token.getAddress())).to.deep.equal(false);
    });

    it("Should fail to add an already supported token", async function () {
      await expect(shop.addSupportedToken(await erc20Token.getAddress())).to.be.revertedWith("Token already supported");
    });

    it("Should fail to remove a non-supported token", async function () {
      await expect(shop.removeSupportedToken(await addr1.getAddress())).to.be.revertedWith("Token not supported");
    });
  });

  describe("Buying items", function () {
    it("Should emit event when buying with native token", async function () {
      await expect(shop.buyItemWithNativeToken("user1", "shop1", "item1", 2, { value: ethers.parseEther("1") }))
        .to.emit(shop, "BuyItemWithNativeToken")
        .withArgs("user1", "shop1", "item1", 2);
    });

    it("Should emit event when buying with ERC20 token", async function () {
      await expect(shop.buyItemWithERC20("user1", "shop1", "item1", 2, await erc20Token.getAddress()))
        .to.emit(shop, "BuyItemWithERC20")
        .withArgs("user1", "shop1", "item1", 2, await erc20Token.getAddress());
    });

    it("Should fail when buying with unsupported ERC20 token", async function () {
      await expect(shop.buyItemWithERC20("user1", "shop1", "item1", 2, await addr1.getAddress()))
        .to.be.revertedWith("Token not supported");
    });
  });

  describe("Withdrawals", function () {
    beforeEach(async function () {
      // Send some Ether to the contract
      await owner.sendTransaction({
        to: await shop.getAddress(),
        value: ethers.parseEther("1.0")
      });

      await erc20Token.mint(addr1.address, ethers.parseEther("1000"));

      // Send some ERC20 tokens to the contract
      await erc20Token.connect(addr1).approve(await addr1.getAddress(), ethers.parseEther("1000"));
      await erc20Token.connect(addr1).transfer(await shop.getAddress(), ethers.parseEther("1000"));
    });

    it("Should withdraw native token", async function () {
      const initialBalance = await ethers.provider.getBalance(await addr1.getAddress());
      await shop.withdrawNativeToken(await addr1.getAddress(), ethers.parseEther("0.5"));
      const finalBalance = await ethers.provider.getBalance(await addr1.getAddress());
      expect(finalBalance - initialBalance).to.equal(ethers.parseEther("0.5"));
    });

    it("Should withdraw ERC20 token", async function () {
      await shop.withdrawERC20Token(await erc20Token.getAddress(), await addr1.getAddress(), ethers.parseEther("500"));
      expect(await erc20Token.balanceOf(await addr1.getAddress())).to.equal(ethers.parseEther("500"));
    });

    it("Should fail to withdraw more than available balance", async function () {
      await expect(shop.withdrawNativeToken(await addr1.getAddress(), ethers.parseEther("2.0")))
        .to.be.revertedWith("Insufficient balance");
    });
  });

  describe("Pausable", function () {
    it("Should pause and unpause", async function () {
      await shop.pause();
      await expect(shop.buyItemWithNativeToken("user1", "shop1", "item1", 2))
        .to.be.revertedWith("Pausable: paused");
      await shop.unpause();
      await expect(shop.buyItemWithNativeToken("user1", "shop1", "item1", 2))
        .to.not.be.reverted;
    });
  });
});