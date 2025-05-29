// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IMedVault {
    function grantEmergencyAccess(address patient, address[] memory guardians) external;
    function hasEmergencyAccess(address patient, address accessor) external view returns (bool);
}

contract Guardian { 
    struct EmergencyRequest {
        address[] guardians;
        uint256 approvalsNeeded;
        uint256 unlockTime;
        bool executed;
        mapping(address => bool) approvals;
        uint256 approvalCount; // 🔧 FIX: Track approval count properly
    }

    mapping(address => EmergencyRequest) public emergencyRequests;
    mapping(address => address[]) public patientGuardians; // 🔧 NEW: Store guardians per patient
    
    address public medVaultContract; // 🔧 NEW: Reference to MedVault
    
    event GuardiansAssigned(address indexed patient, address[] guardians);
    event UnlockRequested(address indexed patient, address[] guardians, uint256 approvalsNeeded);
    event UnlockApproved(address indexed patient, address indexed guardian);
    event UnlockExecuted(address indexed patient);

    // 🔧 NEW: Set MedVault contract address
    function setMedVaultContract(address _medVaultContract) external {
        require(medVaultContract == address(0), "Already set");
        medVaultContract = _medVaultContract;
    }
    
    // 🔧 NEW: Patients assign their guardians first
    function assignGuardians(address[] memory _guardians) external {
        require(_guardians.length >= 2, "Min 2 guardians");
        require(_guardians.length <= 10, "Max 10 guardians");
        
        // Validate guardians
        for (uint i = 0; i < _guardians.length; i++) {
            require(_guardians[i] != address(0), "Invalid guardian");
            require(_guardians[i] != msg.sender, "Cannot be own guardian");
        }
        
        patientGuardians[msg.sender] = _guardians;
        emit GuardiansAssigned(msg.sender, _guardians);
    }

    // 🔧 FIXED: Only guardians can request unlock
    function requestUnlock(address patient) external {
        require(patientGuardians[patient].length >= 2, "No guardians assigned");
        
        // Check if caller is a guardian
        bool isGuardian = false;
        address[] memory guardians = patientGuardians[patient];
        for (uint i = 0; i < guardians.length; i++) {
            if (guardians[i] == msg.sender) {
                isGuardian = true;
                break;
            }
        }
        require(isGuardian, "Not a guardian");
        
        // Clear old request
        _clearOldRequest(patient);

        EmergencyRequest storage req = emergencyRequests[patient];
        req.guardians = guardians;
        req.approvalsNeeded = (guardians.length / 2) + 1;
        req.unlockTime = block.timestamp + 48 hours;
        req.executed = false;
        req.approvalCount = 0; // 🔧 FIX: Initialize count

        emit UnlockRequested(patient, guardians, req.approvalsNeeded);
    }

    function approveUnlock(address patient) external {
        EmergencyRequest storage req = emergencyRequests[patient];
        require(req.guardians.length > 0, "No active request"); // 🔧 FIX: Better check
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
        req.approvalCount++; // 🔧 FIX: Increment count
        emit UnlockApproved(patient, msg.sender);

        _checkApprovals(patient);
    }

    function _checkApprovals(address patient) private {
        EmergencyRequest storage req = emergencyRequests[patient];
        
        if (req.approvalCount >= req.approvalsNeeded) {
            req.executed = true;
            emit UnlockExecuted(patient);
            
            // 🔧 NEW: Grant emergency access in MedVault
            if (medVaultContract != address(0)) {
                IMedVault(medVaultContract).grantEmergencyAccess(patient, req.guardians);
            }
        }
    }
    
    // 🔧 NEW: Clear old request data
    function _clearOldRequest(address patient) private {
        EmergencyRequest storage req = emergencyRequests[patient];
        if (req.guardians.length > 0) {
            // Clear all approvals
            for (uint i = 0; i < req.guardians.length; i++) {
                req.approvals[req.guardians[i]] = false;
            }
        }
        delete emergencyRequests[patient];
    }
    
    // 🔧 NEW: View functions
    function getGuardians(address patient) external view returns (address[] memory) {
        return patientGuardians[patient];
    }
    
    function getRequestStatus(address patient) external view returns (
        uint256 approvalsNeeded,
        uint256 currentApprovals,
        uint256 unlockTime,
        bool executed,
        bool active
    ) {
        EmergencyRequest storage req = emergencyRequests[patient];
        return (
            req.approvalsNeeded,
            req.approvalCount,
            req.unlockTime,
            req.executed,
            req.guardians.length > 0 && !req.executed && block.timestamp < req.unlockTime
        );
    }
    
    function hasApproved(address patient, address guardian) external view returns (bool) {
        return emergencyRequests[patient].approvals[guardian];
    }
}