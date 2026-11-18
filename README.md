# Proxy PDV Castrol

Cloudflare Worker que consulta los puntos de venta de Castrol sin exponer el token del backend en la web.

## Endpoint

`GET /api/castrol/pdv` devuelve la lista de puntos de venta en JSON.

## Desarrollo local

```bash
npm install
cp .dev.vars.example .dev.vars   # y pega el token en .dev.vars
npm run dev
```

## Publicar en Cloudflare

```bash
npx wrangler login
npx wrangler secret put API_TOKEN
npm run deploy
```

Al terminar, Wrangler muestra la URL pública:
`https://castrol-pdv-proxy.<tu-subdominio>.workers.dev/api/castrol/pdv`

## Orígenes permitidos

La variable `ALLOWED_ORIGINS` de `wrangler.toml` define qué sitios pueden llamar al proxy desde el navegador. Si la web cambia de dominio, agrégalo ahí y vuelve a publicar.
