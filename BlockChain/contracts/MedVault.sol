// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract MedVault is AccessControl {
    bytes32 public constant DOCTOR_ROLE = keccak256("DOCTOR_ROLE");
    
    address public healthIDContract;
    
    mapping(address => string[]) private userReports;
    mapping(address => mapping(address => bool)) public doctorPermissions;
    
    // 🔧 NEW: Track pending access requests
    mapping(address => mapping(address => bool)) public pendingAccessRequests;
    
    event ReportUploaded(address indexed user, string ipfsHash);
    event AccessRequested(address indexed doctor, address indexed patient);
    event AccessApproved(address indexed doctor, address indexed patient, bool granted);
    
    constructor(address _healthIDContract) {
        healthIDContract = _healthIDContract;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    function uploadReport(string memory _ipfsHash) external {
        require(IERC721(healthIDContract).balanceOf(msg.sender) > 0, "No HealthID");
        userReports[msg.sender].push(_ipfsHash);
        emit ReportUploaded(msg.sender, _ipfsHash);
    }
    
    // 🔧 FIXED: Remove DOCTOR_ROLE requirement - anyone can request access
    function requestAccess(address patient) external {
        require(patient != address(0), "Invalid patient address");
        require(msg.sender != patient, "Cannot request access to own records");
        require(!doctorPermissions[patient][msg.sender], "Access already granted");
        
        pendingAccessRequests[patient][msg.sender] = true;
        emit AccessRequested(msg.sender, patient);
    }
    
    // 🔧 ENHANCED: Approve access function with pending request check
    function approveAccess(address doctor, bool grant) external {
        require(doctor != address(0), "Invalid doctor address");
        require(pendingAccessRequests[msg.sender][doctor], "No pending request from this doctor");
        
        doctorPermissions[msg.sender][doctor] = grant;
        
        // Clear the pending request
        pendingAccessRequests[msg.sender][doctor] = false;
        
        emit AccessApproved(doctor, msg.sender, grant);
    }
    
    // 🔧 NEW: Allow patients to revoke access anytime
    function revokeAccess(address doctor) external {
        require(doctor != address(0), "Invalid doctor address");
        doctorPermissions[msg.sender][doctor] = false;
        emit AccessApproved(doctor, msg.sender, false);
    }
    
    // 🔧 NEW: Check if there's a pending access request
    function hasPendingRequest(address patient, address doctor) external view returns (bool) {
        return pendingAccessRequests[patient][doctor];
    }
    
    // 🔧 NEW: Get all pending requests for a patient (helper function)
    function getPendingRequestStatus(address patient, address doctor) external view returns (bool pending, bool granted) {
        return (pendingAccessRequests[patient][doctor], doctorPermissions[patient][doctor]);
    }
    
    function getReports(address patient) external view returns (string[] memory) {
        require(
            msg.sender == patient || 
            doctorPermissions[patient][msg.sender] || 
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Unauthorized access"
        );
        return userReports[patient];
    }
    
    function getReportCount(address patient) external view returns (uint256) {
        require(
            msg.sender == patient || 
            doctorPermissions[patient][msg.sender] || 
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Unauthorized access"
        );
        return userReports[patient].length;
    }
    
    function getReportByIndex(address patient, uint256 index) external view returns (string memory) {
        require(
            msg.sender == patient || 
            doctorPermissions[patient][msg.sender] || 
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
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