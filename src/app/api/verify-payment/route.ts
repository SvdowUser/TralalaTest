import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { PumpAgent } from "@pump-fun/agent-payments-sdk";
import type { VerifyPaymentRequest, VerifyPaymentResponse } from "@/lib/types";

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 2_000;

/**
 * POST /api/verify-payment
 *
 * Validates the on-chain invoice via the pump-fun SDK with a retry
 * loop (up to 10 × 2 s). If verified, generates and returns the
 * random number (0–1000). The service is NEVER delivered without
 * server-side confirmation.
 */
export async function POST(req: NextRequest) {
  try {
    const body: VerifyPaymentRequest = await req.json();

    const { walletAddress, invoice } = body;

    if (!walletAddress || !invoice) {
      return NextResponse.json(
        { error: "Missing walletAddress or invoice" },
        { status: 400 }
      );
    }

    // ── Environment ─────────────────────────────────────────────────
    const agentMintAddress = process.env.AGENT_TOKEN_MINT_ADDRESS!;
    const currencyMintAddress = process.env.CURRENCY_MINT!;

    if (!agentMintAddress || !currencyMintAddress) {
      throw new Error("Missing required environment variables.");
    }

    const agentMint = new PublicKey(agentMintAddress);
    const agent = new PumpAgent(agentMint, "mainnet");

    const invoiceParams = {
      user: new PublicKey(walletAddress),
      currencyMint: new PublicKey(currencyMintAddress),
      amount: Number(invoice.amount),
      memo: Number(invoice.memo),
      startTime: Number(invoice.startTime),
      endTime: Number(invoice.endTime),
    };

    // ── Retry loop ───────────────────────────────────────────────────
    let verified = false;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      verified = await agent.validateInvoicePayment(invoiceParams);
      if (verified) break;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }

    if (!verified) {
      const response: VerifyPaymentResponse = {
        verified: false,
        error: "Payment could not be confirmed on-chain. Please try again.",
      };
      return NextResponse.json(response, { status: 402 });
    }

    // ── Deliver the service ─────────────────────────────────────────
    const randomNumber = Math.floor(Math.random() * 1001); // 0–1000 inclusive

    const response: VerifyPaymentResponse = {
      verified: true,
      randomNumber,
    };

    return NextResponse.json(response);
  } catch (err: unknown) {
    console.error("[verify-payment]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
