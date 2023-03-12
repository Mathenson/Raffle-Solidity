const { network } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config")

//the VRFCoordinatorV2 constructor
const GAS_PRICE_LINK = 1e9; //link per gas
const BASE_FEE = "250000000000000000" // the premium 0.25 link per request, it cost 0.25 per request

module.exports = async ({ getNamedAccounts, deployments}) => {
    const {deploy, log} = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    //const args = [BASE_FEE, GAS_PRICE_LINK] 

    if(chainId == 31337) {
        log("Local network detected! Deploying mocks...")  
         //deploy a mock VRFcoordinator...
         await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            log: true,
            args: [BASE_FEE, GAS_PRICE_LINK],
         })
         log("mock deployed!!")
         log("====================================")
    }  

}

module.exports.tags = ["all", "mocks"]