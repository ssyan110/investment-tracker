CREATE TABLE daily_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id text NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  date date NOT NULL,
  market_price numeric NOT NULL,
  units numeric NOT NULL,
  market_value numeric NOT NULL,
  cost_basis numeric NOT NULL,
  UNIQUE (asset_id, date)
);

CREATE INDEX idx_daily_snapshots_asset_id ON daily_snapshots(asset_id);
CREATE INDEX idx_daily_snapshots_date ON daily_snapshots(date);
