const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");
const pool = require("./db");

const app = express();
const PORT = 3002;


// ==========================================================
// MIDDLEWARE
// ==========================================================

app.use(cors());
app.use(express.json());


// ==========================================================
// ROTA DE TESTE
// ==========================================================

app.get("/", (req, res) => {

    res.json({
        message: "Backend CADBIMOZ funcionando!"
    });

});


// ==========================================================
// RECEBER LEAD
// ==========================================================

app.post("/leads", async (req, res) => {

    console.log(
        "POST /leads recebido:",
        new Date().toISOString(),
        req.body.email
    );

    const {
        nome,
        email,
        whatsapp,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_content
    } = req.body;


    // ======================================================
    // VALIDAÇÃO
    // ======================================================

    if (!nome || nome.trim().length < 3) {

        return res.status(400).json({
            success: false,
            field: "nome",
            message: "Nome inválido."
        });

    }


    if (!email || !email.includes("@")) {

        return res.status(400).json({
            success: false,
            field: "email",
            message: "E-mail inválido."
        });

    }


    if (!whatsapp || !whatsapp.trim()) {

        return res.status(400).json({
            success: false,
            field: "whatsapp",
            message: "WhatsApp é obrigatório."
        });

    }


    try {

        // ==================================================
        // GUARDAR LEAD
        // ==================================================

        const result = await pool.query(
            `
            INSERT INTO leads (
                nome,
                email,
                whatsapp,
                utm_source,
                utm_medium,
                utm_campaign,
                utm_content
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)

            RETURNING
                id,
                nome,
                email,
                whatsapp,
                utm_source,
                utm_medium,
                utm_campaign,
                utm_content,
                created_at
            `,
            [
                nome.trim(),
                email.trim(),
                whatsapp.trim(),
                utm_source || null,
                utm_medium || null,
                utm_campaign || null,
                utm_content || null
            ]
        );


        // ==================================================
        // GERAR TOKEN
        // ==================================================

        const token = crypto
            .randomBytes(32)
            .toString("hex");


        const expiresAt = new Date(
            Date.now() + 30 * 60 * 1000
        );


        // ==================================================
        // GUARDAR TOKEN
        // ==================================================

        await pool.query(
            `
            INSERT INTO ebook_tokens (
                token,
                lead_id,
                expires_at
            )
            VALUES ($1, $2, $3)
            `,
            [
                token,
                result.rows[0].id,
                expiresAt
            ]
        );


        console.log(
            "Lead guardado:",
            result.rows[0].id,
            result.rows[0].email
        );


        // ==================================================
        // RESPOSTA
        // ==================================================

        return res.status(201).json({

            success: true,

            message:
                "Lead recebido e guardado com sucesso!",

            lead: result.rows[0],

            downloadUrl:
                `/download/ebook?token=${token}`

        });


    } catch (error) {

        console.error(
            "Erro POST /leads:",
            error.message
        );


        // ==================================================
        // EMAIL DUPLICADO
        // ==================================================

        if (
            error.code === "23505" &&
            error.constraint === "leads_email_unique"
        ) {

            return res.status(409).json({
                success: false,
                field: "email",
                message:
                    "Este e-mail já está cadastrado."
            });

        }


        // ==================================================
        // WHATSAPP DUPLICADO
        // ==================================================

        if (
            error.code === "23505" &&
            error.constraint === "leads_whatsapp_unique"
        ) {

            return res.status(409).json({
                success: false,
                field: "whatsapp",
                message:
                    "Este número de WhatsApp já está cadastrado."
            });

        }


        // ==================================================
        // OUTROS ERROS
        // ==================================================

        return res.status(500).json({
            success: false,
            message:
                "Erro ao guardar o lead."
        });

    }

});


// ==========================================================
// LISTAR LEADS
// ==========================================================

app.get("/leads", async (req, res) => {

    try {

        const result = await pool.query(
            `
            SELECT
                id,
                nome,
                email,
                whatsapp,
                utm_source,
                utm_medium,
                utm_campaign,
                utm_content,
                created_at

            FROM leads

            ORDER BY created_at DESC
            `
        );


        return res.json({
            success: true,
            leads: result.rows
        });


    } catch (error) {

        console.error(
            "Erro ao buscar leads:",
            error.message
        );


        return res.status(500).json({
            success: false,
            message:
                "Erro ao buscar os leads."
        });

    }

});


// ==========================================================
// ESTATÍSTICAS DE DOWNLOADS
// ==========================================================

app.get("/ebook/stats", async (req, res) => {

    try {

        const result = await pool.query(
            `
            SELECT

                COUNT(*) FILTER (
                    WHERE downloaded_at IS NOT NULL
                ) AS total_downloads,

                COUNT(*) FILTER (
                    WHERE downloaded_at IS NOT NULL
                    AND downloaded_at::date = CURRENT_DATE
                ) AS downloads_today,

                COUNT(*) FILTER (
                    WHERE downloaded_at IS NOT NULL
                    AND DATE_TRUNC('month', downloaded_at)
                        = DATE_TRUNC(
                            'month',
                            CURRENT_TIMESTAMP
                        )
                ) AS downloads_month

            FROM ebook_tokens
            `
        );


        const stats = result.rows[0];


        return res.json({

            success: true,

            stats: {

                totalDownloads:
                    Number(stats.total_downloads),

                downloadsToday:
                    Number(stats.downloads_today),

                downloadsMonth:
                    Number(stats.downloads_month)

            }

        });


    } catch (error) {

        console.error(
            "Erro ao buscar estatísticas:",
            error.message
        );


        return res.status(500).json({
            success: false,
            message:
                "Erro ao buscar estatísticas de downloads."
        });

    }

});


