/*
Coffee Cupping Form behavior.
Keep page-specific form logic here.
Shared/theme styling belongs in ../css/theme.css.
*/

let SAMPLE_COUNT = 0;
const scoreOptions = [];
for(let s=6; s<=10.0001; s+=0.25) scoreOptions.push(s.toFixed(2));

// const aromaQualityOptions = [
//   "Floral",
//   "Fruity",
//   "Berry",
//   "Dried Fruit",
//   "Citrus Fruit",
//   "Roasted",
//   "Cereal",
//   "Burnt",
//   "Tobacco",
//   "Sour/Fermented",
//   "Sour",
//   "Fermented",
//   "Nutty/Cocoa",
//   "Nutty",
//   "Cocoa",
//   "Green/Vegetative",
//   "Spice",
//   "Sweet",
//   "Vanilla/Vanillin",
//   "Brown Sugar",
//   "Other",
//   "Chemical",
//   "Musty/Earthy",
//   "Woody"
// ];
const aromaQualityGroups = [
  {
    parent: "Floral",
    children: []
  },
  {
    parent: "Fruity",
    children: [
      "Berry",
      "Dried Fruit",
      "Citrus Fruit"
    ]
  },
  {
    parent: "Roasted",
    children: [
      "Cereal",
      "Burnt",
      "Tobacco"
    ]
  },
  {
    parent: "Sour/Fermented",
    children: [
      "Sour",
      "Fermented"
    ]
  },
  {
    parent: "Nutty/Cocoa",
    children: [
      "Nutty",
      "Cocoa"
    ]
  },
  {
    parent: "Green/Vegetative",
    children: []
  },
  {
    parent: "Spice",
    children: []
  },
  {
    parent: "Sweet",
    children: [
      "Vanilla/Vanillin",
      "Brown Sugar"
    ]
  },
  {
    parent: "Other",
    children: [
      "Chemical",
      "Musty/Earthy",
      "Woody"
    ]
  }
];

const mainTasteOptions = [
  "Salty",
  "Bitter",
  "Sour",
  "Umami",
  "Sweet"
];

let samples = [];

function createSamples(count){
  return Array.from({length:count}, (_,i)=>({
    id:i+1,
    aroma:{
      dry:null, break:null, color:null, qualityScore:"", qualities:[], complete:false
    },
    flavor:{
      flavor:"", aftertaste:"", acidity:"", body:"", balance:"", overall:"",
      acidityIntensity:null, bodyLevel:null,
      uniformity:[false,false,false,false,false],
      cleanCup:[false,false,false,false,false],
      sweetness:[false,false,false,false,false],
      flavorQualities:[],
      mainTastes:[],
      defectType:""
    }
  }));
}

let stage="aroma";
let activeSample=1;
let aromaLocked=false;
let finalized=false;
let validationState={stage:null,errorsBySample:{}};

const tabsEl=document.getElementById("sampleTabs");
const contentEl=document.getElementById("content");
const actionsEl=document.getElementById("actions");
const titleEl=document.getElementById("stageTitle");
const eyebrowEl=document.getElementById("stageEyebrow");
const ruleEl=document.getElementById("ruleBox");
const panelEl=document.getElementById("panel");
const sampleSetupEl=document.getElementById("sampleSetup");
const sampleCountInputEl=document.getElementById("sampleCountInput");
const sampleCountErrorEl = document.getElementById("sampleCountError");
const decreaseSampleBtn = document.getElementById("decreaseSampleBtn");
const increaseSampleBtn = document.getElementById("increaseSampleBtn");
const cuppingProgressEl=document.getElementById("cuppingProgress");

function scrollToFormTop(){
  requestAnimationFrame(()=>{
    panelEl.scrollIntoView({behavior:"smooth",block:"start"});
  });
}

function getAromaMissingFields(s){
  const missing=[];
  if(!s.aroma.dry) missing.push("dry");
  if(!s.aroma.break) missing.push("break");
  if(!s.aroma.color) missing.push("color");
  if(!s.aroma.qualityScore) missing.push("qualityScore");
  if(!s.aroma.qualities.length) missing.push("aromaQualities");
  return missing;
}

function getFlavorMissingFields(s){
  const f=s.flavor;
  const missing=[];

  ["flavor","aftertaste","acidity","body","balance","overall"].forEach(key=>{
    if(f[key] === "") missing.push(key);
  });

  if(f.acidityIntensity === null) missing.push("acidityIntensity");
  if(f.bodyLevel === null) missing.push("bodyLevel");
  if(!f.flavorQualities.length) missing.push("flavorQualities");
  if(!f.mainTastes.length) missing.push("mainTastes");

  if(
    getDefectiveCupCount(s) > 0 &&
    f.defectType !== "taint" &&
    f.defectType !== "fault"
  ){
    missing.push("defectType");
  }

  return missing;
}

function buildValidationErrors(stageName){
  const errors={};

  samples.forEach(sample=>{
    const missing=stageName==="aroma"
      ? getAromaMissingFields(sample)
      : getFlavorMissingFields(sample);

    if(missing.length){
      errors[sample.id]=missing;
    }
  });

  return errors;
}

