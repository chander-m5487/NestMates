/**
 * Community safety notice for NestMates.
 *
 * The version string is bumped whenever the wording or substance of the
 * notice changes. We store the acknowledged version on the user record so we
 * can re-prompt acknowledgment if (and only if) the policy materially changes.
 *
 * Notes for editors:
 *  - Keep the tone calm and matter-of-fact. The goal is to encourage safe
 *    behavior, not scare users away.
 *  - Each item is a short heading + a one-or-two-sentence body. The UI
 *    renders them as a scrollable list inside a right-pane card.
 *  - Always include a "platform liability" item — that's the clause that
 *    protects NestMates from being held responsible for off-platform
 *    interactions between users.
 */

export const SAFETY_NOTICE_VERSION = 'v1';

export interface SafetyPoint {
  title: string;
  body: string;
}

export const SAFETY_POINTS: SafetyPoint[] = [
  {
    title: 'NestMates is a community platform, not a broker',
    body: 'We help people connect — we do not own, inspect, or vet the listings posted here.',
  },
  {
    title: 'Verify everything in person',
    body: 'Tour the property and meet the host before paying. If you cannot visit, ask someone you trust to.',
  },
  {
    title: 'Never wire money to someone you have not met',
    body: 'Avoid wire transfers, gift cards, or crypto until you have signed a lease and confirmed the property is real.',
  },
  {
    title: 'Use a written lease',
    body: 'Sign a lease that lists the rent, deposit, term, and refund policy — and keep a copy.',
  },
  {
    title: 'Protect your personal information',
    body: 'Share only what is needed for the rental. Never hand over bank passwords or full ID documents to strangers.',
  },
  {
    title: 'Trust your gut',
    body: 'Pricing too good to be true, evasive answers, or rushed payments are red flags — pause and ask more.',
  },
  {
    title: 'Meet in safe, public spaces first',
    body: 'Share your plans with a friend, meet during the day, and bring a companion when you can.',
  },
  {
    title: 'Report anything that feels wrong',
    body: 'Scams, harassment, or unsafe behaviour? Report the listing or user so we can act.',
  },
  {
    title: 'You are responsible for your interactions',
    body: 'Conversations, payments, and leases happen between users. Use NestMates respectfully and follow local laws.',
  },
  {
    title: 'NestMates is not liable for off-platform activity',
    body: 'The platform is provided "as is". To the extent allowed by law, NestMates is not responsible for losses from interactions arranged here.',
  },
];
