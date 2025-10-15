/**
 * Check USDFC Balance Directly
 */

import 'dotenv/config';
import { ethers } from 'ethers';

const USDFC_ADDRESS = '0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0';
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

async function checkBalance() {
  const provider = new ethers.JsonRpcProvider(
    process.env.FILECOIN_NETWORK_RPC_URL || 'https://api.calibration.node.glif.io/rpc/v1'
  );

  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const address = wallet.address;

  console.log(`Wallet: ${address}`);
  console.log(`USDFC Contract: ${USDFC_ADDRESS}\n`);

  const usdfcContract = new ethers.Contract(USDFC_ADDRESS, ERC20_ABI, provider);

  const balance = await usdfcContract.balanceOf(address);
  const decimals = await usdfcContract.decimals();
  const symbol = await usdfcContract.symbol();

  console.log(`Symbol: ${symbol}`);
  console.log(`Decimals: ${decimals}`);
  console.log(`Raw Balance: ${balance.toString()}`);
  console.log(`Formatted Balance: ${ethers.formatUnits(balance, decimals)} ${symbol}`);
}

checkBalance().catch(console.error);
