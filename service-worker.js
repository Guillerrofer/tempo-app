/* Service worker de Tempo.
   - Archivos propios: primero la red (siempre la última versión si hay conexión); si no hay red o tarda más de 4 s, la caché.
   - Recursos externos (Google Fonts): primero la caché.
   - Al instalar se descarga todo saltándose la caché HTTP del navegador (GitHub Pages guarda 10 min), para no precargar archivos viejos.
   Sube CACHE cuando cambie la lista FILES o la lógica de este archivo. */
const CACHE='tempo-shell-v19';
const FILES=['./','./index.html','./styles.css','./database.js','./sync.js','./app.js','./manifest.webmanifest','./icons/icon.svg','./icons/icon-192.png','./icons/icon-512.png'];
const NETWORK_TIMEOUT=4000;

self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES.map(f=>new Request(f,{cache:'reload'})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));

function store(req,res){if(res&&(res.ok||res.type==='opaque')){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy))}return res}
function fallback(req){return caches.match(req,{ignoreSearch:req.mode==='navigate'}).then(hit=>hit||(req.mode==='navigate'?caches.match('./index.html'):Response.error()))}

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin){
    e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>store(req,res))).catch(()=>Response.error()));
    return;
  }
  // 'no-cache' revalida con el servidor (respuesta 304 barata si no ha cambiado).
  const network=fetch(req.url,{cache:'no-cache',credentials:'same-origin'}).then(res=>store(req,res));
  const timeout=new Promise(resolve=>setTimeout(resolve,NETWORK_TIMEOUT));
  e.respondWith(Promise.race([network.catch(()=>null),timeout]).then(res=>res||fallback(req)));
});
