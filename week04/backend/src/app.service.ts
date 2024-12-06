import { Injectable } from '@nestjs/common';
import * as tokenJson from './assets/MyToken.json';
import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  PublicClient,
} from 'viem';
import { sepolia } from 'viem/chains';
import { ConfigService } from '@nestjs/config';
import { privateKeyToAccount } from 'viem/accounts';

@Injectable()
export class AppService {
  publicClient: PublicClient;
  walletClient;

  constructor(private configService: ConfigService) {
    const apiKey = process.env.ALCHEMY_API_KEY;
    const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`);
    this.publicClient = createPublicClient({
      chain: sepolia,
      transport: http(`https://eth-sepolia.g.alchemy.com/v2/${apiKey}`),
    }) as any as PublicClient;

    this.walletClient = createWalletClient({
      transport: http(`https://eth-sepolia.g.alchemy.com/v2/${apiKey}`),
      chain: sepolia,
      account: account,
    });
  }

  getContractAddress(): string {
    return process.env.TOKEN_ADDRESS;
  }

  async getTokenName(): Promise<string> {
    try {
      const name = await this.publicClient.readContract({
        address: this.getContractAddress() as `0x${string}`,
        abi: tokenJson.abi,
        functionName: 'name',
      });
      return name as string;
    } catch (error) {
      this.logger.error('Failed to fetch token name', error);
      throw new Error('Error fetching token name');
    }
  }

   getServerWalletAddress(): string {
    return this.walletClient.account.address;
  }

  // TODO
  async checkMinterRole(address: string): Promise<boolean> {
    const MINTER_ROLE =
      '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6';
    // const MINTER_ROLE =  await this.publicClient.readContract({
    //   address: this.getContractAddress(),
    //   abi: tokenJson.abi,
    //   functionName: 'MINTER_ROLE'
    // });
    const hasRole = await this.publicClient.readContract({
      address: this.getContractAddress() as `0x${string}`,
      abi: tokenJson.abi,
      functionName: 'hasRole',
      args: [MINTER_ROLE, address],
    });
    return hasRole as boolean;
  }

  // TODO
 async mintTokens(address: string): Promise<{ result: boolean }> {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new Error('Invalid Ethereum address');
    }
    try {
      const tx = await this.walletClient.writeContract({
        address: this.getContractAddress() as `0x${string}`,
        abi: tokenJson.abi,
        functionName: 'mint',
        args: [address, BigInt(1000 * 10 ** 18)], // Mint 1000 tokens
      });

      const receipt = await this.walletClient.waitForTransactionReceipt({
        hash: tx,
      });
      return { result: receipt.status === 'success' };
    } catch (error) {
      this.logger.error('Error minting tokens', error);
      throw new Error('Failed to mint tokens');
    }
  }

  async getTransactionReceipt(hash: string) {
    const receipt = await this.publicClient.getTransactionReceipt({
      hash: hash as `0x${string}`,
    });
    return {
      result: `Transaction status: ${receipt.status} , Block number ${receipt.blockNumber}`,
    };
  }

  async getTokenBalance(address: string) {
    const symbol = await this.publicClient.readContract({
      address: this.getContractAddress() as `0x${string}`,
      abi: tokenJson.abi,
      functionName: 'symbol',
    });
    const balanceOf = await this.publicClient.readContract({
      address: this.getContractAddress() as `0x${string}`,
      abi: tokenJson.abi,
      functionName: 'balanceOf',
      args: [address],
    });

    return `${formatEther(balanceOf as bigint)} ${symbol}`;
  }

 async getTotalSupply(): Promise<string> {
    try {
      const symbol = await this.publicClient.readContract({
        address: this.getContractAddress() as `0x${string}`,
        abi: tokenJson.abi,
        functionName: 'symbol',
      });
      const totalSupply = await this.publicClient.readContract({
        address: this.getContractAddress() as `0x${string}`,
        abi: tokenJson.abi,
        functionName: 'totalSupply',
      });
      return `${formatEther(totalSupply as bigint)} ${symbol}`;
    } catch (error) {
      this.logger.error('Error fetching total supply', error);
      throw new Error('Failed to fetch total supply');
    }
  }
}
