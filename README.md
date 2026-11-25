# Tempo — PWA personal de registro de tiempo

Primera versión funcional de una aplicación web instalable para Android.

## Qué incluye
- Cronómetro y temporizador con reloj retro flip. El temporizador suena al llegar a cero (se puede silenciar sin pararlo) y sigue contando tiempo extra; se guarda el total.
- La etiqueta se elige al finalizar y guardar (se recuerda la última usada).
- Pantalla completa (cuadrado pequeño en la esquina superior derecha del reloj) con controles accesibles; la pantalla no se apaga mientras está abierta (si el navegador lo permite).
- Reanudación de sesión tras cerrar o bloquear el móvil.
- Pausar, reanudar, reiniciar (descartar la sesión sin guardarla) y guardar registros. Las pausas no cuentan en las estadísticas ni en las metas.
- Avisos al salir de la app con una sesión en marcha («¿Sigues ahí?» y recordatorios cada 5, 10, 20 o 30 min, con botón para pausar). Se activan o desactivan en Ajustes.
- Etiquetas personalizables.
- Historial y alta manual de registros.
- Estadísticas por día, semana (lunes a domingo), mes, trimestre y año.
- Objetivos diarios, semanales y mensuales, generales o por etiqueta, con un desplegable que muestra los registros que suman a cada meta (fecha, etiqueta, duración y nota).
- Exportación e importación de copias JSON. La importación comprueba el archivo antes y, si falla, no modifica tus datos.
- Almacenamiento local mediante IndexedDB.
- Sincronización opcional entre dispositivos con una frase o código (Ajustes → Sincronización). Los datos se cifran en el dispositivo antes de subirse a Firebase.
- PWA con caché básica.

## Ejecutar en el ordenador
IndexedDB y los service workers necesitan un origen seguro. No abras `index.html` con doble clic.

Opción sencilla:
1. Instala Visual Studio Code.
2. Abre esta carpeta.
3. Instala la extensión **Live Server**.
4. Pulsa con el botón derecho sobre `index.html` y elige **Open with Live Server**.

También puedes usar Python si ya lo tienes instalado:
```bash
python -m http.server 8000
```
Después abre `http://localhost:8000`.

## Instalar en el Samsung
Para instalarla como PWA, publica la carpeta en un alojamiento HTTPS (por ejemplo, Vercel o GitHub Pages). Abre la dirección en Chrome en el Samsung y usa el menú ⋮ > Instalar aplicación o Añadir a pantalla de inicio.

## Importante
- Los datos se guardan en el almacenamiento del navegador de cada dispositivo.
- Sin sincronización activada, no se envía nada a ningún servidor. Con ella, solo se sube texto cifrado con tu frase: guárdala bien, porque sin ella no se pueden recuperar los datos de la nube, y quien la tenga puede verlos y cambiarlos.
- El cronómetro en marcha, el tema y el modo de reloj son de cada dispositivo y no se sincronizan.
- Exporta copias de seguridad regularmente.
- Esta es una primera versión de desarrollo. Antes de usarla para datos importantes, prueba exportación/importación, cambios de fecha, sesiones largas y recuperación tras reiniciar el móvil.

## Próximas mejoras recomendadas
1. Editor completo de registros (fecha, hora, duración, etiqueta y nota).
2. Alertas de objetivos mediante notificaciones.
3. Accesibilidad, pruebas y ajustes visuales específicos para Samsung/Android.
