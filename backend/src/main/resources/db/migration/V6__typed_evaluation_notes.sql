-- Old rows have no stage; leave them NULL instead of inventing an Aroma/Flavor label.
-- MySQL permits multiple NULLs under a UNIQUE index, preserving existing legacy notes.
-- New AROMA/FLAVOR notes are uniquely identified per evaluation.
ALTER TABLE text_evaluations
    ADD COLUMN stage VARCHAR(16) NULL DEFAULT NULL;

CREATE UNIQUE INDEX uq_text_evaluations_stage
    ON text_evaluations (evaluation_id, stage);
