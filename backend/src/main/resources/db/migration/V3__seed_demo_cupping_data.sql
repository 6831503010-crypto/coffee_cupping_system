-- DEMONSTRATION DATA ONLY. Flyway executes this V3 migration ONCE after V1 and V2.
-- Put into backend/src/main/resources/db/migration/V3__seed_demo_cupping_data.sql
-- Not for production: creates five log-in-enabled demo accounts with a known password.
-- Password for ALL seeded accounts: CoffeeDemo#2026
-- MySQL 8+; uses session variables / LAST_INSERT_ID() to work with existing rows.
--
-- CASE 1: Organizer creates two samples; first sample appears in an EVENT session
--         where three OTHER users each submit one evaluation.
-- CASE 2: Another user creates a sample and an INDIVIDUAL session, and
--         evaluates it as the only judge.
-- Plus 48 checkbox options: 24 AROMA_QUALITY and 24 FLAVOR_QUALITY.
-- Example evaluation scores/totals are illustrative, not authoritative scoring rules.

-- 1. Registered demo users (BCrypt hashes compatible with Spring Security).

INSERT INTO users (name, email, password_hash, qualification_status, qualification_confirmed_at, created_at)
VALUES ('Demo Organizer', 'organizer@cupping-demo.test', '$2a$10$IaDyfS3QSw9U38jcjHvWQe6w/DsLE9cvC1hbw5Wmn16PclVfZ.n5K', NULL, NULL, '2026-10-08 09:00:00');

SET @demo_owner_id := LAST_INSERT_ID();



INSERT INTO users (name, email, password_hash, qualification_status, qualification_confirmed_at, created_at)
VALUES ('Judge Anna', 'anna@cupping-demo.test', '$2a$10$7FNMlo0T04guGoeQ0hxyw.RJE0NAWFsLPkwetpaVjgXXjxOH60Gw6', 'QUALIFIED', '2026-10-09 10:00:00', '2026-10-08 09:00:00');

SET @demo_judge1_id := LAST_INSERT_ID();



INSERT INTO users (name, email, password_hash, qualification_status, qualification_confirmed_at, created_at)
VALUES ('Judge Ben', 'ben@cupping-demo.test', '$2a$10$k0HGaNdfP6DemlhHyauX1evKazwOOddpyWkcYAGw3gIeExsQSkXe6', 'QUALIFIED', '2026-10-09 10:00:00', '2026-10-08 09:00:00');

SET @demo_judge2_id := LAST_INSERT_ID();



INSERT INTO users (name, email, password_hash, qualification_status, qualification_confirmed_at, created_at)
VALUES ('Judge Chaya', 'chaya@cupping-demo.test', '$2a$10$WalHv5uR89rpMfjo5IpOOu8zDk0Gj2kIjqqt2to3YWyCPR5.XqcGW', 'QUALIFIED', '2026-10-09 10:00:00', '2026-10-08 09:00:00');

SET @demo_judge3_id := LAST_INSERT_ID();



INSERT INTO users (name, email, password_hash, qualification_status, qualification_confirmed_at, created_at)
VALUES ('Solo Cupper', 'solo@cupping-demo.test', '$2a$10$g6Vc4QIkjMln8sVcbLQfpOXeVdXB8YrjPhGADGqT2EI95w1XmL.KG', NULL, NULL, '2026-10-08 09:00:00');

SET @demo_solo_id := LAST_INSERT_ID();



-- 2. Reference defect types; no dummy evaluation has a defect penalty.

INSERT INTO defect_types (defect_name, points_per_cup, description)
VALUES ('Taint', 2, 'Demo lookup: noticeable but not overpowering defect (illustrative).');

INSERT INTO defect_types (defect_name, points_per_cup, description)
VALUES ('Fault', 4, 'Demo lookup: serious defect (illustrative).');



-- 3. Evaluation checkbox options from the Aroma Qualities and Flavor Qualities images.

