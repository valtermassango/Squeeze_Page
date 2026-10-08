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


function renderLeads(leads) {

    leadsTable.replaceChildren();
    if (!leads.length) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 9;
        cell.textContent = 'Nenhum lead encontrado.';
        row.append(cell);
        leadsTable.append(row);
        return;
    }
    leads.forEach(lead => {
        const row = document.createElement('tr');
        const values = [lead.id, lead.nome, lead.email, lead.whatsapp,
            lead.utm_source || 'Direto', lead.utm_medium || '-',
            lead.utm_campaign || '-', lead.utm_content || '-',
            new Date(lead.created_at).toLocaleString('pt-PT')];
        values.forEach(value => {
            const cell = document.createElement('td');
            cell.textContent = String(value ?? '');
            row.append(cell);
        });
        leadsTable.append(row);
    });
}


// Express serves the CRM and API on the same origin.
const loginPanel = document.getElementById('login-panel');
const loginForm = document.getElementById('login-form');
const loginFields = document.getElementById('login-fields');
const loginStatus = document.getElementById('login-status');
const loginPassword = document.getElementById('login-password');
const logoutButton = document.getElementById('logout-button');
const retryLogout = document.getElementById('retry-logout');
let authenticated = false;
let authVersion = 0;
let loadingDashboard = false;
let logoutPending = false;

