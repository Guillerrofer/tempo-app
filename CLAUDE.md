# CLAUDE.md — Guía del proyecto Tempo

Este archivo explica el proyecto para Claude y para cualquier persona que vaya a mantenerlo. Léelo antes de cambiar código. La aplicación está en esta carpeta y es una PWA estática para registrar tiempo.

## 1. Descripción general

### Para qué sirve

Tempo (también aparece como “Simple Clock” en la interfaz) es un cronómetro personal. Permite medir sesiones, clasificarlas con etiquetas, guardarlas en un historial y consultar estadísticas y objetivos. Está pensado para instalarse en Android como PWA, pero también funciona en un navegador de escritorio.

### Funcionalidades actuales

- Reloj retro flip con dos tipos de sesión: cronómetro y temporizador. El temporizador (`timer.target` en ms) cuenta hacia atrás; al llegar a cero suena una alarma (Web Audio + vibración, y notificación si la app está en segundo plano y hay permiso) con un botón «Silenciar alarma» (`#muteBtn`, `timer.muted`) que no lo detiene, y sigue contando tiempo extra. Al guardar, el registro es igual que el del cronómetro y su `duration` es el total (temporizador + extra). No se puede cambiar de tipo con una sesión activa.
- Inicio, pausa, reanudación, reinicio (descarta la sesión sin guardar, con confirmación) y finalización/guardado de sesiones.
- Persistencia de la sesión activa entre recargas mediante `localStorage`.
- La etiqueta no se elige al empezar: se elige en el diálogo de «Finalizar y guardar», con la última etiqueta usada preseleccionada.
- Modo de pantalla completa (icono pequeño ⛶, solo esquinas, en la esquina superior derecha del reloj) con controles del cronómetro accesibles; al pausar no sale de pantalla completa y al finalizar y guardar sí.
- Bloqueo de pantalla opcional (`Wake Lock`) cuando el navegador lo admite.
- Avisos en segundo plano (Ajustes → «Avisos en segundo plano», activados por defecto, cada 5/10/20/30 min; localStorage['tempo-notify'] = {enabled, minutes}): al ocultarse la app con una sesión en marcha (no en pausa) se muestra «¿Sigues ahí?» y luego un recordatorio cada N minutos (onAppHidden, ackgroundCheck cada 15 s, gNextAt). Todas usan el tag 	empo-session y se cierran al volver (stopBackgroundNotices). Tienen las acciones «Pausar» y «Volver a Tempo»: service-worker.js (
otificationclick) envía {type:'pause-timer', at} a la app o, si está cerrada, abre ./?action=pause&at=…; pauseAt(at) pausa con la hora en que se pulsó. Los programa la página, no un servidor: si Android congela la app en segundo plano, se retrasan.
- Etiquetas configurables, con nombre y color.
- Historial de sesiones, edición de etiqueta/nota, borrado y alta manual. Las duraciones del historial y de las metas (progreso y desglose) se muestran con segundos mediante `humanS()`; las estadísticas, los objetivos de las metas y el diálogo de guardado usan `human()` (horas y minutos).
- Estadísticas por día, semana (lunes a domingo), mes, trimestre y año, con desglose por etiqueta.
- Metas diarias, semanales y mensuales, generales o asociadas a una etiqueta; se pueden editar y eliminar. Cada meta tiene un desplegable «Ver registros (N)» (`<details class="goal-details">`, `goalBreakdown()`) con los registros que cuentan en el periodo actual: etiqueta, fecha, tiempo que cuenta (si el registro cruza el inicio del periodo, «cuenta X de Y») y nota. Las metas abiertas se recuerdan en `openGoals` mientras la app está abierta.
- Exportación e importación de copia de seguridad JSON.
- Sincronización opcional entre dispositivos con una frase compartida (cifrado de extremo a extremo, Firebase Firestore).
- Tema claro/oscuro.
- PWA instalable con caché para uso sin conexión.

### Cómo funciona internamente

