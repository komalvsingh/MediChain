const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  // Use existing HealthID address
  const EXISTING_HEALTH_ID = "0x0926920E743431343D90edA86F1B276350DA5A89";
  
  console.log("Redeploying MedVault with updated contract...");
  console.log(`Using existing HealthID at: ${EXISTING_HEALTH_ID}`);
  
  // Deploy updated MedVault with existing HealthID address
  const MedVault = await hre.ethers.getContractFactory("MedVault");
  console.log("Deploying updated MedVault...");
  const medVault = await MedVault.deploy(EXISTING_HEALTH_ID);
  await medVault.waitForDeployment();
  const medVaultAddress = await medVault.getAddress();
  
  console.log(`✅ Updated MedVault deployed at: ${medVaultAddress}`);
  
  // Summary with all addresses
  console.log("\n=== Updated Deployment ===");
  console.log(`HealthID  : ${EXISTING_HEALTH_ID} (unchanged)`);
  console.log(`MedVault  : ${medVaultAddress} (NEW - updated)`);
  console.log(`Guardian  : 0xf2f2612cFE7120cf6E8a99fe49A53220A5af8D6E (unchanged)`);
  console.log("===========================\n");
  
  console.log("⚠️  IMPORTANT: Update your frontend to use the new MedVault address!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Redeployment failed:", error);
    process.exit(1);
  });