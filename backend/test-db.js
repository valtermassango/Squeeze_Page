const pool = require("./db");
async function testConnection() {
    try {
        const result = await pool.query("SELECT NOW()");
        console.log("PostgreSQL conectado!");
        console.log("Data/hora do servidor:");
        console.log(result.rows[0]);
    } catch (error) {
        console.error("Erro ao conectar ao PostgreSQL:");
        console.error(error.message);
    } finally {
        await pool.end();
    }
}
testConnection();