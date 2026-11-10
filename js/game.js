(() => {
  const MAX_GUESSES = 6;
  const HIT_PCT = 0.05;        // within 5% is a win...
  const HIT_MIN_EUR = 0.05;    // ...or within 5 cents, so cheap items stay fair
  const CLOSE_PCT = 0.25;
  const CLOSE_MIN_EUR = 0.10;  // likewise for "close" on very cheap items

  const products = window.PRODUCTS;
  const $ = (id) => document.getElementById(id);

  // ---------- text ----------
  const STRINGS = {
    nl: {
      switchTo: "EN", switchLabel: "Switch to English", locale: "nl-NL",
      guess: "Gok",
      inputLabel: "Jouw gok in euro", placeholder: "0,00",
      share: "Deel", next: "Volgend product", close: "Sluiten",
      skip: "Overslaan, ken ik al", skipConfirm: "Overslaan telt als verloren ronde. Doorgaan?",
      invalid: "Typ een prijs, bijvoorbeeld 2,49",
      copied: "Resultaat gekopieerd",
      higher: "hoger", lower: "lager", correct: "goed",
      wins: ["In één keer goed! 🎯", "Briljant!", "Goed gegokt!", "Mooi!", "Pfoe!", "Net op tijd!"],
      lose: "Helaas, geen gokken meer",
      priceWas: (p) => `De prijs was <strong>${p}</strong>`,
      howToPlay: "Zo werkt het",
      help1: "Raad de normale prijs van het product in <strong>6 pogingen</strong>.",
      help2: "Na elke gok zie je of de echte prijs hoger <b>⬆</b> of lager <b>⬇</b> is.",
      legendHit: "Binnen 5% (of 5 cent): gewonnen!",
      legendClose: "Binnen 25% (of 10 cent)",
      legendFar: "Meer dan 25% ernaast",
      help3: "Na elke ronde krijg je een nieuw product. Je ziet alle producten voordat er een terugkomt.",
      statsTitle: "Statistieken", distribution: "Verdeling van gokken",
      played: "Gespeeld", winPct: "Winst %", streak: "Reeks", best: "Beste",
      cats: { dairy: "Zuivel & eieren", bakery: "Brood", pantry: "Voorraadkast", drinks: "Koffie & thee", meat: "Vlees", cheese: "Kaas", produce: "Groente & fruit" },
      footer: "Prijzen en foto’s: Albert Heijn, opgehaald op 10 november 2026. Normale prijs zonder Bonus. Prijzen kunnen inmiddels veranderd zijn. Fanproject, niet verbonden aan Albert Heijn.",
    },
    en: {
      switchTo: "NL", switchLabel: "Schakel naar Nederlands", locale: "en-GB",
      guess: "Guess",
      inputLabel: "Your price guess in euros", placeholder: "0.00",
      share: "Share", next: "Next product", close: "Close",
      skip: "Skip, I know this one", skipConfirm: "Skipping now counts as a lost round. Continue?",
      invalid: "Enter a price like 2.49",
      copied: "Result copied to clipboard",
      higher: "higher", lower: "lower", correct: "correct",
      wins: ["Spot on! 🎯", "Brilliant!", "Great guess!", "Nice!", "Phew!", "Just made it!"],
      lose: "Out of guesses",
      priceWas: (p) => `The price was <strong>${p}</strong>`,
      howToPlay: "How to play",
      help1: "Guess the regular shelf price of the product in <strong>6 tries</strong>.",
      help2: "After each guess you'll see whether the real price is higher <b>⬆</b> or lower <b>⬇</b>.",
      legendHit: "Within 5% (or 5 cents): you win!",
      legendClose: "Within 25% (or 10 cents)",
      legendFar: "More than 25% off",
      help3: "After each round you get a new product. You'll see every product before any comes back.",
      statsTitle: "Statistics", distribution: "Guess distribution",
      played: "Played", winPct: "Win %", streak: "Streak", best: "Best",
      cats: { dairy: "Dairy & eggs", bakery: "Bread", pantry: "Pantry", drinks: "Coffee & tea", meat: "Meat", cheese: "Cheese", produce: "Fruit & veg" },
      footer: "Prices and photos: Albert Heijn, retrieved 10 November 2026. Regular price without Bonus deals. Prices may have changed since. Fan-made game, not affiliated with Albert Heijn.",
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

  // ---------- state ----------
  let game; // { productIndex, guesses: [{value, grade}], done, won }

  // Randomly shuffled deck so every product comes up once before any repeats.
  // It's saved (by product name, so editing the list is safe) so a page refresh
  // carries on with the same deck instead of starting over.
  const DECK_KEY = "ahodle-deck";
  const LAST_KEY = "ahodle-last";

  function shuffledDeck() {
    const deck = products.map((p) => p.name);
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    // Don't start a new deck with the product just played.
    const last = store.get(LAST_KEY, null);
    if (deck.length > 1 && deck[deck.length - 1] === last) {
      [deck[0], deck[deck.length - 1]] = [deck[deck.length - 1], deck[0]];
    }
    return deck;
  }

  function nextProductIndex() {
    const names = new Set(products.map((p) => p.name));
    let deck = store.get(DECK_KEY, []).filter((n) => names.has(n));
    if (!deck.length) deck = shuffledDeck();
    const name = deck.pop();
    store.set(DECK_KEY, deck);
    store.set(LAST_KEY, name);
    return products.findIndex((p) => p.name === name);
  }

  function newGame() {
    game = { productIndex: nextProductIndex(), guesses: [], done: false, won: false };
    render();
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
    $("skip-btn").hidden = done;
    $("result").hidden = !done;
    $("message").textContent = "";
    if (!done) {
      $("guess-input").focus();
      return;
    }
    const p = products[game.productIndex];
    $("result-title").textContent = game.won ? t().wins[game.guesses.length - 1] : t().lose;
    $("result-price").innerHTML = t().priceWas(fmt(p.price));
    $("next-btn").focus();
  }

  function render(animateLast = false) {
    renderText();
    renderProduct();
    renderBoard(animateLast);
    renderEnd();
  }

  // ---------- stats ----------
  const STATS_KEY = "ahodle-stats-v2"; // v1 held daily-mode stats
  const emptyStats = () => ({ played: 0, wins: 0, streak: 0, maxStreak: 0, dist: [0, 0, 0, 0, 0, 0], last: 0 });

  function recordResult() {
    const stats = store.get(STATS_KEY, emptyStats());
    stats.played++;
    if (game.won) {
      stats.wins++;
      stats.streak++;
      stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
      stats.dist[game.guesses.length - 1]++;
      stats.last = game.guesses.length;
    } else {
      stats.streak = 0;
      stats.last = 0;
    }
    store.set(STATS_KEY, stats);
  }

  function showStats() {
    const s = t();
    const stats = store.get(STATS_KEY, emptyStats());
    const pct = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
    $("stats").innerHTML = [
      [stats.played, s.played], [pct, s.winPct], [stats.streak, s.streak], [stats.maxStreak, s.best],
    ].map(([v, l]) => `<div><strong>${v}</strong><span>${l}</span></div>`).join("");

    // Highlight the row of the most recent win.
    const max = Math.max(1, ...stats.dist);
    $("dist").innerHTML = stats.dist.map((count, i) => `
      <div class="dist-row"><span>${i + 1}</span>
        <div class="dist-bar${stats.last === i + 1 ? " latest" : ""}" style="width:${Math.max(8, (count / max) * 100)}%">${count}</div>
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
    if (game.done) recordResult();
    render(true);
  }

  // Skipping before guessing is free; after guessing it counts as a loss,
  // so skipping can't be used to protect a streak.
  function skip() {
    if (game.guesses.length) {
      if (!confirm(t().skipConfirm)) return;
      game.done = true;
      recordResult();
    }
    newGame();
  }

  async function share() {
    const p = products[game.productIndex];
    const rows = game.guesses.map((g) => {
      const colour = { hit: "🟩", close: "🟨", far: "⬜" }[g.grade];
      const arrow = g.grade === "hit" ? "🎯" : g.value < p.price ? "⬆️" : "⬇️";
      return colour + arrow;
    });
    // No shared daily product, so name the product so friends know what was guessed.
    const score = game.won ? game.guesses.length : "X";
    const text = `AHodle ${score}/${MAX_GUESSES}: ${p.name}\n${rows.join("\n")}\n${location.href}`;
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

  function toggleLang() {
    lang = lang === "nl" ? "en" : "nl";
    store.set("ahodle-lang", lang);
    render();
    if ($("stats-dialog").open) showStats();
  }

  // ---------- wire up ----------
  $("guess-form").addEventListener("submit", submitGuess);
  $("share-btn").addEventListener("click", share);
  $("next-btn").addEventListener("click", newGame);
  $("skip-btn").addEventListener("click", skip);
  $("help-btn").addEventListener("click", () => $("help-dialog").showModal());
  $("stats-btn").addEventListener("click", showStats);
  $("lang-btn").addEventListener("click", toggleLang);

  newGame();
  if (!store.get("ahodle-seen-help", false)) {
    $("help-dialog").showModal();
    store.set("ahodle-seen-help", true);
  }
})();
