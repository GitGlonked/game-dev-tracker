const STORAGE_KEY = "game-dev-tracker:v1";

const AREAS = [
  { id: "code", label: "Code", detail: "Systems, gameplay, tools" },
  { id: "art", label: "Art", detail: "Characters, worlds, interface" },
  { id: "design", label: "Design", detail: "Levels, mechanics, pacing" },
  { id: "audio", label: "Audio", detail: "Music, effects, voice" },
];

const STATUSES = [
  { id: "todo", label: "To do" },
  { id: "doing", label: "In progress" },
  { id: "done", label: "Done" },
];

const areaById = Object.fromEntries(AREAS.map((area) => [area.id, area]));

let state = loadState();
let filter = { area: "all", milestoneId: "all" };

const els = {
  title: document.getElementById("game-title"),
  logline: document.getElementById("game-logline"),
  shipDate: document.getElementById("ship-date"),
  shipNote: document.getElementById("ship-note"),
  ring: document.getElementById("overall-ring"),
  pct: document.getElementById("overall-pct"),
  copy: document.getElementById("overall-copy"),
  areas: document.getElementById("areas"),
  milestones: document.getElementById("milestones"),
  clearMilestone: document.getElementById("clear-milestone-filter"),
  board: document.getElementById("board"),
  taskForm: document.getElementById("task-form"),
  milestoneForm: document.getElementById("milestone-form"),
};

function sampleState() {
  return {
    title: "Cinderwake",
    logline: "A lantern-bearer crosses a city that only exists at dusk.",
    shipDate: "2027-03-20",
    milestones: [
      { id: "m-slice", title: "Vertical slice", date: "2026-12-15" },
      { id: "m-lock", title: "Content lock", date: "2027-02-01" },
      { id: "m-rc", title: "Release candidate", date: "2027-03-20" },
    ],
    tasks: [
      task("Lantern throw with a readable arc", "code", "m-slice", "doing"),
      task("Camera that leans into turns", "code", "m-slice", "done"),
      task("Dusk city blockout", "design", "m-slice", "done"),
      task("First loop: light, walk, hide", "design", "m-slice", "doing"),
      task("Lantern-bearer silhouette", "art", "m-slice", "doing"),
      task("Dusk palette and window glow", "art", "m-slice", "done"),
      task("Stone footstep set", "audio", "m-slice", "done"),
      task("A short dusk theme", "audio", "m-slice", "doing"),
      task("Three districts with distinct routes", "design", "m-lock", "todo"),
      task("Market crowd loops", "audio", "m-lock", "todo"),
      task("NPC idle poses", "art", "m-lock", "todo"),
      task("Dialogue barks", "code", "m-lock", "todo"),
      task("Save and continue", "code", "m-rc", "todo"),
      task("Final mix pass", "audio", "m-rc", "todo"),
    ],
  };
}

function task(title, area, milestoneId, status) {
  return { id: crypto.randomUUID(), title, area, milestoneId, status };
}

