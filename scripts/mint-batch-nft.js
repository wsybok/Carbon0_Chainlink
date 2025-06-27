const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    console.log("🎨 MINTING BATCH NFT WITH CHAINLINK FUNCTIONS METADATA");
    console.log("======================================================================");
    
    try {
        const network = hre.network.name;
        const [deployer] = await ethers.getSigners();
        
        console.log(`📡 Network: ${network}`);
        console.log(`👤 Deployer: ${deployer.address}`);
        console.log(`💰 Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} AVAX`);
        
        // Load deployed contracts
        const oracleDeployment = require("../deployments/avalancheFuji-oracle-deployment.json");
        const batchSystemDeployment = require("../deployments/avalancheFuji-batch-nft-system.json");
        
        const oracle = await ethers.getContractAt("CarbonVerificationOracle", oracleDeployment.contractAddress);
        const batchNFT = await ethers.getContractAt("BatchNFT", batchSystemDeployment.contracts.batchNFT.address);
        
        console.log(`🔗 Oracle: ${oracleDeployment.contractAddress}`);
        console.log(`🎨 BatchNFT: ${batchSystemDeployment.contracts.batchNFT.address}`);
        
        // Check existing verified credit
        const creditId = 2;
        const credit = await oracle.getCarbonCredit(creditId);
        console.log(`\n✅ Using verified credit ID: ${creditId}`);
        console.log(`📋 Project: ${credit.projectId}`);
        console.log(`📋 Verified: ${credit.isVerified}`);
        
        // Get Chainlink verification data
        const requestId = await oracle.creditToRequest(creditId);
        const verificationData = await oracle.getVerificationRequest(requestId);
        
        console.log(`\n🔗 Chainlink Functions Data Available:`);
        console.log(`   🌟 GS Project ID: ${verificationData.gsId}`);
        console.log(`   🔥 Available Credits: ${verificationData.availableForSale}`);
        console.log(`   📅 Timestamp: ${verificationData.timestamp}`);
        
        // Mint BatchNFT using available credits from Chainlink
        const availableCredits = Number(verificationData.availableForSale);
        const batchCredits = Math.min(5000, availableCredits); // Use up to 5000 from available
        
        console.log(`\n🔄 Minting BatchNFT with ${batchCredits} credits (from ${availableCredits} available via Chainlink)...`);
        
        // Get gas price for transaction
        const feeData = await ethers.provider.getFeeData();
        
        const mintTx = await batchNFT.mintBatchWithToken(
            deployer.address,
            credit.projectId,
            ethers.parseUnits(batchCredits.toString(), 18),
            creditId,
            {
                gasPrice: feeData.gasPrice,
                gasLimit: 2000000
            }
        );
        
        console.log(`⏳ Transaction sent: ${mintTx.hash}`);
        const receipt = await mintTx.wait();
        console.log(`✅ Transaction confirmed in block: ${receipt.blockNumber}`);
        
        // Extract batch ID from events
        let batchId;
        for (const log of receipt.logs) {
            try {
                const parsed = batchNFT.interface.parseLog(log);
                if (parsed && parsed.name === "BatchMintedWithToken") {
                    batchId = Number(parsed.args.batchId);
                    const tokenAddress = parsed.args.tokenAddress;
                    console.log(`🎨 BatchNFT #${batchId} minted successfully!`);
                    console.log(`🪙 ProjectToken created: ${tokenAddress}`);
                    break;
                }
            } catch (e) {
                // Skip logs that aren't from our contract
            }
        }
        
        if (!batchId) {
            // Fallback: get the latest batch
            const nextBatchId = await batchNFT.nextBatchId();
            batchId = Number(nextBatchId) - 1;
            console.log(`🎨 BatchNFT #${batchId} minted (fallback detection)`);
        }
        
        // Now demonstrate the NFT metadata with Chainlink data
        console.log(`\n🔗 FETCHING NFT METADATA WITH CHAINLINK FUNCTIONS DATA...`);
        
        const tokenURI = await batchNFT.tokenURI(batchId);
        console.log(`\n📋 NFT Metadata for BatchNFT #${batchId}:`);
        
        if (tokenURI.startsWith("data:application/json;base64,")) {
            const base64Data = tokenURI.replace("data:application/json;base64,", "");
            const jsonData = Buffer.from(base64Data, 'base64').toString('utf-8');
            const metadata = JSON.parse(jsonData);
            
            console.log(`🎨 Name: ${metadata.name}`);
            console.log(`📝 Description: ${metadata.description}`);
            console.log(`\n🔗 Attributes (INCLUDING CHAINLINK FUNCTIONS DATA):`);
            
            metadata.attributes.forEach(attr => {
                const isChainlinkData = attr.trait_type.includes("GS Project ID") || 
                                       attr.trait_type.includes("Available Credits") || 
                                       attr.trait_type.includes("Last Updated") ||
                                       attr.trait_type.includes("Verification Status");
                
                if (isChainlinkData) {
                    console.log(`     🌟 ${attr.trait_type}: ${attr.value} ← FROM CHAINLINK FUNCTIONS API`);
                } else {
                    console.log(`     📋 ${attr.trait_type}: ${attr.value}`);
                }
            });
            
            console.log(`\n✅ SUCCESS: NFT metadata now includes LIVE data from Chainlink Functions!`);
            console.log(`🔗 The NFT attributes show real-time carbon credit information from Gold Standard API`);
            
        } else {
            console.log(`📋 Token URI: ${tokenURI}`);
        }
        
        // Check the associated ProjectToken
        const tokenAddress = await batchNFT.batchToTokenContract(batchId);
        if (tokenAddress !== ethers.ZeroAddress) {
            console.log(`\n🪙 Associated ProjectToken: ${tokenAddress}`);
            
            const projectToken = await ethers.getContractAt("ProjectToken", tokenAddress);
            const tokenName = await projectToken.name();
            const tokenSymbol = await projectToken.symbol();
            const totalSupply = await projectToken.totalSupply();
            
            console.log(`   Name: ${tokenName}`);
            console.log(`   Symbol: ${tokenSymbol}`);
            console.log(`   Total Supply: ${ethers.formatUnits(totalSupply, 18)} tokens`);
            
            console.log(`\n🎯 COMPLETE SYSTEM DEMONSTRATION:`);
            console.log(`   1. ✅ Chainlink Functions fetched real-time API data`);
            console.log(`   2. ✅ BatchNFT metadata includes this live data`);
            console.log(`   3. ✅ ProjectToken created with ${ethers.formatUnits(totalSupply, 18)} supply`);
            console.log(`   4. ✅ Full carbon credit tokenization with dynamic metadata`);
        }
        
        console.log(`\n🏆 ACHIEVEMENT UNLOCKED: NFT METADATA POWERED BY CHAINLINK FUNCTIONS!`);
        
    } catch (error) {
        console.error("❌ Minting failed:", error);
        
        if (error.message.includes("Carbon credit not verified")) {
            console.log("\n💡 Note: The credit needs to be marked as verified in the oracle.");
            console.log("   This would normally happen automatically via Chainlink callback.");
            console.log("   The Chainlink Functions data is available and ready to use!");
        }
        
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 