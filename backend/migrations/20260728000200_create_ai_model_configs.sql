CREATE TABLE ai_model_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    base_url TEXT NOT NULL,
    model_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    api_key_ciphertext BYTEA NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ai_model_configs_provider_model_unique UNIQUE (provider, base_url, model_name)
);

CREATE UNIQUE INDEX idx_ai_model_configs_default
ON ai_model_configs (is_default)
WHERE is_default = TRUE;

CREATE INDEX idx_ai_model_configs_enabled
ON ai_model_configs (is_enabled)
WHERE is_enabled = TRUE;

CREATE TRIGGER set_ai_model_configs_updated_at
BEFORE UPDATE ON ai_model_configs
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
