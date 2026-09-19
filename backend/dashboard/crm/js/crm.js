// ==========================================================
// CADBIMOZ CRM
// ==========================================================


// ==========================================================
// 1. ELEMENTOS DO HTML
// ==========================================================

// Leads
const totalLeads = document.getElementById("total-leads");
const leadsToday = document.getElementById("leads-today");
const leadsMonth = document.getElementById("leads-month");


// Downloads gerais
const totalDownloads = document.getElementById("total-downloads");
const downloadsToday = document.getElementById("downloads-today");
const downloadsMonth = document.getElementById("downloads-month");


// Proveniência - Leads
const sourceFacebook = document.getElementById("source-facebook");
const sourceTikTok = document.getElementById("source-tiktok");
const sourceYouTube = document.getElementById("source-youtube");
const sourceWhatsApp = document.getElementById("source-whatsapp");
const sourceDirect = document.getElementById("source-direct");


// Proveniência - Downloads
const downloadsFacebook =
    document.getElementById("downloads-facebook");

const downloadsTikTok =
    document.getElementById("downloads-tiktok");

const downloadsYouTube =
    document.getElementById("downloads-youtube");

const downloadsWhatsApp =
    document.getElementById("downloads-whatsapp");

const downloadsDirect =
    document.getElementById("downloads-direct");


// Proveniência - Taxa de Download
const rateFacebook =
    document.getElementById("rate-facebook");

const rateTikTok =
    document.getElementById("rate-tiktok");

const rateYouTube =
    document.getElementById("rate-youtube");

const rateWhatsApp =
    document.getElementById("rate-whatsapp");

const rateDirect =
    document.getElementById("rate-direct");


// Tabela e ferramentas
const leadsTable = document.getElementById("leads-table");
const refreshButton = document.getElementById("refresh-leads");
const crmStatus = document.getElementById("crm-status");
const searchLeads = document.getElementById("search-leads");


// ==========================================================
// 2. VARIÁVEIS
// ==========================================================

let allLeads = [];


// ==========================================================
// 3. ENDEREÇOS DA API
// ==========================================================

const LEADS_API_URL =
    "http://localhost:3002/leads";

const DOWNLOAD_STATS_API_URL =
    "http://localhost:3002/ebook/stats";

const SOURCE_STATS_API_URL =
    "http://localhost:3002/ebook/stats/source";


// ==========================================================
// 4. BUSCAR LEADS
// ==========================================================

async function loadLeads() {

    try {

        crmStatus.textContent =
            "A carregar leads...";


        const response =
            await fetch(LEADS_API_URL);


        if (!response.ok) {

            throw new Error(
                `Erro HTTP: ${response.status}`
            );

        }


        const data =
            await response.json();


        if (!data.success) {

            throw new Error(
                data.message ||
                "Erro ao carregar leads."
            );

        }


        // Guardar leads
        allLeads = data.leads;


        // Atualizar dashboard
        updateLeadStatistics(allLeads);

        updateSourceStatistics(allLeads);

        renderLeads(allLeads);


        crmStatus.textContent =
            `${allLeads.length} lead(s) encontrado(s).`;


    } catch (error) {

        console.error(
            "Erro ao carregar leads:",
            error
        );


        crmStatus.textContent =
            "Não foi possível carregar os leads.";

    }

}


// ==========================================================
// 5. ESTATÍSTICAS DOS LEADS
// ==========================================================

function updateLeadStatistics(leads) {

    // Total de leads
    totalLeads.textContent =
        leads.length;


    const today =
        new Date();


    // ======================================================
    // LEADS DE HOJE
    // ======================================================

    const todayCount =
        leads.filter(lead => {

            const leadDate =
                new Date(lead.created_at);


            return (

                leadDate.getDate() ===
                    today.getDate() &&

                leadDate.getMonth() ===
                    today.getMonth() &&

                leadDate.getFullYear() ===
                    today.getFullYear()

            );

        }).length;


    leadsToday.textContent =
        todayCount;


    // ======================================================
    // LEADS DESTE MÊS
    // ======================================================

    const monthCount =
        leads.filter(lead => {

            const leadDate =
                new Date(lead.created_at);


            return (

                leadDate.getMonth() ===
                    today.getMonth() &&

                leadDate.getFullYear() ===
                    today.getFullYear()

            );

        }).length;


    leadsMonth.textContent =
        monthCount;

}


