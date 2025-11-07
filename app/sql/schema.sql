-- Customers catalog used by the query API
CREATE TABLE IF NOT EXISTS customers (
  rut VARCHAR(12) PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
CREATE TRIGGER trg_customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION set_customers_updated_at();

-- Event log that stores every payload received by the API
CREATE TABLE IF NOT EXISTS customer_events (
  id BIGSERIAL PRIMARY KEY,
  rut VARCHAR(12) NOT NULL REFERENCES customers (rut) ON DELETE CASCADE,
  request_id UUID NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_events_rut_created_at
  ON customer_events (rut, created_at DESC);
