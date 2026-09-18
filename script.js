/* ============================================================
   Inflation Time Machine — logic
   Tweak INFLATION_RATE / POCKET_MONEY_AGE etc. in CONFIG below.
   ============================================================ */

(function () {
  "use strict";

  // ---------- Easy-to-tweak knobs ----------
  const CONFIG = {
    /** Assumed average Indian CPI (illustrative) */
    INFLATION_RATE: 0.06,

    /** Childhood "pocket money era" — middle of ages 8–10 */
    POCKET_MONEY_AGE: 9,

    /** Past pocket-money amount (₹) */
    PAST_AMOUNT: 10,

    /** Present amount projected to age 40 (₹) */
    FUTURE_BASE: 100,

    /** Target age for the future projection */
    TARGET_AGE: 40,

    /** Valid birth-year window */
    MIN_YEAR: 1950,
    /** Must be at least this many years old to use the tool */
    MIN_AGE: 5,

    /** Count-up duration in ms */
    COUNT_DURATION: 1000,
  };

  // ---------- Nostalgic captions (warm, self-aware — not roasting) ----------
  const CAPTIONS_PAST = [
    "Still not enough for two samosas though 😅",
    "Back then this could buy you a Cadbury AND bus fare home.",
    "Somewhere, a kirana shop uncle is laughing at this number.",
    "This is what your school canteen would call 'rich kid money' in 1998.",
    "Pocket money inflation hits different when you do the math.",
    "Your ₹10 note probably had more character than today's UPI notification.",
    "This number explains why you saved coins in a Frooti bottle.",
    "Somewhere between Parle-G and recess, this felt like a fortune.",
    "Your amma thought this was plenty. Math says she wasn't entirely wrong.",
    "The ₹10 ice-cream uncle of your childhood is smiling somewhere.",
    "Worth more on paper — still spent in ten minutes at the canteen.",
  ];

  const CAPTIONS_FUTURE = [
    "Future-you might need a bigger wallet — or just better chai taste.",
    "By then, even the samosa will have its own inflation story.",
    "A reminder to save a little… and also to buy the Cadbury today.",
    "Forty looks different when the rupee does the talking.",
    "May your salary grow faster than this number 🤞",
    "Plant a money plant now. Metaphorically. Or literally. Both work.",
    "Future kirana uncles will still smile — the prices just shift.",
    "Time machines can't print money, but they can make you think.",
  ];

  // ---------- DOM ----------
  const form = document.getElementById("year-form");
  const yearInput = document.getElementById("birth-year");
  const yearError = document.getElementById("year-error");
  const results = document.getElementById("results");
  const resultsKicker = document.getElementById("results-kicker");
  const valuePast = document.getElementById("value-past");
  const valueFuture = document.getElementById("value-future");
  const captionPast = document.getElementById("caption-past");
  const captionFuture = document.getElementById("caption-future");
  const metaPast = document.getElementById("meta-past");
  const metaFuture = document.getElementById("meta-future");
  const futureTitle = document.getElementById("future-title");

  const currentYear = new Date().getFullYear();
  yearInput.max = String(currentYear - CONFIG.MIN_AGE);

  // ---------- Math helpers ----------
  /**
   * Compound inflation: FV = PV * (1 + r)^n
   * Same formula for "past money in today's rupees"
   * (past amount grown forward by years_elapsed).
   */
  function compound(presentValue, rate, years) {
    if (years <= 0) return presentValue;
    return presentValue * Math.pow(1 + rate, years);
  }

  function formatRupee(n) {
    // Indian-ish grouping via en-IN
    return Math.round(n).toLocaleString("en-IN");
  }

  function pickRandom(arr, exclude) {
    let choice;
    do {
      choice = arr[Math.floor(Math.random() * arr.length)];
    } while (arr.length > 1 && choice === exclude);
    return choice;
  }

  // ---------- Validation ----------
  function validateYear(raw) {
    const year = Number(raw);
    const maxYear = currentYear - CONFIG.MIN_AGE;

    if (
      !Number.isInteger(year) ||
      String(raw).trim().length !== 4 ||
      year < CONFIG.MIN_YEAR ||
      year > maxYear
    ) {
      return { ok: false, year: null };
    }
    return { ok: true, year };
  }

  function showError(show) {
    yearError.hidden = !show;
    yearInput.setAttribute("aria-invalid", show ? "true" : "false");
  }

  // ---------- Count-up animation ----------
  function animateCount(el, target, duration) {
    const start = performance.now();
    const from = 0;

    // Cancel any previous animation on this element
    if (el._raf) cancelAnimationFrame(el._raf);

    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      // Ease-out cubic — feels like a mechanical counter settling
      const eased = 1 - Math.pow(1 - t, 3);
      const value = from + (target - from) * eased;
      el.textContent = formatRupee(value);
      if (t < 1) {
        el._raf = requestAnimationFrame(frame);
      } else {
        el.textContent = formatRupee(target);
      }
    }

    el._raf = requestAnimationFrame(frame);
  }

  // ---------- Main calculate + render ----------
  function calculate(birthYear) {
    const ageNow = currentYear - birthYear;
    const childhoodYear = birthYear + CONFIG.POCKET_MONEY_AGE;
    const yearsSinceChildhood = Math.max(0, currentYear - childhoodYear);

    // ₹10 from childhood → today's money
    const pastInToday = compound(
      CONFIG.PAST_AMOUNT,
      CONFIG.INFLATION_RATE,
      yearsSinceChildhood
    );

    // Years until (or since) turning 40
    const yearTurn40 = birthYear + CONFIG.TARGET_AGE;
    const yearsTo40 = yearTurn40 - currentYear;

    let futureValue = null;
    let alreadyForty = false;

    if (yearsTo40 > 0) {
      futureValue = compound(
        CONFIG.FUTURE_BASE,
        CONFIG.INFLATION_RATE,
        yearsTo40
      );
    } else if (yearsTo40 === 0) {
      futureValue = CONFIG.FUTURE_BASE;
    } else {
      // Already past 40 — show what ₹100 *from when they turned 40* is worth today
      alreadyForty = true;
      const yearsSince40 = currentYear - yearTurn40;
      futureValue = compound(
        CONFIG.FUTURE_BASE,
        CONFIG.INFLATION_RATE,
        yearsSince40
      );
    }

    return {
      birthYear,
      ageNow,
      childhoodYear,
      yearsSinceChildhood,
      pastInToday,
      yearTurn40,
      yearsTo40,
      futureValue,
      alreadyForty,
    };
  }

  function render(data) {
    results.hidden = false;
    results.classList.add("is-visible");

    resultsKicker.textContent =
      data.ageNow < 18
        ? `Born ${data.birthYear} — still early days for the time machine…`
        : `Born ${data.birthYear} · pocket-money era around ${data.childhoodYear}`;

    // Card 1 meta + caption
    if (data.yearsSinceChildhood === 0) {
      metaPast.textContent = `You're still in the pocket-money years — ₹10 is roughly ₹10 of today.`;
    } else {
      metaPast.textContent = `₹${CONFIG.PAST_AMOUNT} around age ${CONFIG.POCKET_MONEY_AGE} (${data.childhoodYear}), grown ~${Math.round(CONFIG.INFLATION_RATE * 100)}%/yr for ${data.yearsSinceChildhood} years.`;
    }
    captionPast.textContent = pickRandom(CAPTIONS_PAST);

    // Card 2 title / meta / caption
    if (data.alreadyForty) {
      futureTitle.innerHTML =
        `₹100 when you turned 40 ≈<br /><span class="rupee-line">₹<span class="count-up" id="value-future" data-target="0">0</span> in today's money</span>`;
      metaFuture.textContent = `You turned 40 in ${data.yearTurn40}. Here's that ₹100 adjusted forward to now.`;
    } else if (data.yearsTo40 === 0) {
      futureTitle.innerHTML =
        `₹100 today will be worth<br /><span class="rupee-line">₹<span class="count-up" id="value-future" data-target="0">0</span> — you're turning 40 this year</span>`;
      metaFuture.textContent = `Welcome to the club. Same rupee, same year.`;
    } else {
      futureTitle.innerHTML =
        `₹100 today will be worth<br /><span class="rupee-line">₹<span class="count-up" id="value-future" data-target="0">0</span> when you turn 40</span>`;
      metaFuture.textContent = `In ${data.yearsTo40} year${data.yearsTo40 === 1 ? "" : "s"} (${data.yearTurn40}), at ~${Math.round(CONFIG.INFLATION_RATE * 100)}% avg. CPI.`;
    }
    captionFuture.textContent = pickRandom(
      CAPTIONS_FUTURE,
      captionPast.textContent
    );

    // Re-query future span (title may have been rebuilt)
    const futureEl = document.getElementById("value-future");
    const pastEl = document.getElementById("value-past");

    pastEl.dataset.target = String(data.pastInToday);
    futureEl.dataset.target = String(data.futureValue);

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduceMotion) {
      pastEl.textContent = formatRupee(data.pastInToday);
      futureEl.textContent = formatRupee(data.futureValue);
    } else {
      animateCount(pastEl, data.pastInToday, CONFIG.COUNT_DURATION);
      animateCount(futureEl, data.futureValue, CONFIG.COUNT_DURATION);
    }

    // Smooth scroll to results (nice for screen recordings + phones)
    requestAnimationFrame(() => {
      results.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });
  }

  // ---------- Events ----------
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const { ok, year } = validateYear(yearInput.value);

    if (!ok) {
      showError(true);
      yearInput.focus();
      return;
    }

    showError(false);
    render(calculate(year));
  });

  yearInput.addEventListener("input", function () {
    if (!yearError.hidden) showError(false);
  });
})();