// ==========================================================
// 6. ESTATÍSTICAS DE PROVENIÊNCIA DOS LEADS
// ==========================================================

function updateSourceStatistics(leads) {

    let facebook = 0;
    let tiktok = 0;
    let youtube = 0;
    let whatsapp = 0;
    let direct = 0;


    leads.forEach(lead => {

        const source =
            (lead.utm_source || "")
                .trim()
                .toLowerCase();


        switch (source) {

            case "facebook":

                facebook++;

                break;


            case "tiktok":

                tiktok++;

                break;


            case "youtube":

                youtube++;

                break;


            case "whatsapp":

                whatsapp++;

                break;


            default:

                direct++;

        }

    });


    sourceFacebook.textContent =
        facebook;

    sourceTikTok.textContent =
        tiktok;

    sourceYouTube.textContent =
        youtube;

    sourceWhatsApp.textContent =
        whatsapp;

    sourceDirect.textContent =
        direct;

}


// ==========================================================
// 7. BUSCAR ESTATÍSTICAS GERAIS DE DOWNLOADS
// ==========================================================

async function loadDownloadStatistics() {

    try {

        const response =
            await fetch(
                DOWNLOAD_STATS_API_URL
            );


        if (!response.ok) {

            throw new Error(
                `Erro HTTP: ${response.status}`
            );

        }


        const data =
            await response.json();


        if (!data.success) {

            throw new Error(
                data.message ||
                "Erro ao carregar downloads."
            );

        }


        totalDownloads.textContent =
            data.stats.totalDownloads;

        downloadsToday.textContent =
            data.stats.downloadsToday;

        downloadsMonth.textContent =
            data.stats.downloadsMonth;


    } catch (error) {

        console.error(
            "Erro ao carregar estatísticas de downloads:",
            error
        );


        totalDownloads.textContent = "-";
        downloadsToday.textContent = "-";
        downloadsMonth.textContent = "-";

    }

}


// ==========================================================
// 8. BUSCAR DOWNLOADS E TAXA POR PROVENIÊNCIA
// ==========================================================

async function loadSourceDownloadStatistics() {

    try {

        const response =
            await fetch(
                SOURCE_STATS_API_URL
            );


        if (!response.ok) {

            throw new Error(
                `Erro HTTP: ${response.status}`
            );

        }


        const data =
            await response.json();


        if (!data.success) {

            throw new Error(
                data.message ||
                "Erro ao carregar estatísticas por proveniência."
            );

        }


        // ==================================================
        // VALORES INICIAIS
        // ==================================================

        downloadsFacebook.textContent = 0;
        downloadsTikTok.textContent = 0;
        downloadsYouTube.textContent = 0;
        downloadsWhatsApp.textContent = 0;
        downloadsDirect.textContent = 0;


        rateFacebook.textContent = "0.0%";
        rateTikTok.textContent = "0.0%";
        rateYouTube.textContent = "0.0%";
        rateWhatsApp.textContent = "0.0%";
        rateDirect.textContent = "0.0%";


        // ==================================================
        // PROCESSAR CADA PROVENIÊNCIA
        // ==================================================

        data.sources.forEach(item => {

            const leads =
                Number(item.leads);

            const downloads =
                Number(item.downloads);


            // ==============================================
            // CALCULAR TAXA DE DOWNLOAD
            // ==============================================

            const rate =
                leads > 0
                    ? (downloads / leads) * 100
                    : 0;


            const formattedRate =
                `${rate.toFixed(1)}%`;


            // ==============================================
            // FACEBOOK
            // ==============================================

            if (item.source === "facebook") {

                downloadsFacebook.textContent =
                    downloads;

                rateFacebook.textContent =
                    formattedRate;

            }


            // ==============================================
            // TIKTOK
            // ==============================================

            else if (item.source === "tiktok") {

                downloadsTikTok.textContent =
                    downloads;

                rateTikTok.textContent =
                    formattedRate;

            }


            // ==============================================
            // YOUTUBE
            // ==============================================

            else if (item.source === "youtube") {

                downloadsYouTube.textContent =
                    downloads;

                rateYouTube.textContent =
                    formattedRate;

            }


            // ==============================================
            // WHATSAPP
            // ==============================================

            else if (item.source === "whatsapp") {

                downloadsWhatsApp.textContent =
                    downloads;

                rateWhatsApp.textContent =
                    formattedRate;

            }


            // ==============================================
            // DIRETO / OUTROS
            // ==============================================

            else if (item.source === "direct") {

                downloadsDirect.textContent =
                    downloads;

                rateDirect.textContent =
                    formattedRate;

            }

        });


    } catch (error) {

        console.error(
            "Erro ao carregar estatísticas por proveniência:",
            error
        );


        downloadsFacebook.textContent = "-";
        downloadsTikTok.textContent = "-";
        downloadsYouTube.textContent = "-";
        downloadsWhatsApp.textContent = "-";
        downloadsDirect.textContent = "-";


        rateFacebook.textContent = "-";
        rateTikTok.textContent = "-";
        rateYouTube.textContent = "-";
        rateWhatsApp.textContent = "-";
        rateDirect.textContent = "-";

    }

}


