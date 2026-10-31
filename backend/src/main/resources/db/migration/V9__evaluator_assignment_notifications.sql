CREATE TABLE notifications (
    notification_id BIGINT NOT NULL AUTO_INCREMENT,
    recipient_user_id INT NOT NULL,
    actor_user_id INT NULL,
    session_id INT NULL,
    session_evaluator_id INT NULL,

    notification_type VARCHAR(50) NOT NULL,
    message VARCHAR(500) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    read_at DATETIME(6) NULL,

    PRIMARY KEY (notification_id),

    CONSTRAINT uq_notifications_assignment
        UNIQUE (session_evaluator_id, notification_type),

    CONSTRAINT fk_notifications_recipient
        FOREIGN KEY (recipient_user_id)
        REFERENCES users (user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_notifications_actor
        FOREIGN KEY (actor_user_id)
        REFERENCES users (user_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_notifications_session
        FOREIGN KEY (session_id)
        REFERENCES cupping_sessions (session_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_notifications_membership
        FOREIGN KEY (session_evaluator_id)
        REFERENCES session_evaluators (session_evaluator_id)
        ON DELETE SET NULL,

    INDEX idx_notifications_recipient_created (
        recipient_user_id,
        created_at,
        notification_id
    ),

    INDEX idx_notifications_recipient_unread (
        recipient_user_id,
        read_at
    )
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4;
