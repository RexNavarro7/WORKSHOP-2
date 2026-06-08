'use client';
import { useState, useCallback } from 'react';
import { useWallet } from '@/hooks/useWallet';
import ConnectWallet from '@/components/ConnectWallet';
import FundAccount from '@/components/FundAccount';
import AddTrustline from '@/components/AddTrustline';
import BalanceCard from '@/components/BalanceCard';
import SendPayment from '@/components/SendPayment';
import SavingsGoal from '@/components/SavingsGoal';
import JournalismModule from '@/components/JournalismModule';
import X402Simulator from '@/components/X402Simulator';

export default function Home() {
  const wallet = useWallet();
  const { publicKey, connecting } = wallet;
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <main className="min-h-screen w-full bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              StellarX · Hyper-Local Journalism
            </h1>
            <p className="text-sm text-gray-500">
              Pay-per-view · Freighter · Soroban Testnet
            </p>
          </div>
          <ConnectWallet {...wallet} />
        </header>

        {!publicKey && !connecting && (
          <div className="rounded border border-gray-200 bg-white py-16 text-center text-gray-500">
            <p className="mb-2">Connect your Freighter wallet to get started.</p>
            <p className="text-sm">
              No wallet?{' '}
              <a
                href="https://freighter.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline"
              >
                Install Freighter
              </a>{' '}
              and switch it to Test Net.
            </p>
          </div>
        )}

        {publicKey && (
          <>
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <FundAccount publicKey={publicKey} onFunded={refresh} />
              <AddTrustline publicKey={publicKey} onDone={refresh} />
            </div>
            <BalanceCard publicKey={publicKey} refreshKey={refreshKey} />
            <button
              onClick={refresh}
              className="mt-3 text-sm text-gray-500 underline hover:text-gray-700"
            >
              Refresh balances
            </button>
            <SendPayment publicKey={publicKey} onSent={refresh} />
          </>
        )}

        <JournalismModule publicKey={publicKey} />
        <X402Simulator />

        {/* Workshop savings-goal demo — kept for reference */}
        <SavingsGoal publicKey={publicKey} />

        <footer className="mt-10 text-center text-xs text-gray-400">
          Built for the StellarX PH workshop @ PUP QC · pick an idea, then bend
          this scaffold toward it.
        </footer>
      </div>
    </main>
  );
}
