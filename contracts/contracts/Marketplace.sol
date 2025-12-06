// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Marketplace
 * @dev Marketplace for trading DuelCraft cosmetic NFTs (skins, accessories, etc.)
 * Supports buying, selling, and renting of cosmetic items
 */
contract Marketplace is Ownable, ReentrancyGuard {
    // Payment token (Arena Token)
    IERC20 public paymentToken;
    
    // Platform fee (in basis points, 250 = 2.5%)
    uint256 public platformFee;
    address public feeRecipient;
    
    // Listing structure
    struct Listing {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 price;
        bool isActive;
        bool isRental;
        uint256 rentalDuration; // in seconds (only for rentals)
    }
    
    // Rental structure
    struct Rental {
        address renter;
        uint256 listingId;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
    }
    
    // Listings
    uint256 public nextListingId = 1;
    mapping(uint256 => Listing) public listings;
    
    // Rentals
    uint256 public nextRentalId = 1;
    mapping(uint256 => Rental) public rentals;
    mapping(address => mapping(uint256 => uint256)) public activeRentals; // nft => tokenId => rentalId
    
    // Anti-bot: cooldown between purchases (prevents bot farming)
    mapping(address => uint256) public lastPurchaseTime;
    uint256 public purchaseCooldown = 5 minutes;
    
    // Events
    event Listed(uint256 indexed listingId, address indexed seller, address nftContract, uint256 tokenId, uint256 price, bool isRental);
    event Unlisted(uint256 indexed listingId);
    event Purchased(uint256 indexed listingId, address indexed buyer, uint256 price);
    event Rented(uint256 indexed rentalId, uint256 indexed listingId, address indexed renter, uint256 duration);
    event RentalEnded(uint256 indexed rentalId);
    
    constructor(address _paymentToken, uint256 _platformFee) Ownable(msg.sender) {
        paymentToken = IERC20(_paymentToken);
        platformFee = _platformFee;
        feeRecipient = msg.sender;
    }
    
    /**
     * @dev List NFT for sale
     */
    function listItem(
        address nftContract,
        uint256 tokenId,
        uint256 price
    ) external nonReentrant returns (uint256) {
        require(price > 0, "Price must be > 0");
        require(IERC721(nftContract).ownerOf(tokenId) == msg.sender, "Not owner");
        require(IERC721(nftContract).isApprovedForAll(msg.sender, address(this)), "Not approved");
        
        uint256 listingId = nextListingId++;
        
        listings[listingId] = Listing({
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            price: price,
            isActive: true,
            isRental: false,
            rentalDuration: 0
        });
        
        emit Listed(listingId, msg.sender, nftContract, tokenId, price, false);
        
        return listingId;
    }
    
    /**
     * @dev List NFT for rent
     */
    function listItemForRent(
        address nftContract,
        uint256 tokenId,
        uint256 pricePerDay,
        uint256 maxRentalDays
    ) external nonReentrant returns (uint256) {
        require(pricePerDay > 0, "Price must be > 0");
        require(maxRentalDays > 0 && maxRentalDays <= 30, "Invalid duration");
        require(IERC721(nftContract).ownerOf(tokenId) == msg.sender, "Not owner");
        require(IERC721(nftContract).isApprovedForAll(msg.sender, address(this)), "Not approved");
        
        uint256 listingId = nextListingId++;
        
        listings[listingId] = Listing({
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            price: pricePerDay,
            isActive: true,
            isRental: true,
            rentalDuration: maxRentalDays * 1 days
        });
        
        emit Listed(listingId, msg.sender, nftContract, tokenId, pricePerDay, true);
        
        return listingId;
    }
    
    /**
     * @dev Cancel listing
     */
    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.seller == msg.sender, "Not seller");
        require(listing.isActive, "Not active");
        
        listing.isActive = false;
        
        emit Unlisted(listingId);
    }
    
    /**
     * @dev Purchase NFT
     */
    function purchaseItem(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.isActive, "Not active");
        require(!listing.isRental, "Item is for rent only");
        require(msg.sender != listing.seller, "Cannot buy own item");
        
        // Anti-bot cooldown
        require(
            block.timestamp >= lastPurchaseTime[msg.sender] + purchaseCooldown,
            "Cooldown active"
        );
        lastPurchaseTime[msg.sender] = block.timestamp;
        
        uint256 price = listing.price;
        uint256 fee = (price * platformFee) / 10000;
        uint256 sellerAmount = price - fee;
        
        // Transfer payment
        require(
            paymentToken.transferFrom(msg.sender, feeRecipient, fee),
            "Fee transfer failed"
        );
        require(
            paymentToken.transferFrom(msg.sender, listing.seller, sellerAmount),
            "Payment transfer failed"
        );
        
        // Transfer NFT
        IERC721(listing.nftContract).safeTransferFrom(
            listing.seller,
            msg.sender,
            listing.tokenId
        );
        
        listing.isActive = false;
        
        emit Purchased(listingId, msg.sender, price);
    }
    
    /**
     * @dev Rent NFT
     */
    function rentItem(uint256 listingId, uint256 numDays) external nonReentrant returns (uint256) {
        Listing storage listing = listings[listingId];
        require(listing.isActive, "Not active");
        require(listing.isRental, "Not for rent");
        require(msg.sender != listing.seller, "Cannot rent own item");
        require(numDays > 0 && numDays * 1 days <= listing.rentalDuration, "Invalid duration");
        
        // Check no active rental
        uint256 existingRentalId = activeRentals[listing.nftContract][listing.tokenId];
        if (existingRentalId != 0) {
            Rental storage existingRental = rentals[existingRentalId];
            require(!existingRental.isActive || block.timestamp > existingRental.endTime, "Already rented");
            if (existingRental.isActive) {
                existingRental.isActive = false;
                emit RentalEnded(existingRentalId);
            }
        }
        
        uint256 totalPrice = listing.price * numDays;
        uint256 fee = (totalPrice * platformFee) / 10000;
        uint256 ownerAmount = totalPrice - fee;
        
        // Transfer payment
        require(
            paymentToken.transferFrom(msg.sender, feeRecipient, fee),
            "Fee transfer failed"
        );
        require(
            paymentToken.transferFrom(msg.sender, listing.seller, ownerAmount),
            "Payment transfer failed"
        );
        
        // Create rental
        uint256 rentalId = nextRentalId++;
        uint256 duration = numDays * 1 days;
        
        rentals[rentalId] = Rental({
            renter: msg.sender,
            listingId: listingId,
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            isActive: true
        });
        
        activeRentals[listing.nftContract][listing.tokenId] = rentalId;
        
        emit Rented(rentalId, listingId, msg.sender, duration);
        
        return rentalId;
    }
    
    /**
     * @dev Check if address can use rented NFT
     */
    function canUseRental(address nftContract, uint256 tokenId, address user) external view returns (bool) {
        uint256 rentalId = activeRentals[nftContract][tokenId];
        if (rentalId == 0) return false;
        
        Rental memory rental = rentals[rentalId];
        return rental.isActive && 
               rental.renter == user && 
               block.timestamp <= rental.endTime;
    }
    
    /**
     * @dev End expired rental (anyone can call)
     */
    function endRental(uint256 rentalId) external {
        Rental storage rental = rentals[rentalId];
        require(rental.isActive, "Not active");
        require(block.timestamp > rental.endTime, "Not expired");
        
        rental.isActive = false;
        
        Listing memory listing = listings[rental.listingId];
        delete activeRentals[listing.nftContract][listing.tokenId];
        
        emit RentalEnded(rentalId);
    }
    
    /**
     * @dev Update platform fee (owner only)
     */
    function setPlatformFee(uint256 _platformFee) external onlyOwner {
        require(_platformFee <= 1000, "Fee too high"); // Max 10%
        platformFee = _platformFee;
    }
    
    /**
     * @dev Update fee recipient (owner only)
     */
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        feeRecipient = _feeRecipient;
    }
    
    /**
     * @dev Update purchase cooldown (owner only)
     */
    function setPurchaseCooldown(uint256 _cooldown) external onlyOwner {
        require(_cooldown <= 1 hours, "Cooldown too long");
        purchaseCooldown = _cooldown;
    }
    
    /**
     * @dev Get active listings (paginated)
     */
    function getActiveListings(uint256 offset, uint256 limit) external view returns (Listing[] memory) {
        uint256 count = 0;
        for (uint256 i = 1; i < nextListingId && count < limit; i++) {
            if (listings[i].isActive) {
                if (count >= offset) {
                    count++;
                }
            }
        }
        
        Listing[] memory result = new Listing[](count);
        uint256 index = 0;
        count = 0;
        
        for (uint256 i = 1; i < nextListingId && index < result.length; i++) {
            if (listings[i].isActive) {
                if (count >= offset) {
                    result[index] = listings[i];
                    index++;
                }
                count++;
            }
        }
        
        return result;
    }
}
