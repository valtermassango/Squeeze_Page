-- Approved local-only schema. Never run alongside 001_crm_auth.sql.
USE `cadbimoz_backend_dev`;

CREATE TABLE `leads` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `nome` varchar(150) NOT NULL,
    `email` varchar(150) NOT NULL,
    `whatsapp` varchar(20) NOT NULL,
    `utm_source` varchar(50) DEFAULT NULL,
    `utm_medium` varchar(50) DEFAULT NULL,
    `utm_campaign` varchar(100) DEFAULT NULL,
    `utm_content` varchar(100) DEFAULT NULL,
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`id`),
    UNIQUE KEY `email` (`email`),
    UNIQUE KEY `whatsapp` (`whatsapp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ebook_tokens` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `token` varchar(64) NOT NULL,
    `lead_id` int(11) NOT NULL,
    `expires_at` datetime NOT NULL,
    `used` tinyint(1) NOT NULL DEFAULT 0,
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    `downloaded_at` datetime DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `token` (`token`),
    KEY `idx_ebook_tokens_lead_id` (`lead_id`) USING BTREE,
    CONSTRAINT `fk_ebook_tokens_lead`
        FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE crm_users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin') NOT NULL DEFAULT 'admin',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY crm_users_email_unique (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE crm_sessions (
    token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    expires_at DATETIME(3) NOT NULL,
    PRIMARY KEY (token_hash),
    KEY crm_sessions_user (user_id),
    KEY crm_sessions_expiry (expires_at),
    CONSTRAINT crm_sessions_user_fk FOREIGN KEY (user_id)
        REFERENCES crm_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