// ==========================================================
// 9. MOSTRAR LEADS NA TABELA
// ==========================================================

function renderLeads(leads) {

    // Limpar tabela
    leadsTable.innerHTML = "";


    // Nenhum lead encontrado
    if (leads.length === 0) {

        leadsTable.innerHTML = `
            <tr>
                <td colspan="9">
                    Nenhum lead encontrado.
                </td>
            </tr>
        `;

        return;

    }


    // Criar linha para cada lead
    leads.forEach(lead => {

        const row =
            document.createElement("tr");


        // Formatar data
        const date =
            new Date(
                lead.created_at
            );


        const formattedDate =
            date.toLocaleString(
                "pt-PT",
                {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );


        row.innerHTML = `

            <td>${lead.id}</td>

            <td>${lead.nome}</td>

            <td>${lead.email}</td>

            <td>${lead.whatsapp}</td>

            <td>
                ${lead.utm_source || "Direto"}
            </td>

            <td>
                ${lead.utm_medium || "-"}
            </td>

            <td>
                ${lead.utm_campaign || "-"}
            </td>

            <td>
                ${lead.utm_content || "-"}
            </td>

            <td>
                ${formattedDate}
            </td>

        `;


        leadsTable.appendChild(row);

    });

}


// ==========================================================
// 10. PESQUISAR LEADS
// ==========================================================

searchLeads.addEventListener(
    "input",
    () => {

        const searchTerm =
            searchLeads.value
                .trim()
                .toLowerCase();


        const filteredLeads =
            allLeads.filter(lead => {

                return (

                    lead.nome
                        .toLowerCase()
                        .includes(searchTerm)

                    ||

                    lead.email
                        .toLowerCase()
                        .includes(searchTerm)

                    ||

                    lead.whatsapp
                        .includes(searchTerm)

                );

            });


        renderLeads(
            filteredLeads
        );

    }
);


// ==========================================================
// 11. BOTÃO ATUALIZAR
// ==========================================================

refreshButton.addEventListener(
    "click",
    async () => {

        await loadLeads();

        await loadDownloadStatistics();

        await loadSourceDownloadStatistics();

    }
);


// ==========================================================
// 12. CARREGAR DASHBOARD
// ==========================================================

async function loadDashboard() {

    await loadLeads();

    await loadDownloadStatistics();

    await loadSourceDownloadStatistics();

}


// ==========================================================
// INICIAR CRM
// ==========================================================

loadDashboard();