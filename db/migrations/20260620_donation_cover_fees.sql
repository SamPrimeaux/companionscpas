-- Track intended gift vs gross Stripe charge when donor covers processing fees
ALTER TABLE donations ADD COLUMN intended_amount_cents INTEGER;
ALTER TABLE donations ADD COLUMN cover_fees INTEGER DEFAULT 0;
