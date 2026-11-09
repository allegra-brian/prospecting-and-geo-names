// Tiny form helpers shared by the interview and the profile editor.
// A "spec" describes a field: { path, label, kind, help?, options?, fields?, rows? }
// kinds: text | textarea | lines (one item per line -> array) | number | select | rows (array of objects)

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function getPath(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

export function setPath(obj, path, value) {
  const keys = path.split(".");
  let o = obj;
  keys.slice(0, -1).forEach((k, i) => {
    if (o[k] == null || typeof o[k] !== "object") o[k] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    o = o[k];
  });
  o[keys[keys.length - 1]] = value;
}

let uid = 0;
const nextId = () => `f${++uid}`;

function control(spec, value, path) {
  const id = nextId();
  const common = `id="${id}" data-path="${esc(path)}" data-kind="${spec.kind || "text"}"`;
  const ph = spec.placeholder ? ` placeholder="${esc(spec.placeholder)}"` : "";
  let input;
  switch (spec.kind) {
    case "textarea":
      input = `<textarea ${common}${ph} class="${spec.tall ? "tall" : ""}" rows="${spec.rows || 4}">${esc(value)}</textarea>`;
      break;
    case "lines":
      input = `<textarea ${common}${ph} rows="${spec.rows || 5}">${esc((value || []).join("\n"))}</textarea>`;
      break;
    case "number":
      input = `<input type="number" ${common}${ph} value="${esc(value ?? "")}" ${spec.min != null ? `min="${spec.min}"` : ""} ${spec.max != null ? `max="${spec.max}"` : ""}>`;
      break;
    case "select":
      input = `<select ${common}>${spec.options
        .map((o) => {
          const [v, l] = Array.isArray(o) ? o : [o, o];
          return `<option value="${esc(v)}" ${String(v) === String(value) ? "selected" : ""}>${esc(l)}</option>`;
        })
        .join("")}</select>`;
      break;
    default:
      input = `<input type="${spec.type || "text"}" ${common}${ph} value="${esc(value ?? "")}">`;
  }
  const counter =
    spec.maxChars != null
      ? `<div class="counter" data-counter-for="${id}" data-max="${spec.maxChars}">${String(value || "").length} / ${spec.maxChars}</div>`
      : "";
  return { id, input, counter };
}

export function fieldHTML(spec, state, basePath = "") {
  const path = basePath ? `${basePath}.${spec.path}` : spec.path;
  const value = getPath(state, path);
  if (spec.kind === "rows") {
    const items = Array.isArray(value) ? value : [];
    return `<div class="field">
      <span class="label">${esc(spec.label)}</span>
      ${spec.help ? `<span class="help">${esc(spec.help)}</span>` : ""}
      <div class="rows">
        ${items
          .map(
            (_, i) => `<div class="rowcard">
              <div class="rowgrid">${spec.fields.map((f) => fieldHTML(f, state, `${path}.${i}`)).join("")}</div>
              <div class="rowfoot"><button type="button" class="btn ghost small" data-remove-row="${esc(path)}" data-index="${i}">Remove</button></div>
            </div>`
          )
          .join("")}
      </div>
      <button type="button" class="btn secondary small" data-add-row="${esc(path)}">+ ${esc(spec.addLabel || "Add")}</button>
    </div>`;
  }
  const { id, input, counter } = control(spec, value, path);
  const help = spec.kind === "lines" ? spec.help || "One per line." : spec.help;
  return `<label class="field" for="${id}">
    <span class="label">${esc(spec.label)}</span>
    ${help ? `<span class="help">${esc(help)}</span>` : ""}
    ${input}${counter}
  </label>`;
}

function readValue(el) {
  const kind = el.dataset.kind;
  if (kind === "lines") return el.value.split("\n").map((s) => s.trim()).filter(Boolean);
  if (kind === "number") return el.value === "" ? null : Number(el.value);
  if (kind === "select" && /^\d+$/.test(el.value) && el.dataset.numeric === "1") return Number(el.value);
  return el.value;
}

/**
 * Wire inputs inside `root` to `state`. `specsByPath` lets row-add know the empty shape.
 * onChange() fires on every edit; rerender() is called after rows are added/removed.
 */
export function bindFields(root, state, { onChange, rerender, rowTemplates = {} }) {
  root.addEventListener("input", (e) => {
    const el = e.target.closest("[data-path]");
    if (!el) return;
    setPath(state, el.dataset.path, readValue(el));
    const c = root.querySelector(`[data-counter-for="${el.id}"]`);
    if (c) {
      const n = el.value.length;
      c.textContent = `${n} / ${c.dataset.max}`;
      c.classList.toggle("over", n > Number(c.dataset.max));
    }
    onChange?.();
  });
  root.addEventListener("change", (e) => {
    const el = e.target.closest("select[data-path]");
    if (!el) return;
    const v = el.value;
    setPath(state, el.dataset.path, /^\d+$/.test(v) ? Number(v) : v);
    onChange?.();
  });
  root.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add-row]");
    const rem = e.target.closest("[data-remove-row]");
    if (add) {
      const path = add.dataset.addRow;
      const arr = getPath(state, path) || [];
      const tmplKey = path.replace(/\.\d+\./g, ".");
      arr.push(structuredClone(rowTemplates[tmplKey] || {}));
      setPath(state, path, arr);
      onChange?.();
      rerender?.();
    } else if (rem) {
      const path = rem.dataset.removeRow;
      const arr = getPath(state, path) || [];
      arr.splice(Number(rem.dataset.index), 1);
      onChange?.();
      rerender?.();
    }
  });
}
