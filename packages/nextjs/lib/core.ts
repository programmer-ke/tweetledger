import { create } from 'kubo-rpc-client';

const ipfs = create({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' }); // Use Infura for demo; switch to local node if running kubo locally

export async function uploadToIPFS(data: object): Promise<string> {
  const result = await ipfs.add(JSON.stringify(data));
  return result.cid.toString();
}
