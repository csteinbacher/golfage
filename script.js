/* The Wolf – Simple Tracker (v0.5.3)
   - Inputs sized as % of card (mobile fix)
   - Floating New Game button (bottom-right)
   - Footer toggle white text
   - Native confirm() on New Game
   - Manual scoring, rotating tee order, persistent state
*/

const els = {
  // setup
  setup: document.getElementById("setup"),
  playersWrap: document.getElementById("playersWrap"),
  addPlayerBtn: document.getElementById("addPlayerBtn"),
  removePlayerBtn: document.getElementById("removePlayerBtn"),
  startBtn: document.getElementById("startBtn"),
  clearBtn: document.getElementById("clearBtn"),

  // board
  board: document.getElementById("board"),
  scoreList: document.getElementById("scoreList"),
  newGameBtn: document.getElementById("newGameBtn"),

  // holes
  holeNum: document.getElementById("holeNum"),
  prevHoleBtn: document.getElementById("prevHoleBtn"),
  nextHoleBtn: document.getElementById("nextHoleBtn"),

  // theme
  themeToggle: document.getElementById("themeToggle"),
};

const STORAGE_KEY = "wolf-simple-v05";
const THEME_KEY = "wolf-theme";

let playersInputs = [];
let players = [];          // [{id, name, score}]
let currentHole = 1;
let baseOrder = [];

/* ---------- Persistence ---------- */
function saveState() {
  const data = { players, currentHole, baseOrder };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!Array.isArray(data.players) || data.players.length < 3) return null;

    data.players = data.players.map(p => ({
      id: String(p.id || uid()),
      name: String(p.name || "Player"),
      score: Number.isFinite(p.score) ? p.score : 0,
    }));
    data.currentHole = Number.isFinite(data.currentHole) && data.currentHole > 0 ? data.currentHole : 1;

    const ids = data.players.map(p => p.id);
    const validBase = Array.isArray(data.baseOrder) && data.baseOrder.length === ids.length &&
                      data.baseOrder.every(id => ids.includes(id));
    data.baseOrder = validBase ? data.baseOrder : ids;

    return data;
  } catch { return null; }
}
function clearState() { try { localStorage.removeItem(STORAGE_KEY); } catch {} }

/* ---------- Theme ---------- */
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try { localStorage.setItem(THEME_KEY, theme); } catch {}
}
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "dark" || saved === "light") applyTheme(saved);
  else applyTheme("light");
}

/* ---------- Setup Helpers ---------- */
const uid = () => Math.random().toString(36).slice(2, 9);

function addPlayerInput(value = "") {
  const wrap = document.createElement("div");
  wrap.className = "mt field";        // add 'field' for CSS width rules
  const label = document.createElement("label");
  label.textContent = `Player ${playersInputs.length + 1}`;
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Name";
  input.value = value;
  wrap.append(label, input);
  els.playersWrap.appendChild(wrap);
  playersInputs.push(input);
}
function ensure3to5() {
  while (playersInputs.length < 3) addPlayerInput();
  if (playersInputs.length < 4) addPlayerInput(); // convenience 4th slot
}
function clearSetupUI() { els.playersWrap.innerHTML = ""; playersInputs = []; }

/* ---------- Tee Order ---------- */
function orderForHole(holeNumber) {
  const steps = ((holeNumber - 1) % baseOrder.length + baseOrder.length) % baseOrder.length;
  const a = baseOrder.slice();
  return a.slice(steps).concat(a.slice(0, steps));
}
function playersByIdMap() { const m = new Map(); players.forEach(p => m.set(p.id, p)); return m; }

/* ---------- Board Rendering ---------- */
function renderBoard() {
  const byId = playersByIdMap();
  const order = orderForHole(currentHole);
  els.scoreList.innerHTML = order.map((id) => {
    const p = byId.get(id);
    return `
      <li class="item" data-id="${p.id}">
        <div class="name">${escapeHtml(p.name)}</div>
        <button class="btn minus" data-action="dec" aria-label="decrement">–</button>
        <div class="score" data-role="score">${p.score}</div>
        <button class="btn plus" data-action="inc" aria-label="increment">+</button>
      </li>
    `;
  }).join("");
  updateHoleUI();
}
function updateHoleUI() {
  els.holeNum.textContent = currentHole;
  els.prevHoleBtn.disabled = currentHole <= 1;
}

/* ---------- Actions ---------- */
function start() {
  const names = playersInputs.map(i => i.value.trim()).filter(Boolean);
  if (names.length < 3 || names.length > 5) return alert("Enter between 3 and 5 player names.");
  players = names.map(n => ({ id: uid(), name: n, score: 0 }));
  baseOrder = players.map(p => p.id);
  currentHole = 1;
  saveState();
  renderBoard();
  els.setup.classList.add("hidden");
  els.board.classList.remove("hidden");
}
function newGameConfirm() {
  const ok = window.confirm("Start a new game? This will clear players, hole, and scores.");
  if (ok) {
    clearState();
    players = []; baseOrder = []; currentHole = 1;
    clearSetupUI(); ensure3to5();
    els.board.classList.add("hidden");
    els.setup.classList.remove("hidden");
  }
}
function handleListClick(e) {
  const btn = e.target.closest("button"); if (!btn) return;
  const li = btn.closest("li.item"); if (!li) return;
  const id = li.dataset.id;
  const p = players.find(x => x.id === id); if (!p) return;

  const action = btn.dataset.action;
  if (action === "inc") p.score += 1;
  if (action === "dec") p.score -= 1;

  li.querySelector("[data-role='score']").textContent = p.score;
  saveState();
}
function nextHole() { currentHole += 1; renderBoard(); saveState(); }
function prevHole() { if (currentHole > 1) { currentHole -= 1; renderBoard(); saveState(); } }

/* ---------- Utils ---------- */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

/* ---------- Wire Up ---------- */
document.addEventListener("DOMContentLoaded", () => {
  initTheme();

  const saved = loadState();
  if (saved) {
    ({ players, currentHole, baseOrder } = saved);
    renderBoard();
    els.setup.classList.add("hidden");
    els.board.classList.remove("hidden");
  } else {
    ensure3to5();
  }

  // Setup
  els.addPlayerBtn.addEventListener("click", () => { if (playersInputs.length < 5) addPlayerInput(); });
  els.removePlayerBtn.addEventListener("click", () => {
    if (playersInputs.length > 3) { els.playersWrap.lastElementChild.remove(); playersInputs.pop(); }
  });
  els.startBtn.addEventListener("click", start);
  els.clearBtn.addEventListener("click", () => { clearSetupUI(); ensure3to5(); });

  // Board
  els.scoreList.addEventListener("click", handleListClick);
  els.nextHoleBtn.addEventListener("click", nextHole);
  els.prevHoleBtn.addEventListener("click", prevHole);
  els.newGameBtn.addEventListener("click", newGameConfirm);

  // Theme toggle
  els.themeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    applyTheme(current === "dark" ? "light" : "dark");
  });
});
