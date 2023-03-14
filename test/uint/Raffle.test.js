const { assert, expect} = require("chai")
const { getNamedAccounts, deployments, ethers, network } = require("hardhat")

const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

//ternary operation 
!developmentChains.includes(network.name) 
? describe.skip 
: describe("Raffle Uint Tests", function () {
    //things to deploy
    let raffle, vrfCoordinatorV2Mock, raffleEntranceFee, deployer, interval
    const chainId = network.config.chainId

    beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer
        await deployments.fixture(["all"])
        raffle = await ethers.getContract("Raffle", deployer)
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
        raffleEntranceFee = await raffle.getEntranceFee()
        interval = await raffle.getInterval()
    })
  
    //first test
    //check if it set the state and the intervals correctly
    describe("constructor", function() {
        it("Initialize the raffle correctly", async function() {
            const raffleState = await raffle.getRaffleState()
            const interval = await raffle.getInterval()
            assert.equal(raffleState.toString(), "0")
            assert.equal(interval.toString(), networkConfig[chainId]["interval"])
        })
    })

    //test to enter raffle
    //make sure it revert error if enough ETH is not Entered (fire error)
    describe("enter raffle",  function() {
        it("reverts enough ETH is not entered", async function () {
            await expect(raffle.enterRaffle()).to.be.revertedWith(
                "Raffle__NotEnoughEthEntered"
                )
        })
  

    //test if it records players when they enter
    //with the raffle entrance fee
        it("records players when they enter", async function() {
             await raffle.enterRaffle({value: raffleEntranceFee})
             const firstContractPlayer = await raffle.getPlayer(0)
             assert.equal(firstContractPlayer, deployer)
        })
  
    //test to make sure it emit an events
    it("emits event on enter", async function () {
        await expect(raffle.enterRaffle({value: raffleEntranceFee}))
        .to.emit(raffle, "RaffleEnter")
    })

    it("doesnt allow entrance when raffle is calculating", async function () {
        await raffle.enterRaffle({value: raffleEntranceFee})
        await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
        await network.provider.send("evm_mine", [])
        //pretend to be a chainlink keeper
        await raffle.performUpkeep([])
        await expect(raffle.enterRaffle({ value: raffleEntranceFee}))
        .to.be.revertedWith("Raffle__NotOpened")
        })
    }) 

    //test the checkUpKeeps

    describe("checkUpKeep", function() {
        it("returns false if people havn't sent any ETH", async function () {
           await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
           await network.provider.send("evm_mine", [])
           const { upkeepNeeded} = await raffle.callStatic.checkUpkeep([])
           assert(!upkeepNeeded)
        })
        it("returns false if raffle isn't open", async function() {
            await raffle.enterRaffle({value: raffleEntranceFee})
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.send("evm_mine", [])
            await raffle.performUpkeep([])
            const raffleState = await raffle.getRaffleState()
           const { upkeepNeeded} = await raffle.callStatic.checkUpkeep([])
           assert.equal(raffleState.toString(), "1")
           assert.equal(upkeepNeeded. false)
        })
        
        it("returns false if enough time hasn't passed", async () => {
            await raffle.enterRaffle({value: raffleEntranceFee})
            await network.provider.send("evm_increaseTime", [interval.toNumber() - 1])
            await network.provider.request({method: "evm_mine", params: []})
            const [ upkeepNeeded ] = await raffle.callStatic.checkUpkeep("0x")
            assert(!upkeepNeeded)
        })

        it("returns true if enough time has passed, has players, eth, and is open", async function () {
            await raffle.enterRaffle({value: raffleEntranceFee})
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.request({ method: "evm_mine", params: []})
            const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x")
            assert(upkeepNeeded)
        })
    }) 

    //perform upkeep

    describe("perfromUpkeep", function() {
        it("can only run if checkUpkeep is true", async function() {
           await raffle.enterRaffle({value: raffleEntranceFee})
           await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
           await network.provider.send("evm_mine", [])
           const tx = await raffle.performUpkeep([])
           assert(tx)

        })
        it("revert when checkUpkeep is false", async function () {
            await expect(raffle.performUpkeep([])).to.be.revertedWith(
                "Raffle__UpkeepNotNeeded"
            )

        })
        it("updates the raffle state, emits an events, and call the vrf coordinator", async function (){
            await raffle.enterRaffle({value: raffleEntranceFee})
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.send("evm_mine", [])
            const txRes = await raffle.performUpkeep([])
            const txReceipt = await txRes.wait(1)
            const requestId = await txReceipt.events[1].args.requestId
            const raffleState = await raffle.getRaffleState()
            assert(requestId.toNumber() > 0)
            assert(raffleState.toString() == "1")
        })
    })

    //fufill random words
    describe("fufillRandomWords", function() {
        beforeEach(async function() {
            await raffle.enterRaffle({value: raffleEntranceFee})
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.send("evm_mine", [])
        })
        it("can only be called after performUpkeep", async function () {
            await expect(vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
             ) .to.be.revertedWith("nonexistent request")
             await expect(vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)
             ) .to.be.revertedWith("nonexistent request")
        })

         it("picks a winner, reset the lottery, ad sends money", async function () {
            const additionalEntrants = 3
            const startingAccountIndex = 1 //deployer = 0
            const accounts = await ethers.getSigners()
            for (
                let i = startingAccountIndex;
                i < startingAccountIndex + additionalEntrants;
                i++ ) {
                   
                const accountConnectedRaffle = raffle.connect(accounts[i])
                await accountConnectedRaffle.enterRaffle({value: raffleEntranceFee})
                }

                const startingTimeStamp = await raffle.getLatestTimeStamp()
                //performUpkeep (mock being Chainlink Keepers)
                //fulfillRandomWords (mock being Chainlink VRF)
                //we will have to wait for the fulfillRandomWords to be called
                await new Promise(async (resolve, reject) => {
                    raffle.once("WinnerPicked", async () => {
                        console.log("Found the event!")
                        try{
                            const recentWinner = await raffle.getRecentWinner()
                            const raffleState = await raffle.getRaffleState()
                            const endingTimestamp = await raffle.getLatestTimeStamp()
                            const numPlayers = await raffle.getNumberOfPlayers()
                            const winnerEndingBalance = await accounts[1].getBalance()
                            assert.equal(numPlayers.toString(), "0")
                            assert.equal(raffleState.toString(), "0")
                            assert(endingTimestamp > startingTimeStamp)

                            assert.equal(
                                winnerEndingBalance.toString(),
                                winnerStartingBalance.add( 
                                    raffleEntranceFee
                                        .mul(additionalEntrants)
                                        .add(raffleEntranceFee)
                                        .toString()
                                )
                            )

                        } catch (e) {
                            reject (e)
                        }
                        resolve()
                     })
                    //setting up the listener
                    //below, we will fire the event, and the listener will pick it up and resolve
                    const tx = await raffle.performUpkeep([])
                    const txReceipt = await tx.wait(1)
                    const winnerStartingBalance = await accounts[1].getBalance()
                    await vrfCoordinatorV2Mock.fulfillRandomWords(
                        txReceipt.events[1].args.requestId,
                        raffle.address
                    )
                })
         })
    })
})