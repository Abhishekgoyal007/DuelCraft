// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CashDuel
 * @dev Smart contract for real-money duels on Mantle network
 * Players bet MNT tokens, winner takes 90% of pot, 10% platform fee
 */
contract CashDuel is ReentrancyGuard, Pausable, Ownable {
    
    // ============ ENUMS ============
    
    enum DuelTier { BRONZE, SILVER, GOLD }
    enum DuelStatus { WAITING, ACTIVE, COMPLETED, CANCELED }
    
    // ============ STRUCTS ============
    
    struct Duel {
        uint256 id;
        address player1;
        address player2;
        DuelTier tier;
        uint256 entryFee;
        uint256 totalPot;
        address winner;
        DuelStatus status;
        uint256 createdAt;
        uint256 completedAt;
    }
    
    struct PlayerStats {
        uint256 totalEarnings;      // Total MNT won
        uint256 totalSpent;         // Total MNT paid as entry fees
        uint256 cashDuelsPlayed;    // Number of cash duels played
        uint256 cashDuelsWon;       // Number of cash duels won
        uint256 lastDuelTime;       // Timestamp of last duel (for cooldown)
        uint256 dailyDuelCount;     // Duels played today
        uint256 lastResetDay;       // Day number for daily reset
    }
    
    // ============ CONSTANTS ============
    
    uint256 public constant BRONZE_FEE = 2 ether;    // 2 MNT
    uint256 public constant SILVER_FEE = 10 ether;   // 10 MNT
    uint256 public constant GOLD_FEE = 20 ether;     // 20 MNT
    uint256 public constant PLATFORM_FEE_PERCENT = 10;
    uint256 public constant COOLDOWN_PERIOD = 30;    // 30 seconds
    uint256 public constant DAILY_DUEL_LIMIT = 20;
    uint256 public constant CANCEL_DELAY = 300;      // 5 minutes
    
    // ============ STATE VARIABLES ============
    
    uint256 private duelCounter;
    address public authorizedCaller;
    address public operationsWallet;
    address public treasuryWallet;
    uint256 public accumulatedFees;
    
    mapping(uint256 => Duel) public duels;
    mapping(address => PlayerStats) public playerStats;
    mapping(address => uint256[]) private playerDuelHistory;
    
    // ============ EVENTS ============
    
    event DuelCreated(
        uint256 indexed duelId, 
        address indexed player1, 
        DuelTier tier, 
        uint256 entryFee
    );
    
    event DuelJoined(
        uint256 indexed duelId, 
        address indexed player2
    );
    
    event DuelCompleted(
        uint256 indexed duelId, 
        address indexed winner, 
        uint256 payout, 
        address indexed loser
    );
    
    event DuelCanceled(
        uint256 indexed duelId, 
        uint256 refundAmount
    );
    
    event FeesWithdrawn(
        uint256 amount, 
        address operationsWallet, 
        address treasuryWallet
    );
    
    // ============ CONSTRUCTOR ============
    
    constructor(
        address _authorizedCaller,
        address _operationsWallet,
        address _treasuryWallet
    ) Ownable(msg.sender) {
        require(_authorizedCaller != address(0), "Invalid authorized caller");
        require(_operationsWallet != address(0), "Invalid operations wallet");
        require(_treasuryWallet != address(0), "Invalid treasury wallet");
        
        authorizedCaller = _authorizedCaller;
        operationsWallet = _operationsWallet;
        treasuryWallet = _treasuryWallet;
    }
    
    // ============ MODIFIERS ============
    
    modifier onlyAuthorized() {
        require(msg.sender == authorizedCaller, "Not authorized");
        _;
    }
    
    // ============ MAIN FUNCTIONS ============
    
    /**
     * @dev Create a new duel and wait for opponent
     */
    function createDuel(DuelTier tier) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
        returns (uint256) 
    {
        uint256 requiredFee = getEntryFee(tier);
        require(msg.value == requiredFee, "Incorrect entry fee");
        
        // Check cooldown
        PlayerStats storage stats = playerStats[msg.sender];
        require(
            block.timestamp >= stats.lastDuelTime + COOLDOWN_PERIOD,
            "Cooldown period active"
        );
        
        // Check daily limit
        uint256 currentDay = block.timestamp / 1 days;
        if (stats.lastResetDay != currentDay) {
            stats.dailyDuelCount = 0;
            stats.lastResetDay = currentDay;
        }
        require(stats.dailyDuelCount < DAILY_DUEL_LIMIT, "Daily limit reached");
        
        // Create duel
        duelCounter++;
        duels[duelCounter] = Duel({
            id: duelCounter,
            player1: msg.sender,
            player2: address(0),
            tier: tier,
            entryFee: requiredFee,
            totalPot: requiredFee,
            winner: address(0),
            status: DuelStatus.WAITING,
            createdAt: block.timestamp,
            completedAt: 0
        });
        
        // Update player stats
        stats.totalSpent += requiredFee;
        stats.lastDuelTime = block.timestamp;
        stats.dailyDuelCount++;
        playerDuelHistory[msg.sender].push(duelCounter);
        
        emit DuelCreated(duelCounter, msg.sender, tier, requiredFee);
        
        return duelCounter;
    }
    
    /**
     * @dev Join an existing duel
     */
    function joinDuel(uint256 duelId) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
        returns (address, address) 
    {
        Duel storage duel = duels[duelId];
        
        require(duel.id != 0, "Duel does not exist");
        require(duel.status == DuelStatus.WAITING, "Duel not available");
        require(msg.sender != duel.player1, "Cannot join own duel");
        require(msg.value == duel.entryFee, "Incorrect entry fee");
        
        // Check cooldown and daily limit
        PlayerStats storage stats = playerStats[msg.sender];
        require(
            block.timestamp >= stats.lastDuelTime + COOLDOWN_PERIOD,
            "Cooldown period active"
        );
        
        uint256 currentDay = block.timestamp / 1 days;
        if (stats.lastResetDay != currentDay) {
            stats.dailyDuelCount = 0;
            stats.lastResetDay = currentDay;
        }
        require(stats.dailyDuelCount < DAILY_DUEL_LIMIT, "Daily limit reached");
        
        // Update duel
        duel.player2 = msg.sender;
        duel.totalPot += msg.value;
        duel.status = DuelStatus.ACTIVE;
        
        // Update player stats
        stats.totalSpent += msg.value;
        stats.lastDuelTime = block.timestamp;
        stats.dailyDuelCount++;
        playerDuelHistory[msg.sender].push(duelId);
        
        // Update both players' played count
        playerStats[duel.player1].cashDuelsPlayed++;
        playerStats[msg.sender].cashDuelsPlayed++;
        
        emit DuelJoined(duelId, msg.sender);
        
        return (duel.player1, duel.player2);
    }
    
    /**
     * @dev Complete duel and pay winner (only authorized caller)
     */
    function completeDuel(uint256 duelId, address winner) 
        external 
        onlyAuthorized 
        nonReentrant 
    {
        Duel storage duel = duels[duelId];
        
        require(duel.id != 0, "Duel does not exist");
        require(duel.status == DuelStatus.ACTIVE, "Duel not active");
        require(
            winner == duel.player1 || winner == duel.player2, 
            "Invalid winner"
        );
        
        // Calculate payouts
        uint256 platformFee = (duel.totalPot * PLATFORM_FEE_PERCENT) / 100;
        uint256 winnerPayout = duel.totalPot - platformFee;
        
        // Update duel
        duel.winner = winner;
        duel.status = DuelStatus.COMPLETED;
        duel.completedAt = block.timestamp;
        
        // Update winner stats
        PlayerStats storage winnerStats = playerStats[winner];
        winnerStats.totalEarnings += winnerPayout;
        winnerStats.cashDuelsWon++;
        
        // Accumulate platform fees
        accumulatedFees += platformFee;
        
        // Pay winner
        (bool success, ) = winner.call{value: winnerPayout}("");
        require(success, "Transfer to winner failed");
        
        address loser = (winner == duel.player1) ? duel.player2 : duel.player1;
        
        emit DuelCompleted(duelId, winner, winnerPayout, loser);
    }
    
    /**
     * @dev Cancel duel and refund entry fee (only player1, only if waiting)
     */
    function cancelDuel(uint256 duelId) 
        external 
        nonReentrant 
    {
        Duel storage duel = duels[duelId];
        
        require(duel.id != 0, "Duel does not exist");
        require(msg.sender == duel.player1, "Only creator can cancel");
        require(duel.status == DuelStatus.WAITING, "Can only cancel waiting duels");
        require(
            block.timestamp >= duel.createdAt + CANCEL_DELAY,
            "Must wait before canceling"
        );
        
        // Update duel status
        duel.status = DuelStatus.CANCELED;
        
        // Refund entry fee
        uint256 refundAmount = duel.entryFee;
        
        // Adjust player stats
        PlayerStats storage stats = playerStats[msg.sender];
        stats.totalSpent -= refundAmount;
        stats.dailyDuelCount--;
        
        // Remove from history
        _removeDuelFromHistory(msg.sender, duelId);
        
        // Transfer refund
        (bool success, ) = msg.sender.call{value: refundAmount}("");
        require(success, "Refund transfer failed");
        
        emit DuelCanceled(duelId, refundAmount);
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @dev Get all active duels waiting for opponent
     */
    function getActiveDuels() 
        external 
        view 
        returns (Duel[] memory) 
    {
        uint256 activeCount = 0;
        
        // Count active duels
        for (uint256 i = 1; i <= duelCounter; i++) {
            if (duels[i].status == DuelStatus.WAITING) {
                activeCount++;
            }
        }
        
        // Build array
        Duel[] memory activeDuels = new Duel[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= duelCounter; i++) {
            if (duels[i].status == DuelStatus.WAITING) {
                activeDuels[index] = duels[i];
                index++;
            }
        }
        
        return activeDuels;
    }
    
    /**
     * @dev Get player statistics
     */
    function getUserStats(address user) 
        external 
        view 
        returns (PlayerStats memory) 
    {
        return playerStats[user];
    }
    
    /**
     * @dev Get player's duel history
     */
    function getUserDuelHistory(address user, uint256 limit) 
        external 
        view 
        returns (Duel[] memory) 
    {
        uint256[] memory userDuels = playerDuelHistory[user];
        uint256 count = userDuels.length > limit ? limit : userDuels.length;
        
        Duel[] memory history = new Duel[](count);
        
        for (uint256 i = 0; i < count; i++) {
            uint256 index = userDuels.length - 1 - i; // Most recent first
            history[i] = duels[userDuels[index]];
        }
        
        return history;
    }
    
    /**
     * @dev Get entry fee for tier
     */
    function getEntryFee(DuelTier tier) 
        public 
        pure 
        returns (uint256) 
    {
        if (tier == DuelTier.BRONZE) return BRONZE_FEE;
        if (tier == DuelTier.SILVER) return SILVER_FEE;
        if (tier == DuelTier.GOLD) return GOLD_FEE;
        revert("Invalid tier");
    }
    
    /**
     * @dev Get duel by ID
     */
    function getDuel(uint256 duelId) 
        external 
        view 
        returns (Duel memory) 
    {
        return duels[duelId];
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @dev Withdraw accumulated platform fees
     */
    function withdrawPlatformFees() 
        external 
        onlyOwner 
        nonReentrant 
    {
        require(accumulatedFees > 0, "No fees to withdraw");
        
        uint256 amount = accumulatedFees;
        accumulatedFees = 0;
        
        // Split 50/50 between operations and treasury
        uint256 operationsAmount = amount / 2;
        uint256 treasuryAmount = amount - operationsAmount;
        
        (bool success1, ) = operationsWallet.call{value: operationsAmount}("");
        require(success1, "Transfer to operations failed");
        
        (bool success2, ) = treasuryWallet.call{value: treasuryAmount}("");
        require(success2, "Transfer to treasury failed");
        
        emit FeesWithdrawn(amount, operationsWallet, treasuryWallet);
    }
    
    /**
     * @dev Set authorized caller address
     */
    function setAuthorizedCaller(address caller) 
        external 
        onlyOwner 
    {
        require(caller != address(0), "Invalid address");
        authorizedCaller = caller;
    }
    
    /**
     * @dev Set operations wallet
     */
    function setOperationsWallet(address wallet) 
        external 
        onlyOwner 
    {
        require(wallet != address(0), "Invalid address");
        operationsWallet = wallet;
    }
    
    /**
     * @dev Set treasury wallet
     */
    function setTreasuryWallet(address wallet) 
        external 
        onlyOwner 
    {
        require(wallet != address(0), "Invalid address");
        treasuryWallet = wallet;
    }
    
    /**
     * @dev Emergency pause
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // ============ INTERNAL FUNCTIONS ============
    
    function _removeDuelFromHistory(address user, uint256 duelId) 
        private 
    {
        uint256[] storage history = playerDuelHistory[user];
        for (uint256 i = 0; i < history.length; i++) {
            if (history[i] == duelId) {
                history[i] = history[history.length - 1];
                history.pop();
                break;
            }
        }
    }
    
    // ============ FALLBACK ============
    
    receive() external payable {
        revert("Direct payments not accepted");
    }
}