function applyValidationHighlights(){
  contentEl.querySelectorAll(".validation-error").forEach(el=>{
    el.classList.remove("validation-error");
  });
  contentEl.querySelectorAll(".field-error-message").forEach(el=>el.remove());

  if(validationState.stage!==stage) return;

  const missing=validationState.errorsBySample[activeSample] || [];

  missing.forEach(fieldId=>{
    const field=contentEl.querySelector(`[data-validation-id="${fieldId}"]`);
    if(!field) return;

    field.classList.add("validation-error");
    const message=document.createElement("div");
    message.className="field-error-message";
    message.textContent="Required field";
    field.appendChild(message);
  });
}

function scrollToFirstValidationError(){
  requestAnimationFrame(()=>{
    const first=contentEl.querySelector(".validation-error");
    if(first){
      first.scrollIntoView({behavior:"smooth",block:"center"});
    }
  });
}

function refreshCurrentSampleValidation(){
  if(validationState.stage!==stage || (stage!=="aroma" && stage!=="flavor")) return;

  const sample=samples[activeSample-1];
  const missing=stage==="aroma"
    ? getAromaMissingFields(sample)
    : getFlavorMissingFields(sample);

  if(missing.length){
    validationState.errorsBySample[activeSample]=missing;
  }else{
    delete validationState.errorsBySample[activeSample];
  }

  renderTabs();
  applyValidationHighlights();
}

contentEl.addEventListener("change",()=>{
  if(stage!=="aroma" && stage!=="flavor") return;
  saveVisible();
  refreshCurrentSampleValidation();
});

function updateSampleStepperButtons() {
  const raw = sampleCountInputEl.value.trim();
  const count = Number(raw);

  const valid =
    raw !== "" &&
    Number.isInteger(count) &&
    count >= 1 &&
    count <= 10;

  // Minus is only usable when we have a valid value greater than 1
  decreaseSampleBtn.disabled = !valid || count <= 1;

  // Plus stays usable when empty/invalid so it can bring the user back to 1
  increaseSampleBtn.disabled = valid && count >= 10;
}


function changeSampleCount(change) {
  const raw = sampleCountInputEl.value.trim();
  let count = Number(raw);

  // If blank or invalid, start from 1
  if (
    raw === "" ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > 10
  ) {
    count = 1;
  } else {
    count += change;
  }

  // Never allow the buttons to go outside 1–10
  count = Math.max(1, Math.min(10, count));

  sampleCountInputEl.value = count;

  // Remove an old validation message after the user corrects the field
  sampleCountErrorEl.textContent = "";

  updateSampleStepperButtons();
}

function startCupping(){
  const raw=sampleCountInputEl.value.trim();
  const count=Number(raw);

  if(raw==="" || !Number.isInteger(count) || count<1 || count>10){
    sampleCountErrorEl.textContent="Please enter a whole number from 1 to 10.";
    sampleCountInputEl.focus();
    return;
  }

  SAMPLE_COUNT=count;
  samples=createSamples(count);
  stage="aroma";
  activeSample=1;
  aromaLocked=false;
  finalized=false;
  validationState={stage:null,errorsBySample:{}};

  sampleCountErrorEl.textContent="";
  sampleSetupEl.style.display="none";
  cuppingProgressEl.style.display="block";
  panelEl.style.display="block";
  document.getElementById("successBox").style.display="none";

  render();
  scrollToFormTop();
}

sampleCountInputEl.addEventListener("keydown", event=>{
  if(event.key==="Enter") startCupping();
});
sampleCountInputEl.addEventListener("input", () => {
  sampleCountErrorEl.textContent = "";
  updateSampleStepperButtons();
});
updateSampleStepperButtons();

function scoreSelect(name, value, label){
  return `
    <div class="field-card" data-validation-id="${name}">
      <label for="${name}">${label}<span class="required-mark" aria-hidden="true">*</span></label>
      <select class="score-select" id="${name}" data-field="${name}">
        <option value="">Select score</option>
        ${scoreOptions.map(v=>`<option value="${v}" ${value===v?"selected":""}>${v}</option>`).join("")}
      </select>
      <div class="help">SCA quality scale: 6.00–10.00 in 0.25 increments</div>
    </div>`;
}

function renderTabs(){
  tabsEl.style.display = stage==="review" ? "none" : "flex";
  if(stage==="review") return;
  tabsEl.innerHTML=samples.map(s=>{
    const complete=stage==="aroma" ? s.aroma.complete : flavorIsComplete(s);
    const hasError = validationState.stage===stage &&
      (validationState.errorsBySample[s.id]?.length > 0);

    return `<button class="tab ${s.id===activeSample?"active":""} ${complete?"complete":""} ${hasError?"error":""}" onclick="switchSample(${s.id})">
      <span class="dot"></span> Sample ${s.id}
    </button>`;
  }).join("");
}

function switchSample(id){ saveVisible(); activeSample=id; render(); }

