// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

contract SocialFeed {
    // State variables for linked list pointers
    uint256 public head = 0; // ID of the first post (oldest)
    uint256 public tail = 0; // ID of the latest post (newest)

    // Empty Post struct (to be expanded later)
    /*struct Post {
        // Placeholder: fields like id, author, etc., will be added
	}*/

    // Constructor (minimal, no params needed yet)
    //constructor() {}

    // Pure view function to get the tail ID (current latest post ID)
    function getHead() external pure returns (uint256) {
        return 0; // Initially 0; will be updated to return tail when list is populated
    }
}
