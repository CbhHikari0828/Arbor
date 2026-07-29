CREATE TABLE discussion_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES discussion_branches(id) ON DELETE CASCADE,
    message_id UUID REFERENCES discussion_messages(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_discussion_notes_branch_id_created_at
ON discussion_notes (branch_id, created_at DESC);

CREATE TRIGGER set_discussion_notes_updated_at
BEFORE UPDATE ON discussion_notes
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
