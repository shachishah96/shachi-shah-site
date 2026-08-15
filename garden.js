/* ---------- DIGITAL GARDEN ----------
   plant flowers, they grow over real time, water them to speed things up.
   everything lives in this one browser's localStorage — no server, no accounts. */

(function(){
  const STORAGE_KEY = "shachiSiteGarden.v1";
  const WATER_COOLDOWN_MS = 30 * 60 * 1000; // 30 min between waterings per plant
  const MAX_STAGE = 3;
  const DAY_MS = 24 * 60 * 60 * 1000;

  const PLANT_TYPES = ["daisy", "bluebell", "tulip", "sunflower", "tree"];

  function loadGarden(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch(e){ return []; }
  }
  function saveGarden(plants){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(plants)); } catch(e){}
  }

  function getStage(plant){
    const daysSincePlanted = Math.floor((Date.now() - plant.plantedAt) / DAY_MS);
    const waterBonus = plant.waterCount || 0;
    return Math.max(0, Math.min(MAX_STAGE, daysSincePlanted + waterBonus));
  }

  function canWater(plant){
    if (!plant.lastWatered) return true;
    return (Date.now() - plant.lastWatered) >= WATER_COOLDOWN_MS;
  }

  /* ---- SVG builders: one small function per plant type, parameterised by growth stage (0-3) ---- */
  function stemPath(height, brown){
    return `<path d="M0,90 Q${brown?-3:3},${90-height*0.55} 0,${90-height}" stroke="${brown ? "#7a6a4f" : "#4C6B4A"}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  }
  function leafPair(y, brown){
    const c = brown ? "#8a7a5f" : "#5C7F58";
    return `<ellipse cx="-7" cy="${y}" rx="7" ry="3.2" fill="${c}" transform="rotate(-25 -7 ${y})"/>
            <ellipse cx="7" cy="${y}" rx="7" ry="3.2" fill="${c}" transform="rotate(25 7 ${y})"/>`;
  }

  function headDaisy(scale){
    if (scale <= 0) return "";
    const petals = [...Array(8)].map((_,i)=>{
      const a = (360/8)*i;
      return `<ellipse cx="0" cy="-11" rx="3.4" ry="9" fill="#FDFDF8" transform="rotate(${a})"/>`;
    }).join("");
    return `<g transform="scale(${scale})">${petals}<circle r="5.5" fill="#E8B94A"/></g>`;
  }
  function headBluebell(scale){
    if (scale <= 0) return "";
    const bells = [-9,0,9].map((dx,i)=>`
      <path d="M${dx},${-2-i%2*3} q-4,8 0,13 q4,-5 0,-13 z" fill="#4A6FA5"/>`).join("");
    return `<g transform="scale(${scale}) translate(0,-6)">${bells}</g>`;
  }
  function headTulip(scale){
    if (scale <= 0) return "";
    return `<g transform="scale(${scale}) translate(0,-8)">
      <path d="M-8,4 Q-9,-12 0,-14 Q9,-12 8,4 Q4,-2 0,-1 Q-4,-2 -8,4 Z" fill="#D9536A"/>
    </g>`;
  }
  function headSunflower(scale){
    if (scale <= 0) return "";
    const petals = [...Array(12)].map((_,i)=>{
      const a = (360/12)*i;
      return `<ellipse cx="0" cy="-14" rx="4" ry="11" fill="#F3C23B" transform="rotate(${a})"/>`;
    }).join("");
    return `<g transform="scale(${scale})">${petals}<circle r="7" fill="#5C4327"/></g>`;
  }
  function headTree(scale){
    if (scale <= 0) return "";
    const blobs = [[0,-4,13],[-9,3,10],[9,3,10],[0,10,11]];
    return `<g transform="scale(${scale}) translate(0,-6)">
      ${blobs.map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#4C7A54"/>`).join("")}
    </g>`;
  }
  const HEAD_BUILDERS = { daisy: headDaisy, bluebell: headBluebell, tulip: headTulip, sunflower: headSunflower, tree: headTree };

  function plantSVG(type, stage){
    const isTree = type === "tree";
    const stemH = 16 + stage * (isTree ? 22 : 16);
    const headScale = [0, 0.4, 0.72, 1][stage];
    const headBuilder = HEAD_BUILDERS[type] || headDaisy;
    const leaves = stage >= 1 ? leafPair(90 - stemH*0.45, isTree) : "";
    const headY = 90 - stemH;
    return `<svg viewBox="0 0 60 100" width="${isTree ? 64 : 40}" height="${isTree ? 90 : 60}">
      ${stemPath(stemH, isTree)}
      ${leaves}
      <g transform="translate(0,${headY})">${headBuilder(headScale)}</g>
    </svg>`;
  }

  function iconSVG(type){
    if (type === "water") {
      return `<svg viewBox="0 0 24 24"><path d="M12 3c3 4 6 7.5 6 11a6 6 0 1 1-12 0c0-3.5 3-7 6-11z" fill="#3E5B66"/></svg>`;
    }
    return plantSVG(type, 3).replace(/width="\d+" height="\d+"/, 'width="20" height="20"');
  }

  /* ---- rendering ---- */
  let plants = [];
  let activeTool = "daisy";
  let bedEl, plantsEl, toolbarEl;

  function render(){
    if (!plantsEl) return;
    plantsEl.innerHTML = plants.map(p => {
      const stage = getStage(p);
      const watered = !canWater(p);
      return `<div class="g-plant" data-id="${p.id}" style="left:${p.x}%;top:${p.y}%;" title="${stage >= MAX_STAGE ? "fully grown" : (watered ? "watered recently — check back later" : "click with the water tool to help it grow")}">
        ${plantSVG(p.type, stage)}
      </div>`;
    }).join("");
  }

  function plantAt(type, xPct, yPct){
    plants.push({
      id: "p" + Date.now() + Math.random().toString(36).slice(2,7),
      type, x: xPct, y: yPct,
      plantedAt: Date.now(),
      lastWatered: null,
      waterCount: 0
    });
    saveGarden(plants);
    render();
  }

  function waterPlant(id){
    const p = plants.find(pl => pl.id === id);
    if (!p) return;
    if (getStage(p) >= MAX_STAGE) return;
    if (!canWater(p)) return;
    p.waterCount = (p.waterCount || 0) + 1;
    p.lastWatered = Date.now();
    saveGarden(plants);
    render();
  }

  function setTool(tool){
    activeTool = tool;
    toolbarEl.querySelectorAll(".g-tool").forEach(b => b.classList.toggle("active", b.dataset.tool === tool));
    bedEl.classList.toggle("tool-water", tool === "water");
  }

  function handleBedClick(e){
    const rect = bedEl.getBoundingClientRect();
    const plantHit = e.target.closest(".g-plant");

    if (activeTool === "water"){
      if (plantHit) waterPlant(plantHit.dataset.id);
      return;
    }
    if (plantHit) return; // don't re-plant on top of an existing plant
    const xPct = Math.min(96, Math.max(4, ((e.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.min(94, Math.max(20, ((e.clientY - rect.top) / rect.height) * 100));
    plantAt(activeTool, xPct, yPct);
  }

  function buildToolbarIcons(){
    toolbarEl.querySelectorAll(".g-tool-icon").forEach(el => {
      el.innerHTML = iconSVG(el.dataset.icon);
    });
  }

  function init(){
    bedEl = document.getElementById("gardenBed");
    plantsEl = document.getElementById("gardenPlants");
    toolbarEl = document.getElementById("gardenToolbar");
    if (!bedEl || bedEl.dataset.gardenInit) return;
    bedEl.dataset.gardenInit = "1";

    plants = loadGarden();
    buildToolbarIcons();
    render();

    toolbarEl.querySelectorAll(".g-tool[data-tool]").forEach(btn => {
      btn.addEventListener("click", () => setTool(btn.dataset.tool));
    });
    bedEl.addEventListener("click", handleBedClick);

    const clearBtn = document.getElementById("gardenClear");
    if (clearBtn) clearBtn.addEventListener("click", () => {
      if (!plants.length) return;
      if (confirm("clear your whole garden? this can't be undone.")){
        plants = [];
        saveGarden(plants);
        render();
      }
    });

    // re-render periodically so growth is visible without a refresh
    setInterval(render, 60 * 1000);
  }

  window.initGarden = init;
})();
