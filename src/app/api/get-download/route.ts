/**
 * POST /api/get-download
 *
 * 1. Verifies payment on-chain via pump-fun SDK (with retry)
 * 2. If confirmed → returns signed download URLs for the 3 pack images
 *
 * Images live in /public/packs/ on Vercel.
 * Add your generated Brainrot images there named:
 *   pack-1.png, pack-2.png, pack-3.png
 */

import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { PumpAgent } from "@pump-fun/agent-payments-sdk";
import type { VerifyPaymentRequest } from "@/lib/types";

const MAX_RETRIES = 10;
const RETRY_DELAY = 2000;

// The 3 images in your /public/packs/ folder
const PACK_FILES = [
  { name: "tralala-brainrot-1.png", path: "/packs/pack-1.png" },
  { name: "tralala-brainrot-2.png", path: "/packs/pack-2.png" },
  { name: "tralala-brainrot-3.png", path: "/packs/pack-3.png" },
];

export async function POST(req: NextRequest) {
  try {
    const body: VerifyPaymentRequest = await req.json();
    const { walletAddress, invoice } = body;

    if (!walletAddress || !invoice) {
      return NextResponse.json({ error: "Missing walletAddress or invoice" }, { status: 400 });
    }

    const agentMint = new PublicKey(process.env.AGENT_TOKEN_MINT_ADDRESS!);
    const currencyMint = new PublicKey(process.env.CURRENCY_MINT!);
    const agent = new PumpAgent(agentMint, "mainnet");

    const invoiceParams = {
      user: new PublicKey(walletAddress),
      currencyMint,
      amount: Number(invoice.amount),
      memo: Number(invoice.memo),
      startTime: Number(invoice.startTime),
      endTime: Number(invoice.endTime),
    };

    // Retry loop — wait for on-chain confirmation
    let verified = false;
    for (let i = 0; i < MAX_RETRIES; i++) {
      verified = await agent.validateInvoicePayment(invoiceParams);
      if (verified) break;
      await new Promise((r) => setTimeout(r, RETRY_DELAY));
    }

    if (!verified) {
      return NextResponse.json(
        { error: "Payment not confirmed on-chain. Please wait a moment and try again." },
        { status: 402 }
      );
    }

    // Payment confirmed — return download file list
    // Files are served directly from /public/packs/ on Vercel (no auth needed)
    // For extra security you could generate short-lived signed URLs here
    const files = PACK_FILES.map((f) => ({
      name: f.name,
      url: f.path,
    }));

    return NextResponse.json({ verified: true, files });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[get-download]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
