-- REST API Configuration Table
CREATE TABLE IF NOT EXISTS rest_api_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  enabled INTEGER DEFAULT 0,
  port INTEGER DEFAULT 8080,
  allow_external_access INTEGER DEFAULT 0,
  rate_limit INTEGER DEFAULT 100,
  api_key TEXT,
  webhook_url TEXT,
  webhook_enabled INTEGER DEFAULT 0,
  webhook_events TEXT DEFAULT '["message","status"]',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CHECK (id = 1)
);

-- REST API Keys Table
CREATE TABLE IF NOT EXISTS rest_api_keys (
  id TEXT PRIMARY KEY,
  api_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  last_used_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- REST API Usage Logs Table
CREATE TABLE IF NOT EXISTS rest_api_logs (
  id TEXT PRIMARY KEY,
  api_key TEXT,
  method TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  response_code INTEGER,
  response_time INTEGER,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (api_key) REFERENCES rest_api_keys(api_key)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rest_api_logs_timestamp ON rest_api_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_rest_api_logs_api_key ON rest_api_logs(api_key);
CREATE INDEX IF NOT EXISTS idx_rest_api_keys_active ON rest_api_keys(is_active);

