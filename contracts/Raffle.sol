// what to do 

//Raffle contract
//Enter the lottery
//pick a random winner
//Winner to be selected every X minutes 

//SPDX-License-Identifier: MIT
 
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol"; 


    error Raffle__NotEnoughEthEntered();
    error Raffle__TranferFailed();
    error Raffle__NotOpened();
    error Raffle__UpkeepNotNeeded(uint256 currentBalance, uint256 numPlayers, uint256 raffleState);

/**
 * @title A sample Raffle contract
 * @author Mathenson
 * @notice This contract is for creating an untemperable decentralized smart contract
 * @dev This implements chainlink VRF V2 and Chainlink keepers
 */

contract Raffle is VRFConsumerBaseV2, KeeperCompatibleInterface {

        //state variables  
    //entrance fee
    uint256 private immutable i_entranceFee;
    address payable[] private s_players;
    


    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private immutable i_callbackGasLimit;
    uint32 private constant NUM_WORDS = 1;


    //enums
    enum RaffleState {
            OPEN,
            CALCULATING
    }

    //lottery variables
    address private s_recentWinners;
    RaffleState private s_raffleState;
    uint256 private s_lastTimeStamp;
    uint256 immutable i_interval; 

    // events //
    event RaffleEnter(address indexed s_player);
    event RequestedRafffleWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winner);

    //constructor
    constructor (
         address vrfCoordinatorV2,
         uint256 entranceFee,
         bytes32 gasLane,
         uint64  subscriptionId,
         uint32 callbackGasLimit,
         uint256 interval
         ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_entranceFee = entranceFee;
        i_vrfCoordinator  = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        s_raffleState = RaffleState.OPEN; 
        s_lastTimeStamp = block.timestamp;
        i_interval = interval;
        
    }

    //user should be able to enter it 
    function enterRaffle() public payable {
        if(msg.value < i_entranceFee){revert Raffle__NotEnoughEthEntered();}
        s_players.push(payable(msg.sender));

        if (s_raffleState != RaffleState.OPEN) {
            revert Raffle__NotOpened();
        }

        //Emit an event when we update a dynamic array or Mapping
        //Named events with the function name reversed 
        emit RaffleEnter(msg.sender);
    }

    /**
     * @dev The upkeep function is the one the chainlink keepers call
     * they look for rhe `upKeepNeeded` to return true
      * The following should be true to return true
     * 1. Our time interval should have passed
     * 2.  The lottery should have at least 1 player, and have some ETh
     * 3. Our subscription is funded with LINK
     * 4. Lottery should be in an open statw
     * 
     */

    function checkUpkeep(bytes memory  /*checkData*/) public view override returns 
    (
         bool upkeepNeeded,
         bytes memory /*performData*/ 
         
         )
         
         {
        bool isOpen = (RaffleState.OPEN == s_raffleState);
        //intervals 
        bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
        bool hasPlayers = (s_players.length > 0);
        bool hasBalance = address(this).balance > 0;
        upkeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
    } 

    //pick random winner
    function performUpkeep(bytes calldata /*performData*/) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded) {
            revert Raffle__UpkeepNotNeeded 
            (address(this).balance, 
            s_players.length, 
            uint256(s_raffleState)
            );
        }
        s_raffleState = RaffleState.CALCULATING;
        uint256 requestId = i_vrfCoordinator.requestRandomWords( 
         i_gasLane,
         i_subscriptionId,
         REQUEST_CONFIRMATIONS,
         i_callbackGasLimit,
         NUM_WORDS
        );
        emit RequestedRafffleWinner(requestId);

    }

    function fulfillRandomWords(uint256 /*requestId*/, uint256[] memory randomWords) 
    internal 
     override
     {
        //we are picking random winner with a modulo function 
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexOfWinner];
        s_recentWinners = recentWinner;
        //reset raffle state
        s_raffleState = RaffleState.OPEN;
        // reset players array
        s_players = new address payable[](0); 
        // Reset timestamp
        s_lastTimeStamp = block.timestamp;
        //send money to the random winner
        (bool success, ) = recentWinner.call{value: address(this).balance}("");
        //require success
        if (!success) {
            revert Raffle__TranferFailed();
        }
        emit WinnerPicked(recentWinner);

    } 

    function getEntranceFee()  external view returns (uint) {
        return i_entranceFee;
    }
 
    function getPlayer(uint256 _index) external view returns (address) {
        return s_players[_index];
     }

    function getRecentWinner() public view returns (address) {
        return s_recentWinners;
    }

    function getRaffleState() public view returns (RaffleState){
            return  s_raffleState;
    }

    function getNumWords()  public pure returns (uint256) {
        return NUM_WORDS;
    }

    function getNumberOfPlayers() public view returns(uint256) {
       return s_players.length;
    }

    function getLatestTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }

    function getRequestConfirmmation() public pure returns (uint256) {
        return REQUEST_CONFIRMATIONS;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }
}