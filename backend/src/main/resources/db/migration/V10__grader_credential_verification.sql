-- Trusted qualification records.
-- The records seeded below are fictional and for testing only.

CREATE TABLE grader_credentials (
    credential_id INT NOT NULL AUTO_INCREMENT,

    certificate_name VARCHAR(100) NOT NULL,

    license_code VARCHAR(8)
        CHARACTER SET ascii
        COLLATE ascii_bin
        NOT NULL,

    claimed_by_user_id INT NULL,
    claimed_at DATETIME(6) NULL,

    created_at DATETIME(6)
        NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (credential_id),

    CONSTRAINT uq_grader_license
        UNIQUE (license_code),

    CONSTRAINT uq_grader_account
        UNIQUE (claimed_by_user_id),

    CONSTRAINT fk_grader_account
        FOREIGN KEY (claimed_by_user_id)
        REFERENCES users (user_id)
        ON DELETE RESTRICT,

    CONSTRAINT ck_grader_license
        CHECK (
            CHAR_LENGTH(license_code) = 8
            AND license_code REGEXP '^Q-[0-9]{6}$'
        ),

    CONSTRAINT ck_grader_claim
        CHECK (
            (
                claimed_by_user_id IS NULL
                AND claimed_at IS NULL
            )
            OR
            (
                claimed_by_user_id IS NOT NULL
                AND claimed_at IS NOT NULL
            )
        )
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4;


-- Preserve qualification status at evaluation finalization.
-- Existing evaluations remain unverified; no retrospective badges.

ALTER TABLE session_evaluators
    ADD COLUMN verified_at_finalization
        BOOLEAN NOT NULL DEFAULT FALSE;


-- Generate exactly 50 fictional certificates.
-- Names: Demo Q Grader 01 through Demo Q Grader 50
-- Codes: Q-900001 through Q-900050

INSERT INTO grader_credentials (
    certificate_name,
    license_code
)
SELECT
    CONCAT(
        'Demo Q Grader ',
        LPAD(numbers.certificate_number, 2, '0')
    ),
    CONCAT(
        'Q-',
        LPAD(900000 + numbers.certificate_number, 6, '0')
    )
FROM (
    SELECT
        tens.n * 10 + units.n + 1 AS certificate_number
    FROM (
        SELECT 0 AS n
        UNION ALL SELECT 1
        UNION ALL SELECT 2
        UNION ALL SELECT 3
        UNION ALL SELECT 4
    ) AS tens
    CROSS JOIN (
        SELECT 0 AS n
        UNION ALL SELECT 1
        UNION ALL SELECT 2
        UNION ALL SELECT 3
        UNION ALL SELECT 4
        UNION ALL SELECT 5
        UNION ALL SELECT 6
        UNION ALL SELECT 7
        UNION ALL SELECT 8
        UNION ALL SELECT 9
    ) AS units
) AS numbers
ORDER BY numbers.certificate_number;
