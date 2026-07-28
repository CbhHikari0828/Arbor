CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE knowledge_node_status AS ENUM ('seed', 'exploring', 'summarized');
CREATE TYPE discussion_message_role AS ENUM ('user', 'assistant');

CREATE TABLE knowledge_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES knowledge_nodes(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    tags TEXT[] NOT NULL DEFAULT '{}',
    status knowledge_node_status NOT NULL DEFAULT 'seed',
    position_x DOUBLE PRECISION NOT NULL DEFAULT 0,
    position_y DOUBLE PRECISION NOT NULL DEFAULT 0,
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE knowledge_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
    label TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT knowledge_edges_unique_pair UNIQUE (source_id, target_id)
);

CREATE TABLE discussion_branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_from_message_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE discussion_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES discussion_branches(id) ON DELETE CASCADE,
    role discussion_message_role NOT NULL,
    content TEXT NOT NULL,
    model_id TEXT,
    parent_message_id UUID REFERENCES discussion_messages(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE discussion_branches
    ADD CONSTRAINT discussion_branches_created_from_message_id_fkey
    FOREIGN KEY (created_from_message_id)
    REFERENCES discussion_messages(id)
    ON DELETE SET NULL;

CREATE TABLE knowledge_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID NOT NULL UNIQUE REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
    thesis TEXT NOT NULL DEFAULT '',
    bullets TEXT[] NOT NULL DEFAULT '{}',
    open_questions TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_knowledge_nodes_parent_id ON knowledge_nodes(parent_id);
CREATE INDEX idx_knowledge_nodes_deleted_at ON knowledge_nodes(deleted_at);
CREATE INDEX idx_knowledge_nodes_is_favorite ON knowledge_nodes(is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX idx_knowledge_edges_source_id ON knowledge_edges(source_id);
CREATE INDEX idx_knowledge_edges_target_id ON knowledge_edges(target_id);
CREATE INDEX idx_discussion_branches_node_id ON discussion_branches(node_id);
CREATE INDEX idx_discussion_messages_branch_id_created_at ON discussion_messages(branch_id, created_at);
CREATE INDEX idx_knowledge_summaries_node_id ON knowledge_summaries(node_id);

CREATE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_knowledge_nodes_updated_at
BEFORE UPDATE ON knowledge_nodes
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_knowledge_edges_updated_at
BEFORE UPDATE ON knowledge_edges
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_discussion_branches_updated_at
BEFORE UPDATE ON discussion_branches
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_knowledge_summaries_updated_at
BEFORE UPDATE ON knowledge_summaries
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