-- option_type is AROMA_QUALITY or FLAVOR_QUALITY; parent_option_id defines nesting.

-- Only rows inserted by this migration may be used for the dummy selections.

SET @demo_previous_max_option_id := (SELECT COALESCE(MAX(option_id), 0) FROM evaluation_options);



-- AROMA_QUALITY (9 parents + 15 children).

INSERT INTO evaluation_options (option_name, option_type, parent_option_id, active)
VALUES ('Floral', 'AROMA_QUALITY', NULL, TRUE);



INSERT INTO evaluation_options (option_name, option_type, parent_option_id, active)
VALUES ('Fruity', 'AROMA_QUALITY', NULL, TRUE);

SET @demo_aroma_parent_2 := LAST_INSERT_ID();

INSERT INTO evaluation_options (option_name, option_type, parent_option_id, active)
VALUES
  ('Berry', 'AROMA_QUALITY', @demo_aroma_parent_2, TRUE),
  ('Dried Fruit', 'AROMA_QUALITY', @demo_aroma_parent_2, TRUE),
  ('Citrus Fruit', 'AROMA_QUALITY', @demo_aroma_parent_2, TRUE);



INSERT INTO evaluation_options (option_name, option_type, parent_option_id, active)
VALUES ('Roasted', 'AROMA_QUALITY', NULL, TRUE);

SET @demo_aroma_parent_3 := LAST_INSERT_ID();

INSERT INTO evaluation_options (option_name, option_type, parent_option_id, active)
VALUES
  ('Cereal', 'AROMA_QUALITY', @demo_aroma_parent_3, TRUE),
  ('Burnt', 'AROMA_QUALITY', @demo_aroma_parent_3, TRUE),
  ('Tobacco', 'AROMA_QUALITY', @demo_aroma_parent_3, TRUE);



INSERT INTO evaluation_options (option_name, option_type, parent_option_id, active)
VALUES ('Sour/Fermented', 'AROMA_QUALITY', NULL, TRUE);

SET @demo_aroma_parent_4 := LAST_INSERT_ID();

INSERT INTO evaluation_options (option_name, option_type, parent_option_id, active)
VALUES
  ('Sour', 'AROMA_QUALITY', @demo_aroma_parent_4, TRUE),
  ('Fermented', 'AROMA_QUALITY', @demo_aroma_parent_4, TRUE);



INSERT INTO evaluation_options (option_name, option_type, parent_option_id, active)
VALUES ('Nutty/Cocoa', 'AROMA_QUALITY', NULL, TRUE);

SET @demo_aroma_parent_5 := LAST_INSERT_ID();

INSERT INTO evaluation_options (option_name, option_type, parent_option_id, active)
VALUES
  ('Nutty', 'AROMA_QUALITY', @demo_aroma_parent_5, TRUE),
  ('Cocoa', 'AROMA_QUALITY', @demo_aroma_parent_5, TRUE);



INSERT INTO evaluation_options (option_name, option_type, parent_option_id, active)
VALUES ('Green/Vegetative', 'AROMA_QUALITY', NULL, TRUE);



INSERT INTO evaluation_options (option_name, option_type, parent_option_id, active)
VALUES ('Spice', 'AROMA_QUALITY', NULL, TRUE);



INSERT INTO evaluation_options (option_name, option_type, parent_option_id, active)
VALUES ('Sweet', 'AROMA_QUALITY', NULL, TRUE);

SET @demo_aroma_parent_8 := LAST_INSERT_ID();

INSERT INTO evaluation_options (option_name, option_type, parent_option_id, active)
VALUES
  ('Vanilla/Vanillin', 'AROMA_QUALITY', @demo_aroma_parent_8, TRUE),
  ('Brown Sugar', 'AROMA_QUALITY', @demo_aroma_parent_8, TRUE);



