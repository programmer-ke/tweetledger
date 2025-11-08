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
    }

    mapping(uint256 => Post) public posts;

    event PostCreated(uint256 id);

    function post(string memory message) external {
        require(bytes(message).length > 0 && bytes(message).length <= 280, "Message must be 1-280 characters");

        uint256 id = nextId++;
        posts[id] = Post({
            id: id,
            author: msg.sender,
            timestamp: block.timestamp,
            prevId: tail
        });

        if (tail == 0) {
            head = id; // First post
        }
        tail = id;

        emit PostCreated(id);
    }
}