La aplicación es estática: el navegador carga HTML, CSS y JavaScript. `app.js` inicializa IndexedDB, carga etiquetas, registros y metas, conecta los eventos de interfaz y renderiza las vistas. `database.js` encapsula las operaciones sobre IndexedDB. El cronómetro activo se guarda por separado en `localStorage` bajo la clave `tempo-timer`.

Los datos no se envían a un backend: cada instalación/navegador conserva sus propios datos. Publicar cambios en GitHub Pages actualiza los archivos de la aplicación, pero no sincroniza los datos entre dispositivos ni debe borrar IndexedDB.

### Tecnologías

- HTML5, CSS3 y JavaScript del navegador, sin framework ni compilación.
- IndexedDB para los datos persistentes; `localStorage` para preferencias y estado del cronómetro.
- Service Worker y Web App Manifest para instalación y caché PWA.
- APIs opcionales del navegador: Fullscreen, Screen Orientation, Wake Lock y Storage Persistence.
- Google Fonts se carga desde una URL externa en `styles.css`; el resto de la app no usa bibliotecas de terceros.
- Firebase Firestore (proyecto `tempo-app-b9116`, plan Spark) solo si el usuario activa la sincronización. Se usa su API REST con `fetch`, sin el SDK de Firebase.

## 2. Estructura del proyecto

Árbol completo de los archivos de aplicación presentes en esta copia:

```text
 time-tracker-pwa/
 ├── CLAUDE.md                 Guía de trabajo para Claude (este documento)
 ├── README.md                 Instrucciones breves de ejecución e instalación
 ├── index.html                Estructura de las vistas, formularios y diálogos
 ├── styles.css                Estilos, modos visuales y adaptación a pantalla completa
 ├── app.js                    Estado, lógica de interfaz, cronómetro y cálculos
 ├── database.js               Acceso a IndexedDB
 ├── sync.js                   Sincronización cifrada con Firestore (opcional)
 ├── service-worker.js         Precaché y comportamiento sin conexión
 ├── manifest.webmanifest      Metadatos de instalación PWA
 └── icons/
     ├── icon.svg              Icono vectorial
     ├── icon-192.png          Icono PWA de 192 × 192
     └── icon-512.png          Icono PWA de 512 × 512
```

### Archivos esenciales

- **`index.html`**: IDs y clases conectan los controles con `app.js` y `styles.css`. Al cambiar un ID, busca y actualiza todas sus referencias.
- **`app.js`**: lógica principal. Incluye inicialización, navegación, cronómetro, modo fullscreen, registros, estadísticas, metas, ajustes y copias JSON.
- **`database.js`**: nombre de base, versión y stores de IndexedDB (`records`, `tags`, `goals`). Es crítico para la persistencia de datos.
- **`styles.css`**: estilos base y reglas específicas de pantalla pequeña/grande, orientación y pantalla completa. Al final hay reglas de ajustes posteriores que pueden prevalecer sobre reglas anteriores por cascada.
- **`service-worker.js`**: lista los archivos precargados y asigna el nombre de caché. Es crítico al publicar cambios porque un nombre de caché nuevo hace que el navegador instale la nueva versión.
- **`manifest.webmanifest`**: determina nombre, iconos, ruta inicial y modo de presentación de la PWA.

### Auxiliares

- **`README.md`**: guía corta dirigida a usuarios para ejecutar e instalar la aplicación.
- **`icons/`**: recursos gráficos de instalación.
- **`CLAUDE.md`**: contexto e instrucciones de mantenimiento; actualizarlo cuando cambien arquitectura o convenciones.

No hay `package.json`, gestor de paquetes, sistema de compilación, suite de tests ni `.gitignore`. Esta carpeta es la raíz del repositorio Git (ver sección 4).

## 3. Funcionamiento técnico

### Conexión de componentes y flujo de datos

