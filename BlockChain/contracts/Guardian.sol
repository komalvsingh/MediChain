// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Guardian {
    struct EmergencyRequest {
        address[] guardians;
        uint256 approvalsNeeded;
        uint256 unlockTime;
        bool executed;
        mapping(address => bool) approvals;
    }

    mapping(address => EmergencyRequest) public emergencyRequests;

    event UnlockRequested(address indexed patient, address[] guardians, uint256 approvalsNeeded);
    event UnlockApproved(address indexed patient, address indexed guardian);
    event UnlockExecuted(address indexed patient);

    function requestUnlock(address patient, address[] memory _guardians) external {
        require(_guardians.length >= 2, "Min 2 guardians");

        delete emergencyRequests[patient]; // Clear old request (incl. mapping)

        EmergencyRequest storage req = emergencyRequests[patient];
        req.guardians = _guardians;
        req.approvalsNeeded = (_guardians.length / 2) + 1;
        req.unlockTime = block.timestamp + 48 hours;
        req.executed = false;

        emit UnlockRequested(patient, _guardians, req.approvalsNeeded);
    }

    function approveUnlock(address patient) external {
        EmergencyRequest storage req = emergencyRequests[patient];
        require(!req.executed, "Already executed");
        require(block.timestamp < req.unlockTime, "Time expired");

        bool isGuardian = false;
        for (uint i = 0; i < req.guardians.length; i++) {
            if (req.guardians[i] == msg.sender) {
                isGuardian = true;
                break;
            }
        }
        require(isGuardian, "Not a guardian");

        require(!req.approvals[msg.sender], "Already approved");
        req.approvals[msg.sender] = true;
        emit UnlockApproved(patient, msg.sender);

        _checkApprovals(patient);
    }

    function _checkApprovals(address patient) private {
        EmergencyRequest storage req = emergencyRequests[patient];
        uint256 approvedCount;
        for (uint i = 0; i < req.guardians.length; i++) {
            if (req.approvals[req.guardians[i]]) {
                approvedCount++;
            }
        }
        if (approvedCount >= req.approvalsNeeded) {
            req.executed = true;
            emit UnlockExecuted(patient);
            // You can also call an external function here if needed
        }
    }
}
