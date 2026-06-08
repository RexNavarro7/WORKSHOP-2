import {
  Contract,
  TransactionBuilder,
  Account,
  rpc,
  nativeToScVal,
  scValToNative,
  Address,
  BASE_FEE,
} from '@stellar/stellar-sdk';
import {
  server,
  NETWORK_PASSPHRASE,
  JOURNALISM_CONTRACT_ID,
  USDC_CONTRACT_ID,
  TX_TIMEOUT_SECONDS,
} from './stellar';

const READ_SOURCE = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

/** $0.02 USDC — 7 decimal places → 200,000 stroops */
export const ARTICLE_PRICE_STROOPS = 200_000;

/** Turn raw Soroban simulation errors into actionable messages. */
export function parsePaywallSimulationError(raw: string): string {
  if (raw.includes('trustline entry is missing')) {
    return (
      'The journalist wallet cannot receive USDC yet (no trustline on the recipient account). ' +
      'An admin must run: .\\scripts\\setup-journalist.ps1'
    );
  }
  if (
    raw.includes('insufficient balance') ||
    raw.includes('InsufficientBalance') ||
    raw.includes('balance is too low')
  ) {
    return (
      'Your wallet does not have enough USDC. Add a USDC trustline on this page, ' +
      'then get testnet USDC from https://faucet.circle.com/'
    );
  }
  if (raw.includes('trustline') && raw.includes('missing')) {
    return 'A USDC trustline is missing. Click "Add USDC trustline" above, then try again.';
  }
  return raw;
}

export function journalismContractConfigured(): boolean {
  return Boolean(JOURNALISM_CONTRACT_ID);
}

/** Read is_unlocked(user, article_id) via simulation — no wallet required. */
export async function readIsUnlocked(
  userAddress: string,
  articleId: string,
): Promise<boolean> {
  const contract = new Contract(JOURNALISM_CONTRACT_ID);
  const source = new Account(READ_SOURCE, '0');

  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'is_unlocked',
        new Address(userAddress).toScVal(),
        nativeToScVal(articleId, { type: 'symbol' }),
      ),
    )
    .setTimeout(TX_TIMEOUT_SECONDS)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (!rpc.Api.isSimulationSuccess(sim) || sim.result === undefined) {
    throw new Error('Could not read unlock status. Is the contract deployed?');
  }

  return scValToNative(sim.result.retval) as boolean;
}

/**
 * Build + simulate + assemble an unsigned pay_for_article invocation.
 * Returns XDR ready for Freighter to sign.
 */
export async function buildPayForArticleXDR(
  sender: string,
  articleId: string,
  journalistAddress: string,
  amountStroops: number = ARTICLE_PRICE_STROOPS,
): Promise<string> {
  const contract = new Contract(JOURNALISM_CONTRACT_ID);
  const account = await server.getAccount(sender);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'pay_for_article',
        new Address(sender).toScVal(),
        nativeToScVal(articleId, { type: 'symbol' }),
        new Address(journalistAddress).toScVal(),
        nativeToScVal(BigInt(amountStroops), { type: 'i128' }),
      ),
    )
    .setTimeout(TX_TIMEOUT_SECONDS)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (!rpc.Api.isSimulationSuccess(sim)) {
    const detail =
      'error' in sim && sim.error ? String(sim.error) : 'simulation failed';
    throw new Error(parsePaywallSimulationError(detail));
  }

  return rpc.assembleTransaction(tx, sim).build().toXDR();
}

export { USDC_CONTRACT_ID };
