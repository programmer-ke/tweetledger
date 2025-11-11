// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

contract SocialFeed {
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

    event PostCreated(uint256 id, string cid, address author, uint256 timestamp, bytes32 messageHash);

    function post(string memory message, string memory _cid) external {
        require(bytes(message).length > 0 && bytes(message).length <= 280, "Message must be 1-280 characters");

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

        emit PostCreated(id, _cid, msg.sender, block.timestamp, messageHash);
    }

    function computeMessageHash(
        string memory message,
        address author,
        uint256 timestamp
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(message, author, timestamp));
    }
}
