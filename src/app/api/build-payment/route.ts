import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey, Transaction, ComputeBudgetProgram } from "@solana/web3.js";
import { PumpAgent } from "@pump-fun/agent-payments-sdk";
import type { BuildPaymentRequest, BuildPaymentResponse } from "@/lib/types";

/**
 * POST /api/build-payment
 *
 * Accepts the user's wallet address, builds an unsigned payment
 * transaction using the pump-fun SDK, and returns it as base64
 * along with the invoice parameters needed for later verification.
 */
export async function POST(req: NextRequest) {
  try {
    const body: BuildPaymentRequest = await req.json();

    if (!body.walletAddress) {
      return NextResponse.json(
        { error: "Missing walletAddress" },
        { status: 400 }
      );
    }

    // ── Environment ─────────────────────────────────────────────────
    const rpcUrl = process.env.SOLANA_RPC_URL!;
    const agentMintAddress = process.env.AGENT_TOKEN_MINT_ADDRESS!;
    const currencyMintAddress = process.env.CURRENCY_MINT!;
    const priceAmount = process.env.PRICE_AMOUNT ?? "7000000"; // 0.007 SOL = ~$1 default

    if (!rpcUrl || !agentMintAddress || !currencyMintAddress) {
      throw new Error("Missing required environment variables.");
    }

    // ── Invoice parameters ──────────────────────────────────────────
    const memo = String(Math.floor(Math.random() * 900_000_000_000) + 100_000);
    const now = Math.floor(Date.now() / 1000);
    const startTime = String(now);
    const endTime = String(now + 86_400); // valid for 24 hours

    // ── Build transaction ───────────────────────────────────────────
    const connection = new Connection(rpcUrl, "confirmed");
    const agentMint = new PublicKey(agentMintAddress);
    const currencyMint = new PublicKey(currencyMintAddress);
    const userPublicKey = new PublicKey(body.walletAddress);

    const agent = new PumpAgent(agentMint, "mainnet", connection);

    const instructions = await agent.buildAcceptPaymentInstructions({
      user: userPublicKey,
      currencyMint,
      amount: priceAmount,
      memo,
      startTime,
      endTime,
    });

    const { blockhash } = await connection.getLatestBlockhash("confirmed");

    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.feePayer = userPublicKey;
    tx.add(
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 }),
      ...instructions
    );

    const serializedTx = tx
      .serialize({ requireAllSignatures: false })
      .toString("base64");

    const response: BuildPaymentResponse = {
      transaction: serializedTx,
      invoice: { memo, startTime, endTime, amount: priceAmount },
    };

    return NextResponse.json(response);
  } catch (err: unknown) {
    console.error("[build-payment]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
