(function () {
  // Prevent duplicate load
  if (document.getElementById("cvath-panel")) return;

  // ---------- UTIL ----------
  function parseNumber(val) {
    if (!val) return 0;
    val = val.toString().replace(/[$,]/g, "").toLowerCase().trim();
    if (val.endsWith("k")) return parseFloat(val) * 1e3;
    if (val.endsWith("m")) return parseFloat(val) * 1e6;
    if (val.endsWith("b")) return parseFloat(val) * 1e9;
    return parseFloat(val) || 0;
  }

  // ---------- CVATH CORE ----------
  function calculateCVATH(mc, vol, ath, lp) {
    if (vol < mc) return { reject: true, reason: "Volume < MC" };

    const ratio = mc / ath;
    if (ratio <= 0.10) return { reject: true, reason: "RUGGED (-90%+ ATH)" };

    const volumeScore = Math.min(vol / mc, 2);

    let athScore;
    if (ratio <= 0.20) athScore = 0.3;
    else if (ratio <= 0.40) athScore = 0.8;
    else if (ratio <= 0.70) athScore = 1.2;
    else if (ratio <= 0.85) athScore = 0.9;
    else athScore = 0.7;

    const lpRatio = lp / mc;
    let lpMult = 1.0;
    if (lpRatio < 0.02) lpMult = 0.5;
    else if (lpRatio < 0.05) lpMult = 0.75;
    else if (lpRatio > 0.12) lpMult = 1.1;

    const score = volumeScore * athScore * lpMult;

    let rating =
      score >= 1.3 ? "Very Good" :
      score >= 0.9 ? "Good" :
      score >= 0.6 ? "Borderline" : "Bad";

    return { score, rating, ratio, lpRatio };
  }

  // ---------- ENTRY ----------
  function calculateEntry(mc, ath, mode) {
    if (mode === "Scalp") {
      return [mc * 0.98, mc * 0.92, mc * 0.88];
    }
    if (mode === "Momentum") {
      return [mc * 1.0, mc * 0.95, mc * 0.9];
    }
    // Dip Buy
    return [mc * 0.95, ath * 0.6, ath * 0.7];
  }

  // ---------- UI ----------
  const panel = document.createElement("div");
  panel.id = "cvath-panel";
  panel.innerHTML = `
    <div id="cvath-header">
      <span>CVATH Analyzer</span>
      <button id="cvath-close">✕</button>
    </div>

    <div id="cvath-body">
      <input id="cvath-mc" placeholder="Market Cap">
      <input id="cvath-vol" placeholder="Volume (24h)">
      <input id="cvath-ath" placeholder="ATH Market Cap">
      <input id="cvath-lp" placeholder="Liquidity">

      <div class="modes">
        <button data-mode="Scalp">Scalp</button>
        <button data-mode="Dip Buy" class="active">Dip Buy</button>
        <button data-mode="Momentum">Momentum</button>
      </div>

      <button id="cvath-run">Calculate CVATH</button>

      <pre id="cvath-output"></pre>
    </div>
  `;

  document.body.appendChild(panel);

  // ---------- DRAG ----------
  let drag = false, ox = 0, oy = 0;
  const header = panel.querySelector("#cvath-header");

  header.onmousedown = e => {
    drag = true;
    ox = e.clientX - panel.offsetLeft;
    oy = e.clientY - panel.offsetTop;
  };
  document.onmousemove = e => {
    if (!drag) return;
    panel.style.left = e.clientX - ox + "px";
    panel.style.top = e.clientY - oy + "px";
  };
  document.onmouseup = () => drag = false;

  // ---------- MODE ----------
  let mode = "Dip Buy";
  panel.querySelectorAll(".modes button").forEach(btn => {
    btn.onclick = () => {
      panel.querySelectorAll(".modes button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      mode = btn.dataset.mode;
    };
  });

  // ---------- RUN ----------
  document.getElementById("cvath-run").onclick = () => {
    const mc = parseNumber(document.getElementById("cvath-mc").value);
    const vol = parseNumber(document.getElementById("cvath-vol").value);
    const ath = parseNumber(document.getElementById("cvath-ath").value);
    const lp = parseNumber(document.getElementById("cvath-lp").value);

    const out = document.getElementById("cvath-output");
    out.textContent = "";

    if (!mc || !vol || !ath || !lp) {
      out.textContent = "Enter all values.";
      return;
    }

    const res = calculateCVATH(mc, vol, ath, lp);

    if (res.reject) {
      out.textContent = `REJECT ❌\n${res.reason}`;
      return;
    }

    const [a, o, c] = calculateEntry(mc, ath, mode);
    const dip = Math.round((1 - mc / ath) * 100);

    out.textContent =
      `CVATH: ${res.score.toFixed(2)} (${res.rating})\n\n` +
      `ATH Dip: ${dip}%\n` +
      `LP / MC: ${(res.lpRatio * 100).toFixed(2)}%\n\n` +
      `ENTRY — ${mode}\n` +
      `Aggressive: $${a.toLocaleString()}\n` +
      `Optimal:    $${o.toLocaleString()}\n` +
      `Conservative: $${c.toLocaleString()}`;
  };

  // ---------- CLOSE ----------
  document.getElementById("cvath-close").onclick = () => panel.remove();

  // ---------- LOAD CSS ----------
  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "https://cdn.jsdelivr.net/gh/YOUR_GITHUB_USERNAME/cvath/cvath.css";
  document.head.appendChild(css);
})();