function scale5(name, selected, labels=["1","2","3","4","5"]){
  return `<div class="scale5">
    ${labels.map((l,i)=>{
      const v=i+1;
      return `<input type="radio" name="${name}" id="${name}-${v}" value="${v}" ${String(selected)===String(v)?"checked":""}>
              <label for="${name}-${v}">${l}</label>`;
    }).join("")}
  </div>`;
}

function choice3(name, selected){
  return `<div class="choice3">
    ${["Low","Medium","High"].map(v=>`
      <input type="radio" name="${name}" id="${name}-${v}" value="${v}" ${selected===v?"checked":""}>
      <label for="${name}-${v}">${v}</label>`).join("")}
  </div>`;
}

// function aromaQualityChecks(selectedValues = []){
//   return `
//     <div class="aroma-quality-grid">
//       ${aromaQualityOptions.map((quality, index)=>`
//         <label class="aroma-quality-option">
//           <input
//             type="checkbox"
//             name="aromaQuality"
//             value="${quality}"
//             ${selectedValues.includes(quality) ? "checked" : ""}
//           >
//           <span>${quality}</span>
//         </label>
//       `).join("")}
//     </div>
//   `;
// }
function aromaQualityChecks(selectedValues = []){
  return `
    <div class="aroma-quality-groups">

      ${aromaQualityGroups.map(group => `
        <div class="aroma-quality-group">

          <label class="aroma-quality-option aroma-quality-parent">
            <input
              type="checkbox"
              name="aromaQuality"
              value="${group.parent}"
              ${selectedValues.includes(group.parent) ? "checked" : ""}
            >
            <span>${group.parent}</span>
          </label>

          ${group.children.length ? `
            <div class="aroma-quality-children">

              ${group.children.map(child => `
                <label class="aroma-quality-option aroma-quality-child">
                  <input
                    type="checkbox"
                    name="aromaQuality"
                    value="${child}"
                    ${selectedValues.includes(child) ? "checked" : ""}
                  >
                  <span>${child}</span>
                </label>
              `).join("")}

            </div>
          ` : ""}

        </div>
      `).join("")}

    </div>
  `;
}

// function flavorQualityChecks(selectedValues = []){
//   return `
//     <div class="aroma-quality-grid">
//       ${aromaQualityOptions.map(quality=>`
//         <label class="aroma-quality-option">
//           <input
//             type="checkbox"
//             name="flavorQuality"
//             value="${quality}"
//             ${selectedValues.includes(quality) ? "checked" : ""}
//           >
//           <span>${quality}</span>
//         </label>
//       `).join("")}
//     </div>
//   `;
// }
function flavorQualityChecks(selectedValues = []){
  return `
    <div class="aroma-quality-groups">

      ${aromaQualityGroups.map(group => `
        <div class="aroma-quality-group">

          <label class="aroma-quality-option aroma-quality-parent">
            <input
              type="checkbox"
              name="flavorQuality"
              value="${group.parent}"
              ${selectedValues.includes(group.parent) ? "checked" : ""}
            >
            <span>${group.parent}</span>
          </label>

          ${group.children.length ? `
            <div class="aroma-quality-children">

              ${group.children.map(child => `
                <label class="aroma-quality-option aroma-quality-child">
                  <input
                    type="checkbox"
                    name="flavorQuality"
                    value="${child}"
                    ${selectedValues.includes(child) ? "checked" : ""}
                  >
                  <span>${child}</span>
                </label>
              `).join("")}

            </div>
          ` : ""}

        </div>
      `).join("")}

    </div>
  `;
}

function mainTasteChecks(selectedValues = []){
  return `
    <div class="aroma-quality-grid">
      ${mainTasteOptions.map(taste=>`
        <label class="aroma-quality-option">
          <input
            type="checkbox"
            name="mainTaste"
            value="${taste}"
            ${selectedValues.includes(taste) ? "checked" : ""}
          >
          <span>${taste}</span>
        </label>
      `).join("")}
    </div>
  `;
}

function aromaView(s){
  return `
    <div class="sample-title">
      <h3>Sample ${s.id}</h3>
      <span class="pill">Aroma • 5 cups evaluated as one sample</span>
    </div>
    <div class="grid">
      <section class="section" data-validation-id="dry">
        <h4>Dry Aroma</h4>
        <label>Dry score (1–5)<span class="required-mark" aria-hidden="true">*</span></label>
        ${scale5("dry",s.aroma.dry)}
      </section>

      <section class="section" data-validation-id="break">
        <h4>Break Aroma</h4>
        <label>Break score (1–5)<span class="required-mark" aria-hidden="true">*</span></label>
        ${scale5("break",s.aroma.break)}
      </section>

      <section class="section" data-validation-id="color">
        <h4>Colour Intensity</h4>
        <label>Select the observed intensity<span class="required-mark" aria-hidden="true">*</span></label>
        ${choice3("color",s.aroma.color)}
      </section>

      <section class="section">
        <h4>Fragrance / Aroma Quality</h4>
        ${scoreSelect("qualityScore",s.aroma.qualityScore,"Quality score")}
      </section>

      <section class="section full" data-validation-id="aromaQualities">
        <h4>Aroma Qualities</h4>
        <label>Select all qualities that apply<span class="required-mark" aria-hidden="true">*</span></label>
        ${aromaQualityChecks(s.aroma.qualities)}
      </section>

    </div>`;
}

