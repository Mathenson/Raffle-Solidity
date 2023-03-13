const { getNamedAccounts, deployments, ethers } = require("hardhat")
const { describe } = require("node:test")
const { developmentChains } = require("../../helper-hardhat-config")


developmentChains.includes(network.name)
 ? describe.skip 
 : describe("Raffle Uint Test", function () {
    let raffle, raffleEntranceFee, deployer

    beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer
        raffle = await ethers.getContract("Raffle", deployer)
        raffleEntranceFee = await raffle.getEntranceFee()
    })
})