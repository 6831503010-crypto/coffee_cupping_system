const HISTORY_KEY = "aromaArtisans.cuppingHistory.v1";

function readHistory(){
  try{
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  }catch{
    return [];
  }
}
function writeHistory(records){ localStorage.setItem(HISTORY_KEY, JSON.stringify(records)); }
function formatDate(value){
  const d = new Date(value);
  if(Number.isNaN(d.getTime())) return "Unknown date";
  return d.toLocaleString(undefined,{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
}
function n(value){
  const x=Number(value);
  return Number.isFinite(x) ? x.toFixed(2) : "—";
}
function text(value){
  return Array.isArray(value) ? value.join(", ") : (value ?? "—");
}
function avg(record){
  const values=(record.samples||[]).map(s=>Number(s.finalScore)).filter(Number.isFinite);
  return values.length ? (values.reduce((a,b)=>a+b,0)/values.length).toFixed(2) : "—";
}
function sampleMarkup(s){
  const a=s.aroma||{}, f=s.flavor||{};
  return `
    <article class="sample-card">
      <h3>Sample ${s.id}</h3>
      <div class="score-row"><span>Aroma quality</span><strong>${n(a.qualityScore)}</strong></div>
      <div class="score-row"><span>Flavor</span><strong>${n(f.flavor)}</strong></div>
      <div class="score-row"><span>Aftertaste</span><strong>${n(f.aftertaste)}</strong></div>
      <div class="score-row"><span>Acidity</span><strong>${n(f.acidity)}</strong></div>
      <div class="score-row"><span>Body</span><strong>${n(f.body)}</strong></div>
      <div class="score-row"><span>Balance</span><strong>${n(f.balance)}</strong></div>
      <div class="score-row"><span>Overall</span><strong>${n(f.overall)}</strong></div>
      <div class="score-row"><span>Final score</span><strong>${n(s.finalScore)} / 100</strong></div>
      <button class="details-toggle" type="button">Show details</button>
      <div class="details">
        <div class="sample-notes"><strong>Aroma:</strong> ${text(a.qualities)}<br></div>
        <div class="sample-notes"><strong>Flavor qualities:</strong> ${text(f.flavorQualities)}<br><strong>Main tastes:</strong> ${text(f.mainTastes)}<br></div>
      </div>
    </article>`;
}
function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}
function render(){
  const records=readHistory();
  // document.getElementById("sessionCount").textContent=records.length;
  // document.getElementById("sampleCount").textContent=records.reduce((t,r)=>t+(r.samples?.length||0),0);
  const sessionCount = records.length;

  const sampleCount = records.reduce(
    (total, record) => total + (record.samples?.length || 0),
    0
  );

  document.getElementById("sessionCount").textContent = sessionCount;
  document.getElementById("sampleCount").textContent = sampleCount;

  document.getElementById("sessionCountLabel").textContent =
    sessionCount <= 1 ? "Session" : "Sessions";

  document.getElementById("sampleCountLabel").textContent =
    sampleCount <= 1 ? "Sample" : "Samples";
  document.getElementById("latestDate").textContent=records.length?formatDate(records[0].completedAt):"—";
  const list=document.getElementById("historyList");

  if(!records.length){
    list.innerHTML=`<section class="history-empty"><h2>No completed sessions yet.</h2><p>Finish an evaluation in the Cupping Form and it will appear here.</p><a class="btn primary btn-link" href="cupping-form.html">Start Cupping →</a></section>`;
    return;
  }

  list.innerHTML=records.map((r,i)=>`
    <article class="history-card">
      <div class="history-card-head">
        <div>
          <h2>Session ${records.length-i}</h2>
          <div class="history-date">
            ${formatDate(r.completedAt)} •
            ${r.samples?.length || 0}
            ${(r.samples?.length || 0) === 1 ? "sample" : "samples"}
          </div>
        </div>

        <div class="session-total"><strong>${avg(r)}</strong><span>Average score</span></div>
      </div>
      <div class="sample-grid">${(r.samples||[]).map(sampleMarkup).join("")}</div>
      <div class="history-card-footer">
        <span class="muted">Saved in this browser</span>
        <button class="delete-session" type="button" data-delete="${r.id}">Delete session</button>
      </div>
    </article>`).join("");

  list.querySelectorAll(".details-toggle").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const details=btn.nextElementSibling;
      const open=details.classList.toggle("open");
      btn.textContent=open?"Hide details":"Show details";
    });
  });
  list.querySelectorAll("[data-delete]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const id=btn.dataset.delete;
      writeHistory(readHistory().filter(r=>r.id!==id));
      render();
    });
  });
}
document.getElementById("clearHistoryBtn").addEventListener("click",()=>{
  if(readHistory().length && confirm("Clear all saved cupping history from this browser?")){
    localStorage.removeItem(HISTORY_KEY);
    render();
  }
});
render();