// function cupChecks(name, values){
//   return `<div class="cupchecks">
//     ${values.map((v,i)=>`
//       <label class="cup">
//         <input type="checkbox" data-cup="${i}" data-group="${name}" ${v?"checked":""}>
//         <span>Cup ${i+1}</span>
//       </label>`).join("")}
//   </div>`;
// }
function formatScore(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return Number.isInteger(number)
    ? String(number)
    : String(parseFloat(number.toFixed(2)));
}
  function calculateCupScore(values) {
    return values.filter(Boolean).length * 2;
  }

  function getDefectiveCupCount(sample) {
    return sample.flavor.uniformity.filter(value => !value).length;
  }

  function getDefectPoints(defectType) {
    if (defectType === "taint") return 2;
    if (defectType === "fault") return 4;
    return 0;
  }

  function calculateDefectDeduction(sample) {
    return getDefectiveCupCount(sample) * getDefectPoints(sample.flavor.defectType);
  }

  function calculateBaseScore(sample) {
    return (
      (Number(sample.aroma.qualityScore) || 0) +
      (Number(sample.flavor.flavor) || 0) +
      (Number(sample.flavor.aftertaste) || 0) +
      (Number(sample.flavor.acidity) || 0) +
      (Number(sample.flavor.body) || 0) +
      calculateCupScore(sample.flavor.uniformity) +
      calculateCupScore(sample.flavor.cleanCup) +
      (Number(sample.flavor.balance) || 0) +
      calculateCupScore(sample.flavor.sweetness) +
      (Number(sample.flavor.overall) || 0)
    );
  }

  function calculateFinalScore(sample) {
    return (calculateBaseScore(sample) - calculateDefectDeduction(sample)).toFixed(2);
  }

  function cupChecks(name, values) {
    return `<div class="cupchecks">
    ${values.map((v, i) => `
      <label class="cup">
        <input
          type="checkbox"
          data-cup="${i}"
          data-group="${name}"
          aria-label="Cup ${i + 1}"
          ${v ? "checked" : ""}
          onchange="syncUniformClean('${name}', ${i}, this.checked)"
        >

        <span class="coffee-cup-control" aria-hidden="true">
          <svg viewBox="0 0 48 48">
            <path d="M10 15h24v14a10 10 0 0 1-10 10h-4A10 10 0 0 1 10 29Z"></path>
            <path d="M34 19h3.5a6.5 6.5 0 0 1 0 13H34"></path>
            <path d="M8 40h29"></path>
            <path class="cup-check" d="m16 26 5 5 10-12"></path>
          </svg>
        </span>

        <span class="cup-label">Cup ${i + 1}</span>
      </label>`).join("")}
  </div>`;
  }

  // Synchronize Uniformity and Clean Cup checkboxes
  function syncUniformClean(group, cupIndex, checked) {

      const sample = samples[activeSample - 1];

      // Sweetness is independent: only update its own cup and score
      if (group === "sweetness") {
        sample.flavor.sweetness[cupIndex] = checked;

        const sweetnessScoreEl = document.getElementById("sweetnessScore");
        if (sweetnessScoreEl) {
          sweetnessScoreEl.textContent = calculateCupScore(sample.flavor.sweetness);
        }
        return;
      }

      // Only Uniformity and Clean Cup are dependent
      if (group !== "uniformity" && group !== "cleanCup") {
        return;
      }

      // Find the matching dependent field
      const pairedGroup =
        group === "uniformity"
          ? "cleanCup"
          : "uniformity";

      // Update the matching checkbox on screen
      const pairedCheckbox = document.querySelector(
        `input[data-group="${pairedGroup}"][data-cup="${cupIndex}"]`
      );

      if (pairedCheckbox) {
        pairedCheckbox.checked = checked;
      }

      // Update the stored data immediately
      sample.flavor[group][cupIndex] = checked;
      sample.flavor[pairedGroup][cupIndex] = checked;

      const uniformityScoreEl = document.getElementById("uniformityScore");
      const cleanCupScoreEl = document.getElementById("cleanCupScore");

      if (uniformityScoreEl) {
        uniformityScoreEl.textContent = calculateCupScore(sample.flavor.uniformity);
      }

      if (cleanCupScoreEl) {
        cleanCupScoreEl.textContent = calculateCupScore(sample.flavor.cleanCup);
      }

      const defectiveCupCount = getDefectiveCupCount(sample);
      const defectSection = document.getElementById("defectSection");
      const defectCupCountEl = document.getElementById("defectCupCount");

      if (defectSection) {
        defectSection.style.display = defectiveCupCount > 0 ? "block" : "none";
      }
      if (defectCupCountEl) {
        defectCupCountEl.textContent = defectiveCupCount;
      }

      if (defectiveCupCount === 0) {
        sample.flavor.defectType = "";
        document.querySelectorAll('input[name="defectType"]').forEach(input => {
          input.checked = false;
        });
      }

      const defectDeductionEl = document.getElementById("defectDeduction");
      if (defectDeductionEl) {
        defectDeductionEl.textContent = calculateDefectDeduction(sample);
      }
    }

  function setDefectType(defectType) {
    const sample = samples[activeSample - 1];
    sample.flavor.defectType = defectType;

    if(validationState.stage==="flavor"){
      const missing=getFlavorMissingFields(sample);
      if(missing.length){
        validationState.errorsBySample[activeSample]=missing;
      }else{
        delete validationState.errorsBySample[activeSample];
      }
    }

    render();
  }