class ApiError extends Error {
    constructor(status) { super('API request failed'); this.status = status; }
}
function safeMessage(error) {
    if (error.status === 403) return 'Acesso negado. Não tem permissão para esta operação.';
    if (error.status === 429) return 'Demasiadas tentativas. Aguarde alguns minutos e tente novamente.';
    return 'Não foi possível concluir o pedido. Verifique a ligação e tente novamente.';
}
async function apiRequest(path, options = {}) {
    const response = await fetch(path, {
        ...options, credentials: 'include', cache: 'no-store',
        signal: AbortSignal.timeout(15000)
    });
    // Check HTTP status before parsing: error pages need not contain JSON.
    if (!response.ok) throw new ApiError(response.status);
    return response.json();
}
function clearData() {
    allLeads = [];
    leadsTable.replaceChildren();
    searchLeads.value = '';
    crmStatus.textContent = '';
    document.querySelectorAll('.stat-value, .source-download strong, .source-rate strong')
        .forEach(el => { el.textContent = '—'; });
    document.getElementById('current-user').textContent = '';
}
function showLogin(message = '') {
    authenticated = false;
    authVersion++;
    clearData();
    document.querySelector('.sidebar').hidden = true;
    document.querySelector('.main-content').hidden = true;
    loginPanel.hidden = false;
    loginPassword.value = '';
    loginStatus.textContent = message;
}
function filterLeads() {
    if (!authenticated) return;
    const term = searchLeads.value.trim().toLowerCase();
    renderLeads(allLeads.filter(lead => [lead.nome, lead.email, lead.whatsapp]
        .some(value => String(value ?? '').toLowerCase().includes(term))));
}
function renderDownloads(stats, sources) {
    totalDownloads.textContent = stats.totalDownloads;
    downloadsToday.textContent = stats.downloadsToday;
    downloadsMonth.textContent = stats.downloadsMonth;
    const cards = {
        facebook: [downloadsFacebook, rateFacebook],
        tiktok: [downloadsTikTok, rateTikTok],
        youtube: [downloadsYouTube, rateYouTube],
        whatsapp: [downloadsWhatsApp, rateWhatsApp],
        direct: [downloadsDirect, rateDirect]
    };
    Object.values(cards).forEach(([count, rate]) => {
        count.textContent = '0'; rate.textContent = '0.0%';
    });
    sources.forEach(item => {
        if (!Object.hasOwn(cards, item.source)) return;
        const [count, rate] = cards[item.source];
        const leads = Number(item.leads);
        const downloads = Number(item.downloads);
        count.textContent = downloads;
        rate.textContent = `${(leads > 0 ? downloads / leads * 100 : 0).toFixed(1)}%`;
    });
}
async function loadDashboard() {
    if (!authenticated || loadingDashboard) return;
    loadingDashboard = true;
    refreshButton.disabled = true;
    const version = authVersion;
    crmStatus.textContent = 'A carregar leads e estatísticas...';
    try {
        // Stop immediately on an authorization failure; commit UI updates together.
        const leads = await apiRequest('/leads');
        if (version !== authVersion) return;
        const downloads = await apiRequest('/ebook/stats');
        if (version !== authVersion) return;
        const sources = await apiRequest('/ebook/stats/source');
        if (version !== authVersion) return;
        if (!leads.success || !Array.isArray(leads.leads) ||
            !downloads.success || !downloads.stats ||
            !sources.success || !Array.isArray(sources.sources)) throw new ApiError(500);
        allLeads = leads.leads;
        updateLeadStatistics(allLeads);
        updateSourceStatistics(allLeads);
        filterLeads();
        renderDownloads(downloads.stats, sources.sources);
        crmStatus.textContent = `${allLeads.length} lead(s) encontrado(s).`;
    } catch (error) {
        if (version !== authVersion) return;
        if (error.status === 401) showLogin('A sessão expirou. Entre novamente.');
        else {
            allLeads = [];
            leadsTable.replaceChildren();
            document.querySelectorAll('.stat-value, .source-download strong, .source-rate strong')
                .forEach(el => { el.textContent = '—'; });
            crmStatus.textContent = safeMessage(error);
        }
    } finally {
        loadingDashboard = false;
        refreshButton.disabled = false;
        // A new login may have happened while an old data request was finishing.
        if (authenticated && version !== authVersion) void loadDashboard();
    }
}
function signedIn(user) {
    if (!user || typeof user.email !== 'string') throw new ApiError(500);
    authVersion++;
    authenticated = true;
    loginPanel.hidden = true;
    document.querySelector('.sidebar').hidden = false;
    document.querySelector('.main-content').hidden = false;
    document.getElementById('current-user').textContent = user.email;
    logoutButton.focus();
    void loadDashboard();
}
loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (loginFields.disabled || logoutPending) return;
    loginFields.disabled = true;
    loginStatus.textContent = 'A entrar...';
    try {
        const pending = apiRequest('/auth/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: document.getElementById('login-email').value,
                password: loginPassword.value })
        });
        loginPassword.value = '';
        const data = await pending;
        if (!data.success) throw new ApiError(500);
        signedIn(data.user);
    } catch (error) {
        loginStatus.textContent = error.status === 401 ?
            'E-mail ou palavra-passe inválidos.' : safeMessage(error);
    } finally {
        loginPassword.value = '';
        loginFields.disabled = false;
    }
});
async function logout() {
    if (retryLogout.disabled) return;
    logoutPending = true;
    loginFields.disabled = true;
    retryLogout.disabled = true;
    retryLogout.hidden = true;
    // Invalidate pending data responses immediately and erase displayed data.
    showLogin('A terminar a sessão...');
    try {
        await apiRequest('/auth/logout', { method: 'POST' });
        logoutPending = false;
        loginStatus.textContent = 'Sessão terminada.';
    } catch (error) {
        if (error.status === 401) {
            logoutPending = false;
            loginStatus.textContent = 'A sessão terminou. Entre novamente.';
        } else {
            loginStatus.textContent = `${safeMessage(error)} A saída não foi confirmada. Tente terminar a sessão novamente.`;
            retryLogout.hidden = false;
        }
    } finally {
        retryLogout.disabled = false;
        loginFields.disabled = logoutPending;
        if (logoutPending) retryLogout.focus();
        else document.getElementById('login-email').focus();
    }
}
logoutButton.addEventListener('click', logout);
retryLogout.addEventListener('click', logout);
searchLeads.addEventListener('input', filterLeads);
refreshButton.addEventListener('click', loadDashboard);
(async () => {
    showLogin('A verificar a sessão...');
    loginFields.disabled = true;
    try {
        const data = await apiRequest('/auth/me');
        if (!data.success) throw new ApiError(500);
        signedIn(data.user);
    } catch (error) {
        showLogin(error.status === 401 ? '' : safeMessage(error));
    } finally {
        loginFields.disabled = false;
    }
})();
