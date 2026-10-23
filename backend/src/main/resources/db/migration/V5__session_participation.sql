ALTER TABLE cupping_sessions
    ADD COLUMN creator_participates BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN participation_token VARCHAR(64)
        CHARACTER SET ascii COLLATE ascii_bin NULL,
    ADD CONSTRAINT uq_session_participation_token
        UNIQUE (participation_token);

-- Recover the creator's participation choice for existing sessions.
UPDATE cupping_sessions cs
SET creator_participates = EXISTS (
    SELECT 1
    FROM session_evaluators se
    WHERE se.session_id = cs.session_id
      AND se.user_id = cs.created_by
);
