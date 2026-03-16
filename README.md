# $TRALALA — Tokenized Agent RNG

> A Next.js web app that lets users connect their Solana wallet, pay **0.1 SOL**, and receive a server-verified random number (0–1000).

Built using the official [pump.fun Tokenized Agents SDK](https://github.com/pump-fun/pump-fun-skills/tree/main/tokenized-agents).

---

## Live Demo

Deploy to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

---

## Token

| Field       | Value                                          |
| ----------- | ---------------------------------------------- |
| Ticker      | `$TRALALA`                                     |
| Mint        | `89muFzE1VpotYQfKm7xsuEbhgxRLyinmsELGTCSLpump` |
| Network     | Solana Mainnet                                 |
| Payment     | 0.1 SOL per RNG call                           |

---

## Architecture

```
Browser (Next.js)
  ├── /rng          ← UI page (wallet connect + pay button)
  ├── WalletProvider ← Phantom via @solana/wallet-adapter
  └── API Routes (server-side)
        ├── POST /api/build-payment   ← builds unsigned tx w/ pump-fun SDK
        └── POST /api/verify-payment  ← verifies invoice on-chain → returns RNG
```

### Payment Flow

```
1. User connects Phantom wallet
2. Client → POST /api/build-payment  (sends wallet address)
3. Server builds & returns base64-encoded unsigned transaction + invoice params
4. Client deserializes tx → wallet signs → broadcasts to Solana
5. Client → POST /api/verify-payment  (sends invoice params + tx signature)
6. Server calls validateInvoicePayment() with retry loop (10 × 2 s)
7. If verified → server generates random number and returns it
8. UI displays the number with Solscan link
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm or pnpm
- A Phantom wallet with mainnet SOL

### Installation

```bash
git clone https://github.com/your-org/tralala-agent
cd tralala-agent
npm install
```

### Environment

Copy the example env file and fill in your values:

```bash
cp .env.local.example .env.local
```

| Variable                       | Description                                  | Default                                          |
| ------------------------------ | -------------------------------------------- | ------------------------------------------------ |
| `SOLANA_RPC_URL`               | Server-side Solana RPC endpoint              | `https://rpc.solanatracker.io/public`            |
| `NEXT_PUBLIC_SOLANA_RPC_URL`   | Client-side Solana RPC endpoint              | `https://rpc.solanatracker.io/public`            |
| `AGENT_TOKEN_MINT_ADDRESS`     | $TRALALA token mint                          | `89muFzE1VpotYQfKm7xsuEbhgxRLyinmsELGTCSLpump` |
| `CURRENCY_MINT`                | Payment currency (SOL = wrapped SOL address) | `So11111111111111111111111111111111111111112`     |
| `PRICE_AMOUNT`                 | Price in lamports (0.1 SOL = 100_000_000)   | `100000000`                                      |

### Run Development Server

```bash
npm run dev
# open http://localhost:3000
```

### Deploy to Vercel

```bash
vercel --prod
```

Set the env variables in the Vercel dashboard under **Settings → Environment Variables**.

---

## Security Notes

- **Private keys are never handled.** The server only builds unsigned transactions.
- **Payment is always verified server-side** before any service is delivered. The client cannot fake a payment.
- **Each invoice is single-use.** The pump-fun SDK enforces this via an on-chain PDA.
- `.env.local` is in `.gitignore` — never commit real secrets.

---

## Tech Stack

| Layer     | Technology                                    |
| --------- | --------------------------------------------- |
| Framework | Next.js 14 (App Router)                       |
| Styling   | Tailwind CSS                                  |
| Payments  | `@pump-fun/agent-payments-sdk` v2             |
| Wallet    | `@solana/wallet-adapter-react` + Phantom      |
| Chain     | Solana Mainnet                                |

---

## License

MIT
