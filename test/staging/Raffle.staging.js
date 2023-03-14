const { expect, assert } = require("chai")
const { getNamedAccounts, deployments, ethers } = require("hardhat")
const { describe } = require("node:test")
const { developmentChains, networkConfig  } = require("../../helper-hardhat-config")


developmentChains.includes(network.name)
 ? describe.skip 
 : describe("Raffle Uint Test", function () {
    let raffle, raffleEntranceFee, deployer

    beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer
        raffle = await ethers.getContract("Raffle", deployer)
        raffleEntranceFee = await raffle.getEntranceFee()
    })

    describe("fulfillRandomWords", async function () {
        it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async function () {
            const startingTimeStamp = await raffle.getLatestTimeStamp()

            await new Promise(async (resolve, reject) => {
                raffleEntranceFee.once("WinnerPicked event", async () => {
                    console.log("WinnerPicked event fired!")
                    // resolve()
                    try{
                        //assert here 
                        const recentWinner = await raffle.gerRecentWinner()
                        const raffleState = await raffle.getRaffleState()
                        const winnerEndingBalance = await accounts[0].getBalance()
                        const endingTimestamp = await raffle.getLatestTimeStamp()
                        
                        await expect(raffle.getPlayer(0)).to.be.reverted
                        assert.equal(recentWinner.toString(), accounts[0].address)
                        assert.equal(raffleState, 0)
                        assert.equal(
                            winnerEndingBalance.toString(),
                            winnerStartingBalance.add(raffleEntranceFee).toString()
                        )
                        assert(endingTimestamp > startingTimeStamp)
                        resolve()
                    } catch {
                        console.log(error)
                        reject(e)
                    }
                })

                //then enter the raffle
                await raffle.enterRaffle({value: raffleEntranceFee})
                const winnerStartingBalance = await accounts[0].getBalance()
            })
        })
    })
})