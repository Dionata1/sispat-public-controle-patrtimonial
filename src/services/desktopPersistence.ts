const DB_NAME = 'SISPAT_PUBLIC_DESKTOP';
const DB_VERSION = 1;
const STORE_NAME = 'kv';
const PREFIXES = ['sispat_'];

let dbPromise: Promise<IDBDatabase> | null = null;
let originalSetItem: typeof Storage.prototype.setItem | null = null;
let originalRemoveItem: typeof Storage.prototype.removeItem | null = null;
let originalClear: typeof Storage.prototype.clear | null = null;

function isSispatKey(key: string) {
  return PREFIXES.some(prefix => key.startsWith(prefix));
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Falha ao abrir banco local IndexedDB.'));
  });
  return dbPromise;
}

async function getAllDbEntries(): Promise<Array<[string, string]>> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const keysReq = store.getAllKeys();
    const valuesReq = store.getAll();
    tx.oncomplete = () => {
      const keys = (keysReq.result || []).map(String);
      const values = (valuesReq.result || []).map(String);
      resolve(keys.map((key, index) => [key, values[index] ?? '']));
    };
    tx.onerror = () => reject(tx.error || new Error('Falha ao ler o banco local.'));
  });
}

async function putDbValue(key: string, value: string) {
  if (!isSispatKey(key)) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Falha ao gravar no banco local.'));
  });
}

async function deleteDbValue(key: string) {
  if (!isSispatKey(key)) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Falha ao excluir do banco local.'));
  });
}

async function clearDb() {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Falha ao limpar o banco local.'));
  });
}

function patchLocalStorage() {
  if (originalSetItem) return;
  originalSetItem = Storage.prototype.setItem;
  originalRemoveItem = Storage.prototype.removeItem;
  originalClear = Storage.prototype.clear;

  Storage.prototype.setItem = function(key: string, value: string) {
    originalSetItem!.call(this, key, value);
    if (this === window.localStorage && isSispatKey(String(key))) {
      void putDbValue(String(key), String(value)).catch(err => console.error('SISPAT DB set:', err));
    }
  };

  Storage.prototype.removeItem = function(key: string) {
    originalRemoveItem!.call(this, key);
    if (this === window.localStorage && isSispatKey(String(key))) {
      void deleteDbValue(String(key)).catch(err => console.error('SISPAT DB remove:', err));
    }
  };

  Storage.prototype.clear = function() {
    originalClear!.call(this);
    if (this === window.localStorage) {
      void clearDb().catch(err => console.error('SISPAT DB clear:', err));
    }
  };
}

export async function initDesktopDatabase() {
  if (!('indexedDB' in window)) {
    console.warn('IndexedDB indisponível. O SISPAT usará armazenamento local de compatibilidade.');
    return;
  }

  const entries = await getAllDbEntries();
  const rawSetItem = Storage.prototype.setItem;

  if (entries.length > 0) {
    // Banco local é a fonte principal: restaura o cache síncrono antes do React iniciar.
    for (const [key, value] of entries) {
      rawSetItem.call(window.localStorage, key, value);
    }
  } else {
    // Primeira execução/migração: leva dados SISPAT existentes para o banco local.
    const pending: Promise<void>[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || !isSispatKey(key)) continue;
      const value = window.localStorage.getItem(key);
      if (value !== null) pending.push(putDbValue(key, value));
    }
    await Promise.all(pending);
  }

  patchLocalStorage();
}

export type SispatBackup = {
  product: 'SISPAT Public';
  version: '4.0';
  database: 'IndexedDB';
  exportedAt: string;
  records: Record<string, string>;
};

export async function createLocalBackup(): Promise<SispatBackup> {
  const entries = await getAllDbEntries();
  const records: Record<string, string> = {};
  for (const [key, value] of entries) records[key] = value;
  return {
    product: 'SISPAT Public',
    version: '4.0',
    database: 'IndexedDB',
    exportedAt: new Date().toISOString(),
    records,
  };
}

export async function downloadLocalBackup() {
  const backup = await createLocalBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  a.href = url;
  a.download = `SISPAT_Backup_${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function restoreLocalBackup(file: File) {
  const text = await file.text();
  const parsed = JSON.parse(text) as Partial<SispatBackup>;
  if (parsed.product !== 'SISPAT Public' || !parsed.records || typeof parsed.records !== 'object') {
    throw new Error('Arquivo de backup inválido para o SISPAT Public.');
  }

  await clearDb();
  const rawClear = originalClear || Storage.prototype.clear;
  const rawSet = originalSetItem || Storage.prototype.setItem;
  rawClear.call(window.localStorage);

  for (const [key, value] of Object.entries(parsed.records)) {
    if (!isSispatKey(key) || typeof value !== 'string') continue;
    rawSet.call(window.localStorage, key, value);
    await putDbValue(key, value);
  }
}

export async function getLocalDatabaseStatus() {
  try {
    const entries = await getAllDbEntries();
    const approxBytes = entries.reduce((total, [k, v]) => total + new Blob([k, v]).size, 0);
    return {
      connected: true,
      type: 'IndexedDB / LevelDB local',
      entries: entries.length,
      approxBytes,
      profilePath: '%LOCALAPPDATA%\\SISPAT Public\\EdgeProfile',
    };
  } catch {
    return {
      connected: false,
      type: 'IndexedDB / LevelDB local',
      entries: 0,
      approxBytes: 0,
      profilePath: '%LOCALAPPDATA%\\SISPAT Public\\EdgeProfile',
    };
  }
}