function flavorView(s){
  return `
    <div class="sample-title">
      <h3>Sample ${s.id}</h3>
      <span class="pill">Flavor stage • flexible/editable</span>
    </div>

    <div class="grid">
      <section class="section full">
        <h4>Taste Evaluation</h4>
        <div class="score-grid">
          ${scoreSelect("flavor",s.flavor.flavor,"Flavor")}
          ${scoreSelect("aftertaste",s.flavor.aftertaste,"Aftertaste")}
          ${scoreSelect("acidity",s.flavor.acidity,"Acidity")}
          ${scoreSelect("body",s.flavor.body,"Body")}
          ${scoreSelect("balance",s.flavor.balance,"Balance")}
          ${scoreSelect("overall",s.flavor.overall,"Overall")}
        </div>
      </section>

      <section class="section" data-validation-id="acidityIntensity">
        <h4>Acidity Intensity</h4>
        <label>Select intensity (1–5)<span class="required-mark" aria-hidden="true">*</span></label>
        ${scale5("acidityIntensity", s.flavor.acidityIntensity)}
        <div class="help">1 = Low · 5 = High</div>
      </section>

      <section class="section" data-validation-id="bodyLevel">
        <h4>Body Level</h4>
        <label>Select body level (1–5)<span class="required-mark" aria-hidden="true">*</span></label>
        ${scale5("bodyLevel", s.flavor.bodyLevel)}
        <div class="help">1 = Thin · 5 = Heavy</div>
      </section>

      <section class="section full">
        <div class="section-score-header">
          <h4>Uniformity — Cup 1 to Cup 5</h4>
          <div class="section-score">
            Score: <span id="uniformityScore">${calculateCupScore(s.flavor.uniformity)}</span>/10
          </div>
        </div>
        <div class="cup-state-legend">
          <strong>Selected cup</strong> = Uniform · <strong>Unselected cup</strong> = Not Uniform
        </div>
        ${cupChecks("uniformity",s.flavor.uniformity)}
      </section>

      <section class="section full">
        <div class="section-score-header">
          <h4>Clean Cup — Cup 1 to Cup 5</h4>
          <div class="section-score">
            Score: <span id="cleanCupScore">${calculateCupScore(s.flavor.cleanCup)}</span>/10
          </div>
        </div>
        <div class="cup-state-legend">
          <strong>Selected cup</strong> = Clean · <strong>Unselected cup</strong> = Not Clean
        </div>
        ${cupChecks("cleanCup",s.flavor.cleanCup)}
      </section>

      <section class="section full" id="defectSection" data-validation-id="defectType"
        style="display:${getDefectiveCupCount(s) > 0 ? "block" : "none"}">
        <div class="section-score-header">
          <h4>Defects</h4>
          <div class="section-score">
            <span id="defectCupCount">${getDefectiveCupCount(s)}</span> defective cup(s)
          </div>
        </div>

        <label>How severe is the defect?<span class="required-mark" aria-hidden="true">*</span></label>
        <div class="defect-options">
          <input type="radio" name="defectType" id="defect-taint" value="taint"
            ${s.flavor.defectType === "taint" ? "checked" : ""}
            onchange="setDefectType('taint')">
          <label for="defect-taint">
            <strong>Taint</strong><br>
            <span class="help">2 points per defective cup</span>
          </label>

          <input type="radio" name="defectType" id="defect-fault" value="fault"
            ${s.flavor.defectType === "fault" ? "checked" : ""}
            onchange="setDefectType('fault')">
          <label for="defect-fault">
            <strong>Fault</strong><br>
            <span class="help">4 points per defective cup</span>
          </label>
        </div>

        <div class="defect-deduction">
          Deduction: ${getDefectiveCupCount(s)} cup(s) ×
          ${s.flavor.defectType === "taint" ? "2" : s.flavor.defectType === "fault" ? "4" : "0"}
          = <span id="defectDeduction">${calculateDefectDeduction(s)}</span> points
        </div>
      </section>

      <section class="section full">
        <div class="section-score-header">
          <h4>Sweetness — Cup 1 to Cup 5</h4>
          <div class="section-score">
            Score: <span id="sweetnessScore">${calculateCupScore(s.flavor.sweetness)}</span>/10
          </div>
        </div>
        <div class="cup-state-legend">
          <strong>Selected cup</strong> = Sweet · <strong>Unselected cup</strong> = Not Sweet
        </div>
        ${cupChecks("sweetness",s.flavor.sweetness)}
      </section>

      <section class="section full" data-validation-id="flavorQualities">
        <h4>Flavor Qualities</h4>
        <label>Select all qualities that apply<span class="required-mark" aria-hidden="true">*</span></label>
        ${flavorQualityChecks(s.flavor.flavorQualities)}
      </section>

      <section class="section full" data-validation-id="mainTastes">
        <h4>Main Tastes (2)</h4>
        <label>Select the main tastes<span class="required-mark" aria-hidden="true">*</span></label>
        ${mainTasteChecks(s.flavor.mainTastes)}
      </section>

    </div>`;
}

  function reviewView() {
    return `
    <div class="sample-title">
      <h3>Review all samples</h3>
      <span class="pill">Aroma locked • Flavor editable until finalization</span>
    </div>

    <div class="review-list">

      ${samples.map(s => `

        <article class="review-card">

          <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:12px">
            <h4>Sample ${s.id}</h4>

            <button
              class="btn ghost"
              onclick="editFlavor(${s.id})"
              ${finalized ? "disabled" : ""}
            >
              Edit Flavor Test
            </button>
          </div>


          <div class="review-score-group">

            <h5>Aroma Test Scores</h5>

            <div class="mini-grid">

              <div class="kv">
                <b>Aroma Quality</b>
                <span>
                  ${s.aroma.qualityScore
                      ? `${formatScore(s.aroma.qualityScore)} / 10`
                      : "—"
                    }
                </span>
              </div>


              <div class="kv">
                <b>Dry Aroma</b>
                <span>
                  ${s.aroma.dry
                      ? `${formatScore(s.aroma.dry)} / 5`
                      : "—"
                    }
                </span>
              </div>


              <div class="kv">
                <b>Break Aroma</b>
                <span>
                  ${s.aroma.break
                      ? `${formatScore(s.aroma.break)} / 5`
                      : "—"
                    }
                </span>
              </div>


              <div class="kv">
                <b>Colour Intensity</b>
                <span>
                  ${s.aroma.color || "—"}
                </span>
              </div>

            </div>

          </div>
          <div class="review-qualities">
            <b>Selected Aroma Qualities</b>

            <div class="quality-inline-list">
              ${s.aroma.qualities.map(quality => `
                <span class="quality-item">
                  • ${escapeHtml(quality)}
                </span>
              `).join("")}
            </div>
          </div>




          <div class="review-score-group">

            <h5>Flavor Test Scores</h5>

            <div class="mini-grid">

              <div class="kv">
                <b>Flavor</b>
                <span>
                  ${s.flavor.flavor
                      ? `${formatScore(s.flavor.flavor)} / 10`
                      : "—"
                    }
                </span>
              </div>


              <div class="kv">
                <b>Aftertaste</b>
                <span>
                  ${s.flavor.aftertaste
                      ? `${formatScore(s.flavor.aftertaste)} / 10`
                      : "—"
                    }
                </span>
              </div>


              <div class="kv">
                <b>Acidity</b>
                <span>
                  ${s.flavor.acidity
                      ? `${formatScore(s.flavor.acidity)} / 10`
                      : "—"
                    }
                </span>
              </div>


              <div class="kv">
                <b>Body</b>
                <span>
                  ${s.flavor.body
                      ? `${formatScore(s.flavor.body)} / 10`
                      : "—"
                    }
                </span>
              </div>


              <div class="kv">
                <b>Uniformity</b>
                <span>
                  ${formatScore(
                      calculateCupScore(s.flavor.uniformity)
                    )} / 10
                </span>
              </div>


              <div class="kv">
                <b>Clean Cup</b>
                <span>
                  ${formatScore(
                      calculateCupScore(s.flavor.cleanCup)
                    )} / 10
                </span>
              </div>


              <div class="kv">
                <b>Balance</b>
                <span>
                  ${s.flavor.balance
                      ? `${formatScore(s.flavor.balance)} / 10`
                      : "—"
                    }
                </span>
              </div>


              <div class="kv">
                <b>Sweetness</b>
                <span>
                  ${formatScore(
                      calculateCupScore(s.flavor.sweetness)
                    )} / 10
                </span>
              </div>


              <div class="kv">
                <b>Overall</b>
                <span>
                  ${s.flavor.overall
                      ? `${formatScore(s.flavor.overall)} / 10`
                      : "—"
                    }
                </span>
              </div>


              ${getDefectiveCupCount(s) > 0
                  ? `
                              <div class="kv">
                                <b>Defects</b>

                                <span>
                                  ${getDefectiveCupCount(s)} cup(s) ×

                                  ${s.flavor.defectType === "taint"
                    ? "Taint (2)"
                    : "Fault (4)"
                  }

                                  = -${formatScore(
                    calculateDefectDeduction(s)
                  )}
                                </span>
                              </div>
                            `
                  : ""
                }

            </div>

          </div>

          <div class="review-qualities">
            <b>Selected Flavor Qualities</b>

            <div class="quality-inline-list">
              ${s.flavor.flavorQualities.map(quality => `
                <span class="quality-item">
                  • ${escapeHtml(quality)}
                </span>
              `).join("")}
            </div>
          </div>

          <div class="review-qualities">
            <b>Main Tastes</b>

            <div class="quality-inline-list">
              ${s.flavor.mainTastes.map(taste => `
                <span class="quality-item">
                  • ${escapeHtml(taste)}
                </span>
              `).join("")}
            </div>
          </div>




          <div class="review-score-group">

            <h5>Final Score</h5>

            <div
              class="kv"
              style="text-align:center; padding:20px;"
            >

              <span
                style="font-size:28px; font-weight:800;"
              >
                ${formatScore(
        calculateFinalScore(s)
      )} / 100
              </span>

            </div>

          </div>

        </article>

      `).join("")}

    </div>
  `;
  }
