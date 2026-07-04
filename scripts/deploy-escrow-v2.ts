import fs from "fs";
import path from "path";
import solc from "solc";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { activeChain, ARC_RPC_URL, USDC_ADDRESS } from "../src/lib/chain.js";

const contractSource = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract JuriXEscrow {
    address public operator;
    address public feeCollector;
    address public usdcToken;

    struct Hackathon {
        address hoster;
        uint256 prizePool;
        uint256 platformFee;
        bool disbursed; // Also represents refunded/finalized
        bool exists;
    }

    mapping(string => Hackathon) public hackathons;

    event EscrowRegistered(string hackathonId, address hoster, uint256 prizePool, uint256 platformFee);
    event EscrowDisbursed(string hackathonId, address[] winners, uint256[] amounts);
    event EscrowRefunded(string hackathonId, address hoster, uint256 amount);

    constructor(address _usdcToken, address _feeCollector) {
        operator = msg.sender;
        feeCollector = _feeCollector;
        usdcToken = _usdcToken;
    }

    modifier onlyOperator() {
        require(msg.sender == operator, "Only operator can call");
        _;
    }

    function registerHackathon(
        string memory hackathonId,
        address hoster,
        uint256 prizePool,
        uint256 platformFee
    ) external onlyOperator {
        require(!hackathons[hackathonId].exists, "Already registered");

        hackathons[hackathonId] = Hackathon(hoster, prizePool, platformFee, false, true);

        if (platformFee > 0) {
            require(IERC20(usdcToken).transfer(feeCollector, platformFee), "Platform fee transfer failed");
        }

        emit EscrowRegistered(hackathonId, hoster, prizePool, platformFee);
    }

    function disbursePrizes(
        string memory hackathonId,
        address[] calldata winners,
        uint256[] calldata amounts
    ) external onlyOperator {
        Hackathon storage h = hackathons[hackathonId];
        require(h.exists, "Hackathon does not exist");
        require(!h.disbursed, "Already finalized");
        
        uint256 total;
        for (uint256 i = 0; i < winners.length; i++) {
            total += amounts[i];
            require(IERC20(usdcToken).transfer(winners[i], amounts[i]), "Transfer to winner failed");
        }
        require(total <= h.prizePool, "Amount exceeds prize pool");
        
        h.disbursed = true;
        emit EscrowDisbursed(hackathonId, winners, amounts);
    }

    function cancelAndRefund(string memory hackathonId) external onlyOperator {
        Hackathon storage h = hackathons[hackathonId];
        require(h.exists, "Hackathon does not exist");
        require(!h.disbursed, "Already finalized");
        require(h.hoster != address(0), "Invalid hoster address");

        uint256 refundAmount = h.prizePool;
        h.disbursed = true; // Mark as finalized to prevent double-spending

        if (refundAmount > 0) {
            require(IERC20(usdcToken).transfer(h.hoster, refundAmount), "Refund transfer failed");
        }

        emit EscrowRefunded(hackathonId, h.hoster, refundAmount);
    }
}
`;

async function main() {
  const privateKey = process.env.JURIX_OPERATOR_PRIVATE_KEY;
  const feeCollector = process.env.JURIX_FEE_COLLECTOR || "0x5A305347b6BC3469505886d87D41C5EFC1A5E979"; // Fallback to operator address
  if (!privateKey) {
    console.error("Missing JURIX_OPERATOR_PRIVATE_KEY");
    process.exit(1);
  }
  const formattedKey = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  const account = privateKeyToAccount(formattedKey);

  console.log("Compiling JuriXEscrow v2 Solidity contract...");
  const input = {
    language: "Solidity",
    sources: {
      "JuriXEscrow.sol": {
        content: contractSource,
      },
    },
    settings: {
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode"],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const contract = output.contracts["JuriXEscrow.sol"]["JuriXEscrow"];
  const abi = contract.abi;
  const bytecode = contract.evm.bytecode.object;

  console.log("Compilation complete. Deploying v2 contract to Arc Testnet...");
  console.log(`USDC Token: ${USDC_ADDRESS}`);
  console.log(`Fee Collector: ${feeCollector}`);

  const walletClient = createWalletClient({
    account,
    chain: activeChain,
    transport: http(ARC_RPC_URL),
  });

  const publicClient = createPublicClient({
    chain: activeChain,
    transport: http(ARC_RPC_URL),
  });

  const hash = await walletClient.deployContract({
    abi,
    bytecode: `0x${bytecode}`,
    args: [USDC_ADDRESS, feeCollector],
  });

  console.log(`Deployment transaction sent. Hash: ${hash}`);
  console.log("Waiting for confirmation...");
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const contractAddress = receipt.contractAddress;
  console.log(`\n🎉 JuriXEscrow v2 contract deployed at: ${contractAddress}\n`);

  // Write contract details back to a file we can read
  fs.writeFileSync(
    path.join(process.cwd(), "scripts/contract-details.json"),
    JSON.stringify({ address: contractAddress, abi }, null, 2)
  );
  console.log("Saved contract address and ABI to scripts/contract-details.json");
}

main().catch(console.error);