1. `index.html` carga `database.js` antes de `app.js`.
2. `app.js` llama `DB.open()`, carga `tags`, `records` y `goals`, restaura el estado del temporizador desde `localStorage` y dibuja la interfaz.
3. Las acciones de usuario modifican estado y persisten los cambios con `DB.put`, `DB.remove` o `DB.replaceAll`.
4. Las estadísticas y el progreso de metas se calculan en el cliente a partir de los registros. Las sesiones que cruzan los límites de un periodo se recortan para el cálculo de estadísticas.
5. Al guardar un temporizador se crea un registro con hora de inicio, fin, duración, etiqueta y nota opcional. Cancelar el diálogo de guardado no debería finalizar ni borrar la sesión.
6. Pausas: el temporizador guarda en `timer.segments` los tramos activos `[inicio, fin]`. Al guardar, el registro incluye `segments` y `startAt`/`endAt` son el inicio real y el fin real (así que `endAt - startAt` puede ser mayor que `duration`). Las estadísticas y metas usan `overlap(registro, a, b)`, que suma solo los tramos activos; si un registro no tiene `segments` (registros antiguos o manuales) usa `[startAt, endAt]`. Nunca calcules tiempo con `endAt - startAt` directamente: usa `duration` u `overlap`.
7. Al cargar la página, se registra `service-worker.js` si el navegador lo permite.
8. Modo retro: `renderFlip(ms)` crea dos `.flip-card` (horas `data-unit="h"` con la etiqueta `H`, y minutos `data-unit="m"` con `.flip-seconds` en la esquina). `setFlipCard` solo reconstruye una tarjeta cuando cambia su valor: mitad superior nueva, mitad inferior antigua y dos solapas animadas (`.flip-flap-top` con el valor antiguo y `.flip-flap-bottom` con el nuevo). Si el usuario prefiere menos movimiento (`prefers-reduced-motion`), no hay animación. Los tamaños usan unidades de contenedor (`cqw`) relativas a cada tarjeta. Fuente: Oswald (Google Fonts).
9. Pantalla completa (`body.timer-fullscreen`, todo en un único bloque al final de `styles.css`): `--fs-top` y `--fs-bottom` reservan el espacio de la barra superior y de los controles, y el reloj se dimensiona con `--fs-h`. En pantalla completa solo se ven el reloj, la × para salir y `#fsToggleBtn` (un único botón que inicia, pausa o reanuda, abajo en el centro); la fila de 4 botones y el estado se ocultan. Fuera de pantalla completa, `#fsToggleBtn` está oculto y se usan los 4 botones. `#fullscreenBtn` está dentro de `.timer-ring` (posición absoluta en la esquina) y en pantalla completa pasa a `position:fixed` arriba a la derecha como botón ×. Si cambias la altura de los controles, ajusta esas variables.

### Base de datos y almacenamiento

- IndexedDB: base `tempo-local-db`, versión actual `1`.
- Stores: `records`, `tags`, `goals`; todas usan `id` como clave.
- La aplicación crea etiquetas predeterminadas si la lista está vacía.
- `localStorage`: temporizador (`tempo-timer`), tipo de sesión elegido (`tempo-kind`: `stopwatch`/`countdown`), última duración del temporizador (`tempo-countdown`, ms), avisos en segundo plano (`tempo-notify`), tema (`tempo-light`) y última etiqueta usada al guardar (`tempo-last-tag`).
- No hay cuentas de usuario ni servidor propio. La única API remota es Firestore, y solo con la sincronización activada.

### Sincronización (`sync.js`)

- **Frase → cajón y clave:** PBKDF2-SHA256 (310 000 iteraciones, sal fija `tempo-sync-v1`) sobre la frase normalizada (NFC, sin espacios repetidos, minúsculas) da 512 bits: los 256 primeros, en hex, son `vaultId`; los 256 siguientes, la clave AES-GCM. Se guardan en `localStorage['tempo-sync']` junto con `lastPulled` (marca de servidor) y `lastSyncAt`. La frase nunca se guarda.
- **Remoto:** `vaults/{vaultId}/items/{docId}` con `{iv, data, updatedAt}`. `docId` = SHA-256 de `vaultId:almacén:id` (40 hex). `data` es `{s: almacén, v: elemento}` cifrado con AES-GCM, con `docId` como dato adicional autenticado. `updatedAt` lo fija el servidor (`REQUEST_TIME`).
- **Local:** cada cambio pasa por `save()`/`softDelete()` en `app.js`, que ponen `updatedAt` (hora local de la edición) y `_dirty: true`. Los borrados son marcas `{id, deleted: true, updatedAt}` sin contenido; `load()` las oculta. **No uses `DB.put`/`DB.remove` directamente para datos del usuario**, o el cambio no se sincronizará.
- **Ciclo:** primero `pull` (descarga desde `lastPulled` menos 2 min, paginando por `updatedAt` + `__name__`) y luego `push` (lotes atómicos de hasta 400). En un conflicto gana el `updatedAt` local más reciente.
- **Cuándo se sincroniza:** al abrir la app, 1,5 s después de cada cambio, al recuperar la conexión, al volver a la app y cada 60 s mientras está visible.
- **Al activarla** (`Sync.link`), las etiquetas locales nunca subidas que se llaman igual que una remota se fusionan con ella y se reasignan sus registros y metas; el resto se sube.
- **Importación:** con o sin sincronización, `importPlan()` marca como pendiente todo lo importado y convierte en borrado lo que ya no está.
- **Reglas de Firestore** (publicadas por el usuario en la consola): lectura solo con un `vaultId` de 64 caracteres; escritura solo con las claves `iv`, `data` y `updatedAt`, con `data` de menos de 20 000 caracteres y `updatedAt == request.time`; nada de borrados. Listar cajones o hacer consultas globales está denegado (comprobado con 403). Si cambias el formato de los documentos, actualiza también las reglas y avisa al usuario.
- **Configuración:** la `apiKey` y el `projectId` están en `sync.js` y no son secretos. La protección viene de las reglas, del cifrado y, opcionalmente, de restringir la clave a `https://guillerrofer.github.io/*` en Google Cloud.
- **Lo que no se sincroniza:** el cronómetro activo, el tema, el modo de reloj y la última etiqueta usada (todo en `localStorage`).
- Las copias JSON incluyen etiquetas, registros y metas (sin marcas de borrado ni `_dirty`). No incluyen el temporizador activo ni las preferencias. El campo `segments` de los registros es opcional, así que las copias antiguas siguen siendo válidas.
- La importación valida cada elemento con `isValidBackup` y escribe los tres stores con `DB.replaceStores` en una sola transacción: o se guarda todo o no cambia nada.
- `app.js` y el resto del código deben guardarse en UTF-8. Si aparecen textos como `Ã³` o `Â¿`, el archivo se ha guardado con una codificación incorrecta.

**Precaución con los datos:** nunca borres stores, cambies el nombre de la base ni eleves su versión sin diseñar y revisar una migración compatible. No uses `DB.replaceAll`/`DB.replaceStores` salvo para implementar deliberadamente la importación confirmada por el usuario. No borres datos del sitio durante mantenimiento. Recomienda exportar una copia antes de cambios de esquema.

### Dependencias y configuración

No se instalan dependencias. El navegador necesita servir la app desde `localhost` o HTTPS para que IndexedDB/PWA y el Service Worker funcionen como se espera. Abrir el HTML con `file://` no es el flujo recomendado.

### Ejecutar localmente

Desde la carpeta `time-tracker-pwa`:

```bash
python -m http.server 8000
```

Abre `http://localhost:8000`. También se puede abrir `index.html` con la extensión Live Server de VS Code. Para PWA instalada en el teléfono, publica esta carpeta bajo HTTPS y abre su URL en Chrome/Android.

### Comprobación manual

No hay tests automatizados configurados. Cuando el usuario pida verificar cambios, comprueba en un navegador:

- Que la app carga sin errores de consola y se puede navegar entre las vistas.
- Cronómetro: iniciar, pausar, reanudar, guardar, cancelar guardado y recargar con una sesión activa.
- Pantalla completa: controles visibles; pausar/reanudar no sale; finalizar y confirmar el guardado sí sale.
- Crear/editar/eliminar metas diarias, semanales y mensuales, con y sin etiqueta.
- Cambiar los periodos de estadísticas, incluida semana de lunes a domingo.
- Crear un registro y confirmar historial, totales y progreso de meta.
- Exportar e importar una copia si se tocó esa zona.
- En móvil, comprobar orientación vertical/horizontal y que los controles no queden tapados.

No afirmes que una comprobación se hizo si no se ejecutó realmente.

## 4. Git y GitHub

### Conceptos

- **Git** guarda un historial local de cambios del código.
- **GitHub** aloja repositorios Git y puede publicar una web estática con GitHub Pages.
- **Commit**: instantánea identificada de cambios, con mensaje descriptivo.
- **Rama (branch)**: línea independiente de trabajo; permite preparar cambios sin tocar la rama principal.
- **Push**: sube commits locales al remoto (por ejemplo, GitHub).
- **Pull**: obtiene e integra cambios del remoto en la rama local (habitualmente `git pull` equivale a fetch + integración).
- **Merge**: integra los cambios de una rama en otra; puede producir conflictos si dos cambios editan las mismas líneas.

### Organización y estado conocidos

- Esta carpeta (`time-tracker-pwa/`) **es la raíz del repositorio**: remoto `origin` = `https://github.com/Guillerrofer/tempo-app.git`, rama `main`.
- GitHub Pages publica la raíz de `main` en `https://guillerrofer.github.io/tempo-app/`. Un push a `main` se publica en menos de un minuto.
- Identidad configurada solo en este repositorio: `guillerrofer` / `guillerrofer@users.noreply.github.com` (correo anónimo de GitHub; no uses el correo real del usuario).
- **Publicación automática:** el usuario quiere que Claude haga commit y push a `main` al terminar cada cambio, sin pedir confirmación, después de comprobarlo (pruebas o capturas) y de subir la versión `CACHE` si hace falta. Excepción: los cambios que puedan borrar o reinterpretar datos (esquema de IndexedDB, formato de sincronización o de exportación, reglas de Firestore) se consultan antes, según la sección 5. La autenticación la gestiona Git Credential Manager de Windows. `gh` no está instalado.

### Flujo para guardar y publicar cambios

```bash
git status
git pull --ff-only
git add <archivos cambiados>      # nunca `git add -A` sin revisar git status antes
git diff --cached
git commit -m "Describe el cambio"
git push
```

Antes de publicar, sube la versión `CACHE` de `service-worker.js` si cambió algún archivo precargado. Después del push, comprueba que `https://guillerrofer.github.io/tempo-app/service-worker.js` sirve la versión nueva. No hagas `push --force`, `reset --hard`, `rebase` ni cambios de rama sin que el usuario lo pida.

### Recuperar versiones anteriores

- `git diff` muestra cambios no confirmados.
- `git log --oneline` muestra commits anteriores.
- `git restore -- archivo` descarta cambios locales de ese archivo: es destructivo; no ejecutarlo sin autorización explícita y copia/revisión previa.
- Para recuperar una versión antigua, inspecciona primero `git show COMMIT:ruta/al/archivo`; luego restaura de forma consciente en una rama o commit nuevo.
- Evita `git reset --hard` y `git push --force`: pueden eliminar trabajo o historial compartido.

### Trabajar sin sobrescribir cambios ni perder código

1. Antes de editar, lee instrucciones existentes (`CLAUDE.md`, `AGENTS.md`, `README.md`) y ejecuta/revisa `git status` si hay Git.
2. Inspecciona el archivo y el cambio local antes de tocarlo; preserva cambios del usuario aunque no estén relacionados.
3. Limita el cambio a los archivos necesarios. No reemplaces archivos completos si basta una edición concreta.
4. No cambies el esquema/almacenamiento sin estrategia de migración y respaldo.
5. Antes de publicar, revisa el diff y confirma qué archivos se modificaron.
6. Si se trabaja manualmente desde GitHub web, descarga/sube la versión completa actualizada de cada archivo afectado y no elimines archivos de datos o configuración por intuición. Los commits de GitHub también forman historial.

### `.gitignore` y `README.md`

- `.gitignore` indica a Git qué archivos locales no debe añadir, por ejemplo temporales del editor, logs o dependencias descargadas. No existe en esta copia. Si se añade, no ignores archivos esenciales de la PWA (`index.html`, JS, CSS, manifest o iconos), ni exportaciones que el usuario quiera conservar sin consultarle.
- `README.md` es la primera guía de instalación/uso para personas. Mantén ahí las instrucciones breves de usuario y usa este `CLAUDE.md` para contexto técnico, arquitectura y reglas de mantenimiento.

### Conflictos

Si Git informa de un conflicto, no borres marcadores ni elijas una versión automáticamente. Abre el archivo, entiende ambas modificaciones, conserva las dos intenciones cuando sea posible y revisa el diff. Si el conflicto afecta a datos, migraciones, configuración de publicación o un cambio del usuario cuyo propósito no se entiende, detente y pide contexto. Tras resolverlo, `git status` debe dejar de listar el archivo como no resuelto; luego se revisa y confirma la integración.

## 5. Instrucciones para Claude

### Forma de trabajar

- Responde en español salvo que el usuario solicite otro idioma.
- Trata `time-tracker-pwa/` como raíz de la aplicación. No asumas que la raíz de workspace tiene Git.
- Antes de modificar, inspecciona el estado real de los archivos; no confíes solo en conversaciones previas o en capturas del IDE.
- Explica brevemente qué archivos vas a tocar y por qué cuando el cambio sea sustancial.
- Haz el cambio completo solicitado y comunica qué cambió y qué quedó sin verificar.
- No instales frameworks ni añadas build tooling para una mejora pequeña: el diseño actual es JavaScript estático sin dependencias.
- No subas a GitHub ni publiques/despliegues cambios a menos que el usuario lo pida explícitamente.

### Convenciones de código

- Mantén el estilo actual del proyecto (JavaScript simple, funciones pequeñas, CSS/HTML sin proceso de compilación).
- Conserva los IDs/clases y contratos usados entre `index.html`, `app.js` y `styles.css`; si cambian, actualiza las tres referencias.
- Escapa texto introducido por el usuario al insertarlo en HTML (`escapeHtml`). No interpoles texto libre sin escapar.
- Conserva diseño responsive, accesibilidad básica (etiquetas, nombres accesibles y estados disabled) y manejo de APIs opcionales con fallback.
- Respeta el idioma y el estilo visual existentes.
- Al cambiar archivos que el Service Worker precarga, incrementa el nombre `CACHE` en `service-worker.js` (por ejemplo, de `tempo-shell-v7` a `tempo-shell-v8`) para que clientes instalados reciban los recursos nuevos. No elimines cachés/datos de usuario de otra forma.

### Añadir una funcionalidad

1. Identifica el flujo de datos y los controles relacionados antes de editar.
2. Actualiza markup (`index.html`), comportamiento (`app.js`), estilos (`styles.css`) y persistencia (`database.js`) solo si hace falta.
3. Si introduces un nuevo campo/store, diseña una migración de IndexedDB y preserva datos previos; subir `VERSION` sin migración no es suficiente.
4. Actualiza `service-worker.js` y su versión de caché si el recurso servido cambió; actualiza el `README.md` para capacidades visibles de usuario y este documento para cambios estructurales.
5. Comprueba manualmente la ruta afectada cuando se solicite y describe el resultado real.

### Consultar antes de tocar partes importantes

Pide aclaración al usuario antes de una decisión que pueda eliminar datos, cambiar el significado de registros/metas existentes, alterar el formato de exportación, introducir sincronización/cuentas/servicios externos, modificar el flujo de publicación, sobrescribir cambios locales sin entenderlos o hacer operaciones Git destructivas. Para cambios visuales o funcionales reversibles que respeten la arquitectura actual, elige una solución razonable y avanza sin interrumpir con preguntas innecesarias.
