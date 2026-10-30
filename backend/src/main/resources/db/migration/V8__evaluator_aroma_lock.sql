-- One aroma-stage lock per evaluator/session.
-- Written using an authoritative UTC backend timestamp.
-- Existing records remain NULL; do not invent historical lock times.
ALTER TABLE session_evaluators
    ADD COLUMN aroma_locked_at DATETIME(6) NULL;
