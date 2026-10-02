# dev-helper

Extensión de Chrome (Manifest V3) para manejar desde el popup el `localStorage`, el
`sessionStorage`, las cookies y userscripts de la pestaña activa, con simulación de
dispositivos y snippets guardados.

Hecha con Preact, Tailwind y Vite.

## Instalar

```bash
npm install
npm run build
```

En `chrome://extensions`: **Modo de desarrollador** → **Cargar descomprimida** → la carpeta
`dist/`. `npm run package` arma además un `extension.zip`.
