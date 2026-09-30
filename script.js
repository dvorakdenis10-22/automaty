/* ====== STAV ====== */
const POCKET_MS = 5 * 60 * 1000;
const POCKET_AMOUNT = 500;
let money = 0, inventory = [], pocketReadyAt = Date.now() + POCKET_MS, spinning = false, opening = false;

const $ = id => document.getElementById(id);
const fmt = n => n.toLocaleString("cs-CZ") + " Kč";
const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

function toast(t){ const e=$("toast"); e.textContent=t; e.classList.add("show"); setTimeout(()=>e.classList.remove("show"),2200); }
function save(){ localStorage.setItem("kasino", JSON.stringify({money, inventory, pocketReadyAt})); }
function updateUI(){
  $("money").textContent = fmt(money);
  $("inv-count").textContent = inventory.length;
  save();
}

/* ====== INTRO ====== */
const story = [
  {who:"Ty", t:"Mami, zítra začíná škola a potřebuju koupit učebnice…"},
  {who:"Máma", t:"Tady máš 2 000 Kč na učebnice. Ať je nezapomeneš koupit!"},
  {who:"Ty", t:"Dík, mami! (…v hlavě ti už běží úplně jiný plán…)"},
];
let si = 0;
function showLine(){
  const l = story[si];
  $("intro-speaker").textContent = l.who;
  $("intro-portrait").textContent = l.who === "Máma" ? "👩" : "🧒";
  $("intro-text").textContent = l.t;
  $("intro-next").textContent = si === story.length - 1 ? "Vzít peníze" : "Pokračovat";
}
$("intro-next").onclick = () => {
  si++;
  if (si < story.length) return showLine();
  money = 2000;
  pocketReadyAt = Date.now() + POCKET_MS;
  startGame();
};
function startGame(){
  $("intro").classList.add("hidden");
  $("game").classList.remove("hidden");
  $("story-note").textContent = "Učebnice se samy nekoupí… ale co když vyhraješ víc? 😏";
  buildCases(); renderInv(); updateUI(); tick(); setInterval(tick, 500);
}

/* ====== KAPESNÉ ====== */
function tick(){
  const left = pocketReadyAt - Date.now();
  const btn = $("pocket-btn");
  if (left <= 0){
    btn.disabled = false;
    btn.innerHTML = `Vyzvednout ${POCKET_AMOUNT} Kč`;
  } else {
    btn.disabled = true;
    const s = Math.ceil(left/1000);
    btn.innerHTML = `Za <b>${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}</b>`;
  }
}
$("pocket-btn").onclick = () => {
  money += POCKET_AMOUNT;
  pocketReadyAt = Date.now() + POCKET_MS;
  toast("+" + fmt(POCKET_AMOUNT) + " kapesné");
  updateUI(); tick();
};

/* ====== ZÁLOŽKY ====== */
document.querySelectorAll(".tab").forEach(b => b.onclick = () => {
  document.querySelectorAll(".tab").forEach(x => x.classList.toggle("active", x === b));
  document.querySelectorAll(".panel").forEach(p => p.classList.toggle("hidden", p.id !== b.dataset.tab));
});

/* ====== AUTOMAT ====== */
const SYMBOLS = [
  {s:"🍒", w:30, mult:5}, {s:"🍋", w:26, mult:8}, {s:"🍊", w:20, mult:10},
  {s:"🔔", w:12, mult:15}, {s:"⭐", w:8, mult:25}, {s:"7️⃣", w:4, mult:50},
];
function pickSym(){
  let r = Math.random() * SYMBOLS.reduce((a,b)=>a+b.w,0);
  for (const x of SYMBOLS){ if ((r -= x.w) < 0) return x; }
  return SYMBOLS[0];
}
const bet = () => Math.max(10, parseInt($("bet-input").value) || 10);
$("bet-minus").onclick = () => $("bet-input").value = Math.max(10, bet() - 50);
$("bet-plus").onclick  = () => $("bet-input").value = bet() + 50;
$("bet-max").onclick   = () => $("bet-input").value = Math.max(10, money);

$("spin").onclick = async () => {
  if (spinning) return;
  const b = bet();
  if (b > money) return toast("Nemáš dost peněz!");
  spinning = true; $("spin").disabled = true;
  money -= b; updateUI();
  const msg = $("slot-msg"); msg.className = ""; msg.textContent = "Točí se…";
  const reels = [...document.querySelectorAll(".reel")];
  const result = reels.map(pickSym);

  reels.forEach(r => r.classList.add("spinning"));
  const timers = reels.map(r => setInterval(() => r.firstElementChild.textContent = pickSym().s, 70));
  for (let i = 0; i < 3; i++){
    await new Promise(r => setTimeout(r, 700 + i * 600));
    clearInterval(timers[i]);
    reels[i].classList.remove("spinning");
    reels[i].firstElementChild.textContent = result[i].s;
  }

  let win = 0;
  if (result[0].s === result[1].s && result[1].s === result[2].s) win = b * result[0].mult;
  else if (result[0].s === result[1].s || result[1].s === result[2].s || result[0].s === result[2].s) win = Math.floor(b * 1.5);

  if (win){ money += win; msg.className = "win"; msg.textContent = "Výhra " + fmt(win) + "!"; }
  else { msg.className = "lose"; msg.textContent = "Nic. Zkus to znovu…"; }
  checkBroke();
  spinning = false; $("spin").disabled = false; updateUI();
};

