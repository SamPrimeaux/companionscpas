/** Stripe fee gross-up: nonprofit nets intendedCents after 2.9% + $0.30 (live). */
export function calculateWithFees(intendedCents) {
  const n = Number(intendedCents) || 0;
  if (n <= 0) return 0;
  return Math.ceil((n + 30) / (1 - 0.029));
}

export function feeAmount(intendedCents) {
  return calculateWithFees(intendedCents) - Number(intendedCents || 0);
}

export function resolveDonationAmounts(data = {}, piMeta = {}) {
  const intendedCents = Number(
    data.intended_cents ?? piMeta.intended_cents ?? data.amount_cents ?? piMeta.amount_cents ?? 0
  ) || 0;
  const coverFees = Boolean(
    data.cover_fees === true || data.cover_fees === 1 || data.cover_fees === "true"
    || piMeta.cover_fees === "true" || piMeta.cover_fees === true
  );
  const chargeCents = coverFees && intendedCents > 0
    ? calculateWithFees(intendedCents)
    : (Number(data.amount_cents ?? piMeta.amount_cents ?? intendedCents) || intendedCents);
  return { intendedCents, chargeCents, coverFees };
}
