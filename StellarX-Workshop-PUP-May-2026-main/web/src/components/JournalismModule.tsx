'use client';
import { ARTICLES } from '@/data/articles';
import { journalismContractConfigured } from '@/lib/journalism-contract';
import ArticlePaywall from '@/components/ArticlePaywall';

export default function JournalismModule({
  publicKey,
}: {
  publicKey: string | null;
}) {
  const configured = journalismContractConfigured();

  return (
    <section className="mt-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          Hyper-Local Journalism Paywall
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Pay-per-view investigative reports · $0.02 USDC per article · Soroban
          access registry on Stellar Testnet
        </p>
      </div>

      {!configured && (
        <div className="mb-6 rounded-lg border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Contract not deployed</p>
          <p className="mt-1 text-amber-800">
            Run the deploy script to wire the Soroban paywall contract to this
            module:
          </p>
          <pre className="mt-2 overflow-x-auto rounded bg-gray-900 p-3 text-xs text-gray-100">
            .\scripts\deploy-journalism.ps1
          </pre>
          <p className="mt-2 text-xs text-amber-700">
            Sets <code>NEXT_PUBLIC_JOURNALISM_CONTRACT_ID</code> in{' '}
            <code>web/.env.local</code> — restart <code>npm run dev</code> after.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {ARTICLES.map((article) => (
          <ArticlePaywall
            key={article.id}
            article={article}
            publicKey={publicKey}
          />
        ))}
      </div>
    </section>
  );
}
