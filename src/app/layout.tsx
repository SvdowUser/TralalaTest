import type { Metadata } from "next";
import "./globals.css";
import { SolanaWalletProvider } from "@/components/WalletProvider";

export const metadata: Metadata = {
  title: "$TRALALA — Tokenized Agent RNG",
  description:
    "Pay 0.1 SOL to generate a provably on-chain random number (0–1000). Powered by the $TRALALA tokenized agent on pump.fun.",
  openGraph: {
    title: "$TRALALA — Tokenized Agent RNG",
    description: "Pay 0.1 SOL, get a random number. Verified on-chain.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SolanaWalletProvider>{children}</SolanaWalletProvider>
      </body>
    </html>
  );
}
