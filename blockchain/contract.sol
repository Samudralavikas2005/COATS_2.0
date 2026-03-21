// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract COATSCustody {
    address public owner;

    struct LogAnchor {
        bytes32 logHash;
        string  caseId;
        string  crimeNumber;
        uint256 timestamp;
        address anchoredBy;
    }

    mapping(uint256 => LogAnchor) public anchors;
    uint256 public totalAnchors;

    event LogAnchored(
        uint256 indexed anchorId,
        bytes32 indexed logHash,
        string  caseId,
        string  crimeNumber,
        uint256 timestamp
    );

    constructor() {
        owner = msg.sender;
    }

    function anchorLog(
        bytes32 logHash,
        string memory caseId,
        string memory crimeNumber
    ) public returns (uint256) {
        uint256 anchorId = totalAnchors;
        anchors[anchorId] = LogAnchor({
            logHash:     logHash,
            caseId:      caseId,
            crimeNumber: crimeNumber,
            timestamp:   block.timestamp,
            anchoredBy:  msg.sender
        });
        totalAnchors++;
        emit LogAnchored(anchorId, logHash, caseId, crimeNumber, block.timestamp);
        return anchorId;
    }

    function verifyLog(bytes32 logHash) public view returns (bool exists, uint256 anchorId, uint256 timestamp) {
        for (uint256 i = 0; i < totalAnchors; i++) {
            if (anchors[i].logHash == logHash) {
                return (true, i, anchors[i].timestamp);
            }
        }
        return (false, 0, 0);
    }

    function getAnchor(uint256 anchorId) public view returns (
        bytes32 logHash,
        string memory caseId,
        string memory crimeNumber,
        uint256 timestamp,
        address anchoredBy
    ) {
        LogAnchor memory a = anchors[anchorId];
        return (a.logHash, a.caseId, a.crimeNumber, a.timestamp, a.anchoredBy);
    }
}