INSERT INTO evaluation_options (option_name, option_type, parent_option_id, active)
VALUES ('Other', 'AROMA_QUALITY', NULL, TRUE);

SET @demo_aroma_parent_9 := LAST_INSERT_ID();

INSERT INTO evaluation_options (option_name, option_type, parent_option_id, active)
VALUES
  ('Chemical', 'AROMA_QUALITY', @demo_aroma_parent_9, TRUE),
  ('Musty/Earthy', 'AROMA_QUALITY', @demo_aroma_parent_9, TRUE),
  ('Woody', 'AROMA_QUALITY', @demo_aroma_parent_9, TRUE);



-- FLAVOR_QUALITY (9 parents + 15 children).

INSERT INTO evaluation_options (option_name, option_type, parent_option_id, active)
VALUES ('Floral', 'FLAVOR_QUALITY', NULL, TRUE);



INSERT INTO evaluation_options (option_name, option_type, parent_option_id, active)
VALUES ('Fruity', 'FLAVOR_QUALITY', NULL, TRUE);

SET @demo_flavor_parent_2 := LAST_INSERT_ID();

INSERT INTO evaluation_options (option_name, option_type, parent_option_id, active)
VALUES
  ('Berry', 'FLAVOR_QUALITY', @demo_flavor_parent_2, TRUE),
  ('Dried Fruit', 'FLAVOR_QUALITY', @demo_flavor_parent_2, TRUE),
  ('Citrus Fruit', 'FLAVOR_QUALITY', @demo_flavor_parent_2, TRUE);



INSERT INTO evaluation_options (option_name, option_type, parent_option_id, active)
VALUES ('Roasted', 'FLAVOR_QUALITY', NULL, TRUE);

SET @demo_flavor_parent_3 := LAST_INSERT_ID();

INSERT INTO evaluation_options (option_name, option_type, parent_option_id, active)
VALUES
  ('Cereal', 'FLAVOR_QUALITY', @demo_flavor_parent_3, TRUE),
  ('Burnt', 'FLAVOR_QUALITY', @demo_flavor_parent_3, TRUE),
  ('Tobacco', 'FLAVOR_QUALITY', @demo_flavor_parent_3, TRUE);



INSERT INTO evaluation_options (option_name, option_type, parent_option_id, active)
VALUES ('Sour/Fermented', 'FLAVOR_QUALITY', NULL, TRUE);

SET @demo_flavor_parent_4 := LAST_INSERT_ID();

INSERT INTO evaluation_options (option_name, option_type, parent_option_id, active)
VALUES
  ('Sour', 'FLAVOR_QUALITY', @demo_flavor_parent_4, TRUE),
  ('Fermented', 'FLAVOR_QUALITY', @demo_flavor_parent_4, TRUE);



INSERT INTO evaluation_options (option_name, option_type, parent_option_id, active)
VALUES ('Nutty/Cocoa', 'FLAVOR_QUALITY', NULL, TRUE);

SET @demo_flavor_parent_5 := LAST_INSERT_ID();

INSERT INTO evaluation_options (option_name, option_type, parent_option_id, active)
VALUES
  ('Nutty', 'FLAVOR_QUALITY', @demo_flavor_parent_5, TRUE),
  ('Cocoa', 'FLAVOR_QUALITY', @demo_flavor_parent_5, TRUE);



INSERT INTO evaluation_options (option_name, option_type, parent_option_id, active)
VALUES ('Green/Vegetative', 'FLAVOR_QUALITY', NULL, TRUE);



INSERT INTO evaluation_options (option_name, option_type, parent_option_id, active)
VALUES ('Spice', 'FLAVOR_QUALITY', NULL, TRUE);



INSERT INTO evaluation_options (option_name, option_type, parent_option_id, active)
VALUES ('Sweet', 'FLAVOR_QUALITY', NULL, TRUE);

SET @demo_flavor_parent_8 := LAST_INSERT_ID();