/* ====== BEDNY ====== */
const ITEMS = [
  {n:"Tužka",        i:"✏️", v:20,   r:"common"},
  {n:"Sešit",        i:"📓", v:60,   r:"common"},
  {n:"Sluchátka",    i:"🎧", v:250,  r:"rare"},
  {n:"Sneakers",     i:"👟", v:600,  r:"rare"},
  {n:"Herní myš",    i:"🖱️", v:1400, r:"epic"},
  {n:"Konzole",      i:"🎮", v:3500, r:"epic"},
  {n:"Zlatý řetěz",  i:"⛓️", v:9000, r:"legend"},
  {n:"Sportovní auto",i:"🏎️", v:25000,r:"legend"},
];
const RW = {common:60, rare:25, epic:11, legend:4};
const CASES = [
  {name:"Školní bedna",  ico:"📦", price:100,  boost:0},
  {name:"Stříbrná bedna",ico:"🧰", price:500,  boost:1},
  {name:"Zlatá bedna",   ico:"💎", price:2000, boost:2},
];
function rollItem(boost){
  const w = {...RW}; w.common = Math.max(10, w.common - boost*15);
  w.rare += boost*5; w.epic += boost*6; w.legend += boost*4;
  let r = Math.random() * Object.values(w).reduce((a,b)=>a+b);
  let rar = "common";
  for (const k in w){ if ((r -= w[k]) < 0){ rar = k; break; } }
  const pool = ITEMS.filter(x => x.r === rar);
  return pool[rnd(0, pool.length - 1)];
}
function buildCases(){
  $("case-list").innerHTML = CASES.map((c,i) => `
    <div class="card"><div class="ico">${c.ico}</div><h4>${c.name}</h4><p>${fmt(c.price)}</p>
    <button class="btn small" onclick="openCase(${i})">Otevřít</button></div>`).join("");
}
async function openCase(i){
  if (opening) return;
  const c = CASES[i];
  if (money < c.price) return toast("Nemáš dost peněz!");
  opening = true; money -= c.price; updateUI();
  const won = rollItem(c.boost);
  const WIN_INDEX = 40, LEN = 48;
  const items = Array.from({length: LEN}, (_, k) => k === WIN_INDEX ? won : rollItem(c.boost));
  $("case-open").classList.remove("hidden");
  $("case-result").textContent = "";
  const strip = $("strip");
  strip.style.transition = "none"; strip.style.transform = "translateX(0)";
  strip.innerHTML = items.map(x => `<div class="item r-${x.r}">${x.i}<small>${x.n}</small></div>`).join("");
  await new Promise(r => setTimeout(r, 50));
  const box = strip.parentElement.clientWidth;
  const target = WIN_INDEX * 118 + 59 - box/2 + rnd(-40, 40);
  strip.style.transition = "transform 5s cubic-bezier(.1,.7,.1,1)";
  strip.style.transform = `translateX(-${target}px)`;
  await new Promise(r => setTimeout(r, 5200));
  inventory.push(won);
  $("case-result").textContent = `Získal jsi: ${won.i} ${won.n} (${fmt(won.v)})`;
  renderInv(); updateUI(); opening = false;
}
window.openCase = openCase;

/* ====== INVENTÁŘ ====== */
function renderInv(){
  $("inv-list").innerHTML = inventory.length ? inventory.map((x,i) => `
    <div class="card r-${x.r}"><div class="ico">${x.i}</div><h4>${x.n}</h4><p>${fmt(x.v)}</p>
    <button class="btn small" onclick="sell(${i})">Prodat</button></div>`).join("")
    : "<p>Inventář je prázdný.</p>";
}
window.sell = i => { const x = inventory.splice(i,1)[0]; money += x.v; toast("Prodáno za " + fmt(x.v)); renderInv(); updateUI(); };
$("sell-all").onclick = () => {
  const sum = inventory.reduce((a,b)=>a+b.v,0);
  if (!sum) return;
  inventory = []; money += sum; toast("Prodáno za " + fmt(sum)); renderInv(); updateUI();
};

/* ====== KONEC / BANKROT ====== */
function checkBroke(){
  if (money < 10 && inventory.length === 0)
    $("story-note").textContent = "Učebnice jsou fuč… Počkej na kapesné, nebo to vysvětli mámě. 😬";
}

/* ====== NAČTENÍ ULOŽENÉ HRY ====== */
const saved = JSON.parse(localStorage.getItem("kasino") || "null");
if (saved){ ({money, inventory, pocketReadyAt} = saved); startGame(); }
else showLine();

