// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Tournament
 * @dev Tournament system for DuelCraft with prize pools and champion NFTs
 * Winners receive prize money + exclusive champion NFT badges
 */
contract Tournament is ERC721, Ownable, ReentrancyGuard {
    uint256 private _championNftIds;
    
    // Character NFT contract
    address public characterNft;
    
    // Payment/prize token
    IERC20 public arenaToken;
    
    // Tournament status
    enum Status { UPCOMING, REGISTRATION, ACTIVE, COMPLETED, CANCELLED }
    
    // Tournament structure
    struct TournamentData {
        uint256 id;
        string name;
        uint256 entryFee;
        uint256 prizePool;
        uint256 maxParticipants;
        uint256 registrationStart;
        uint256 registrationEnd;
        uint256 startTime;
        uint256 endTime;
        Status status;
        address[] participants;
        address winner;
        address[] topThree; // 1st, 2nd, 3rd
    }
    
    // Champion NFT structure
    struct ChampionNFT {
        uint256 tournamentId;
        address winner;
        uint256 rank; // 1, 2, or 3
        uint256 mintedAt;
        string tournamentName;
    }
    
    // Tournaments
    uint256 public nextTournamentId = 1;
    mapping(uint256 => TournamentData) public tournaments;
    
    // Champion NFTs
    mapping(uint256 => ChampionNFT) public championNfts;
    
    // Participant registration
    mapping(uint256 => mapping(address => bool)) public isRegistered;
    
    // Events
    event TournamentCreated(uint256 indexed tournamentId, string name, uint256 prizePool, uint256 entryFee);
    event PlayerRegistered(uint256 indexed tournamentId, address indexed player);
    event TournamentStarted(uint256 indexed tournamentId);
    event TournamentCompleted(uint256 indexed tournamentId, address indexed winner, uint256 prize);
    event ChampionNFTMinted(uint256 indexed nftId, uint256 indexed tournamentId, address indexed winner, uint256 rank);
    
    constructor(address _characterNft, address _arenaToken) 
        ERC721("DuelCraft Champion", "CHAMPION") 
        Ownable(msg.sender) 
    {
        characterNft = _characterNft;
        arenaToken = IERC20(_arenaToken);
    }
    
    /**
     * @dev Create new tournament
     */
    function createTournament(
        string memory name,
        uint256 entryFee,
        uint256 prizePool,
        uint256 maxParticipants,
        uint256 registrationStart,
        uint256 registrationEnd,
        uint256 startTime,
        uint256 endTime
    ) external onlyOwner returns (uint256) {
        require(maxParticipants >= 2 && maxParticipants <= 256, "Invalid participant count");
        require(registrationEnd > registrationStart, "Invalid registration period");
        require(startTime > registrationEnd, "Invalid start time");
        require(endTime > startTime, "Invalid end time");
        
        uint256 tournamentId = nextTournamentId++;
        
        TournamentData storage tournament = tournaments[tournamentId];
        tournament.id = tournamentId;
        tournament.name = name;
        tournament.entryFee = entryFee;
        tournament.prizePool = prizePool;
        tournament.maxParticipants = maxParticipants;
        tournament.registrationStart = registrationStart;
        tournament.registrationEnd = registrationEnd;
        tournament.startTime = startTime;
        tournament.endTime = endTime;
        tournament.status = Status.UPCOMING;
        
        emit TournamentCreated(tournamentId, name, prizePool, entryFee);
        
        return tournamentId;
    }
    
    /**
     * @dev Register for tournament
     */
    function register(uint256 tournamentId) external nonReentrant {
        TournamentData storage tournament = tournaments[tournamentId];
        
        require(tournament.id != 0, "Tournament does not exist");
        require(block.timestamp >= tournament.registrationStart, "Registration not started");
        require(block.timestamp <= tournament.registrationEnd, "Registration ended");
        require(tournament.participants.length < tournament.maxParticipants, "Tournament full");
        require(!isRegistered[tournamentId][msg.sender], "Already registered");
        
        // Require owning a character NFT
        require(
            IERC721(characterNft).balanceOf(msg.sender) > 0,
            "Must own character NFT"
        );
        
        // Pay entry fee
        if (tournament.entryFee > 0) {
            require(
                arenaToken.transferFrom(msg.sender, address(this), tournament.entryFee),
                "Entry fee payment failed"
            );
            
            // Add to prize pool
            tournament.prizePool += tournament.entryFee;
        }
        
        // Register player
        tournament.participants.push(msg.sender);
        isRegistered[tournamentId][msg.sender] = true;
        
        // Auto-start registration if conditions met
        if (tournament.status == Status.UPCOMING) {
            tournament.status = Status.REGISTRATION;
        }
        
        emit PlayerRegistered(tournamentId, msg.sender);
    }
    
    /**
     * @dev Start tournament (owner/automated)
     */
    function startTournament(uint256 tournamentId) external onlyOwner {
        TournamentData storage tournament = tournaments[tournamentId];
        
        require(tournament.status == Status.REGISTRATION, "Cannot start");
        require(block.timestamp >= tournament.startTime, "Too early");
        require(tournament.participants.length >= 2, "Not enough participants");
        
        tournament.status = Status.ACTIVE;
        
        emit TournamentStarted(tournamentId);
    }
    
    /**
     * @dev Complete tournament and distribute prizes (owner/game server)
     */
    function completeTournament(
        uint256 tournamentId,
        address winner,
        address second,
        address third
    ) external onlyOwner nonReentrant {
        TournamentData storage tournament = tournaments[tournamentId];
        
        require(tournament.status == Status.ACTIVE, "Not active");
        require(isRegistered[tournamentId][winner], "Winner not registered");
        
        tournament.status = Status.COMPLETED;
        tournament.winner = winner;
        tournament.topThree = [winner, second, third];
        
        // Prize distribution (60% winner, 25% second, 15% third)
        uint256 firstPrize = (tournament.prizePool * 6000) / 10000;
        uint256 secondPrize = (tournament.prizePool * 2500) / 10000;
        uint256 thirdPrize = (tournament.prizePool * 1500) / 10000;
        
        // Distribute prizes
        if (firstPrize > 0) {
            arenaToken.transfer(winner, firstPrize);
        }
        if (secondPrize > 0 && second != address(0)) {
            arenaToken.transfer(second, secondPrize);
        }
        if (thirdPrize > 0 && third != address(0)) {
            arenaToken.transfer(third, thirdPrize);
        }
        
        // Mint champion NFTs for top 3
        _mintChampionNFT(tournamentId, winner, 1, tournament.name);
        if (second != address(0)) {
            _mintChampionNFT(tournamentId, second, 2, tournament.name);
        }
        if (third != address(0)) {
            _mintChampionNFT(tournamentId, third, 3, tournament.name);
        }
        
        emit TournamentCompleted(tournamentId, winner, firstPrize);
    }
    
    /**
     * @dev Mint champion NFT (internal)
     */
    function _mintChampionNFT(
        uint256 tournamentId,
        address winner,
        uint256 rank,
        string memory tournamentName
    ) internal {
        _championNftIds++;
        uint256 nftId = _championNftIds;
        
        _safeMint(winner, nftId);
        
        championNfts[nftId] = ChampionNFT({
            tournamentId: tournamentId,
            winner: winner,
            rank: rank,
            mintedAt: block.timestamp,
            tournamentName: tournamentName
        });
        
        emit ChampionNFTMinted(nftId, tournamentId, winner, rank);
    }
    
    /**
     * @dev Cancel tournament and refund (emergency)
     */
    function cancelTournament(uint256 tournamentId) external onlyOwner nonReentrant {
        TournamentData storage tournament = tournaments[tournamentId];
        
        require(
            tournament.status == Status.UPCOMING || tournament.status == Status.REGISTRATION,
            "Cannot cancel"
        );
        
        tournament.status = Status.CANCELLED;
        
        // Refund entry fees
        if (tournament.entryFee > 0) {
            for (uint256 i = 0; i < tournament.participants.length; i++) {
                arenaToken.transfer(tournament.participants[i], tournament.entryFee);
            }
        }
    }
    
    /**
     * @dev Get tournament participants
     */
    function getParticipants(uint256 tournamentId) external view returns (address[] memory) {
        return tournaments[tournamentId].participants;
    }
    
    /**
     * @dev Get player's champion NFTs
     */
    function getPlayerChampionNFTs(address player) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(player);
        uint256[] memory tokenIds = new uint256[](balance);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= _championNftIds && index < balance; i++) {
            try this.ownerOf(i) returns (address owner) {
                if (owner == player) {
                    tokenIds[index] = i;
                    index++;
                }
            } catch {
                // Token doesn't exist, skip
            }
        }
        
        return tokenIds;
    }
    
    /**
     * @dev Get upcoming/active tournaments
     */
    function getActiveTournaments() external view returns (TournamentData[] memory) {
        uint256 count = 0;
        
        // Count active tournaments
        for (uint256 i = 1; i < nextTournamentId; i++) {
            if (tournaments[i].status == Status.UPCOMING || 
                tournaments[i].status == Status.REGISTRATION ||
                tournaments[i].status == Status.ACTIVE) {
                count++;
            }
        }
        
        // Collect active tournaments
        TournamentData[] memory result = new TournamentData[](count);
        uint256 index = 0;
        
        for (uint256 i = 1; i < nextTournamentId; i++) {
            if (tournaments[i].status == Status.UPCOMING || 
                tournaments[i].status == Status.REGISTRATION ||
                tournaments[i].status == Status.ACTIVE) {
                result[index] = tournaments[i];
                index++;
            }
        }
        
        return result;
    }
    
    /**
     * @dev Fund prize pool (owner/sponsors)
     */
    function fundPrizePool(uint256 tournamentId, uint256 amount) external {
        require(tournaments[tournamentId].id != 0, "Tournament does not exist");
        require(
            arenaToken.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        tournaments[tournamentId].prizePool += amount;
    }
    
    /**
     * @dev Emergency withdraw (owner only)
     */
    function emergencyWithdraw(address to, uint256 amount) external onlyOwner {
        arenaToken.transfer(to, amount);
    }
}
