'use client';
import { useState, useEffect, useCallback } from 'react';
import type { Article } from '@/data/articles';
import {
  journalismContractConfigured,
  readIsUnlocked,
  buildPayForArticleXDR,
  ARTICLE_PRICE_STROOPS,
} from '@/lib/journalism-contract';
import { submitSignedXDR, pollTransaction } from '@/lib/payment';
import { NETWORK_PASSPHRASE } from '@/lib/stellar';

interface Props {
  article: Article;
  publicKey: string | null;
  onUnlock?: (articleId: string, txHash: string) => void;
}

export default function ArticlePaywall({ article, publicKey, onUnlock }: Props) {
  const configured = journalismContractConfigured();
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');

  const checkAccess = useCallback(async () => {
    if (!configured || !publicKey) {
      setUnlocked(false);
      return;
    }
    setChecking(true);
    setError('');
    try {
      const status = await readIsUnlocked(publicKey, article.id);
      setUnlocked(status);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not verify access');
    } finally {
      setChecking(false);
    }
  }, [configured, publicKey, article.id]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  const handleUnlock = async () => {
    if (!publicKey) return;
    setBusy(true);
    setError('');
    try {
      const freighter = await import('@stellar/freighter-api');

      // Build a fresh XDR immediately before signing so timebounds stay valid.
      for (let attempt = 0; attempt < 2; attempt++) {
        const xdr = await buildPayForArticleXDR(
          publicKey,
          article.id,
          article.authorAddress,
          ARTICLE_PRICE_STROOPS,
        );

        const signed = await freighter.signTransaction(xdr, {
          networkPassphrase: NETWORK_PASSPHRASE,
          address: publicKey,
        });
        if (signed.error) {
          throw new Error(
            typeof signed.error === 'string' ? signed.error : 'Signing was rejected',
          );
        }

        try {
          const hash = await submitSignedXDR(signed.signedTxXdr);
          await pollTransaction(hash);
          setTxHash(hash);
          setUnlocked(true);
          onUnlock?.(article.id, hash);
          return;
        } catch (submitErr: unknown) {
          const msg = submitErr instanceof Error ? submitErr.message : '';
          if (attempt === 0 && msg.includes('expired')) {
            continue;
          }
          throw submitErr;
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Transaction failed');
    } finally {
      setBusy(false);
    }
  };

  const priceLabel = `$${(ARTICLE_PRICE_STROOPS / 10_000_000).toFixed(2)} USDC`;

  return (
    <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
          {article.neighborhood}
        </span>
        <span>{article.publishedAt}</span>
        <span>·</span>
        <span>{article.author}</span>
      </div>

      <h3 className="text-lg font-semibold text-gray-900">{article.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">{article.summary}</p>

      <div className="relative mt-4">
        <div
          className={`text-sm leading-relaxed text-gray-800 whitespace-pre-line transition-all ${
            unlocked ? '' : 'select-none blur-sm'
          }`}
          aria-hidden={!unlocked}
        >
          {article.body}
        </div>

        {!unlocked && (
          <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-white via-white/90 to-transparent pb-2 pt-16">
            <div className="w-full max-w-sm rounded-lg border border-indigo-200 bg-white/95 p-4 text-center shadow-lg backdrop-blur-sm">
              <p className="text-sm font-medium text-gray-900">
                Unlock this investigative report for {priceLabel}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Micropayment goes directly to {article.author} on Stellar Testnet
              </p>

              {!configured && (
                <p className="mt-3 text-xs text-amber-700">
                  Deploy the journalism contract first:{' '}
                  <code className="rounded bg-amber-50 px-1">.\scripts\deploy-journalism.ps1</code>
                </p>
              )}

              {configured && !publicKey && (
                <p className="mt-3 text-xs text-gray-500">
                  Connect Freighter to unlock this article.
                </p>
              )}

              {configured && publicKey && (
                <button
                  onClick={handleUnlock}
                  disabled={busy || checking}
                  className="mt-3 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                >
                  {busy ? 'Signing with Freighter…' : checking ? 'Checking access…' : 'Unlock Article'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {unlocked && (
        <p className="mt-3 text-xs text-emerald-600">
          Unlocked on-chain
          {txHash && (
            <>
              {' · '}
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-emerald-700"
              >
                View transaction
              </a>
            </>
          )}
        </p>
      )}

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </article>
  );
}
