// ------------------------------------
// CONFIGURACIÓN
// ------------------------------------
const PROXY_URL = "https://castrol-pdv-proxy.mirllan-dev.workers.dev";
const PDV_URL = `${PROXY_URL}/api/castrol/pdv`;
const MAX_RESULTS = 20;
const MIN_QUERY_LENGTH = 2;
const MAX_LOAD_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

const searchInput = document.getElementById("searchInput");
const resultsEl = document.getElementById("results");
const statusEl = document.getElementById("status");
const darkModeToggle = document.getElementById("darkModeToggle");

let pdvs = [];
let fuse = null;

// ------------------------------------
// UTILIDADES
// ------------------------------------
// El backend usa "NA" cuando un dato no existe
function cleanText(value) {
    const text = String(value ?? "").trim();
    return text.toUpperCase() === "NA" ? "" : text;
}

function mapPdv(row) {
    return {
        nombre: cleanText(row.NOMBRE_CLIENTE),
        codigo: cleanText(row.SAP),
        direccion: cleanText(row.DIRECCION),
        ciudad: cleanText(row.CIUDAD),
        zona: cleanText(row.CODIGO_ZONA),
        segmento: cleanText(row.SEGMENTO),
    };
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function setStatus(html, type = "") {
    statusEl.className = `status ${type}`.trim();
    statusEl.innerHTML = html;
}

// ------------------------------------
// CARGA DE PDVs
// ------------------------------------
// El backend a veces tarda en despertar, por eso se reintenta antes de mostrar un error
async function fetchPdvs() {
    let lastError;

    for (let attempt = 1; attempt <= MAX_LOAD_ATTEMPTS; attempt++) {
        try {
            const response = await fetch(PDV_URL);
            if (response.ok) return await response.json();
            lastError = new Error(`Error ${response.status}`);
        } catch (err) {
            lastError = err;
        }

        if (attempt < MAX_LOAD_ATTEMPTS) {
            setStatus("El servidor está tardando un poco, reintentando...");
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        }
    }

    throw lastError;
}

async function loadPdvs() {
    setStatus("Cargando puntos de venta...");

    try {
        const data = await fetchPdvs();
        const rows = Array.isArray(data) ? data : data?.result ?? [];
        pdvs = rows.map(mapPdv);

        if (pdvs.length === 0) {
            searchInput.placeholder = "Sin puntos de venta";
            setStatus('<span class="material-icons">info</span>De momento no hay puntos de venta.', "empty");
            return;
        }

        fuse = new Fuse(pdvs, {
            keys: [
                { name: "nombre", weight: 0.4 },
                { name: "codigo", weight: 0.2 },
                { name: "direccion", weight: 0.2 },
                { name: "ciudad", weight: 0.2 },
            ],
            threshold: 0.35,
            ignoreLocation: true,
            ignoreDiacritics: true,
        });

        searchInput.disabled = false;
        searchInput.placeholder = "Buscar por nombre, SAP, dirección o ciudad...";
        searchInput.focus();
        setStatus(`${pdvs.length} puntos de venta cargados.`);
    } catch (err) {
        console.error("Error cargando PDVs:", err);
        searchInput.placeholder = "No se pudieron cargar los PDVs";
        setStatus(
            '<span class="material-icons">error_outline</span>No se pudieron cargar los puntos de venta. Intente de nuevo más tarde.',
            "error"
        );
    }
}

// ------------------------------------
// BÚSQUEDA
// ------------------------------------
function searchPdvs(query) {
    // Un código SAP se busca exacto para no traer códigos parecidos
    if (/^\d+$/.test(query)) {
        const byCode = pdvs.filter(pdv => pdv.codigo.includes(query));
        if (byCode.length > 0) return byCode.slice(0, MAX_RESULTS);
    }
    return fuse.search(query, { limit: MAX_RESULTS }).map(result => result.item);
}

function handleInput() {
    const query = searchInput.value.trim();

    if (!fuse || query.length < MIN_QUERY_LENGTH) {
        resultsEl.innerHTML = "";
        return;
    }

    const found = searchPdvs(query);

    resultsEl.innerHTML = found.length > 0
        ? found.map(renderPdv).join("")
        : `<div class="status empty">No se encontraron resultados para "${escapeHtml(query)}".</div>`;
}

function copyButton(text, label) {
    return `<button type="button" class="material-icons copy-icon" title="Copiar" aria-label="Copiar ${label}" data-copy="${escapeHtml(text)}">content_copy</button>`;
}

function renderPdv(pdv, index) {
    const tags = [pdv.segmento, pdv.zona]
        .filter(Boolean)
        .map(tag => `<span class="tag">${escapeHtml(tag)}</span>`)
        .join("");

    const items = [];
    if (pdv.codigo) items.push(`<li><span class="material-icons icon-tipo">tag</span><strong>SAP:</strong> ${escapeHtml(pdv.codigo)}${copyButton(pdv.codigo, "SAP")}</li>`);
    if (pdv.direccion) items.push(`<li><span class="material-icons icon-tipo">place</span><strong>Dirección:</strong> ${escapeHtml(pdv.direccion)}${copyButton(pdv.direccion, "dirección")}</li>`);
    if (pdv.ciudad) items.push(`<li><span class="material-icons icon-tipo">location_city</span>${escapeHtml(pdv.ciudad)}</li>`);

    return `
        <div class="result-item pdv" style="animation-delay: ${index * 0.03}s">
            <h3><span class="material-icons icon-tipo">storefront</span>${escapeHtml(pdv.nombre || "PDV sin nombre")}</h3>
            ${tags ? `<div class="tags">${tags}</div>` : ""}
            <ul>${items.join("")}</ul>
        </div>`;
}

function copyText(button) {
    navigator.clipboard.writeText(button.dataset.copy).then(() => {
        button.textContent = "check";
        setTimeout(() => { button.textContent = "content_copy"; }, 1200);
    }).catch(err => console.error("No se pudo copiar:", err));
}

// ------------------------------------
// MODO OSCURO
// ------------------------------------
function applyDarkMode(enabled) {
    darkModeToggle.checked = enabled;
    document.body.classList.toggle("dark-mode", enabled);
    document.getElementById("darkModeLabel").textContent = enabled ? "☀️ Modo claro" : "🌙 Modo oscuro";
}

function toggleDarkMode() {
    applyDarkMode(darkModeToggle.checked);
    try { localStorage.setItem("darkMode", darkModeToggle.checked ? "1" : "0"); } catch (e) { /* sin almacenamiento */ }
}

function initDarkMode() {
    let saved = null;
    try { saved = localStorage.getItem("darkMode"); } catch (e) { /* sin almacenamiento */ }
    applyDarkMode(saved === "1");
}

// ------------------------------------
// INICIO
// ------------------------------------
searchInput.addEventListener("input", handleInput);
darkModeToggle.addEventListener("change", toggleDarkMode);
resultsEl.addEventListener("click", event => {
    const button = event.target.closest(".copy-icon");
    if (button) copyText(button);
});

initDarkMode();
loadPdvs();
