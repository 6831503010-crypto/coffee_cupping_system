-- Overall session timing.
-- Stored timestamps will use UTC, enforced by the backend implementation.
ALTER TABLE cupping_sessions
    ADD COLUMN session_started_at DATETIME(6) NULL,
    ADD COLUMN session_ended_at DATETIME(6) NULL,
    ADD COLUMN session_elapsed_seconds BIGINT NULL;

-- One independent evaluation timer per evaluator/session membership.
ALTER TABLE session_evaluators
    ADD COLUMN evaluation_started_at DATETIME(6) NULL,
    ADD COLUMN evaluation_ended_at DATETIME(6) NULL,
    ADD COLUMN elapsed_seconds BIGINT NULL,
    ADD COLUMN completion_outcome VARCHAR(32) NULL;
