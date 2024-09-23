const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("UserCheckin", function () {
  let UserCheckin, userCheckin, owner, addr1, addr2;
  let MockERC20, mockToken1, mockToken2, mockToken3;
  const nativeTokenCheckInValue = ethers.parseEther("0.1"); // 0.1 ETH

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    MockERC20 = await ethers.getContractFactory("MockERC20");
    mockToken1 = await MockERC20.deploy("MockToken1", "MT1");
    mockToken2 = await MockERC20.deploy("MockToken2", "MT2");
    mockToken3 = await MockERC20.deploy("MockToken3", "MT3");

    await mockToken1.waitForDeployment();
    await mockToken2.waitForDeployment();
    await mockToken3.waitForDeployment();

    UserCheckin = await ethers.getContractFactory("UserCheckin");
    userCheckin = await UserCheckin.deploy(
      [await mockToken1.getAddress(), await mockToken2.getAddress()],
      [ethers.parseEther("10"), ethers.parseEther("20")],
      nativeTokenCheckInValue
    );

    await userCheckin.waitForDeployment();

    await mockToken1.mint(addr1.address, ethers.parseEther("1000"));
    await mockToken2.mint(addr1.address, ethers.parseEther("1000"));
    await mockToken3.mint(addr1.address, ethers.parseEther("1000"));
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await userCheckin.owner()).to.equal(owner.address);
    });

    it("Should initialize with correct tokens and values", async function () {
      const supportedTokens = await userCheckin.getSupportedTokens();
      expect(supportedTokens).to.have.lengthOf(2);
      expect(supportedTokens[0]).to.equal(await mockToken1.getAddress());
      expect(supportedTokens[1]).to.equal(await mockToken2.getAddress());

      const token1Info = await userCheckin.supportedTokens(await mockToken1.getAddress());
      const token2Info = await userCheckin.supportedTokens(await mockToken2.getAddress());

      expect(token1Info.isSupported).to.be.true;
      expect(token2Info.isSupported).to.be.true;
      expect(token1Info.checkInValue).to.equal(ethers.parseEther("10"));
      expect(token2Info.checkInValue).to.equal(ethers.parseEther("20"));

      expect(await userCheckin.nativeTokenCheckInValue()).to.equal(nativeTokenCheckInValue);
    });
  });

  describe("Token Management", function () {
    // ... (previous tests remain unchanged)

    it("Should update native token check-in value", async function () {
      const newValue = ethers.parseEther("0.2");
      await userCheckin.updateNativeTokenCheckInValue(newValue);
      expect(await userCheckin.nativeTokenCheckInValue()).to.equal(newValue);
    });
  });

  describe("Check-in", function () {
    beforeEach(async function () {
      await mockToken1.connect(addr1).approve(await userCheckin.getAddress(), ethers.parseEther("1000"));
      await mockToken2.connect(addr1).approve(await userCheckin.getAddress(), ethers.parseEther("1000"));
    });

    it("Should allow user to check in with ERC20 token", async function () {
      await userCheckin.connect(addr1).checkIn(1, await mockToken1.getAddress());
      const checkIn = await userCheckin.userCheckIns(1);
      expect(checkIn.count).to.equal(1n);
    });

    it("Should allow user to check in with native token", async function () {
      await userCheckin.connect(addr1).checkInWithNativeToken(1, { value: nativeTokenCheckInValue });
      const checkIn = await userCheckin.userCheckIns(1);
      expect(checkIn.count).to.equal(1n);
    });

    it("Should fail check-in with unsupported token", async function () {
      await expect(userCheckin.connect(addr1).checkIn(1, await mockToken3.getAddress()))
        .to.be.revertedWith("Token not supported");
    });

    it("Should fail check-in without sufficient approval", async function () {
      await mockToken1.connect(addr1).approve(await userCheckin.getAddress(), 0);
      await expect(userCheckin.connect(addr1).checkIn(1, await mockToken1.getAddress()))
        .to.be.revertedWith("ERC20: insufficient allowance");
    });

    it("Should fail check-in with incorrect native token amount", async function () {
      await expect(userCheckin.connect(addr1).checkInWithNativeToken(1, { value: ethers.parseEther("0.05") }))
        .to.be.revertedWith("Incorrect native token amount");
    });
  });

  describe("Withdrawal", function () {
    beforeEach(async function () {
      await mockToken1.connect(addr1).approve(await userCheckin.getAddress(), ethers.parseEther("1000"));
      await userCheckin.connect(addr1).checkIn(1, await mockToken1.getAddress());
      await userCheckin.connect(addr1).checkInWithNativeToken(2, { value: nativeTokenCheckInValue });
    });

    it("Should allow owner to withdraw ERC20 tokens", async function () {
      const initialBalance = await mockToken1.balanceOf(owner.address);
      await userCheckin.withdrawERC20Token(await mockToken1.getAddress(), owner.address, ethers.parseEther("10"));
      const finalBalance = await mockToken1.balanceOf(owner.address);
      expect(finalBalance - initialBalance).to.equal(ethers.parseEther("10"));
    });

    it("Should allow owner to withdraw native tokens", async function () {
      const initialBalance = await ethers.provider.getBalance(owner.address);
      await userCheckin.withdrawNativeToken(owner.address, nativeTokenCheckInValue);
      const finalBalance = await ethers.provider.getBalance(owner.address);
      expect(finalBalance - initialBalance).to.be.closeTo(nativeTokenCheckInValue, ethers.parseEther("0.01")); // Allow for gas costs
    });

    it("Should fail withdrawal of ERC20 tokens for non-owner", async function () {
      await expect(userCheckin.connect(addr1).withdrawERC20Token(await mockToken1.getAddress(), addr1.address, ethers.parseEther("10")))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should fail withdrawal of native tokens for non-owner", async function () {
      await expect(userCheckin.connect(addr1).withdrawNativeToken(addr1.address, nativeTokenCheckInValue))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Pausable", function () {
    beforeEach(async function () {
      await mockToken1.connect(addr1).approve(await userCheckin.getAddress(), ethers.parseEther("1000"));
    });

    it("Should pause and unpause the contract", async function () {
      await userCheckin.pause();
      await expect(userCheckin.connect(addr1).checkIn(1, await mockToken1.getAddress())).to.be.revertedWith("Pausable: paused");
      await expect(userCheckin.connect(addr1).checkInWithNativeToken(1, { value: nativeTokenCheckInValue })).to.be.revertedWith("Pausable: paused");
      await userCheckin.unpause();
      await expect(userCheckin.connect(addr1).checkIn(1, await mockToken1.getAddress())).to.not.be.reverted;
      await expect(userCheckin.connect(addr1).checkInWithNativeToken(1, { value: nativeTokenCheckInValue })).to.not.be.reverted;
    });

    it("Should only allow owner to pause/unpause", async function () {
      await expect(userCheckin.connect(addr1).pause()).to.be.revertedWith("Ownable: caller is not the owner");
      await expect(userCheckin.connect(addr1).unpause()).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});