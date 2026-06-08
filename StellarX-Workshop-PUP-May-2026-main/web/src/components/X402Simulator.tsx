'use client';
import { useState, useCallback } from 'react';

type StepStatus = 'idle' | 'active' | 'done' | 'error';

interface FlowStep {
  id: string;
  label: string;
  detail: string;
  payload?: string;
}

const FLOW_STEPS: FlowStep[] = [
  {
    id: 'click',
    label: '1. User opens article',
    detail: 'Next.js renders blurred content with summary card overlay.',
  },
  {
    id: 'rpc_read',
    label: '2. Check authorization (RPC)',
    detail:
      'Soroban RPC simulates is_unlocked(user, article_id) — no wallet signature needed.',
    payload: 'contract.call("is_unlocked", user, "flood_pump") → false',
  },
  {
    id: 'paywall',
    label: '3. x402 intercept',
    detail:
      'HTTP 402 semantics: content withheld until payment. UI shows "Unlock for $0.02 USDC".',
  },
  {
    id: 'build_tx',
    label: '4. Build Soroban transaction',
    detail:
      'TransactionBuilder + simulateTransaction + assembleTransaction produce unsigned XDR.',
    payload:
      'pay_for_article(user, "flood_pump", journalist, 200000) + USDC transfer',
  },
  {
    id: 'freighter',
    label: '5. Freighter signing',
    detail:
      'signTransaction(xdr, { networkPassphrase: TESTNET }) — user approves in extension popup.',
    payload: 'signedTxXdr returned from @stellar/freighter-api v6',
  },
  {
    id: 'submit',
    label: '6. Submit to Testnet',
    detail:
      'server.sendTransaction(signedXdr) → hash. Status PENDING is not success.',
    payload: 'fee: 100 stroops (BASE_FEE) + Soroban resource fees',
  },
  {
    id: 'poll',
    label: '7. Poll to finality',
    detail:
      'getTransaction(hash) every 1s for up to 60s until status === SUCCESS.',
  },
  {
    id: 'unlock',
    label: '8. UI state transition',
    detail:
      'Blur removed. On-chain ledger now maps (user, article_id) → true. Re-reads are instant.',
    payload: 'is_unlocked → true (no second charge)',
  },
];

const INITIAL_STATUS: Record<string, StepStatus> = Object.fromEntries(
  FLOW_STEPS.map((s) => [s.id, 'idle']),
);

export default function X402Simulator() {
  const [statuses, setStatuses] = useState<Record<string, StepStatus>>(INITIAL_STATUS);
  const [running, setRunning] = useState(false);
  const [currentPayload, setCurrentPayload] = useState('');
  const [log, setLog] = useState<string[]>([]);

  const appendLog = (msg: string) =>
    setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const runSimulation = useCallback(async () => {
    setRunning(true);
    setLog([]);
    setStatuses(INITIAL_STATUS);
    setCurrentPayload('');

    for (const step of FLOW_STEPS) {
      setStatuses((prev) => {
        const next = { ...prev };
        for (const s of FLOW_STEPS) {
          if (s.id === step.id) next[s.id] = 'active';
          else if (FLOW_STEPS.indexOf(s) < FLOW_STEPS.indexOf(step)) next[s.id] = 'done';
        }
        return next;
      });

      if (step.payload) setCurrentPayload(step.payload);
      appendLog(step.label);

      // Simulate network / wallet latency per step
      const delay =
        step.id === 'freighter' ? 1200 : step.id === 'poll' ? 1500 : 600;
      await new Promise((r) => setTimeout(r, delay));

      setStatuses((prev) => ({ ...prev, [step.id]: 'done' }));
    }

    appendLog('Flow complete — article unlocked on Soroban ledger');
    setRunning(false);
  }, []);

  const reset = () => {
    setStatuses(INITIAL_STATUS);
    setCurrentPayload('');
    setLog([]);
    setRunning(false);
  };

  return (
    <section className="mt-8 rounded-lg border border-gray-200 bg-white p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            x402 Protocol Flow Simulator
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Visualize the request lifecycle: Next.js → Freighter → Soroban Testnet
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={runSimulation}
            disabled={running}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {running ? 'Running…' : 'Run Simulation'}
          </button>
          <button
            onClick={reset}
            disabled={running}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Flow diagram */}
      <div className="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {['Browser', 'Freighter', 'Soroban RPC', 'Ledger'].map((node, i) => (
          <div
            key={node}
            className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-center text-xs font-medium text-gray-700"
          >
            {node}
            {i < 3 && (
              <span className="hidden text-gray-400 lg:inline"> →</span>
            )}
          </div>
        ))}
      </div>

      {/* Step timeline */}
      <ol className="space-y-2">
        {FLOW_STEPS.map((step) => {
          const st = statuses[step.id];
          return (
            <li
              key={step.id}
              className={`flex gap-3 rounded-lg border p-3 text-sm transition-colors ${
                st === 'active'
                  ? 'border-indigo-400 bg-indigo-50'
                  : st === 'done'
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : st === 'error'
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-100 bg-gray-50/50'
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  st === 'done'
                    ? 'bg-emerald-500 text-white'
                    : st === 'active'
                      ? 'bg-indigo-500 text-white animate-pulse'
                      : 'bg-gray-300 text-gray-600'
                }`}
              >
                {st === 'done' ? '✓' : FLOW_STEPS.indexOf(step) + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">{step.label}</p>
                <p className="mt-0.5 text-xs text-gray-600">{step.detail}</p>
                {step.payload && st !== 'idle' && (
                  <pre className="mt-2 overflow-x-auto rounded bg-gray-900 p-2 text-xs text-emerald-300">
                    {step.payload}
                  </pre>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* Live payload inspector */}
      {currentPayload && (
        <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
            Active payload
          </p>
          <pre className="overflow-x-auto text-xs text-gray-800">{currentPayload}</pre>
        </div>
      )}

      {/* Event log */}
      {log.length > 0 && (
        <div className="mt-4 rounded-lg bg-gray-900 p-3">
          <p className="mb-2 text-xs font-medium text-gray-400">Event log</p>
          <div className="max-h-32 space-y-0.5 overflow-y-auto font-mono text-xs text-gray-300">
            {log.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-gray-500">
        Gas on Stellar: classic fee (~100 stroops) + Soroban resource fees from
        simulation. USDC micropayment (200,000 stroops = $0.02) transfers directly
        to the journalist — not retained by the contract.
      </p>
    </section>
  );
}
