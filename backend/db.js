const mysql = require("mysql2/promise");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });

const pool = mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: process.env.DB_PORT || 3306,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
        rejectUnauthorized: true,
        ...(process.env.DB_SSL_CA
            ? { ca: process.env.DB_SSL_CA.replace(/\\n/g, "\n") }
            : {})
    },

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;
