const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  // Use existing HealthID address
  const EXISTING_HEALTH_ID = "0x0926920E743431343D90edA86F1B276350DA5A89";
  
  console.log("🚀 Deploying MedVault with Guardian System...");
  console.log(`📋 Using deployer: ${deployer.address}`);
  console.log(`🏥 Using existing HealthID at: ${EXISTING_HEALTH_ID}`);
  
  // Step 1: Deploy Guardian contract first
  console.log("\n📦 Step 1: Deploying Guardian contract...");
  const Guardian = await hre.ethers.getContractFactory("Guardian");
  const guardian = await Guardian.deploy();
  await guardian.waitForDeployment();
  const guardianAddress = await guardian.getAddress();
  console.log(`✅ Guardian deployed at: ${guardianAddress}`);
  
  // Step 2: Deploy MedVault with Guardian address
  console.log("\n📦 Step 2: Deploying MedVault with Guardian integration...");
  const MedVault = await hre.ethers.getContractFactory("MedVault");
  const medVault = await MedVault.deploy(EXISTING_HEALTH_ID, guardianAddress);
  await medVault.waitForDeployment();
  const medVaultAddress = await medVault.getAddress();
  console.log(`✅ MedVault deployed at: ${medVaultAddress}`);
  
  // Step 3: Connect Guardian to MedVault
  console.log("\n🔗 Step 3: Connecting Guardian to MedVault...");
  const setMedVaultTx = await guardian.setMedVaultContract(medVaultAddress);
  await setMedVaultTx.wait();
  console.log("✅ Guardian connected to MedVault");
  
  // Step 4: Verify integration
  console.log("\n🔍 Step 4: Verifying integration...");
  const guardianContractInMedVault = await medVault.guardianContract();
  const medVaultContractInGuardian = await guardian.medVaultContract();
  
  if (guardianContractInMedVault === guardianAddress && medVaultContractInGuardian === medVaultAddress) {
    console.log("✅ Integration verified - contracts properly linked");
  } else {
    console.log("❌ Integration verification failed");
    console.log(`Expected Guardian in MedVault: ${guardianAddress}, Got: ${guardianContractInMedVault}`);
    console.log(`Expected MedVault in Guardian: ${medVaultAddress}, Got: ${medVaultContractInGuardian}`);
  }
  
  // Summary with all addresses
  console.log("\n🎉 === DEPLOYMENT COMPLETE ===");
  console.log(`HealthID  : ${EXISTING_HEALTH_ID} (existing)`);
  console.log(`Guardian  : ${guardianAddress} (NEW)`);
  console.log(`MedVault  : ${medVaultAddress} (NEW - with Guardian)`);
  console.log("==============================");
  
  console.log("\n📋 Next Steps:");
  console.log("1. Update your frontend with new contract addresses");
  console.log("2. Patients can now assign guardians using Guardian.assignGuardians()");
  console.log("3. In emergencies, guardians can request unlock via Guardian.requestUnlock()");
  console.log("4. Emergency access works automatically once majority guardians approve");
  
  console.log("\n🔧 Contract Functions Available:");
  console.log("Guardian Contract:");
  console.log("  - assignGuardians(address[] guardians)");
  console.log("  - requestUnlock(address patient)");
  console.log("  - approveUnlock(address patient)");
  console.log("  - getGuardians(address patient)");
  console.log("  - getRequestStatus(address patient)");
  
  console.log("\nMedVault Contract (All original + new):");
  console.log("  - All original functions work unchanged");
  console.log("  - grantEmergencyAccess() - called by Guardian");
  console.log("  - revokeEmergencyAccess() - patient revokes when recovered");
  console.log("  - hasEmergencyAccess() - check emergency permissions");
}

main()
  .then(() => {
    console.log("\n🎯 Deployment successful!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });