# Hardcore Fighters — copia de seguridad

Esta copia contiene el código fuente, los personajes, frames, fondos, tests y la configuración necesaria para continuar el juego desde otra cuenta de ChatGPT.

## Estado guardado

- Versión visible: `V2.18.56`
- Commit: `153b53074ad82bd3b5dd1a78c46da32578278c75`
- Juego publicado: https://benifaio-fighters-v2-3-1.kaleb-padberg93.chatgpt.site/
- Project ID de Sites: `appgprj_6a8dc270baa0819184c04a656557af82`

## Para continuar

1. Descomprime el archivo y abre la carpeta del proyecto.
2. Instala Node.js 22 o superior.
3. Ejecuta `npm install`.
4. Comprueba el proyecto con `npm run lint` y `npm test`.
5. Para abrirlo en local, ejecuta `npm run dev`.

La carpeta `node_modules`, la compilación `dist`, las cachés y los artefactos temporales no están incluidos porque se regeneran con `npm install` y los comandos del proyecto. No se ha incluido ninguna credencial privada.

Para publicar desde otra cuenta, importa esta carpeta como proyecto web y conserva el `.openai/hosting.json`; si la cuenta nueva no tiene acceso al Project ID anterior, crea un Site nuevo y publica el código allí.