function render(){
  renderTabs();
  panelEl.classList.toggle("locked", stage==="aroma" && aromaLocked);

  document.querySelectorAll(".step").forEach(x=>x.classList.remove("active","done"));
  const order=["aroma","flavor","review"];
  const idx=order.indexOf(stage);
  order.forEach((st,i)=>{
    const el=document.getElementById("p-"+st);
    if(i<idx) el.classList.add("done");
    if(i===idx) el.classList.add("active");
  });

  const s=samples[activeSample-1];
  if(stage==="aroma"){
    eyebrowEl.textContent="Step 1 of 3";
    titleEl.textContent="Aroma Test";
    ruleEl.textContent=aromaLocked ? "Aroma is locked. Continue to the Flavor Test." : "Complete Aroma for every sample. Once confirmed, all Aroma data is locked.";
    contentEl.innerHTML=aromaView(s);
    actionsEl.innerHTML=`
      ${SAMPLE_COUNT > 1 ? `
        <button
          class="btn secondary"
          onclick="prevSample()"
          ${activeSample===1 ? "disabled" : ""}
        >
          ← Previous sample
        </button>
      ` : `<div></div>`}

      <div style="display:flex;gap:10px;flex-wrap:wrap">

        ${!aromaLocked ? `

          ${SAMPLE_COUNT > 1 ? `
            <button
              class="btn ghost"
              onclick="nextSample()"
            >
              Save & next sample →
            </button>
          ` : ""}

          <button
            class="btn primary"
            onclick="confirmAroma()"
          >
            Confirm Aroma Stage 🔒
          </button>

        ` : `

          <button
            class="btn primary"
            onclick="goFlavor()"
          >
            Continue to Flavor Test →
          </button>

        `}

      </div>`;
  } else if(stage==="flavor"){
    eyebrowEl.textContent="Step 2 of 3";
    titleEl.textContent="Flavor Test";
    ruleEl.textContent="This stage is flexible. Move between samples and edit these fields until finalization.";
    contentEl.innerHTML=flavorView(s);
    actionsEl.innerHTML=`
        ${SAMPLE_COUNT > 1 ? `
          <button
            class="btn secondary"
            onclick="prevSample()"
            ${activeSample===1 ? "disabled" : ""}
          >
            ← Previous sample
          </button>
        ` : `<div></div>`}

        <div style="display:flex;gap:10px;flex-wrap:wrap">

          ${SAMPLE_COUNT > 1 ? `
            <button
              class="btn ghost"
              onclick="nextSample()"
            >
              Save & next sample →
            </button>
          ` : ""}

          <button
            class="btn primary"
            onclick="goReview()"
          >
            Review & Finalize →
          </button>

        </div>`;
  } else {
    eyebrowEl.textContent="Step 3 of 3";
    titleEl.textContent="Review & Finalize";
    ruleEl.textContent="Review all samples. Aroma is view-only; Flavor-stage data may still be edited before final confirmation.";
    contentEl.innerHTML=reviewView();
    actionsEl.innerHTML=`
      <button class="btn secondary" onclick="backToFlavor()" ${finalized?"disabled":""}>← Back to Flavor Test</button>
      <button class="btn primary" onclick="finalizeEvaluation()" ${finalized?"disabled":""}>Finish Evaluation</button>`;
  }

  applyValidationHighlights();
}

