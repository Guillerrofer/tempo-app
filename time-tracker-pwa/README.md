# Tempo — PWA personal de registro de tiempo

Primera versión funcional de una aplicación web instalable para Android.

## Qué incluye
- Cronómetro con modo deportivo y modo retro.
- Reanudación de sesión tras cerrar o bloquear el móvil.
- Pausar, reanudar y guardar registros.
- Etiquetas personalizables.
- Historial y alta manual de registros.
- Estadísticas por día, mes, trimestre y año.
- Objetivos diarios y mensuales, generales o por etiqueta.
- Exportación e importación de copias JSON.
- Almacenamiento local mediante IndexedDB.
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
- No hay servidor ni sincronización de registros.
- Exporta copias de seguridad regularmente.
- Esta es una primera versión de desarrollo. Antes de usarla para datos importantes, prueba exportación/importación, cambios de fecha, sesiones largas y recuperación tras reiniciar el móvil.
- El modo retro de esta versión es una aproximación visual flip; la animación de volteo real puede añadirse en una siguiente iteración.

## Próximas mejoras recomendadas
1. Editor completo de registros (fecha, hora, duración, etiqueta y nota).
2. Desglose estadístico robusto de sesiones que cruzan medianoche y límites de periodo.
3. Alertas de objetivos mediante notificaciones.
4. Accesibilidad, pruebas y ajustes visuales específicos para Samsung/Android.
