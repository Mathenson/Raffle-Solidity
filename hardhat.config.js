require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-etherscan")
require("hardhat-deploy")
require("solidity-coverage")
require("hardhat-gas-reporter")
require("hardhat-contract-sizer")
require("dotenv").config()

const GOERLI_URL = process.env.GOERLI_RPC_URL
const PRIVATE_KEY = process.env.PRIVATE_KEY
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  defaultNetwork: "hardhat",

  networks: {
    hardhat:{
        chainId: 31337,
        blockConfirmation: 1,
    },
    goerli:{
        chainId: 5,
        blockConfirmation: 6,
        url: GOERLI_URL,
        accounts: [PRIVATE_KEY]
    }, 
  },
  gasReporter: {
    enabled: false,
    currency: "USD",
    outputFile:"gas-report.txt",
    noColors: true,
  },
  solidity: "0.8.7",
  namedAccounts: {
    deployer: {
      default: 0,
    },
    player: {
      default: 1,
    },
  },
  
  mocha: {
    timeout: 3000000,
  }
};