function saveVisible(){
  const s=samples[activeSample-1];
  if(stage==="aroma" && !aromaLocked){
    s.aroma.dry = document.querySelector('input[name="dry"]:checked')?.value || s.aroma.dry;
    s.aroma.break = document.querySelector('input[name="break"]:checked')?.value || s.aroma.break;
    s.aroma.color = document.querySelector('input[name="color"]:checked')?.value || s.aroma.color;
    s.aroma.qualityScore = document.getElementById("qualityScore")?.value ?? s.aroma.qualityScore;
    s.aroma.qualities = [
      ...document.querySelectorAll('input[name="aromaQuality"]:checked')
    ].map(input => input.value);
    s.aroma.complete = aromaIsComplete(s);
  }
  if(stage==="flavor"){
    ["flavor","aftertaste","acidity","body","balance","overall"].forEach(k=>{
      const el=document.getElementById(k); if(el) s.flavor[k]=el.value;
    });
    // const ai=document.getElementById("acidityIntensity"); if(ai) s.flavor.acidityIntensity=ai.value;
    // const bl=document.getElementById("bodyLevel"); if(bl) s.flavor.bodyLevel=bl.value;
    const ai = document.querySelector(
      'input[name="acidityIntensity"]:checked'
    );
    if (ai) s.flavor.acidityIntensity = Number(ai.value);

    const bl = document.querySelector(
      'input[name="bodyLevel"]:checked'
    );
    if (bl) s.flavor.bodyLevel = Number(bl.value);


    const selectedDefect = document.querySelector('input[name="defectType"]:checked');
    if (selectedDefect) s.flavor.defectType = selectedDefect.value;
    if (getDefectiveCupCount(s) === 0) s.flavor.defectType = "";

    s.flavor.flavorQualities = [
      ...document.querySelectorAll('input[name="flavorQuality"]:checked')
    ].map(input => input.value);

    s.flavor.mainTastes = [
      ...document.querySelectorAll('input[name="mainTaste"]:checked')
    ].map(input => input.value);

    // const notes=document.getElementById("flavorNotes"); if(notes) s.flavor.notes=notes.value;
    // ["uniformity","cleanCup","sweetness"].forEach(group=>{
    //   const vals=[...document.querySelectorAll(`[data-group="${group}"]`)].map(x=>x.checked);
    //   if(vals.length) s.flavor[group]=vals;
    // });
  }
}

  function aromaIsComplete(s) {
    return !!(
      s.aroma.dry &&
      s.aroma.break &&
      s.aroma.color &&
      s.aroma.qualityScore &&
      s.aroma.qualities.length > 0
    );
  }
