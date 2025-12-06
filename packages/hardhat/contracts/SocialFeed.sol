// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract SocialFeed is Ownable {
    constructor(address initialOwner) Ownable(initialOwner) {
        admins[initialOwner] = true;
    }

    // State variables for linked list pointers
    uint256 public head = 0; // ID of the first post (oldest)
    uint256 public tail = 0; // ID of the latest post (newest)
    uint256 public nextId = 1; // Counter for post IDs

    mapping(address => bool) public admins;

    // admins can update the following
    uint256 public usdPricePerEth = 2500;
    uint256 public winnersPerRound = 3;
    uint256 public usdCentsPerPost = 10; // Cost in USD cents per post
    uint256 public userRewardPercentage = 50; // Reward percentage for users (0-100)

    struct Post {
        uint256 id;
        address author;
        uint256 timestamp;
        uint256 prevId; // Previous post ID in the linked list
        string cid; // CID of the post content on IPFS
        bytes32 messageHash; // Hash of the message, author, and timestamp
    }

    mapping(uint256 => Post) public posts;

    // user rewards tracking
    uint256 public rewardPeriodId = 1;

    struct UserPeriodData {
        uint256 count;
        uint256 latestTimestamp;
    }

    mapping(uint256 => mapping(address => UserPeriodData)) public userPostCount;
    mapping(uint256 => address[]) public periodUsers;

    struct AwardRecord {
        uint256 timestamp;
        uint256 periodId;
        address[] addresses;
        uint256[] amounts; // Awarded amount per address
        uint256[] postCounts; // Number of posts per address
    }

    AwardRecord[] public awardHistory;

    event PostCreated(uint256 id, string cid, address author, uint256 prevId, uint256 timestamp, bytes32 messageHash);

    modifier onlyAdmin() {
        require(admins[msg.sender], "Only admin");
        _;
    }

    function addAdmin(address _admin) external onlyOwner {
        admins[_admin] = true;
    }

    function removeAdmin(address _admin) external onlyOwner {
        admins[_admin] = false;
    }

    function setUsdPricePerEth(uint256 _price) external onlyAdmin {
        usdPricePerEth = _price;
    }

    function setWinnersPerRound(uint256 _numWinners) external onlyAdmin {
        winnersPerRound = _numWinners;
    }

    function setUsdCentsPerPost(uint256 _cents) external onlyAdmin {
        usdCentsPerPost = _cents;
    }

    function setUserRewardPercentage(uint256 _percentage) external onlyAdmin {
        require(_percentage <= 100, "Percentage must be <= 100");
        userRewardPercentage = _percentage;
    }

    function distributeRewards(address[] memory winners, uint256[] memory postCounts) external onlyAdmin {
        // Checks
        require(winners.length == postCounts.length, "Winners and postCounts length mismatch");
        require(winners.length > 0, "No winners to distribute");

        uint256 totalBalance = address(this).balance;
        uint256 rewardPortion = (totalBalance * userRewardPercentage) / 100;
        uint256 perWinner = rewardPortion / winners.length;

        // Effects: Update state first
        uint256[] memory amounts = new uint256[](winners.length);
        for (uint256 i = 0; i < winners.length; i++) {
            amounts[i] = perWinner;
        }

        awardHistory.push(AwardRecord({
            timestamp: block.timestamp,
            periodId: rewardPeriodId,
            addresses: winners,
            amounts: amounts,
            postCounts: postCounts
        }));

        rewardPeriodId++;

        // Interactions: External calls last
        for (uint256 i = 0; i < winners.length; i++) {
            (bool success,) = payable(winners[i]).call{value: perWinner}("");
            require(success, "Reward transfer failed");
        }

        uint256 remaining = totalBalance - rewardPortion;
        if (remaining > 0) {
            (bool success,) = payable(owner()).call{value: remaining}("");
            require(success, "Owner transfer failed");
        }
    }

    function post(string memory message, string memory _cid) external payable {
        require(bytes(message).length > 0 && bytes(message).length <= 280, "Message must be 1-280 characters");
        require(bytes(_cid).length > 0 && bytes(_cid).length <= 100, "CID must be 1-100 chars");
        require(msg.value >= getPostCostInWei(), "Insufficient payment for post");

        uint256 id = nextId++;
        bytes32 messageHash = computeMessageHash(message, msg.sender, block.timestamp);
        posts[id] = Post({
            id: id,
            author: msg.sender,
            timestamp: block.timestamp,
            prevId: tail,
            cid: _cid,
            messageHash: messageHash
        });

        if (tail == 0) {
            head = id; // First post
        }
        tail = id;

	// increment posting count for this reward period
	userPostCount[rewardPeriodId][msg.sender].count++;
	userPostCount[rewardPeriodId][msg.sender].latestTimestamp = block.timestamp;

        if (userPostCount[rewardPeriodId][msg.sender].count == 1) {
            periodUsers[rewardPeriodId].push(msg.sender);
        }

        emit PostCreated(id, _cid, msg.sender, tail - 1, block.timestamp, messageHash);
    }

    function computeMessageHash(
        string memory message,
        address author,
        uint256 timestamp
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(message, author, timestamp));
    }

    function getPosts(uint256 startId, uint256 count) external view returns (Post[] memory) {
        require(startId >= 0 && startId <= tail, "Start ID does not exist");

        Post[] memory result = new Post[](count);
        uint256 currentId = startId;
        uint256 index = 0;

        while (currentId != 0 && index < count) {
            result[index] = posts[currentId];
            currentId = posts[currentId].prevId;
            index++;
        }

        // Resize array if fewer posts than count
        if (index < count) {
            assembly {
                mstore(result, index)
            }
        }

        return result;
    }

    function getPeriodData(uint256 periodId) external view returns (address[] memory users, UserPeriodData[] memory data) {
        users = periodUsers[periodId];
        data = new UserPeriodData[](users.length);
        for (uint256 i = 0; i < users.length; i++) {
            data[i] = userPostCount[periodId][users[i]];
        }
    }

    function getPostCostInWei() public view returns (uint256) {
        require(usdPricePerEth > 0, "USD price per ETH must be > 0");
        return (usdCentsPerPost * 1e18) / (100 * usdPricePerEth);
    }

    function getLastAwardRecords(uint256 count) external view returns (AwardRecord[] memory) {
        uint256 historyLength = awardHistory.length;
        uint256 start = count > historyLength ? 0 : historyLength - count;
        uint256 resultLength = historyLength - start;
        AwardRecord[] memory result = new AwardRecord[](resultLength);
        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = awardHistory[start + i];
        }
        return result;
    }

    function getAwardHistoryLength() public view returns (uint256) {
        return awardHistory.length;
    }

    function withdraw(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= address(this).balance, "Insufficient contract balance");
        (bool success,) = payable(owner()).call{value: amount}("");
        require(success, "Withdrawal failed");
    }

    receive() external payable {}
}
