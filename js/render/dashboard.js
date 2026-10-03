"use strict";

// Game ticks update only the visible page. User actions can refresh all pages.
// Preserve controls being operated: replacing their DOM breaks keyboard and pointer input.
window.AIBS_PRESERVE_FOCUS = function (root, update) {
  const active = document.activeElement;
  const owned = root && active && typeof root.contains === "function" && root.contains(active);
  const attributes = owned && active.attributes ? Array.from(active.attributes).filter(function (attribute) { return attribute.name === "id" || attribute.name.indexOf("data-") === 0; }) : [];
  const text = owned ? active.textContent : "";
  update();
  if (!owned || active.isConnected || root.hidden || typeof root.querySelectorAll !== "function") return;
  const replacement = Array.from(root.querySelectorAll("button, select, input, summary, a[href]")).find(function (candidate) {
    return candidate.tagName === active.tagName && (attributes.length ? attributes.every(function (attribute) { return candidate.getAttribute(attribute.name) === attribute.value; }) : candidate.textContent === text);
  });
  if (replacement && !replacement.disabled) replacement.focus({ preventScroll: true });
};

window.AIBS_CREATE_DASHBOARD_RENDERER = function (options) {
  function render(settings) {
    const tick = Boolean(settings && settings.tick);
    const active = document.activeElement;
    options.sections.forEach(function (section) {
      if (tick && section.page && (section.page !== options.getPage() || options.isModalOpen())) return;
      if (tick && section.modal) return;
      const root = section.id ? document.getElementById(section.id) : null;
      if (tick && root && active && typeof root.contains === "function" && root.contains(active)) return;
      window.AIBS_PRESERVE_FOCUS(root, section.render);
    });
    options.afterRender();
  }
  return { render: render };
};