function blankState() {
  return {
    title: "",
    logline: "",
    shipDate: "",
    milestones: [],
    tasks: [],
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return sampleState();
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.tasks) || !Array.isArray(data.milestones)) {
      return sampleState();
    }
    return data;
  } catch {
    return sampleState();
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function percent(tasks) {
  if (!tasks.length) return 0;
  const done = tasks.filter((item) => item.status === "done").length;
  return Math.round((100 * done) / tasks.length);
}

function formatDate(iso) {
  if (!iso) return "No date";
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "No date";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function daysUntil(iso) {
  if (!iso) return null;
  const target = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

function milestoneName(id) {
  return state.milestones.find((item) => item.id === id)?.title || "No milestone";
}

function visibleTasks() {
  return state.tasks.filter((item) => {
    const areaOk = filter.area === "all" || item.area === filter.area;
    const milestoneOk = filter.milestoneId === "all" || item.milestoneId === filter.milestoneId;
    return areaOk && milestoneOk;
  });
}

function hydrateHeader() {
  els.title.value = state.title;
  els.logline.value = state.logline;
  els.shipDate.value = state.shipDate || "";
  document.title = state.title.trim()
    ? `${state.title.trim()} · Game Dev Tracker`
    : "Game Dev Tracker";
}

function renderOverall() {
  const tasks = visibleTasks();
  const value = percent(state.tasks);
  els.ring.style.setProperty("--p", String(value));
  els.pct.textContent = `${value}%`;

  const done = state.tasks.filter((item) => item.status === "done").length;
  if (!state.tasks.length) {
    els.copy.textContent = "Add tasks to see progress across the production.";
  } else if (filter.area !== "all" || filter.milestoneId !== "all") {
    const shownDone = tasks.filter((item) => item.status === "done").length;
    els.copy.textContent = `${done} of ${state.tasks.length} tasks finished · showing ${shownDone} of ${tasks.length}`;
  } else {
    els.copy.textContent = `${done} of ${state.tasks.length} tasks finished`;
  }

  const days = daysUntil(state.shipDate);
  if (days === null) els.shipNote.textContent = "Set a target date";
  else if (days === 0) els.shipNote.textContent = "Ships today";
  else if (days > 0) els.shipNote.textContent = `${days} days to target`;
  else els.shipNote.textContent = `${Math.abs(days)} days past target`;
}

function renderAreas() {
  els.areas.innerHTML = AREAS.map((area) => {
    const tasks = state.tasks.filter((item) => item.area === area.id);
    const value = percent(tasks);
    const pressed = filter.area === area.id;
    return `
      <button type="button" class="area" data-area="${area.id}" aria-pressed="${pressed}" style="--tone: var(--${area.id}); --p: ${value}">
        <div class="area-label">
          <span>${area.label}</span>
          <strong>${value}%</strong>
        </div>
        <p>${tasks.length ? `${tasks.filter((item) => item.status === "done").length} of ${tasks.length} done` : area.detail}</p>
        <div class="bar" aria-hidden="true"><span></span></div>
      </button>
    `;
  }).join("");
}

function renderMilestones() {
  els.clearMilestone.hidden = filter.milestoneId === "all";
  if (!state.milestones.length) {
    els.milestones.innerHTML = `<li class="empty">Milestones break the game into shippable chunks.</li>`;
    return;
  }

  els.milestones.innerHTML = state.milestones.map((milestone) => {
    const tasks = state.tasks.filter((item) => item.milestoneId === milestone.id);
    const value = percent(tasks);
    const pressed = filter.milestoneId === milestone.id;
    return `
      <li>
        <div class="milestone" data-milestone="${esc(milestone.id)}" aria-pressed="${pressed}" style="--p: ${value}">
          <div class="milestone-top">
            <button type="button" class="text-btn milestone-title" data-action="filter-milestone">${esc(milestone.title)}</button>
            <button type="button" class="icon-btn" data-action="delete-milestone" aria-label="Delete ${esc(milestone.title)}">×</button>
          </div>
          <p class="milestone-date">${formatDate(milestone.date)} · ${value}%</p>
          <div class="bar" style="--tone: var(--ember)" aria-hidden="true"><span></span></div>
        </div>
      </li>
    `;
  }).join("");
}

function statusActions(item) {
  if (item.status === "todo") {
    return `<button type="button" class="ghost" data-action="status" data-status="doing">Start</button>`;
  }
  if (item.status === "doing") {
    return `
      <button type="button" class="ghost" data-action="status" data-status="todo">Back</button>
      <button type="button" class="ghost" data-action="status" data-status="done">Done</button>
    `;
  }
  return `<button type="button" class="ghost" data-action="status" data-status="doing">Reopen</button>`;
}

function renderBoard() {
  const tasks = visibleTasks();
  els.board.innerHTML = STATUSES.map((status) => {
    const column = tasks.filter((item) => item.status === status.id);
    const cards = column.length
      ? column.map((item) => `
          <article class="card" data-task="${esc(item.id)}" style="--tone: var(--${esc(item.area)})">
            <div class="card-top">
              <span class="pill">${esc(areaById[item.area]?.label || "Task")}</span>
              <button type="button" class="icon-btn" data-action="delete" aria-label="Delete ${esc(item.title)}">×</button>
            </div>
            <h3 class="card-title" data-action="edit" tabindex="0">${esc(item.title)}</h3>
            <p class="card-meta">${esc(milestoneName(item.milestoneId))}</p>
            <div class="card-actions">${statusActions(item)}</div>
          </article>
        `).join("")
      : `<p class="empty">Nothing here</p>`;

    return `
      <section class="column" aria-label="${status.label}">
        <div class="column-head">
          <h2>${status.label}</h2>
          <span>${column.length}</span>
        </div>
        <div class="cards">${cards}</div>
      </section>
    `;
  }).join("");
}

function fillMilestoneSelect() {
  const select = els.taskForm.elements.milestone;
  const current = select.value;
  select.innerHTML = `<option value="">No milestone</option>${state.milestones
    .map((item) => `<option value="${esc(item.id)}">${esc(item.title)}</option>`)
    .join("")}`;

  if (document.activeElement === select) return;
  if (filter.milestoneId !== "all" && state.milestones.some((item) => item.id === filter.milestoneId)) {
    select.value = filter.milestoneId;
  } else if ([...select.options].some((option) => option.value === current)) {
    select.value = current;
  }

  const areaSelect = els.taskForm.elements.area;
  if (document.activeElement !== areaSelect && filter.area !== "all") {
    areaSelect.value = filter.area;
  }
}

function render() {
  renderOverall();
  renderAreas();
  renderMilestones();
  renderBoard();
  fillMilestoneSelect();
}

function replaceState(next) {
  state = next;
  filter = { area: "all", milestoneId: "all" };
  save();
  hydrateHeader();
  render();
}

function beginEdit(titleEl, item) {
  const input = document.createElement("input");
  input.className = "card-edit";
  input.value = item.title;
  input.setAttribute("aria-label", "Task title");
  input.maxLength = 140;
  titleEl.replaceWith(input);
  input.focus();
  input.select();

  const finish = (commit) => {
    if (commit) {
      const next = input.value.trim();
      if (next) item.title = next;
      save();
    }
    render();
  };

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      input.blur();
    }
    if (event.key === "Escape") {
      input.dataset.cancel = "1";
      input.blur();
    }
  });
  input.addEventListener("blur", () => finish(input.dataset.cancel !== "1"));
}

