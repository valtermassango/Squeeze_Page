
const express = require("express");
const cors = require("cors");
const pool = require("./db");
const app = express();
const PORT = 3002;
app.use(cors());
app.use(express.json());

/* ==========================================================
   MIDDLEWARE
   ========================================================== */
app.use(express.json());


/* ==========================================================
   ROTA DE TESTE
   ========================================================== */
app.get("/", (req, res) => {
    res.json({
        message: "Backend CADBIMOZ funcionando!"
    });
});


/* ==========================================================
   RECEBER LEAD
   ========================================================== */
app.post("/leads", async (req, res) => {
    const { nome, email, whatsapp } = req.body;

 const { nome, email, whatsapp } = req.body;

    // ==========================
    // VALIDAÇÃO DOS DADOS
    // ==========================

    if (!nome || nome.trim().length < 3) {
        return res.status(400).json({
            success: false,
            message: "Nome inválido."
        });
    }

    if (!email || !email.includes("@")) {
        return res.status(400).json({
            success: false,
            message: "E-mail inválido."
        });
    }

    if (!whatsapp) {
        return res.status(400).json({
            success: false,
            message: "WhatsApp é obrigatório."
        });
    }



    try {
        const result = await pool.query(
            `
            INSERT INTO leads (nome, email, whatsapp)
            VALUES ($1, $2, $3)
            RETURNING id, nome, email, whatsapp, created_at
            `,
            [nome, email, whatsapp]
        );
        console.log("Novo lead guardado:");
        console.log(result.rows[0]);
        res.status(201).json({
            success: true,
            message: "Lead recebido e guardado com sucesso!",
            lead: result.rows[0]
        });
    } 
    
    catch (error) {
        console.error("Erro ao guardar lead:");
        console.error(error.message);

        res.status(500).json({
            success: false,
            message: "Erro ao guardar o lead."
        });

    }

});

/* ==========================================================
   INICIAR SERVIDOR
   ========================================================== */

app.listen(PORT, () => {

    console.log(
        `Servidor rodando em http://localhost:${PORT}`
    );

});