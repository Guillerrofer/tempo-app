/* IndexedDB local: los datos no se envían a ningún servidor. */
const DB = (() => {
  const DB_NAME = 'tempo-local-db', VERSION = 1;
  let db;
  function open() {
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,VERSION);
      req.onupgradeneeded=()=>{
        const d=req.result;
        if(!d.objectStoreNames.contains('records')) d.createObjectStore('records',{keyPath:'id'});
        if(!d.objectStoreNames.contains('tags')) d.createObjectStore('tags',{keyPath:'id'});
        if(!d.objectStoreNames.contains('goals')) d.createObjectStore('goals',{keyPath:'id'});
      };
      req.onsuccess=()=>{db=req.result;resolve(db)}; req.onerror=()=>reject(req.error);
    });
  }
  async function store(name,mode='readonly'){if(!db) await open();return db.transaction(name,mode).objectStore(name)}
  async function all(name){const s=await store(name);return new Promise((r,j)=>{const q=s.getAll();q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error)})}
  async function put(name,value){const s=await store(name,'readwrite');return new Promise((r,j)=>{const q=s.put(value);q.onsuccess=()=>r(value);q.onerror=()=>j(q.error)})}
  async function remove(name,id){const s=await store(name,'readwrite');return new Promise((r,j)=>{const q=s.delete(id);q.onsuccess=()=>r();q.onerror=()=>j(q.error)})}
  async function replaceAll(name,items){const s=await store(name,'readwrite');return new Promise((r,j)=>{const q=s.clear();q.onsuccess=()=>{items.forEach(x=>s.put(x));r()};q.onerror=()=>j(q.error)})}
  return {open,all,put,remove,replaceAll};
})();