// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract MedVault is AccessControl {
    bytes32 public constant DOCTOR_ROLE = keccak256("DOCTOR_ROLE");
    
    address public healthIDContract;
    address public guardianContract; // 🔧 NEW: Guardian contract reference
    
    mapping(address => string[]) private userReports;
    mapping(address => mapping(address => bool)) public doctorPermissions;
    mapping(address => mapping(address => bool)) public pendingAccessRequests;
    
    // 🔧 NEW: Emergency access tracking
    mapping(address => bool) public emergencyAccessActive;
    mapping(address => mapping(address => bool)) public emergencyAccessPermissions;
    
    event ReportUploaded(address indexed user, string ipfsHash);
    event AccessRequested(address indexed doctor, address indexed patient);
    event AccessApproved(address indexed doctor, address indexed patient, bool granted);
    event EmergencyAccessGranted(address indexed patient, address[] guardians);
    event EmergencyAccessRevoked(address indexed patient);
    
    constructor(address _healthIDContract, address _guardianContract) {
        healthIDContract = _healthIDContract;
        guardianContract = _guardianContract;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    // 🔧 NEW: Set guardian contract (if deployed separately)
    function setGuardianContract(address _guardianContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        guardianContract = _guardianContract;
    }
    
    function uploadReport(string memory _ipfsHash) external {
        require(IERC721(healthIDContract).balanceOf(msg.sender) > 0, "No HealthID");
        userReports[msg.sender].push(_ipfsHash);
        emit ReportUploaded(msg.sender, _ipfsHash);
    }
    
    function requestAccess(address patient) external {
        require(patient != address(0), "Invalid patient address");
        require(msg.sender != patient, "Cannot request access to own records");
        require(!doctorPermissions[patient][msg.sender], "Access already granted");
        
        pendingAccessRequests[patient][msg.sender] = true;
        emit AccessRequested(msg.sender, patient);
    }
    
    function approveAccess(address doctor, bool grant) external {
        require(doctor != address(0), "Invalid doctor address");
        require(pendingAccessRequests[msg.sender][doctor], "No pending request from this doctor");
        
        doctorPermissions[msg.sender][doctor] = grant;
        pendingAccessRequests[msg.sender][doctor] = false;
        
        emit AccessApproved(doctor, msg.sender, grant);
    }
    
    function revokeAccess(address doctor) external {
        require(doctor != address(0), "Invalid doctor address");
        doctorPermissions[msg.sender][doctor] = false;
        emit AccessApproved(doctor, msg.sender, false);
    }
    
    // 🔧 NEW: Emergency access functions
    function grantEmergencyAccess(address patient, address[] memory guardians) external {
        require(msg.sender == guardianContract, "Only guardian contract can call");
        
        emergencyAccessActive[patient] = true;
        
        // Grant access to all guardians
        for (uint i = 0; i < guardians.length; i++) {
            emergencyAccessPermissions[patient][guardians[i]] = true;
        }
        
        emit EmergencyAccessGranted(patient, guardians);
    }
    
    // 🔧 NEW: Patient can revoke emergency access when they recover
    function revokeEmergencyAccess() external {
        require(emergencyAccessActive[msg.sender], "No emergency access active");
        
        // Get guardians from guardian contract and revoke their access
        (bool success, bytes memory data) = guardianContract.call(
            abi.encodeWithSignature("getGuardians(address)", msg.sender)
        );
        
        if (success) {
            address[] memory guardians = abi.decode(data, (address[]));
            for (uint i = 0; i < guardians.length; i++) {
                emergencyAccessPermissions[msg.sender][guardians[i]] = false;
            }
        }
        
        emergencyAccessActive[msg.sender] = false;
        emit EmergencyAccessRevoked(msg.sender);
    }
    
    // 🔧 NEW: Check if someone has emergency access
    function hasEmergencyAccess(address patient, address accessor) external view returns (bool) {
        return emergencyAccessActive[patient] && emergencyAccessPermissions[patient][accessor];
    }
    
    function hasPendingRequest(address patient, address doctor) external view returns (bool) {
        return pendingAccessRequests[patient][doctor];
    }
    
    function getPendingRequestStatus(address patient, address doctor) external view returns (bool pending, bool granted) {
        return (pendingAccessRequests[patient][doctor], doctorPermissions[patient][doctor]);
    }
    
    // 🔧 UPDATED: Modified to include emergency access
    function getReports(address patient) external view returns (string[] memory) {
        require(
            msg.sender == patient || 
            doctorPermissions[patient][msg.sender] || 
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender) ||
            (emergencyAccessActive[patient] && emergencyAccessPermissions[patient][msg.sender]), // 🔧 NEW: Emergency access
            "Unauthorized access"
        );
        return userReports[patient];
    }
    
    // 🔧 UPDATED: Modified to include emergency access
    function getReportCount(address patient) external view returns (uint256) {
        require(
            msg.sender == patient || 
            doctorPermissions[patient][msg.sender] || 
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender) ||
            (emergencyAccessActive[patient] && emergencyAccessPermissions[patient][msg.sender]), // 🔧 NEW: Emergency access
            "Unauthorized access"
        );
        return userReports[patient].length;
    }
    
    // 🔧 UPDATED: Modified to include emergency access
    function getReportByIndex(address patient, uint256 index) external view returns (string memory) {
        require(
            msg.sender == patient || 
            doctorPermissions[patient][msg.sender] || 
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender) ||
            (emergencyAccessActive[patient] && emergencyAccessPermissions[patient][msg.sender]), // 🔧 NEW: Emergency access
            "Unauthorized access"
        );
        require(index < userReports[patient].length, "Report index out of bounds");
        return userReports[patient][index];
    }
    
    // 🔧 NEW: Admin function to grant DOCTOR_ROLE (if needed for other features)
    function grantDoctorRole(address doctor) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(DOCTOR_ROLE, doctor);
    }
    
    // 🔧 NEW: Admin function to revoke DOCTOR_ROLE
    function revokeDoctorRole(address doctor) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(DOCTOR_ROLE, doctor);
    }
}