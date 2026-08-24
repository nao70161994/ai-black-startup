"use strict";

window.AIBS_CREATE_SAVE_RUNTIME = function (options) {
  const settings = options && typeof options === "object" ? options : {};
  const saveKey = String(settings.saveKey || "app_save");
  const schemaVersion = Math.max(1, Math.floor(Number(settings.schemaVersion) || 1));
  const backupKey = String(settings.backupKey || saveKey + "_backup");
  const corruptKey = String(settings.corruptKey || saveKey + "_corrupt");

  function cloneData(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function migrateV0ToV1(source) {
    const migrated = cloneData(source);
    migrated.schemaVersion = 1;
    return migrated;
  }

  function migrateV1ToV2(source) {
    const migrated = cloneData(source);
    migrated.legacyGlobalBugs = Math.max(0, Math.min(100, Number(migrated.legacyGlobalBugs != null ? migrated.legacyGlobalBugs : migrated.bugs) || 0));
    delete migrated.bugs;
    migrated.schemaVersion = 2;
    return migrated;
  }

  function migrateV2ToV3(source) {
    const migrated = cloneData(source);
    migrated.strategyId = typeof migrated.strategyId === "string" ? migrated.strategyId : "balanced";
    migrated.decisionThreads = migrated.decisionThreads && typeof migrated.decisionThreads === "object" ? migrated.decisionThreads : {};
    migrated.metricHistory = Array.isArray(migrated.metricHistory) ? migrated.metricHistory : [];
    migrated.playSeconds = Math.max(0, Math.floor(Number(migrated.playSeconds) || 0));
    migrated.relationshipFlags = migrated.relationshipFlags && typeof migrated.relationshipFlags === "object" ? migrated.relationshipFlags : {};
    migrated.aiUsageSeconds = migrated.aiUsageSeconds && typeof migrated.aiUsageSeconds === "object" ? migrated.aiUsageSeconds : {};
    migrated.playtestStageId = typeof migrated.playtestStageId === "string" ? migrated.playtestStageId : "";
    migrated.playtestStageEnteredAt = Math.max(0, Math.floor(Number(migrated.playtestStageEnteredAt) || 0));
    migrated.schemaVersion = 3;
    return migrated;
  }

  const migrations = { 0: migrateV0ToV1, 1: migrateV1ToV2, 2: migrateV2ToV3 };

  function migrateData(source) {
    if (!source || typeof source !== "object" || Array.isArray(source)) throw new Error("Save root must be an object.");
    let data = cloneData(source);
    const originalVersion = Math.max(0, Math.floor(Number(data.schemaVersion) || 0));
    if (originalVersion > schemaVersion) throw new Error("Save schema is newer than this app.");
    let currentVersion = originalVersion;
    while (currentVersion < schemaVersion) {
      const migrate = migrations[currentVersion];
      if (typeof migrate !== "function") throw new Error("Missing save migration for schema " + currentVersion + ".");
      data = migrate(data);
      currentVersion = Math.max(0, Math.floor(Number(data.schemaVersion) || 0));
    }
    data.schemaVersion = schemaVersion;
    return { data: data, migratedFrom: originalVersion };
  }

  function parse(raw) {
    if (typeof raw !== "string" || !raw.trim()) throw new Error("Save data is empty.");
    return migrateData(JSON.parse(raw));
  }

  function preserveCorrupt(storage, raw) {
    if (typeof raw !== "string" || !raw) return;
    try { storage.setItem(corruptKey, raw); }
    catch (error) { console.warn("Corrupt save could not be preserved.", error); }
  }

  function load(storage) {
    const raw = storage.getItem(saveKey);
    if (!raw) return { data: null, source: "new", migratedFrom: schemaVersion, error: null };
    try {
      const parsed = parse(raw);
      return { data: parsed.data, source: "primary", migratedFrom: parsed.migratedFrom, error: null };
    } catch (primaryError) {
      preserveCorrupt(storage, raw);
      const backupRaw = storage.getItem(backupKey);
      if (backupRaw) {
        try {
          const backup = parse(backupRaw);
          return { data: backup.data, source: "backup", migratedFrom: backup.migratedFrom, error: primaryError };
        } catch (backupError) {
          return { data: null, source: "new", migratedFrom: schemaVersion, error: backupError };
        }
      }
      return { data: null, source: "new", migratedFrom: schemaVersion, error: primaryError };
    }
  }

  function backupCurrent(storage) {
    const raw = storage.getItem(saveKey);
    if (!raw) return false;
    try { parse(raw); }
    catch (error) { return false; }
    storage.setItem(backupKey, raw);
    return true;
  }

  function save(storage, source) {
    backupCurrent(storage);
    const data = cloneData(source && typeof source === "object" ? source : {});
    data.schemaVersion = schemaVersion;
    const raw = JSON.stringify(data);
    storage.setItem(saveKey, raw);
    return raw;
  }

  function restoreBackup(storage) {
    const raw = storage.getItem(backupKey);
    if (!raw) throw new Error("Backup save does not exist.");
    const restored = parse(raw);
    storage.setItem(saveKey, JSON.stringify(restored.data));
    return restored;
  }

  function hasBackup(storage) {
    try { return Boolean(storage.getItem(backupKey) && parse(storage.getItem(backupKey))); }
    catch (error) { return false; }
  }


  function getSlotKey(slotId) {
    const id = String(slotId || "");
    if (!/^[1-3]$/.test(id)) throw new Error("Save slot must be 1, 2, or 3.");
    return saveKey + "_slot_" + id;
  }

  function saveSlot(storage, slotId, source) {
    const data = migrateData(source && typeof source === "object" ? source : {}).data;
    storage.setItem(getSlotKey(slotId), JSON.stringify(data));
    return data;
  }
  function loadSlot(storage, slotId) {
    const raw = storage.getItem(getSlotKey(slotId));
    if (!raw) throw new Error("Save slot is empty.");
    return parse(raw);
  }

  function listSlots(storage) {
    return ["1", "2", "3"].map(function (slotId) {
      const raw = storage.getItem(getSlotKey(slotId));
      if (!raw) return { id: slotId, occupied: false };
      try {
        const parsed = parse(raw);
        return { id: slotId, occupied: true, appVersion: String(parsed.data.appVersion || ""), lastSavedAt: Math.max(0, Number(parsed.data.lastSavedAt) || 0), companyLevel: Math.max(1, Math.floor(Number(parsed.data.companyLevel) || 1)) };
      } catch (error) {
        return { id: slotId, occupied: true, invalid: true };
      }
    });
  }

  function exportData(source) {
    const data = migrateData(source && typeof source === "object" ? source : {}).data;
    return JSON.stringify({ format: "ai-black-startup-save", schemaVersion: schemaVersion, exportedAt: Date.now(), data: data }, null, 2);
  }

  function importData(text) {
    if (typeof text !== "string" || !text.trim()) throw new Error("Import data is empty.");
    if (text.length > 2000000) throw new Error("Import data is too large.");
    const decoded = JSON.parse(text);
    if (decoded && typeof decoded === "object" && Object.prototype.hasOwnProperty.call(decoded, "format") && decoded.format !== "ai-black-startup-save") throw new Error("Import format is not supported.");
    const source = decoded && decoded.format === "ai-black-startup-save" ? decoded.data : decoded;
    return migrateData(source).data;
  }
  return {
    schemaVersion: schemaVersion,
    saveKey: saveKey,
    backupKey: backupKey,
    corruptKey: corruptKey,
    load: load,
    save: save,
    parse: parse,
    migrateData: migrateData,
    backupCurrent: backupCurrent,
    restoreBackup: restoreBackup,
    hasBackup: hasBackup,
    getSlotKey: getSlotKey,
    saveSlot: saveSlot,
    loadSlot: loadSlot,
    listSlots: listSlots,
    exportData: exportData,
    importData: importData
  };
};
