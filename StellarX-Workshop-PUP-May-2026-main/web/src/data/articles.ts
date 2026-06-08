export interface Article {
  id: string;
  title: string;
  summary: string;
  author: string;
  /** Stellar public key that receives USDC micropayments */
  authorAddress: string;
  neighborhood: string;
  publishedAt: string;
  /** Full investigative body — revealed after unlock */
  body: string;
}

/** Sample hyper-local journalism content for the PUP QC workshop demo */
export const ARTICLES: Article[] = [
  {
    id: 'flood_pump',
    title: 'Who Maintains the Barangay Flood Pumps?',
    summary:
      'A three-month investigation into why three barangays along the Pasig River flood every monsoon — and where the maintenance budget goes.',
    author: 'Mara Santos',
    authorAddress: 'GAR6VAWBMYWGNLQ72JWCMPIU3PAMI4QI56VVLKZW7SGX4OH2XUQ2HELN',
    neighborhood: 'Santa Mesa, Manila',
    publishedAt: '2026-06-01',
    body: `Every June, residents of Block 14 watch the alley turn into a canal. This year we traced ₱2.4M in barangay disaster funds through three contractors — only one of whom filed a valid business permit.

City engineering records obtained via FOI show pump inspections logged on paper but never uploaded to the central system. Two of four pumps on M. Dela Fuente St. have been offline since March.

"We report it every week," said tricycle driver Jun Reyes, 52. "Nothing changes until the TV crews arrive."

The barangay captain declined three interview requests. The city engineer's office said repairs are "scheduled for Q3."`,
  },
  {
    id: 'jeepney_route',
    title: 'The Last Jeepney on Recto Avenue',
    summary:
      'How one cooperative fought consolidation — and what their survival means for 400 daily commuters.',
    author: 'Rico Delgado',
    authorAddress: 'GAR6VAWBMYWGNLQ72JWCMPIU3PAMI4QI56VVLKZW7SGX4OH2XUQ2HELN',
    neighborhood: 'Recto, Manila',
    publishedAt: '2026-05-28',
    body: `Route 816 was supposed to disappear in January. Instead, 12 drivers pooled savings, refinanced one jeepney, and kept running — illegally, according to LTFRB records, but daily for the nurses and students who depend on it.

We rode the route for two weeks, counting passengers and timing gaps versus the nearest modernized alternative: a 22-minute longer walk plus two transfers.

Cooperative treasurer Lita Cruz showed us ledgers: fuel up 18%, fares flat since 2023. "We are not against modernization," she said. "We are against being erased without a plan."

This report includes the full LTFRB case file number and the cooperative's proposed transition timeline.`,
  },
  {
    id: 'market_rent',
    title: 'Silent Rent Hikes at Quinta Market',
    summary:
      'Vendors say fees doubled overnight. Stall assignment records tell a different story than the market administrator\'s press release.',
    author: 'Ana Villanueva',
    authorAddress: 'GAR6VAWBMYWGNLQ72JWCMPIU3PAMI4QI56VVLKZW7SGX4OH2XUQ2HELN',
    neighborhood: 'Quiapo, Manila',
    publishedAt: '2026-05-25',
    body: `Forty-seven vendors signed a complaint letter in April. By May, twelve had withdrawn their names. We interviewed both groups.

The administrator cited "facility upgrades" for a fee increase from ₱850 to ₱1,600 per month. Our site visit found one new ceiling fan and repainted walls in Aisle C only.

Historical lease documents, cross-referenced with city market authority archives, show no approved rate change for 2026. Legal aid clinic Pro Bono Manila is preparing a petition.

"I have sold fish here for nineteen years," vendor Cora Mendoza said. "This is the first time the receipt and the announcement did not match."`,
  },
];
