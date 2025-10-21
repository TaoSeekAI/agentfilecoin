
import { ethers } from 'ethers';
import { NFTScanner } from './nft-scanner.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const provider = new ethers.JsonRpcProvider(
    process.env.NFT_NETWORK_RPC_URL,
    undefined,
    {
      staticNetwork: true,
    }
  );

  const scanner = new NFTScanner(
    '0xab00000000002ade39f58f9d8278a31574ffbe77',
    provider,
    process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs/'
  );

  console.log('Fetching metadata for Token ID: 4');

  const info = await scanner.scanToken('4');

  const result = {
    tokenId: '4',
    contract: '0xab00000000002ade39f58f9d8278a31574ffbe77',
    owner: info.owner,
    tokenURI: info.tokenURI,
    metadata: info.metadata,
  };

  console.log('METADATA_RESULT_START');
  console.log(JSON.stringify(result, null, 2));
  console.log('METADATA_RESULT_END');
}

main().catch((error) => {
  console.error('Fetch error:', error);
  process.exit(1);
});
