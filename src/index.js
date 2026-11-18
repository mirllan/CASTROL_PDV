const PDV_PATH = "/api/castrol/pdv";
const UPSTREAM_TIMEOUT_MS = 15000;

function getAllowedOrigins(env) {
    return (env.ALLOWED_ORIGINS || "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
}

function corsHeaders(origin) {
    if (!origin) return {};
    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
    };
}

async function getPdv(env, headers) {
    if (!env.API_TOKEN) {
        console.error("Falta el secreto API_TOKEN");
        return Response.json({ error: "Proxy sin configurar" }, { status: 500, headers });
    }

    try {
        const response = await fetch(env.PDV_ENDPOINT_URL, {
            headers: {
                Authorization: `Token ${env.API_TOKEN}`,
                "Content-Type": "application/json",
            },
            signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        });

        // Si el backend responde 404 lo tratamos como "sin puntos de venta"
        if (response.status === 404) {
            return Response.json([], { headers });
        }

        if (!response.ok) {
            const text = await response.text();
            console.error(`Error HTTP ${response.status} del backend:`, text.substring(0, 500));
            return Response.json(
                { error: "El backend no pudo entregar los puntos de venta" },
                { status: 502, headers },
            );
        }

        const data = await response.json();
        return Response.json(data ?? [], { headers });
    } catch (err) {
        console.error("Error en el proxy:", err);
        const timedOut = err.name === "TimeoutError";
        return Response.json(
            { error: timedOut ? "El backend tardó demasiado en responder" : "Error al obtener los puntos de venta" },
            { status: timedOut ? 504 : 502, headers },
        );
    }
}

export default {
    async fetch(request, env) {
        const { pathname } = new URL(request.url);
        const origin = request.headers.get("Origin");

        if (origin && !getAllowedOrigins(env).includes(origin)) {
            return Response.json({ error: "Origen no permitido" }, { status: 403 });
        }

        const headers = { ...corsHeaders(origin), "Cache-Control": "no-store" };

        if (pathname !== PDV_PATH) {
            return Response.json({ error: "Ruta no encontrada" }, { status: 404, headers });
        }
        if (request.method === "OPTIONS") {
            return new Response(null, { status: 204, headers });
        }
        if (request.method !== "GET") {
            return Response.json(
                { error: "Método no permitido" },
                { status: 405, headers: { ...headers, Allow: "GET, OPTIONS" } },
            );
        }

        return getPdv(env, headers);
    },
};
