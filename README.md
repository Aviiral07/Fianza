# 🔒 Fianza — Blockchain-Powered Rental Escrow

> **Transparent, fair, tamper-proof deposits secured by Algorand smart contracts.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20Site-5DCAA5?style=for-the-badge)](https://aviiiral07.github.io/Fianza/)
[![Algorand](https://img.shields.io/badge/Built%20on-Algorand-000000?style=for-the-badge&logo=algorand)](https://algorand.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

---

## 🚨 The Problem

Every year, millions of tenants lose their rental deposits unfairly. Landlords can:
- Claim false damages with no proof
- Delay refunds for months
- Keep deposits with zero accountability

There is no transparent, enforceable system. **Tenants have no power.**

---

## ✅ The Solution — Fianza

Fianza puts the deposit into an **immutable Algorand smart contract** — not the landlord's bank account. The rules are agreed upfront, enforced by code, and visible to everyone.

- 🔒 Funds locked on-chain — landlord can't touch them unfairly
- 📸 Move-in/out photo evidence stored permanently on IPFS
- ⚡ Auto-release when conditions are met — no delays
- ⚖️ Dispute system freezes funds and triggers fair resolution

---

## 🎥 Live Demo

👉 **[https://aviiiral07.github.io/Fianza/](https://aviiral07.github.io/Fianza/)**

### Demo Flow
1. Connect Pera Wallet (Testnet)
2. Tenant registers landlord wallet address
3. Tenant locks deposit on-chain
4. Tenant uploads move-in photo CID (IPFS)
5. Landlord releases deposit OR raises dispute
6. Funds move automatically via inner transaction

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | Algorand (Testnet) |
| Smart Contract | Python via AlgoKit (ARC4) |
| Frontend | React + TypeScript + Vite |
| Wallet | Pera Wallet via `@txnlab/use-wallet-react` |
| Storage | IPFS (for photo evidence CIDs) |
| Deployment | GitHub Pages + GitHub Actions CI/CD |

---

## 📦 Smart Contract — `FianzaEscrow`

Written in Python using AlgoKit's Algorand Python framework (ARC4 standard).

### Methods

| Method | Role | Description |
|---|---|---|
| `set_landlord(address)` | Tenant | Register landlord wallet on-chain |
| `fund_deposit()` | Tenant | Lock ALGO into escrow via grouped txn |
| `store_cid(cid)` | Tenant | Store IPFS photo evidence CID on-chain |
| `release_deposit()` | Landlord | Send locked ALGO back to tenant |
| `raise_dispute()` | Landlord | Freeze funds, set status to DISPUTED |
| `get_status()` | Anyone | Returns UNFUNDED / FUNDED / DISPUTED |
| `get_deposit_amount()` | Anyone | Returns locked amount in microALGO |
| `get_cid()` | Anyone | Returns stored IPFS CID |

### State Machine

```
UNFUNDED ──(fund_deposit)──► FUNDED ──(release_deposit)──► UNFUNDED
                                  └──(raise_dispute)──────► DISPUTED
```

---

## 🚀 Run Locally

### Prerequisites
- Node.js 22+
- Python 3.12+
- AlgoKit CLI

### Install AlgoKit
```bash
pip install algokit
```

### Clone & Run Frontend
```bash
git clone https://github.com/Aviiiral07/Fianza.git
cd Fianza/projects/fianza-frontend
npm install
npm run dev
```

### Deploy Smart Contract
```bash
cd Fianza/projects/fianza-contracts
algokit deploy
```

### Environment Variables
Create `.env` in `projects/fianza-frontend/` based on `.env.template`:
```env
VITE_ALGOD_SERVER=https://testnet-api.algonode.cloud
VITE_ALGOD_PORT=443
VITE_ALGOD_TOKEN=
VITE_ALGOD_NETWORK=testnet
VITE_INDEXER_SERVER=https://testnet-idx.algonode.cloud
VITE_INDEXER_PORT=443
VITE_INDEXER_TOKEN=
```

---

## 📁 Project Structure

```
Fianza/
├── projects/
│   ├── fianza-frontend/          # React + TypeScript UI
│   │   ├── src/
│   │   │   ├── Home.tsx          # Main escrow interface
│   │   │   ├── contracts/        # Auto-generated contract client
│   │   │   └── components/       # ConnectWallet, etc.
│   │   └── vite.config.ts
│   └── fianza-contracts/         # Algorand smart contracts
│       └── smart_contracts/
│           └── fianza_escrow/
│               └── contract.py   # ARC4 escrow contract
└── .github/
    └── workflows/
        └── deploy.yml            # CI/CD → GitHub Pages
```

---

## 🔐 How It Works

```
Tenant                    Smart Contract              Landlord
  │                            │                         │
  │──set_landlord()───────────►│                         │
  │──fund_deposit() + ALGO────►│                         │
  │──store_cid(ipfs_hash)─────►│                         │
  │                            │◄────────────────────────│ release_deposit()
  │◄───────────── ALGO returned automatically ───────────│
  │                            │   OR                    │
  │                            │◄────────────────────────│ raise_dispute()
  │                            │ (funds frozen on-chain) │
```

---

## 👥 Team

| Name | Role |
|---|---|
| Aviral Dubey | Full Stack + Smart Contract |

---

## 📄 License

MIT License — see [LICENSE](LICENSE)

---

<div align="center">
  <strong>Built with ❤️ on Algorand</strong><br/>
  <em>Fianza — Because your deposit belongs to you.</em>
</div>