INSERT INTO evaluation_options (option_name, option_type, parent_option_id, active)
VALUES
  ('Vanilla/Vanillin', 'FLAVOR_QUALITY', @demo_flavor_parent_8, TRUE),
  ('Brown Sugar', 'FLAVOR_QUALITY', @demo_flavor_parent_8, TRUE);



INSERT INTO evaluation_options (option_name, option_type, parent_option_id, active)
VALUES ('Other', 'FLAVOR_QUALITY', NULL, TRUE);

SET @demo_flavor_parent_9 := LAST_INSERT_ID();

INSERT INTO evaluation_options (option_name, option_type, parent_option_id, active)
VALUES
  ('Chemical', 'FLAVOR_QUALITY', @demo_flavor_parent_9, TRUE),
  ('Musty/Earthy', 'FLAVOR_QUALITY', @demo_flavor_parent_9, TRUE),
  ('Woody', 'FLAVOR_QUALITY', @demo_flavor_parent_9, TRUE);



-- 4. CASE 1: Organizer creates TWO coffee samples. Only the first is cupped.

INSERT INTO coffee_samples (created_by, sample_name, process, harvest_year, growing_location, owner_producer, created_at)
VALUES (@demo_owner_id, 'Ethiopia Sidama Natural (Demo)', 'NATURAL', 2026, 'Sidama, Ethiopia', 'Demo Sidama Cooperative', '2026-10-10 09:00:00');

SET @demo_sample_one_id := LAST_INSERT_ID();



INSERT INTO coffee_samples (created_by, sample_name, process, harvest_year, growing_location, owner_producer, created_at)
VALUES (@demo_owner_id, 'Colombia Huila Washed (Demo)', 'WASHED', 2026, 'Huila, Colombia', 'Demo Huila Farm', '2026-10-10 09:00:00');

SET @demo_sample_two_id := LAST_INSERT_ID();



INSERT INTO cupping_sessions (created_by, session_name, mode, description, cupping_date, status, result_visibility, finalized_at, created_at)
VALUES (@demo_owner_id, 'Demo Event - Ethiopia Sample 1', 'EVENT', 'One of two samples; three judges evaluate the first sample.', '2026-10-12 10:00:00', 'FINALIZED', 'PUBLIC', '2026-10-12 12:00:00', '2026-10-10 10:00:00');

SET @demo_event_session_id := LAST_INSERT_ID();

INSERT INTO session_samples (session_id, sample_id, sample_code, display_order)
VALUES (@demo_event_session_id, @demo_sample_one_id, 'EVT-A01', 1);

SET @demo_event_session_sample_id := LAST_INSERT_ID();

INSERT INTO session_evaluators (session_id, user_id, joined_at, created_at)
VALUES (@demo_event_session_id, @demo_judge1_id, '2026-10-12 09:45:00', '2026-10-11 09:00:00');

SET @demo_judge1_session_evaluator_id := LAST_INSERT_ID();

INSERT INTO session_evaluators (session_id, user_id, joined_at, created_at)
VALUES (@demo_event_session_id, @demo_judge2_id, '2026-10-12 09:45:00', '2026-10-11 09:00:00');

SET @demo_judge2_session_evaluator_id := LAST_INSERT_ID();

INSERT INTO session_evaluators (session_id, user_id, joined_at, created_at)
VALUES (@demo_event_session_id, @demo_judge3_id, '2026-10-12 09:45:00', '2026-10-11 09:00:00');

SET @demo_judge3_session_evaluator_id := LAST_INSERT_ID();



-- 5. CASE 2: Different user creates their OWN sample and evaluates it alone.

INSERT INTO coffee_samples (created_by, sample_name, process, harvest_year, growing_location, owner_producer, created_at)
VALUES (@demo_solo_id, 'Thailand Chiang Rai Honey (Demo)', 'HONEY', 2026, 'Chiang Rai, Thailand', 'Demo Northern Thailand Farm', '2026-10-13 08:00:00');

