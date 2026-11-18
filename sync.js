/* Sincronización opcional entre dispositivos mediante una frase compartida.
   - De la frase se derivan (PBKDF2) dos cosas: el identificador del "cajón" en Firestore y la clave AES-GCM.
   - Todo se cifra en el dispositivo antes de subirlo: el servidor solo guarda texto ilegible.
   - Cada etiqueta/registro/meta es un documento: vaults/{vaultId}/items/{docId}, con { iv, data, updatedAt }.
   - updatedAt lo pone el servidor (REQUEST_TIME); sirve para descargar solo lo nuevo.
   - Conflictos: gana la versión con updatedAt local (momento de la edición) más reciente.
   La configuración de Firebase no es secreta: la protegen las reglas de Firestore y el cifrado. */
const Sync = (() => {
  const PROJECT = 'tempo-app-b9116';
  const API_KEY = 'AIzaSyCryuRESEF1IdghNf_l1qM4TuIb0lWG6dw';
  const ROOT = `projects/${PROJECT}/databases/(default)/documents`;
  const API = `https://firestore.googleapis.com/v1/${ROOT}`;
  const STORES = ['tags', 'records', 'goals'];
  const LS_KEY = 'tempo-sync';
  const SALT = 'tempo-sync-v1';
  const ITERATIONS = 310000;
  const PAGE = 300, BATCH = 400, OVERLAP_MS = 120000, MIN_PHRASE = 12;
  const enc = new TextEncoder(), dec = new TextDecoder();

  let cfg = readCfg(), aesKey = null, running = null, debounce = null;
  let status = { state: cfg ? 'idle' : 'off', message: '' };
  const api = { onData: null, onStatus: null };

  function readCfg() { try { const c = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); return c && c.vaultId && c.key ? c : null } catch { return null } }
  function writeCfg() { if (cfg) localStorage.setItem(LS_KEY, JSON.stringify(cfg)); else localStorage.removeItem(LS_KEY) }
  function setStatus(state, message = '') { status = { state, message }; api.onStatus?.(status) }

  const hex = b => [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  const toB64 = b => { let s = ''; for (const x of b) s += String.fromCharCode(x); return btoa(s) };
  const fromB64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const normalize = p => String(p).normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();

  async function derive(phrase) {
    const base = await crypto.subtle.importKey('raw', enc.encode(normalize(phrase)), 'PBKDF2', false, ['deriveBits']);
    const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(SALT), iterations: ITERATIONS }, base, 512));
    return { vaultId: hex(bits.slice(0, 32)), key: toB64(bits.slice(32)) };
  }
  async function key() { if (!aesKey) aesKey = await crypto.subtle.importKey('raw', fromB64(cfg.key), 'AES-GCM', false, ['encrypt', 'decrypt']); return aesKey }
  /* El id del documento no revela el id local: hash de "almacén:id". */
  async function docIdFor(store, id) { return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(`${cfg.vaultId}:${store}:${id}`)))).slice(0, 40) }
  async function encrypt(docId, payload) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(docId) }, await key(), enc.encode(JSON.stringify(payload)));
    return { iv: toB64(iv), data: toB64(new Uint8Array(ct)) };
  }
  async function decrypt(docId, iv, data) {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(iv), additionalData: enc.encode(docId) }, await key(), fromB64(data));
    return JSON.parse(dec.decode(pt));
  }

  async function post(url, body) {
    const res = await fetch(`${url}?key=${API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) { const text = await res.text().catch(() => ''); const err = new Error(`Firestore ${res.status}`); err.status = res.status; err.detail = text; throw err }
    return res.json();
  }

  /* Descarga los documentos modificados desde la última vez y los fusiona en IndexedDB. Devuelve los ids remotos vistos. */
  async function pull(full = false) {
    const seen = new Map(); let changed = 0, cursor = null, maxTs = cfg.lastPulled || null;
    const since = !full && cfg.lastPulled ? new Date(Date.parse(cfg.lastPulled) - OVERLAP_MS).toISOString() : null;
    for (;;) {
      const q = { from: [{ collectionId: 'items' }], orderBy: [{ field: { fieldPath: 'updatedAt' }, direction: 'ASCENDING' }, { field: { fieldPath: '__name__' }, direction: 'ASCENDING' }], limit: PAGE };
      if (since) q.where = { fieldFilter: { field: { fieldPath: 'updatedAt' }, op: 'GREATER_THAN_OR_EQUAL', value: { timestampValue: since } } };
      if (cursor) q.startAt = { values: [{ timestampValue: cursor.ts }, { referenceValue: cursor.name }], before: false };
      const rows = (await post(`${API}/vaults/${cfg.vaultId}:runQuery`, { structuredQuery: q })).filter(r => r.document);
      for (const { document: d } of rows) {
        const docId = d.name.split('/').pop(), ts = d.fields?.updatedAt?.timestampValue;
        cursor = { ts, name: d.name };
        if (ts && (!maxTs || Date.parse(ts) > Date.parse(maxTs))) maxTs = ts;
        let item;
        try {
          item = await decrypt(docId, d.fields.iv.stringValue, d.fields.data.stringValue);
          if (!STORES.includes(item.s) || !item.v?.id || docId !== await docIdFor(item.s, item.v.id)) throw new Error('documento inconsistente');
        } catch (err) { console.warn('Sync: documento ignorado', docId, err); continue }
        seen.set(`${item.s}:${item.v.id}`, item.v);
        const local = await DB.get(item.s, item.v.id), remote = item.v;
        if (local && local._dirty && (local.updatedAt || 0) > (remote.updatedAt || 0)) continue; // la edición local es más reciente: se subirá
        if (local && !local._dirty && local.updatedAt === remote.updatedAt && !!local.deleted === !!remote.deleted) continue; // ya está al día
        await DB.put(item.s, { ...remote, _dirty: false }); changed++;
      }
      if (rows.length < PAGE) break;
    }
    if (maxTs) { cfg.lastPulled = maxTs; writeCfg() }
    return { changed, seen };
  }

  /* Sube todo lo marcado como pendiente (_dirty) en lotes atómicos. */
  async function push() {
    const pending = [];
    for (const s of STORES) for (const item of await DB.all(s)) if (item._dirty) pending.push({ s, item });
    for (let i = 0; i < pending.length; i += BATCH) {
      const chunk = pending.slice(i, i + BATCH), writes = [];
      for (const { s, item } of chunk) {
        const { _dirty, ...v } = item, docId = await docIdFor(s, v.id), { iv, data } = await encrypt(docId, { s, v });
        writes.push({ update: { name: `${ROOT}/vaults/${cfg.vaultId}/items/${docId}`, fields: { iv: { stringValue: iv }, data: { stringValue: data } } }, updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }] });
      }
      await post(`${API}:commit`, { writes });
      // Solo se marca como subido si no se ha vuelto a editar mientras tanto.
      for (const { s, item } of chunk) { const cur = await DB.get(s, item.id); if (cur && cur._dirty && cur.updatedAt === item.updatedAt) await DB.put(s, { ...cur, _dirty: false }) }
    }
    return pending.length;
  }

  function describe(err) {
    if (!navigator.onLine) return 'Sin conexión. Se sincronizará al volver a tener internet.';
    if (err?.status === 403) return 'El servidor ha rechazado el acceso (revisa las reglas de Firestore).';
    if (err?.status === 429) return 'Demasiadas peticiones; se reintentará más tarde.';
    return 'No se pudo sincronizar. Se reintentará automáticamente.';
  }

  async function sync() {
    if (!cfg) return;
    if (running) return running;
    if (!navigator.onLine) { setStatus('offline', describe()); return }
    running = (async () => {
      setStatus('syncing');
      try {
        const { changed } = await pull();
        await push();
        cfg.lastSyncAt = Date.now(); writeCfg();
        setStatus('idle');
        if (changed) await api.onData?.();
      } catch (err) { console.warn('Sync:', err, err.detail || ''); setStatus('error', describe(err)) }
    })().finally(() => { running = null });
    return running;
  }

  /* Activa la sincronización en este dispositivo. Combina los datos locales con los del cajón:
     - las etiquetas locales que aún no se han subido y tienen el mismo nombre que una remota se fusionan con ella;
     - el resto de datos locales se sube. */
  async function link(phrase) {
    if (normalize(phrase).length < MIN_PHRASE) throw new Error(`La frase debe tener al menos ${MIN_PHRASE} caracteres.`);
    if (!navigator.onLine) throw new Error('Necesitas conexión a internet para activar la sincronización.');
    const derived = await derive(phrase);
    cfg = { vaultId: derived.vaultId, key: derived.key, lastPulled: null, lastSyncAt: null }; aesKey = null;
    setStatus('syncing');
    try {
      const { seen } = await pull(true);
      const remoteTags = [...seen].filter(([k, v]) => k.startsWith('tags:') && !v.deleted).map(([, v]) => v);
      const remap = new Map();
      for (const t of await DB.all('tags')) {
        if (seen.has(`tags:${t.id}`) || t.deleted) continue;
        const twin = remoteTags.find(r => (r.name || '').toLowerCase() === (t.name || '').toLowerCase());
        if (twin) { remap.set(t.id, twin.id); await DB.remove('tags', t.id) } // nunca se había subido: se puede borrar sin rastro
      }
      const now = Date.now();
      for (const s of STORES) for (const item of await DB.all(s)) {
        let next = item;
        if ((s === 'records' || s === 'goals') && remap.has(item.tagId)) next = { ...item, tagId: remap.get(item.tagId), updatedAt: now, _dirty: true };
        else if (!seen.has(`${s}:${item.id}`) && !item._dirty) next = { ...item, updatedAt: item.updatedAt || now, _dirty: true };
        if (next !== item) await DB.put(s, next);
      }
      await push();
      cfg.lastSyncAt = Date.now(); writeCfg();
      setStatus('idle');
      await api.onData?.();
    } catch (err) {
      cfg = null; aesKey = null; writeCfg(); setStatus('off');
      if (err?.status) throw new Error(describe(err));
      throw err;
    }
  }

  function unlink() { cfg = null; aesKey = null; clearTimeout(debounce); writeCfg(); setStatus('off') }
  function schedule(delay = 1500) { if (!cfg) return; clearTimeout(debounce); debounce = setTimeout(sync, delay) }

  /* Código aleatorio fácil de copiar: 4 grupos de 5 caracteres (100 bits), sin letras confusas. */
  function generateCode() {
    const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789', out = [];
    const bytes = crypto.getRandomValues(new Uint8Array(20));
    for (let i = 0; i < 20; i++) out.push(alphabet[bytes[i] % alphabet.length]);
    return [0, 5, 10, 15].map(i => out.slice(i, i + 5).join('')).join('-');
  }

  window.addEventListener('online', () => schedule(500));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') schedule(300) });
  setInterval(() => { if (document.visibilityState === 'visible') sync() }, 60000);

  return Object.assign(api, {
    enabled: () => !!cfg,
    lastSyncAt: () => cfg?.lastSyncAt || null,
    status: () => status,
    link, unlink, sync, schedule, generateCode,
    _internal: { derive, normalize, docIdFor, encrypt, decrypt, reload: () => { cfg = readCfg(); aesKey = null } } // para pruebas
  });
})();
