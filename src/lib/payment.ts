import { Connection, Transaction } from "@solana/web3.js";

/**
 * Deserializes a base64 transaction, prompts the user to sign it
 * via their wallet, then submits it to the network and waits for
 * on-chain confirmation.
 *
 * NOTE: Call useWallet() / useConnection() at the component level and
 * pass the results here — never call hooks inside async functions.
 */
export async function signAndSendPayment(
  txBase64: string,
  signTransaction: (tx: Transaction) => Promise<Transaction>,
  connection: Connection
): Promise<string> {
  if (!signTransaction) {
    throw new Error("Connected wallet does not support transaction signing.");
  }

  // Deserialize the unsigned transaction built on the server
  const tx = Transaction.from(Buffer.from(txBase64, "base64"));

  // Wallet prompts user to approve
  const signedTx = await signTransaction(tx);

  // Broadcast
  const signature = await connection.sendRawTransaction(
    signedTx.serialize(),
    { skipPreflight: false, preflightCommitment: "confirmed" }
  );

  // Wait for on-chain confirmation
  const latestBlockhash = await connection.getLatestBlockhash("confirmed");
  await connection.confirmTransaction(
    { signature, ...latestBlockhash },
    "confirmed"
  );

  return signature;
}
