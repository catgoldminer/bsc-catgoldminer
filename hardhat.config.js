require("@nomiclabs/hardhat-ganache");
require("@nomiclabs/hardhat-ethers");
require("@nomicfoundation/hardhat-verify");
require("@nomicfoundation/hardhat-chai-matchers");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config();

module.exports = {
  defaultNetwork: "ganache",
  solidity: {
    compilers: [
      {
        version: "0.5.16",
      },
      {
        version: "0.8.0",
      },
      {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      },
      {
        version: "0.8.4",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      },
      {
        version: "0.8.19",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      },
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      },
    ],
  },

  networks: {
    ganache: {
      url: "http://ganache:8545",
      accounts: {
        mnemonic:
          "tail actress very wool broom rule frequent ocean nice cricket extra snap",
        path: " m/44'/60'/0'/0/",
        initialIndex: 0,
        count: 20,
      },
    },
    bsct: {
      url: `https://data-seed-prebsc-2-s1.binance.org:8545/`,
      accounts: [`${process.env.PRIVATE_KEY}`],
      gas: 8100000,
      gasPrice: 8000000000,
    },
    bsc: {
      url: `https://bsc-mainnet.infura.io/v3/3eadb2e1b6db490994b8ca1626250298`,
      accounts: [`${process.env.PRIVATE_KEY}`],
      gasPrice: 3000000000
    }
  },
  etherscan: {
    apiKey: {
     bscTestnet: process.env.BSCSCAN_API_KEY,
     bsc: process.env.BSCSCAN_API_KEY,
    },
  }
};
