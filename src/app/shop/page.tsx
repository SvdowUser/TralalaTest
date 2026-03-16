"use client";

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { signAndSendPayment } from "@/lib/payment";
import type { BuildPaymentResponse } from "@/lib/types";

type Step = "idle" | "building" | "signing" | "verifying" | "done" | "error";
interface DLFile { name: string; url: string; }

export default function ShopPage() {
  const { publicKey, signTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const [step, setStep] = useState<Step>("idle");
  const [files, setFiles] = useState<DLFile[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [signature, setSignature] = useState("");

  const PRICE_SOL = "0.007";

  async function handleBuy() {
    if (!publicKey || !signTransaction) return;
    setStep("building"); setErrorMsg(""); setFiles([]);
    try {
      const buildRes = await fetch("/api/build-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: publicKey.toBase58() }),
      });
      if (!buildRes.ok) throw new Error((await buildRes.json()).error ?? "Build failed");
      const { transaction, invoice }: BuildPaymentResponse = await buildRes.json();

      setStep("signing");
      const txSig = await signAndSendPayment(transaction, signTransaction, connection);
      setSignature(txSig);

      setStep("verifying");
      const dlRes = await fetch("/api/get-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: publicKey.toBase58(), signature: txSig, invoice }),
      });
      const dlData = await dlRes.json();
      if (!dlRes.ok || !dlData.files) throw new Error(dlData.error ?? "Verification failed");
      setFiles(dlData.files);
      setStep("done");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "An error occurred.");
      setStep("error");
    }
  }

  function reset() { setStep("idle"); setFiles([]); setErrorMsg(""); setSignature(""); }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      {/* Header */}
      <div className="mb-8 text-center">
        <span className="text-pump-green text-xs font-mono tracking-widest uppercase opacity-70">
          $TRALALA × Brainrot Shop
        </span>
        <h1 className="text-4xl md:text-5xl font-bold text-white mt-2 tracking-tight">
          Sticker Pack
        </h1>
        <p className="mt-3 text-pump-muted text-sm max-w-xs mx-auto leading-relaxed">
          Pay <span className="text-pump-green font-semibold">{PRICE_SOL} SOL (~$1)</span> and
          get 3 exclusive Brainrot images instantly.
        </p>
        <p className="text-xs text-pump-muted opacity-60 mt-1">
          50% auto-buyback &amp; burn of $TRALALA 🔥
        </p>
      </div>

      {/* Preview grid — blurred until paid */}
      <div className="grid grid-cols-3 gap-3 mb-8 w-full max-w-sm">
        {[1, 2, 3].map((i) => (
          <div key={i} className="relative aspect-square rounded-xl bg-pump-card border border-pump-border overflow-hidden flex items-center justify-center">
            <img
              src={`/previews/preview-${i}.png`}
              alt={`Preview ${i}`}
              className="w-full h-full object-cover blur-md opacity-50"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <span className="absolute text-2xl opacity-40">?</span>
          </div>
        ))}
      </div>

      {/* Main card */}
      <div className="w-full max-w-md bg-pump-card border border-pump-border rounded-2xl p-8 shadow-xl">
        <div className="flex justify-center mb-6">
          <WalletMultiButton />
        </div>

        {/* Idle */}
        {connected && step === "idle" && (
          <button onClick={handleBuy}
            className="w-full py-3 px-6 rounded-xl bg-pump-green text-pump-dark font-bold text-sm tracking-wider hover:opacity-90 active:scale-95 transition-all">
            Buy Pack — {PRICE_SOL} SOL
          </button>
        )}

        {/* Loading states */}
        {["building", "signing", "verifying"].includes(step) && (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-10 h-10 rounded-full border-2 border-pump-border border-t-pump-green spin" />
            <p className="text-white text-sm font-semibold">
              {step === "building" && "Preparing transaction…"}
              {step === "signing" && "Waiting for wallet approval…"}
              {step === "verifying" && "Verifying payment…"}
            </p>
            {step === "signing" && <p className="text-pump-muted text-xs">Check your Phantom wallet</p>}
          </div>
        )}

        {/* Done — show download links */}
        {step === "done" && (
          <div className="text-center">
            <p className="text-pump-green font-bold text-lg mb-1">Payment confirmed! 🎉</p>
            <p className="text-pump-muted text-xs mb-5">Your 3 Brainrot images are ready.</p>
            <div className="flex flex-col gap-3 mb-5">
              {files.map((f, i) => (
                <a key={i} href={f.url} download={f.name}
                  className="flex items-center justify-between px-4 py-3 rounded-xl border border-pump-green bg-pump-green/10 text-pump-green text-sm font-mono hover:bg-pump-green/20 transition-all">
                  <span>{f.name}</span>
                  <span>↓ Download</span>
                </a>
              ))}
            </div>
            <a href={`https://solscan.io/tx/${signature}`} target="_blank" rel="noopener noreferrer"
              className="text-pump-muted text-xs font-mono hover:text-pump-green transition-colors">
              tx: {signature.slice(0, 12)}…{signature.slice(-8)}
            </a>
            <button onClick={reset}
              className="mt-5 w-full py-2 rounded-xl border border-pump-border text-pump-muted text-sm hover:border-pump-green hover:text-pump-green transition-all">
              Buy Another Pack
            </button>
          </div>
        )}

        {/* Error */}
        {step === "error" && (
          <div className="text-center">
            <p className="text-red-400 text-sm mb-4">{errorMsg}</p>
            <button onClick={reset}
              className="w-full py-2 rounded-xl border border-red-800 text-red-400 text-sm hover:border-red-500 transition-all">
              Try Again
            </button>
          </div>
        )}

        {!connected && (
          <p className="text-center text-pump-muted text-xs mt-4">
            Connect your Phantom wallet to buy
          </p>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-8 text-pump-muted text-xs text-center space-y-1">
        <p>
          <a href="https://pump.fun/coin/89muFzE1VpotYQfKm7xsuEbhgxRLyinmsELGTCSLpump"
            target="_blank" rel="noopener noreferrer"
            className="text-pump-green hover:underline font-mono">
            89muFz…Lpump
          </a>
        </p>
        <p className="opacity-50">Revenue → $TRALALA buyback &amp; burn 🔥</p>
      </footer>
    </main>
  );
}
