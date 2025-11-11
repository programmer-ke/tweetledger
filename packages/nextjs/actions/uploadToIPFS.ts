"use server";

import * as dotenv from "dotenv";
import { PinataSDK } from "pinata";

dotenv.config();

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT!,
  pinataGateway: process.env.PINATA_GATEWAY!,
});

export async function uploadToIPFS(data: object): Promise<string> {
  try {
    const result = await pinata.upload.public.json(data);
    return result.cid;
  } catch (error) {
    console.error("Error uploading to Pinata IPFS:", error);
    throw error;
  }
}
