import {
  formatEther,
  parseEther,
  Hex,
  hexToString,
  http,
} from "viem";
import { abi, bytecode } from "../artifacts/contracts/MyERC20Votes.sol/MyToken.json";
import { getClientsAccts } from "./sharedUtils";

// contract address 0xE366C5a151e568eCBC46894E0791E8327b5310f8
// npx ts-node --files ./scripts/GetPastVotes.ts 0xE366C5a151e568eCBC46894E0791E8327b5310f8 <wallet address - optional, get address from private key in .env if not given>
async function main() {
    const parameters = process.argv.slice(2);
    if (!parameters || parameters.length < 1)
        throw new Error("Required contract address parameter not provided. Required: <contract address> Optional: <wallet address>");
    const contractAddress = parameters[0] as `0x${string}`;
    if (!contractAddress) throw new Error("Contract address not provided");
    if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress))
        throw new Error("Invalid contract address");

    const { publicClient, account, deployer } = getClientsAccts();
    const blockNumber = await publicClient.getBlockNumber();
    console.log("Public client created. Last block number: ", blockNumber);

    let acctAddress : string;
    if (parameters.length >= 2) {
        acctAddress = parameters[1];
        console.log("Getting past votes of address:", acctAddress);
    }
    else {
        acctAddress = deployer.account.address;
        console.log("Getting past votes of Deployer address:", acctAddress);
    }

    // Get past votes
    for (let index = blockNumber - 1n; index > 0n; index--) {
        const pastVotes = (await publicClient.readContract({
            address: contractAddress,
            abi,
            functionName: "getPastVotes",
            args: [acctAddress, index],
        })) as bigint;
        console.log(
            `Account ${
                acctAddress
            } had ${formatEther(pastVotes)} units of voting power at block ${index}\n`
        );
    }

}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});