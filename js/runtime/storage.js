"use strict";

window.AIBS_CREATE_STORAGE_FACADE = function (storage) {
  const memory = {};
  let persistent = Boolean(storage);

  function getItem(key) {
    const normalizedKey = String(key);
    if (persistent) {
      try {
        const value = storage.getItem(normalizedKey);
        if (value !== null) memory[normalizedKey] = String(value);
        return value;
      } catch (error) { persistent = false; }
    }
    return Object.prototype.hasOwnProperty.call(memory, normalizedKey) ? memory[normalizedKey] : null;
  }

  function setItem(key, value) {
    const normalizedKey = String(key);
    const normalizedValue = String(value);
    memory[normalizedKey] = normalizedValue;
    if (persistent) {
      try { storage.setItem(normalizedKey, normalizedValue); }
      catch (error) { persistent = false; }
    }
  }

  function removeItem(key) {
    const normalizedKey = String(key);
    delete memory[normalizedKey];
    if (persistent) {
      try { storage.removeItem(normalizedKey); }
      catch (error) { persistent = false; }
    }
  }

  return {
    getItem: getItem,
    setItem: setItem,
    removeItem: removeItem,
    isPersistent: function () { return persistent; }
  };
};
