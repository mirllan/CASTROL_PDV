# Buscador PDVs Castrol

Página estática para buscar puntos de venta de Castrol por nombre, código SAP, dirección o ciudad.

Los datos llegan desde el proxy de Cloudflare publicado desde la rama `Proxy`. Su URL se configura en `PROXY_URL`, al inicio de `script.js`.

## Publicar en GitHub Pages

En **Settings > Pages** del repositorio, selecciona **Deploy from a branch**, la rama `Web` y la carpeta `/ (root)`.

## Probar en local

Sirve la carpeta en el puerto 5500, por ejemplo con la extensión Live Server de VS Code. El proxy solo acepta ese puerto en local.
