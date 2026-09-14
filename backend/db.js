const { Pool } = require("pg");

const pool = new Pool({
    host: "localhost",
    port: 5432,
    database: "cadbimoz",
    user: "postgres",
    password: "Uzit@1988"
});

module.exports = pool;