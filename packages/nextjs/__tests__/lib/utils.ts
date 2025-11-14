import { computeMessageHash } from "~~/lib/utils";

describe("computeMessageHash", () => {
  it("computes correct hash for valid inputs", () => {
    const message = "test message";
    const author = "0xfb1733a1D882932c1E12685208903b6601E0b6f4" as `0x${string}`;
    const timestamp = 1763126459n;

    const hash = computeMessageHash(message, author, timestamp);
    // Expected hash (compute manually or via Solidity equivalent)
    expect(hash).toBe("0x9f91a79b8cdad33afdf902bb506b1276bf81821f20bc28412c48f0abae873b57");
  });

  it("produces different hashes for different messages", () => {
    const author = "0x1234567890123456789012345678901234567890" as `0x${string}`;
    const timestamp = 1234567890n;

    const hash1 = computeMessageHash("message1", author, timestamp);
    const hash2 = computeMessageHash("message2", author, timestamp);
    expect(hash1).not.toBe(hash2);
  });

  it("produces different hashes for different authors", () => {
    const message = "test message";
    const timestamp = 1234567890n;

    const hash1 = computeMessageHash(message, "0x1234567890123456789012345678901234567890" as `0x${string}`, timestamp);
    const hash2 = computeMessageHash(message, "0xfb1733a1D882932c1E12685208903b6601E0b6f4" as `0x${string}`, timestamp);
    expect(hash1).not.toBe(hash2);
  });
});