SET @demo_solo_sample_id := LAST_INSERT_ID();

INSERT INTO cupping_sessions (created_by, session_name, mode, description, cupping_date, status, result_visibility, finalized_at, created_at)
VALUES (@demo_solo_id, 'Demo Personal Cupping - Chiang Rai', 'INDIVIDUAL', 'One creator, one assigned evaluator, one sample.', '2026-10-14 14:00:00', 'FINALIZED', 'PRIVATE', '2026-10-14 15:30:00', '2026-10-13 08:15:00');

SET @demo_solo_session_id := LAST_INSERT_ID();

INSERT INTO session_samples (session_id, sample_id, sample_code, display_order)
VALUES (@demo_solo_session_id, @demo_solo_sample_id, 'IND-A01', 1);

SET @demo_solo_session_sample_id := LAST_INSERT_ID();

INSERT INTO session_evaluators (session_id, user_id, joined_at, created_at)
VALUES (@demo_solo_session_id, @demo_solo_id, '2026-10-14 13:55:00', '2026-10-13 08:15:00');

SET @demo_solo_session_evaluator_id := LAST_INSERT_ID();



-- 6. One finalized evaluation per assigned judge/session sample.

INSERT INTO evaluations (
  session_evaluator_id, session_sample_id, status, dry_aroma, break_aroma, color_intensity, aroma_quality_score, flavor_score, aftertaste_score, acidity_score, body_score, balance_score, uniformity_score, clean_cup_score, sweetness_score, overall_score, acidity_intensity, body_level, defect_type_id, total_score, finalized_at, created_at, updated_at
) VALUES (
  @demo_judge1_session_evaluator_id, @demo_event_session_sample_id, 'FINALIZED', 8, 8, 'MEDIUM', 8.25, 8.50, 8.00, 8.25, 7.50, 8.00, 10.00, 10.00, 10.00, 8.25, 7, 6, NULL, 86.75, '2026-10-12 11:30:00', '2026-10-12 10:15:00', '2026-10-12 11:30:00'
);

SET @demo_judge1_evaluation_id := LAST_INSERT_ID();



INSERT INTO evaluations (
  session_evaluator_id, session_sample_id, status, dry_aroma, break_aroma, color_intensity, aroma_quality_score, flavor_score, aftertaste_score, acidity_score, body_score, balance_score, uniformity_score, clean_cup_score, sweetness_score, overall_score, acidity_intensity, body_level, defect_type_id, total_score, finalized_at, created_at, updated_at
) VALUES (
  @demo_judge2_session_evaluator_id, @demo_event_session_sample_id, 'FINALIZED', 8, 7, 'LIGHT', 8.00, 8.25, 7.75, 8.00, 8.00, 7.75, 10.00, 10.00, 10.00, 8.00, 7, 6, NULL, 85.75, '2026-10-12 11:30:00', '2026-10-12 10:15:00', '2026-10-12 11:30:00'
);

SET @demo_judge2_evaluation_id := LAST_INSERT_ID();



INSERT INTO evaluations (
  session_evaluator_id, session_sample_id, status, dry_aroma, break_aroma, color_intensity, aroma_quality_score, flavor_score, aftertaste_score, acidity_score, body_score, balance_score, uniformity_score, clean_cup_score, sweetness_score, overall_score, acidity_intensity, body_level, defect_type_id, total_score, finalized_at, created_at, updated_at
) VALUES (
  @demo_judge3_session_evaluator_id, @demo_event_session_sample_id, 'FINALIZED', 7, 7, 'MEDIUM', 7.75, 7.75, 7.50, 7.75, 8.00, 7.75, 10.00, 10.00, 10.00, 7.75, 6, 7, NULL, 84.25, '2026-10-12 11:30:00', '2026-10-12 10:15:00', '2026-10-12 11:30:00'
);