els.title.addEventListener("input", () => {
  state.title = els.title.value;
  save();
  document.title = state.title.trim()
    ? `${state.title.trim()} · Game Dev Tracker`
    : "Game Dev Tracker";
});

els.logline.addEventListener("input", () => {
  state.logline = els.logline.value;
  save();
});

els.shipDate.addEventListener("change", () => {
  state.shipDate = els.shipDate.value;
  save();
  renderOverall();
});

els.areas.addEventListener("click", (event) => {
  const button = event.target.closest("[data-area]");
  if (!button) return;
  filter.area = filter.area === button.dataset.area ? "all" : button.dataset.area;
  render();
});

els.milestones.addEventListener("click", (event) => {
  const milestone = event.target.closest("[data-milestone]");
  if (!milestone) return;
  const id = milestone.dataset.milestone;
  const action = event.target.closest("[data-action]")?.dataset.action;

  if (action === "delete-milestone") {
    const name = state.milestones.find((item) => item.id === id)?.title || "this milestone";
    if (!confirm(`Delete “${name}”? Its tasks stay on the board.`)) return;
    state.milestones = state.milestones.filter((item) => item.id !== id);
    state.tasks.forEach((item) => {
      if (item.milestoneId === id) item.milestoneId = "";
    });
    if (filter.milestoneId === id) filter.milestoneId = "all";
    save();
    render();
    return;
  }

  filter.milestoneId = filter.milestoneId === id ? "all" : id;
  render();
});

els.clearMilestone.addEventListener("click", () => {
  filter.milestoneId = "all";
  render();
});

els.board.addEventListener("click", (event) => {
  const card = event.target.closest("[data-task]");
  const actionEl = event.target.closest("[data-action]");
  if (!card || !actionEl) return;
  const item = state.tasks.find((taskItem) => taskItem.id === card.dataset.task);
  if (!item) return;

  if (actionEl.dataset.action === "edit") {
    beginEdit(actionEl, item);
    return;
  }
  if (actionEl.dataset.action === "delete") {
    if (!confirm(`Delete “${item.title}”?`)) return;
    state.tasks = state.tasks.filter((taskItem) => taskItem.id !== item.id);
  }
  if (actionEl.dataset.action === "status") {
    item.status = actionEl.dataset.status;
  }
  save();
  render();
});

els.board.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const title = event.target.closest("[data-action='edit']");
  if (!title) return;
  event.preventDefault();
  title.click();
});

els.taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(els.taskForm);
  const title = String(data.get("title") || "").trim();
  if (!title) return;
  state.tasks.unshift({
    id: crypto.randomUUID(),
    title,
    area: String(data.get("area") || "code"),
    milestoneId: String(data.get("milestone") || ""),
    status: "todo",
  });
  els.taskForm.elements.title.value = "";
  save();
  render();
  els.taskForm.elements.title.focus();
});

els.milestoneForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(els.milestoneForm);
  const title = String(data.get("title") || "").trim();
  if (!title) return;
  state.milestones.push({
    id: crypto.randomUUID(),
    title,
    date: String(data.get("date") || ""),
  });
  els.milestoneForm.reset();
  save();
  render();
  els.milestoneForm.elements.title.focus();
});

document.getElementById("load-sample").addEventListener("click", () => {
  if (!confirm("Replace the current board with the sample game?")) return;
  replaceState(sampleState());
});

document.getElementById("start-fresh").addEventListener("click", () => {
  if (!confirm("Clear this board and start a new game?")) return;
  replaceState(blankState());
});

hydrateHeader();
render();
