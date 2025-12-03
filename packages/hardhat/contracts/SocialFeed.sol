// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract SocialFeed is Ownable {
    constructor(address initialOwner) Ownable(initialOwner) {}

    // State variables for linked list pointers
    uint256 public head = 0; // ID of the first post (oldest)
    uint256 public tail = 0; // ID of the latest post (newest)
    uint256 public nextId = 1; // Counter for post IDs

    struct Post {
        uint256 id;
        address author;
        uint256 timestamp;
        uint256 prevId; // Previous post ID in the linked list
        string cid; // CID of the post content on IPFS
        bytes32 messageHash; // Hash of the message, author, and timestamp
    }

    mapping(uint256 => Post) public posts;

    event PostCreated(uint256 id, string cid, address author, uint256 prevId, uint256 timestamp, bytes32 messageHash);

    function post(string memory message, string memory _cid) external {
        require(bytes(message).length > 0 && bytes(message).length <= 280, "Message must be 1-280 characters");
        require(bytes(_cid).length > 0 && bytes(_cid).length <= 100, "CID must be 1-100 chars");

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
}