SET @demo_judge3_evaluation_id := LAST_INSERT_ID();



INSERT INTO evaluations (
  session_evaluator_id, session_sample_id, status, dry_aroma, break_aroma, color_intensity, aroma_quality_score, flavor_score, aftertaste_score, acidity_score, body_score, balance_score, uniformity_score, clean_cup_score, sweetness_score, overall_score, acidity_intensity, body_level, defect_type_id, total_score, finalized_at, created_at, updated_at
) VALUES (
  @demo_solo_session_evaluator_id, @demo_solo_session_sample_id, 'FINALIZED', 8, 8, 'MEDIUM', 8.00, 8.25, 8.00, 8.00, 7.75, 8.00, 10.00, 10.00, 10.00, 8.25, 7, 7, NULL, 86.25, '2026-10-14 15:20:00', '2026-10-14 14:10:00', '2026-10-14 15:20:00'
);

SET @demo_solo_evaluation_id := LAST_INSERT_ID();



-- 7. Five observed cups per evaluation; 1 = passed uniformity, clean cup, sweetness.

INSERT INTO defect_cup_evaluations (evaluation_id, cup_number, uniformity, clean_cup, sweetness) VALUES
  (@demo_judge1_evaluation_id, 1, TRUE, TRUE, TRUE),
  (@demo_judge1_evaluation_id, 2, TRUE, TRUE, TRUE),
  (@demo_judge1_evaluation_id, 3, TRUE, TRUE, TRUE),
  (@demo_judge1_evaluation_id, 4, TRUE, TRUE, TRUE),
  (@demo_judge1_evaluation_id, 5, TRUE, TRUE, TRUE);



INSERT INTO defect_cup_evaluations (evaluation_id, cup_number, uniformity, clean_cup, sweetness) VALUES
  (@demo_judge2_evaluation_id, 1, TRUE, TRUE, TRUE),
  (@demo_judge2_evaluation_id, 2, TRUE, TRUE, TRUE),
  (@demo_judge2_evaluation_id, 3, TRUE, TRUE, TRUE),
  (@demo_judge2_evaluation_id, 4, TRUE, TRUE, TRUE),
  (@demo_judge2_evaluation_id, 5, TRUE, TRUE, TRUE);



INSERT INTO defect_cup_evaluations (evaluation_id, cup_number, uniformity, clean_cup, sweetness) VALUES
  (@demo_judge3_evaluation_id, 1, TRUE, TRUE, TRUE),
  (@demo_judge3_evaluation_id, 2, TRUE, TRUE, TRUE),
  (@demo_judge3_evaluation_id, 3, TRUE, TRUE, TRUE),
  (@demo_judge3_evaluation_id, 4, TRUE, TRUE, TRUE),
  (@demo_judge3_evaluation_id, 5, TRUE, TRUE, TRUE);



INSERT INTO defect_cup_evaluations (evaluation_id, cup_number, uniformity, clean_cup, sweetness) VALUES
  (@demo_solo_evaluation_id, 1, TRUE, TRUE, TRUE),
  (@demo_solo_evaluation_id, 2, TRUE, TRUE, TRUE),
  (@demo_solo_evaluation_id, 3, TRUE, TRUE, TRUE),
  (@demo_solo_evaluation_id, 4, TRUE, TRUE, TRUE),
  (@demo_solo_evaluation_id, 5, TRUE, TRUE, TRUE);



-- 8. Checked option selections for BOTH quality sections; select parent AND child.

-- Limit selections to option IDs created here to avoid matching old names in existing DBs.

INSERT INTO evaluation_option_selections (evaluation_id, option_id)
SELECT @demo_judge1_evaluation_id, option_id
FROM evaluation_options
WHERE option_id > @demo_previous_max_option_id
  AND option_type = 'AROMA_QUALITY'
  AND option_name IN ('Floral', 'Fruity', 'Berry', 'Citrus Fruit', 'Sweet', 'Brown Sugar');



