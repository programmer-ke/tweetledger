import { create } from 'kubo-rpc-client';
import * as dotenv from "dotenv";
dotenv.config();

const ipfs = create({
  host: process.env.PINATA_GATEWAY,
  port: 443,
  protocol: 'https',
  headers: {
    authorization: `Bearer ${process.env.PINATA_JWT}`,
  }
  
});

export async function uploadToIPFS(data: object): Promise<string> {
  const result = await ipfs.add(JSON.stringify(data));
  return result.cid.toString();
}