function flavorIsComplete(s){
  const f = s.flavor;

  const scoreFieldsComplete =
    ["flavor","aftertaste","acidity","body","balance","overall"]
      .every(k => f[k] !== "");

  const intensityFieldsComplete =
    f.acidityIntensity !== null &&
    f.bodyLevel !== null;

  const descriptiveFieldsComplete =
    f.flavorQualities.length > 0 &&
    f.mainTastes.length > 0;

  const defectFieldsComplete =
    getDefectiveCupCount(s) === 0 ||
    f.defectType === "taint" ||
    f.defectType === "fault";

  return (
    scoreFieldsComplete &&
    intensityFieldsComplete &&
    descriptiveFieldsComplete &&
    defectFieldsComplete
  );
}
function nextSample(){
  saveVisible();
  activeSample = activeSample < SAMPLE_COUNT ? activeSample+1 : 1;
  render();
  scrollToFormTop();
}
function prevSample() {
  saveVisible();
  if (activeSample > 1) activeSample--;
  render();
  scrollToFormTop();
}

function confirmAroma(){
  saveVisible();

  const errors=buildValidationErrors("aroma");
  const incompleteSamples=Object.keys(errors).map(Number);

  if(incompleteSamples.length){
    validationState={stage:"aroma",errorsBySample:errors};
    activeSample=incompleteSamples[0];
    render();
    scrollToFirstValidationError();
    return;
  }

  validationState={stage:null,errorsBySample:{}};
  aromaLocked=true;
  samples.forEach(s=>s.aroma.complete=true);
  render();
}

function goFlavor(){
  validationState={stage:null,errorsBySample:{}};
  stage="flavor";
  activeSample=1;
  render();
  scrollToFormTop();
}

function goReview(){
  saveVisible();

  const errors=buildValidationErrors("flavor");
  const incompleteSamples=Object.keys(errors).map(Number);

  if(incompleteSamples.length){
    validationState={stage:"flavor",errorsBySample:errors};
    activeSample=incompleteSamples[0];
    render();
    scrollToFirstValidationError();
    return;
  }

  validationState={stage:null,errorsBySample:{}};
  stage="review";
  render();
  scrollToFormTop();
}

function backToFlavor(){
  validationState={stage:null,errorsBySample:{}};
  stage="flavor";
  activeSample=1;
  render();
  scrollToFormTop();
}

function editFlavor(id){
  validationState={stage:null,errorsBySample:{}};
  stage="flavor";
  activeSample=id;
  render();
  scrollToFormTop();
}
// function finalizeEvaluation(){
//   finalized=true;
//   document.getElementById("successBox").style.display="block";
//   render();
// }
function finalizeEvaluation(){
  finalized = true;
  document.getElementById("successBox").style.display = "block";
  render();

  // Return to the landing page after finalizing
  setTimeout(() => {
    window.location.href = "index.html";
  }, 1000);
}
function escapeHtml(str){
  return String(str??"").replace(/[&<>"']/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}
