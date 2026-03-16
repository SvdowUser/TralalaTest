"use client";

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { signAndSendPayment } from "@/lib/payment";
import type {
  BuildPaymentResponse,
  VerifyPaymentResponse,
} from "@/lib/types";

type Step = "idle" | "building" | "signing" | "verifying" | "done" | "error";

export default function RNGPage() {
  const { publicKey, signTransaction, connected } = useWallet();
  const { connection } = useConnection();

  const [step, setStep] = useState<Step>("idle");
  const [randomNumber, setRandomNumber] = useState<number | null>(null);
  const [signature, setSignature] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  async function handleGenerateNumber() {
    if (!publicKey || !signTransaction) return;

    setStep("building");
    setErrorMsg("");
    setRandomNumber(null);

    try {
      // ── Step 1: Ask the server to build the unsigned transaction ──
      const buildRes = await fetch("/api/build-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: publicKey.toBase58() }),
      });

      if (!buildRes.ok) {
        const { error } = await buildRes.json();
        throw new Error(error ?? "Failed to build transaction");
      }

      const { transaction, invoice }: BuildPaymentResponse =
        await buildRes.json();

      // ── Step 2: User signs & sends ────────────────────────────────
      setStep("signing");
      const txSignature = await signAndSendPayment(
        transaction,
        signTransaction,
        connection
      );
      setSignature(txSignature);

      // ── Step 3: Server verifies & delivers RNG ────────────────────
      setStep("verifying");
      const verifyRes = await fetch("/api/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          signature: txSignature,
          invoice,
        }),
      });

      const verifyData: VerifyPaymentResponse = await verifyRes.json();

      if (!verifyData.verified || verifyData.randomNumber === undefined) {
        throw new Error(
          verifyData.error ?? "Payment verification failed."
        );
      }

      setRandomNumber(verifyData.randomNumber);
      setStep("done");
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "An error occurred.");
      setStep("error");
    }
  }

  function handleReset() {
    setStep("idle");
    setRandomNumber(null);
    setSignature("");
    setErrorMsg("");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      {/* ── Header ── */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 mb-3">
          <span className="text-pump-green text-xs font-mono tracking-widest uppercase opacity-70">
            pump.fun
          </span>
          <span className="text-pump-muted text-xs">×</span>
          <span className="text-pump-green text-xs font-mono tracking-widest uppercase opacity-70">
            tokenized agent
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
          $TRALALA
        </h1>
        <p className="mt-2 text-pump-muted text-sm max-w-sm mx-auto">
          Pay{" "}
          <span className="text-pump-green font-semibold">0.1 SOL</span> to
          generate a cryptographically random number (0–1000).
        </p>
      </div>

      {/* ── Card ── */}
      <div className="w-full max-w-md bg-pump-card border border-pump-border rounded-2xl p-8 shadow-xl">
        {/* Wallet button */}
        <div className="flex justify-center mb-6">
          <WalletMultiButton />
        </div>

        {/* Connected wallet info */}
        {connected && publicKey && (
          <p className="text-center text-pump-muted text-xs mb-6 font-mono break-all">
            {publicKey.toBase58().slice(0, 8)}…
            {publicKey.toBase58().slice(-8)}
          </p>
        )}

        {/* ── State machine UI ── */}
        {step === "idle" && connected && (
          <button
            onClick={handleGenerateNumber}
            className="w-full py-3 px-6 rounded-xl bg-pump-green text-pump-dark font-bold text-sm tracking-wider hover:opacity-90 active:scale-95 transition-all"
          >
            Generate Random Number — 0.1 SOL
          </button>
        )}

        {step === "building" && <StatusMessage label="Building transaction…" />}

        {step === "signing" && (
          <StatusMessage label="Awaiting wallet approval…" hint="Check your wallet to sign" />
        )}

        {step === "verifying" && (
          <StatusMessage label="Verifying on-chain…" hint="Confirming your payment" />
        )}

        {step === "done" && randomNumber !== null && (
          <div className="text-center">
            <p className="text-pump-muted text-xs mb-3 uppercase tracking-widest">
              Your random number
            </p>
            <div className="text-7xl font-bold text-pump-green glow-number my-4">
              {randomNumber}
            </div>
            <p className="text-pump-muted text-xs mt-4 font-mono break-all">
              tx:{" "}
              <a
                href={`https://solscan.io/tx/${signature}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-pump-green underline"
              >
                {signature.slice(0, 12)}…{signature.slice(-8)}
              </a>
            </p>
            <button
              onClick={handleReset}
              className="mt-6 w-full py-2 px-4 rounded-xl border border-pump-border text-pump-muted text-sm hover:border-pump-green hover:text-pump-green transition-all"
            >
              Generate Another
            </button>
          </div>
        )}

        {step === "error" && (
          <div className="text-center">
            <p className="text-red-400 text-sm mb-4">{errorMsg}</p>
            <button
              onClick={handleReset}
              className="w-full py-2 px-4 rounded-xl border border-red-800 text-red-400 text-sm hover:border-red-500 transition-all"
            >
              Try Again
            </button>
          </div>
        )}

        {!connected && (
          <p className="text-center text-pump-muted text-xs mt-4">
            Connect your Phantom wallet to get started
          </p>
        )}
      </div>

      {/* ── Footer ── */}
      <footer className="mt-10 text-pump-muted text-xs text-center space-y-1">
        <p>
          Token:{" "}
          <a
            href="https://pump.fun/89muFzE1VpotYQfKm7xsuEbhgxRLyinmsELGTCSLpump"
            target="_blank"
            rel="noopener noreferrer"
            className="text-pump-green hover:underline font-mono"
          >
            89muFz…Lpump
          </a>
        </p>
        <p className="opacity-50">Powered by pump.fun Tokenized Agents SDK</p>
      </footer>
    </main>
  );
}

// ── Sub-component ──────────────────────────────────────────────────────────

function StatusMessage({
  label,
  hint,
}: {
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      {/* Spinner */}
      <div className="w-10 h-10 rounded-full border-2 border-pump-border border-t-pump-green spin-ring" />
      <p className="text-white text-sm font-semibold">{label}</p>
      {hint && <p className="text-pump-muted text-xs">{hint}</p>}
    </div>
  );
}
