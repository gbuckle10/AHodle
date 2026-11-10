(() => {
  const MAX_GUESSES = 6;
  const HIT_PCT = 0.05;        // within 5% is a win...
  const HIT_MIN_EUR = 0.05;    // ...or within 5 cents, so cheap items stay fair
  const CLOSE_PCT = 0.25;
  const CLOSE_MIN_EUR = 0.10;  // likewise for "close" on very cheap items
  const EPOCH = new Date(2026, 10, 10); // puzzle #1 (local time)
  const SEED = 20261110;

  const products = window.PRODUCTS;
  const $ = (id) => document.getElementById(id);

  // ---------- text ----------
  const STRINGS = {
    nl: {
      switchTo: "EN", switchLabel: "Switch to English", locale: "nl-NL",
      daily: "Dagelijks", practice: "Oefenen", guess: "Gok",
      inputLabel: "Jouw gok in euro", placeholder: "0,00",
      share: "Deel", next: "Volgend product", close: "Sluiten",
      dailyNo: (n) => `Dagelijks #${n}`, practiceLabel: "Oefenronde",
      invalid: "Typ een prijs, bijvoorbeeld 2,49",
      copied: "Resultaat gekopieerd",
      higher: "hoger", lower: "lager", correct: "goed",
      wins: ["In één keer goed! 🎯", "Briljant!", "Goed gegokt!", "Mooi!", "Pfoe!", "Net op tijd!"],
      lose: "Helaas, geen gokken meer",
      priceWas: (p) => `De prijs was <strong>${p}</strong>`,
      nextIn: (t) => `Nieuw product over ${t}`,
      howToPlay: "Zo werkt het",
      help1: "Raad de normale prijs van het product in <strong>6 pogingen</strong>.",
      help2: "Na elke gok zie je of de echte prijs hoger <b>⬆</b> of lager <b>⬇</b> is.",
      legendHit: "Binnen 5% (of 5 cent): gewonnen!",
      legendClose: "Binnen 25% (of 10 cent)",
      legendFar: "Meer dan 25% ernaast",
      help3: "Elke nacht om middernacht verschijnt een nieuw dagelijks product. Bij Oefenen krijg je onbeperkt willekeurige producten.",
      statsTitle: "Statistieken (dagelijks)", distribution: "Verdeling van gokken",
      played: "Gespeeld", winPct: "Winst %", streak: "Reeks", best: "Beste",
      cats: { dairy: "Zuivel & eieren", bakery: "Brood", pantry: "Voorraadkast", drinks: "Koffie & thee", meat: "Vlees", cheese: "Kaas", produce: "Groente & fruit" },
      footer: 'Prijzen en foto’s: Albert Heijn, opgehaald op 10 november 2026. Normale prijs zonder Bonus. Prijzen kunnen inmiddels veranderd zijn. Productlijst gebaseerd op de <a href="https://voordly.com/boodschappenlijst" target="_blank" rel="noopener">voordly Boodschappenlijst Index</a>. Fanproject, niet verbonden aan Albert Heijn.',
    },
    en: {
      switchTo: "NL", switchLabel: "Schakel naar Nederlands", locale: "en-GB",
      daily: "Daily", practice: "Practice", guess: "Guess",
      inputLabel: "Your price guess in euros", placeholder: "0.00",
      share: "Share", next: "Next product", close: "Close",
      dailyNo: (n) => `Daily #${n}`, practiceLabel: "Practice",
      invalid: "Enter a price like 2.49",
      copied: "Result copied to clipboard",
      higher: "higher", lower: "lower", correct: "correct",
      wins: ["Spot on! 🎯", "Brilliant!", "Great guess!", "Nice!", "Phew!", "Just made it!"],
      lose: "Out of guesses",
      priceWas: (p) => `The price was <strong>${p}</strong>`,
      nextIn: (t) => `Next product in ${t}`,
      howToPlay: "How to play",
      help1: "Guess the regular shelf price of the product in <strong>6 tries</strong>.",
      help2: "After each guess you'll see whether the real price is higher <b>⬆</b> or lower <b>⬇</b>.",
      legendHit: "Within 5% (or 5 cents): you win!",
      legendClose: "Within 25% (or 10 cents)",
      legendFar: "More than 25% off",
      help3: "A new daily product appears every midnight. Practice mode gives you unlimited random products.",
      statsTitle: "Daily statistics", distribution: "Guess distribution",
      played: "Played", winPct: "Win %", streak: "Streak", best: "Best",
      cats: { dairy: "Dairy & eggs", bakery: "Bread", pantry: "Pantry", drinks: "Coffee & tea", meat: "Meat", cheese: "Cheese", produce: "Fruit & veg" },
      footer: 'Prices and photos: Albert Heijn, retrieved 10 November 2026. Regular price without Bonus deals. Prices may have changed since. Product list based on the <a href="https://voordly.com/boodschappenlijst" target="_blank" rel="noopener">voordly Boodschappenlijst Index</a>. Fan-made game, not affiliated with Albert Heijn.',
    },
  };

  // ---------- storage (may be unavailable, e.g. private mode) ----------
  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    },
  };

  let lang = store.get("ahodle-lang", null) || (/^nl\b/i.test(navigator.language || "") ? "nl" : "en");
  const t = () => STRINGS[lang];

  // ---------- helpers ----------
  const fmt = (n) => new Intl.NumberFormat(t().locale, { style: "currency", currency: "EUR" }).format(n);

  function parsePrice(text) {
    const cleaned = text.replace(/[€\s]/g, "").replace(",", ".");
    if (!/^\d+(\.\d{1,2})?$|^\.\d{1,2}$/.test(cleaned)) return null;
    const value = Math.round(parseFloat(cleaned) * 100) / 100;
    return value > 0 && value < 1000 ? value : null;
  }

  function grade(guess, price) {
    const diff = Math.abs(guess - price);
    if (diff <= Math.max(price * HIT_PCT, HIT_MIN_EUR) + 1e-9) return "hit";
    if (diff <= Math.max(price * CLOSE_PCT, CLOSE_MIN_EUR) + 1e-9) return "close";
    return "far";
  }

  function mulberry32(a) {
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Fixed shuffled order so each product appears once before any repeats.
  const dailyOrder = (() => {
    const rand = mulberry32(SEED);
    const order = products.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
  })();

  function dayNumber() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((today - EPOCH) / 86400000) + 1;
  }

  // ---------- state ----------
  // Bump the key if existing products are removed or reordered, so a saved game
  // never points at a different product. Appending products is safe.
  const DAILY_KEY = "ahodle-daily-v2";
  // Set by tools/update_products.py, which mirrors dailyOrder in Python.
  const DAILY_OFFSET = window.DAILY_OFFSET || 0;
  let mode = "daily";
  let game; // { productIndex, guesses: [{value, grade}], done, won, day? }

  function newDailyGame() {
    const day = dayNumber();
    const saved = store.get(DAILY_KEY, null);
    if (saved && saved.day === day) return saved;
    const n = products.length;
    const idx = dailyOrder[(((day - 1 + DAILY_OFFSET) % n) + n) % n];
    return { day, productIndex: idx, guesses: [], done: false, won: false };
  }

  function newPracticeGame() {
    let idx;
    do {
      idx = Math.floor(Math.random() * products.length);
    } while (products.length > 1 && game && game.productIndex === idx);
    return { productIndex: idx, guesses: [], done: false, won: false };
  }

  function save() {
    if (mode === "daily") store.set(DAILY_KEY, game);
  }

  // ---------- rendering ----------
  function renderText() {
    const s = t();
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = s[el.dataset.i18n]));
    document.querySelectorAll("[data-i18n-html]").forEach((el) => (el.innerHTML = s[el.dataset.i18nHtml]));
    document.querySelectorAll("[data-i18n-label]").forEach((el) => el.setAttribute("aria-label", s[el.dataset.i18nLabel]));
    $("lang-btn").textContent = s.switchTo;
    $("lang-btn").setAttribute("aria-label", s.switchLabel);
    $("guess-input").placeholder = s.placeholder;
    $("board").setAttribute("aria-label", s.guess);
  }

  // Photo at p.img, or img/<name-slug>.jpg by default, e.g.
  // "AH Houdbare halfvolle melk" -> img/ah-houdbare-halfvolle-melk.jpg.
  // The tile stays empty while loading and is hidden if there is no photo.
  const imageSrc = (p) =>
    p.img || "img/" + p.name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + ".jpg";

  function renderProductImage(p) {
    const box = $("product-photo");
    box.hidden = false;
    box.textContent = "";
    const img = new Image();
    box.loading = img;
    img.alt = p.name;
    img.onload = () => {
      if (box.loading === img) box.appendChild(img); // skip if superseded by a later render
    };
    img.onerror = () => {
      if (box.loading === img) box.hidden = true;
    };
    img.src = imageSrc(p);
  }

  function renderProduct() {
    const p = products[game.productIndex];
    renderProductImage(p);
    $("product-category").textContent = t().cats[p.cat];
    // The AH product name stays Dutch; English players get a translation under it.
    $("product-name").textContent = p.name;
    $("product-en").textContent = lang === "en" ? p.en : "";
    $("product-size").textContent = lang === "en" && p.sizeEn ? p.sizeEn : p.size;
    $("puzzle-no").textContent = mode === "daily" ? t().dailyNo(game.day) : t().practiceLabel;
  }

  function renderBoard(animateLast = false) {
    const board = $("board");
    board.innerHTML = "";
    const price = products[game.productIndex].price;
    for (let i = 0; i < MAX_GUESSES; i++) {
      const li = document.createElement("li");
      li.className = "row";
      const value = document.createElement("div");
      const dir = document.createElement("div");
      value.className = dir.className = "cell";
      const g = game.guesses[i];
      if (g) {
        li.classList.add("filled", g.grade);
        // Only the newest row flips; older rows render instantly.
        if (!animateLast || i !== game.guesses.length - 1) value.style.animation = dir.style.animation = "none";
        value.textContent = fmt(g.value);
        dir.textContent = g.grade === "hit" ? "✓" : g.value < price ? "⬆" : "⬇";
        dir.setAttribute("aria-label", g.grade === "hit" ? t().correct : g.value < price ? t().higher : t().lower);
      }
      li.append(value, dir);
      board.append(li);
    }
  }

  function renderEnd() {
    const done = game.done;
    $("guess-form").hidden = done;
    $("result").hidden = !done;
    $("message").textContent = "";
    if (!done) {
      $("guess-input").focus();
      return;
    }
    const p = products[game.productIndex];
    $("result-title").textContent = game.won ? t().wins[game.guesses.length - 1] : t().lose;
    $("result-price").innerHTML = t().priceWas(fmt(p.price));
    $("next-btn").hidden = mode !== "practice";
    updateCountdown();
  }

  function render(animateLast = false) {
    renderText();
    renderProduct();
    renderBoard(animateLast);
    renderEnd();
  }

  function updateCountdown() {
    const el = $("countdown");
    if (mode !== "daily" || !game.done) {
      el.textContent = "";
      return;
    }
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const s = Math.max(0, Math.floor((midnight - now) / 1000));
    const pad = (v) => String(v).padStart(2, "0");
    el.textContent = t().nextIn(`${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`);
  }
  setInterval(() => {
    // Roll over to the new daily product if the page stays open past midnight.
    if (mode === "daily" && game.day !== dayNumber()) {
      game = newDailyGame();
      render();
    }
    updateCountdown();
  }, 1000);

  // ---------- stats ----------
  function recordDailyResult() {
    const stats = store.get("ahodle-stats", { played: 0, wins: 0, streak: 0, maxStreak: 0, dist: [0, 0, 0, 0, 0, 0], lastDay: null });
    stats.played++;
    if (game.won) {
      stats.wins++;
      stats.streak = stats.lastDay === game.day - 1 ? stats.streak + 1 : 1;
      stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
      stats.dist[game.guesses.length - 1]++;
      stats.lastDay = game.day;
    } else {
      stats.streak = 0;
      stats.lastDay = null;
    }
    store.set("ahodle-stats", stats);
  }

  function showStats() {
    const s = t();
    const stats = store.get("ahodle-stats", { played: 0, wins: 0, streak: 0, maxStreak: 0, dist: [0, 0, 0, 0, 0, 0] });
    // A streak only counts if yesterday (or today) was won.
    const streak = stats.lastDay >= dayNumber() - 1 ? stats.streak : 0;
    const pct = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
    $("stats").innerHTML = [
      [stats.played, s.played], [pct, s.winPct], [streak, s.streak], [stats.maxStreak, s.best],
    ].map(([v, l]) => `<div><strong>${v}</strong><span>${l}</span></div>`).join("");

    const max = Math.max(1, ...stats.dist);
    const todayDaily = store.get(DAILY_KEY, null);
    const todayWinRow = todayDaily && todayDaily.day === dayNumber() && todayDaily.won ? todayDaily.guesses.length : 0;
    $("dist").innerHTML = stats.dist.map((count, i) => `
      <div class="dist-row"><span>${i + 1}</span>
        <div class="dist-bar${todayWinRow === i + 1 ? " today" : ""}" style="width:${Math.max(8, (count / max) * 100)}%">${count}</div>
      </div>`).join("");
    $("stats-dialog").showModal();
  }

  // ---------- actions ----------
  function submitGuess(e) {
    e.preventDefault();
    if (game.done) return;
    const input = $("guess-input");
    const value = parsePrice(input.value);
    if (value === null) {
      $("message").textContent = t().invalid;
      return;
    }
    const price = products[game.productIndex].price;
    const g = grade(value, price);
    game.guesses.push({ value, grade: g });
    input.value = "";
    if (g === "hit") {
      game.done = game.won = true;
    } else if (game.guesses.length >= MAX_GUESSES) {
      game.done = true;
    }
    if (game.done && mode === "daily") recordDailyResult();
    save();
    render(true);
  }

  async function share() {
    const price = products[game.productIndex].price;
    const rows = game.guesses.map((g) => {
      const colour = { hit: "🟩", close: "🟨", far: "⬜" }[g.grade];
      const arrow = g.grade === "hit" ? "🎯" : g.value < price ? "⬆️" : "⬇️";
      return colour + arrow;
    });
    const title = mode === "daily" ? `AHodle #${game.day}` : `AHodle (${t().practice.toLowerCase()})`;
    const score = game.won ? game.guesses.length : "X";
    const text = `${title} ${score}/${MAX_GUESSES}\n${rows.join("\n")}`;
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        $("message").textContent = t().copied;
        setTimeout(() => ($("message").textContent = ""), 2500);
      }
    } catch {
      // User cancelled the share sheet or clipboard is blocked; nothing to do.
    }
  }

  function setMode(next) {
    mode = next;
    document.querySelectorAll(".mode").forEach((b) => {
      const active = b.dataset.mode === next;
      b.classList.toggle("active", active);
      b.setAttribute("aria-selected", active);
    });
    game = next === "daily" ? newDailyGame() : newPracticeGame();
    render();
  }

  function toggleLang() {
    lang = lang === "nl" ? "en" : "nl";
    store.set("ahodle-lang", lang);
    render();
    if ($("stats-dialog").open) showStats();
  }

  // ---------- wire up ----------
  $("guess-form").addEventListener("submit", submitGuess);
  $("share-btn").addEventListener("click", share);
  $("next-btn").addEventListener("click", () => { game = newPracticeGame(); render(); });
  $("help-btn").addEventListener("click", () => $("help-dialog").showModal());
  $("stats-btn").addEventListener("click", showStats);
  $("lang-btn").addEventListener("click", toggleLang);
  document.querySelectorAll(".mode").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));

  setMode("daily");
  if (!store.get("ahodle-seen-help", false)) {
    $("help-dialog").showModal();
    store.set("ahodle-seen-help", true);
  }
})();
