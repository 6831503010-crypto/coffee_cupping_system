CREATE TABLE users (
    user_id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL,

    PRIMARY KEY (user_id),

    CONSTRAINT uq_users_email
        UNIQUE (email)
)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4;
