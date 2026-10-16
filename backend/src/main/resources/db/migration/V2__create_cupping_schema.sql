-- Coffee cupping database schema (MySQL 8+).
-- V1 already created users. Keep V1 unchanged for existing installations.

ALTER TABLE users
    ADD COLUMN qualification_status VARCHAR(50) NULL,
    ADD COLUMN qualification_confirmed_at DATETIME NULL;

-- Both INDIVIDUAL and EVENT cuppings are represented as sessions.
CREATE TABLE cupping_sessions (
    session_id INT NOT NULL AUTO_INCREMENT,
    created_by INT NOT NULL,
    session_name VARCHAR(255) NOT NULL,
    mode VARCHAR(20) NOT NULL,
    description TEXT NULL,
    cupping_date DATETIME NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    result_visibility VARCHAR(20) NOT NULL DEFAULT 'PRIVATE',
    finalized_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (session_id),
    CONSTRAINT fk_cupping_sessions_created_by
        FOREIGN KEY (created_by) REFERENCES users (user_id)
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4;

CREATE TABLE coffee_samples (
    sample_id INT NOT NULL AUTO_INCREMENT,
    created_by INT NOT NULL,
    sample_name VARCHAR(255) NOT NULL,
    process VARCHAR(100) NULL,
    harvest_year INT NULL,
    growing_location VARCHAR(255) NULL,
    owner_producer VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (sample_id),
    CONSTRAINT fk_coffee_samples_created_by
        FOREIGN KEY (created_by) REFERENCES users (user_id)
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4;

-- A coffee sample can be reused in different sessions, but only once per session.
CREATE TABLE session_samples (
    session_sample_id INT NOT NULL AUTO_INCREMENT,
    session_id INT NOT NULL,
    sample_id INT NOT NULL,
    sample_code VARCHAR(100) NOT NULL,
    display_order INT NOT NULL,

    PRIMARY KEY (session_sample_id),
    CONSTRAINT uq_session_samples_sample UNIQUE (session_id, sample_id),
    CONSTRAINT uq_session_samples_code UNIQUE (session_id, sample_code),
    CONSTRAINT uq_session_samples_order UNIQUE (session_id, display_order),
    CONSTRAINT fk_session_samples_session
        FOREIGN KEY (session_id) REFERENCES cupping_sessions (session_id),
    CONSTRAINT fk_session_samples_sample
        FOREIGN KEY (sample_id) REFERENCES coffee_samples (sample_id)
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4;

-- INDIVIDUAL mode: insert the session creator as the sole evaluator.
-- EVENT mode: insert each participating evaluator.
CREATE TABLE session_evaluators (
    session_evaluator_id INT NOT NULL AUTO_INCREMENT,
    session_id INT NOT NULL,
    user_id INT NOT NULL,
    joined_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (session_evaluator_id),
    CONSTRAINT uq_session_evaluators_user UNIQUE (session_id, user_id),
    CONSTRAINT fk_session_evaluators_session
        FOREIGN KEY (session_id) REFERENCES cupping_sessions (session_id),
    CONSTRAINT fk_session_evaluators_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4;

CREATE TABLE defect_types (
    defect_type_id INT NOT NULL AUTO_INCREMENT,
    defect_name VARCHAR(100) NOT NULL,
    points_per_cup INT NOT NULL,
    description TEXT NULL,

    PRIMARY KEY (defect_type_id)
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4;

CREATE TABLE evaluation_options (
    option_id INT NOT NULL AUTO_INCREMENT,
    option_name VARCHAR(255) NOT NULL,
    option_type VARCHAR(100) NOT NULL,
    parent_option_id INT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,

    PRIMARY KEY (option_id),
    CONSTRAINT fk_evaluation_options_parent
        FOREIGN KEY (parent_option_id) REFERENCES evaluation_options (option_id)
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4;

-- Score columns are nullable to permit saving an unfinished evaluation.
CREATE TABLE evaluations (
    evaluation_id INT NOT NULL AUTO_INCREMENT,
    session_evaluator_id INT NOT NULL,
    session_sample_id INT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    dry_aroma INT NULL,
    break_aroma INT NULL,
    color_intensity VARCHAR(50) NULL,
    aroma_quality_score DECIMAL(5, 2) NULL,
    flavor_score DECIMAL(5, 2) NULL,
    aftertaste_score DECIMAL(5, 2) NULL,
    acidity_score DECIMAL(5, 2) NULL,
    body_score DECIMAL(5, 2) NULL,
    balance_score DECIMAL(5, 2) NULL,
    uniformity_score DECIMAL(5, 2) NULL,
    clean_cup_score DECIMAL(5, 2) NULL,
    sweetness_score DECIMAL(5, 2) NULL,
    overall_score DECIMAL(5, 2) NULL,
    acidity_intensity INT NULL,
    body_level INT NULL,
    defect_type_id INT NULL,
    total_score DECIMAL(6, 2) NULL,
    finalized_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (evaluation_id),
    CONSTRAINT uq_evaluations_evaluator_sample
        UNIQUE (session_evaluator_id, session_sample_id),
    CONSTRAINT fk_evaluations_evaluator
        FOREIGN KEY (session_evaluator_id)
        REFERENCES session_evaluators (session_evaluator_id),
    CONSTRAINT fk_evaluations_session_sample
        FOREIGN KEY (session_sample_id)
        REFERENCES session_samples (session_sample_id),
    CONSTRAINT fk_evaluations_defect_type
        FOREIGN KEY (defect_type_id)
        REFERENCES defect_types (defect_type_id)
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4;

CREATE TABLE defect_cup_evaluations (
    defect_cup_evaluation_id INT NOT NULL AUTO_INCREMENT,
    evaluation_id INT NOT NULL,
    cup_number INT NOT NULL,
    uniformity BOOLEAN NULL,
    clean_cup BOOLEAN NULL,
    sweetness BOOLEAN NULL,

    PRIMARY KEY (defect_cup_evaluation_id),
    CONSTRAINT uq_defect_cup_evaluations_cup UNIQUE (evaluation_id, cup_number),
    CONSTRAINT fk_defect_cup_evaluations_evaluation
        FOREIGN KEY (evaluation_id) REFERENCES evaluations (evaluation_id)
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4;

CREATE TABLE evaluation_option_selections (
    evaluation_id INT NOT NULL,
    option_id INT NOT NULL,

    PRIMARY KEY (evaluation_id, option_id),
    CONSTRAINT fk_evaluation_option_selections_evaluation
        FOREIGN KEY (evaluation_id) REFERENCES evaluations (evaluation_id),
    CONSTRAINT fk_evaluation_option_selections_option
        FOREIGN KEY (option_id) REFERENCES evaluation_options (option_id)
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4;

CREATE TABLE text_evaluations (
    text_evaluation_id INT NOT NULL AUTO_INCREMENT,
    evaluation_id INT NOT NULL,
    `text` VARCHAR(1000) NOT NULL,

    PRIMARY KEY (text_evaluation_id),
    CONSTRAINT fk_text_evaluations_evaluation
        FOREIGN KEY (evaluation_id) REFERENCES evaluations (evaluation_id)
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4;