INSERT INTO evaluation_option_selections (evaluation_id, option_id)
SELECT @demo_judge1_evaluation_id, option_id
FROM evaluation_options
WHERE option_id > @demo_previous_max_option_id
  AND option_type = 'FLAVOR_QUALITY'
  AND option_name IN ('Floral', 'Fruity', 'Berry', 'Citrus Fruit', 'Sweet', 'Brown Sugar');



INSERT INTO evaluation_option_selections (evaluation_id, option_id)
SELECT @demo_judge2_evaluation_id, option_id
FROM evaluation_options
WHERE option_id > @demo_previous_max_option_id
  AND option_type = 'AROMA_QUALITY'
  AND option_name IN ('Fruity', 'Dried Fruit', 'Nutty/Cocoa', 'Cocoa');



INSERT INTO evaluation_option_selections (evaluation_id, option_id)
SELECT @demo_judge2_evaluation_id, option_id
FROM evaluation_options
WHERE option_id > @demo_previous_max_option_id
  AND option_type = 'FLAVOR_QUALITY'
  AND option_name IN ('Fruity', 'Dried Fruit', 'Nutty/Cocoa', 'Cocoa', 'Sweet', 'Brown Sugar');



INSERT INTO evaluation_option_selections (evaluation_id, option_id)
SELECT @demo_judge3_evaluation_id, option_id
FROM evaluation_options
WHERE option_id > @demo_previous_max_option_id
  AND option_type = 'AROMA_QUALITY'
  AND option_name IN ('Roasted', 'Cereal', 'Nutty/Cocoa', 'Nutty', 'Sweet', 'Vanilla/Vanillin');



INSERT INTO evaluation_option_selections (evaluation_id, option_id)
SELECT @demo_judge3_evaluation_id, option_id
FROM evaluation_options
WHERE option_id > @demo_previous_max_option_id
  AND option_type = 'FLAVOR_QUALITY'
  AND option_name IN ('Roasted', 'Cereal', 'Nutty/Cocoa', 'Nutty', 'Sweet', 'Brown Sugar');



INSERT INTO evaluation_option_selections (evaluation_id, option_id)
SELECT @demo_solo_evaluation_id, option_id
FROM evaluation_options
WHERE option_id > @demo_previous_max_option_id
  AND option_type = 'AROMA_QUALITY'
  AND option_name IN ('Floral', 'Fruity', 'Citrus Fruit', 'Spice');



INSERT INTO evaluation_option_selections (evaluation_id, option_id)
SELECT @demo_solo_evaluation_id, option_id
FROM evaluation_options
WHERE option_id > @demo_previous_max_option_id
  AND option_type = 'FLAVOR_QUALITY'
  AND option_name IN ('Floral', 'Fruity', 'Citrus Fruit', 'Sweet', 'Brown Sugar');



-- 9. Free-text tasting notes, one for each evaluation.

INSERT INTO text_evaluations (evaluation_id, `text`)
VALUES (@demo_judge1_evaluation_id, 'Floral aroma, berry and citrus fruit, sweet finish. Good clarity and balance.');

INSERT INTO text_evaluations (evaluation_id, `text`)
VALUES (@demo_judge2_evaluation_id, 'Dried fruit, cocoa and brown sugar; smooth body and rounded acidity.');

INSERT INTO text_evaluations (evaluation_id, `text`)
VALUES (@demo_judge3_evaluation_id, 'Roasted cereal and nutty notes with gentle sweetness; less fruity than other judges.');

INSERT INTO text_evaluations (evaluation_id, `text`)
VALUES (@demo_solo_evaluation_id, 'Fresh citrus and floral aroma, clean cup, sweet aftertaste and medium body.');



-- Note: Session-wide score summaries are calculated by querying evaluations;

-- the V2 schema does not have a summary table. No extra summary row is inserted.
