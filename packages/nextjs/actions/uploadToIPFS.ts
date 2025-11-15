"use server";

import { PinataSDK } from "pinata";

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT!,
  pinataGateway: process.env.NEXT_PUBLIC_PINATA_GATEWAY!,
});

/**
 * Uploads the given object as JSON to IPFS via Pinata and returns the resulting CID.
 *
 * @param data - The object to serialize and upload as JSON to IPFS
 * @returns The CID (content identifier) of the uploaded JSON on IPFS
 * @throws Propagates any error from the Pinata upload operation
 */
export async function uploadToIPFS(data: object): Promise<string> {
  try {
    const result = await pinata.upload.public.json(data);
    return result.cid;
  } catch (error) {
    console.error("Error uploading to Pinata IPFS:", error);
    throw error;
  }
}
