// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract MedVault is AccessControl {
    bytes32 public constant DOCTOR_ROLE = keccak256("DOCTOR_ROLE");
    
    address public healthIDContract;
    
    mapping(address => string[]) private userReports;
    mapping(address => mapping(address => bool)) public doctorPermissions;
    
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
    
    function requestAccess(address patient) external onlyRole(DOCTOR_ROLE) {
        emit AccessRequested(msg.sender, patient);
    }
    
    function approveAccess(address doctor, bool grant) external {
        doctorPermissions[msg.sender][doctor] = grant;
        emit AccessApproved(doctor, msg.sender, grant);
    }
    
    // 🔧 MISSING FUNCTION - Add this to retrieve reports
    function getReports(address patient) external view returns (string[] memory) {
        require(
            msg.sender == patient || 
            doctorPermissions[patient][msg.sender] || 
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Unauthorized access"
        );
        return userReports[patient];
    }
    
    // 🔧 ADDITIONAL HELPER - Get report count
    function getReportCount(address patient) external view returns (uint256) {
        require(
            msg.sender == patient || 
            doctorPermissions[patient][msg.sender] || 
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Unauthorized access"
        );
        return userReports[patient].length;
    }
    
    // 🔧 ADDITIONAL HELPER - Get specific report by index
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
}