// ==========================================================
// ESTATÍSTICAS POR PROVENIÊNCIA
// ==========================================================

app.get("/ebook/stats/source", async (req, res) => {

    try {

        const result = await pool.query(
            `
            SELECT

                CASE

                    WHEN LOWER(TRIM(l.utm_source)) = 'facebook'
                        THEN 'facebook'

                    WHEN LOWER(TRIM(l.utm_source)) = 'tiktok'
                        THEN 'tiktok'

                    WHEN LOWER(TRIM(l.utm_source)) = 'youtube'
                        THEN 'youtube'

                    WHEN LOWER(TRIM(l.utm_source)) = 'whatsapp'
                        THEN 'whatsapp'

                    ELSE 'direct'

                END AS source,

                COUNT(*) AS leads,

                COUNT(*) FILTER (
                    WHERE et.downloaded_at IS NOT NULL
                ) AS downloads

            FROM leads l

            LEFT JOIN ebook_tokens et
                ON et.lead_id = l.id

            GROUP BY source

            ORDER BY source
            `
        );


        return res.json({

            success: true,

            sources: result.rows.map(row => ({

                source:
                    row.source,

                leads:
                    Number(row.leads),

                downloads:
                    Number(row.downloads)

            }))

        });


    } catch (error) {

        console.error(
            "Erro ao buscar estatísticas por proveniência:",
            error.message
        );


        return res.status(500).json({

            success: false,

            message:
                "Erro ao buscar estatísticas por proveniência."

        });

    }

});


// ==========================================================
// DOWNLOAD PROTEGIDO DO EBOOK
// ==========================================================

app.get("/download/ebook", async (req, res) => {

    const { token } = req.query;


    // ======================================================
    // TOKEN OBRIGATÓRIO
    // ======================================================

    if (!token) {

        return res.status(400).json({
            success: false,
            message:
                "Token não fornecido."
        });

    }


    try {

        // ==================================================
        // PROCURAR TOKEN
        // ==================================================

        const result = await pool.query(
            `
            SELECT
                id,
                token,
                lead_id,
                expires_at,
                used,
                downloaded_at

            FROM ebook_tokens

            WHERE token = $1
            `,
            [token]
        );


        // ==================================================
        // TOKEN NÃO EXISTE
        // ==================================================

        if (result.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message:
                    "Token inválido."
            });

        }


        const ebookToken =
            result.rows[0];


        // ==================================================
        // TOKEN JÁ UTILIZADO
        // ==================================================

        if (ebookToken.used) {

            return res.status(403).json({
                success: false,
                message:
                    "Este link de download já foi utilizado."
            });

        }


        // ==================================================
        // TOKEN EXPIRADO
        // ==================================================

        if (
            new Date() >
            new Date(ebookToken.expires_at)
        ) {

            return res.status(403).json({
                success: false,
                message:
                    "Este link de download expirou."
            });

        }


        // ==================================================
        // LOCALIZAÇÃO DO PDF
        // ==================================================

        const ebookPath = path.join(
            __dirname,
            "ebook",
            "ebook-autocad-2027.pdf"
        );


        // ==================================================
        // ENVIAR PDF
        // ==================================================

        res.download(
            ebookPath,
            "ebook-autocad-2027.pdf",
            async (error) => {

                if (error) {

                    console.error(
                        "Erro ao enviar ebook:",
                        error.message
                    );

                    return;

                }


                // ==========================================
                // REGISTAR DOWNLOAD
                // ==========================================

                try {

                    await pool.query(
                        `
                        UPDATE ebook_tokens

                        SET
                            used = TRUE,
                            downloaded_at =
                                CURRENT_TIMESTAMP

                        WHERE id = $1
                        `,
                        [ebookToken.id]
                    );


                    console.log(
                        "Download registado:",
                        ebookToken.id
                    );


                } catch (dbError) {

                    console.error(
                        "Erro ao registar download:",
                        dbError.message
                    );

                }

            }
        );


    } catch (error) {

        console.error(
            "Erro no download do ebook:",
            error.message
        );


        if (!res.headersSent) {

            return res.status(500).json({
                success: false,
                message:
                    "Erro ao processar o download."
            });

        }

    }

});


// ==========================================================
// INICIAR SERVIDOR
// IMPORTANTE: DEVE SER O ÚLTIMO BLOCO DO FICHEIRO
// ==========================================================

app.listen(PORT, () => {

    console.log(
        `Servidor rodando em http://localhost:${PORT}`
    );

});