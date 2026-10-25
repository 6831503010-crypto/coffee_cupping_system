-- V2's sole-evaluator comment is superseded: Individual sessions support 1–10 evaluators.
ALTER TABLE cupping_sessions
    ADD COLUMN evaluator_capacity INT NOT NULL DEFAULT 1;
ALTER TABLE cupping_sessions
    ADD CONSTRAINT chk_individual_capacity
        CHECK (mode <> 'INDIVIDUAL' OR evaluator_capacity BETWEEN 1 AND 10);
-- Inclusion of the creator is represented by their session_evaluators membership.
