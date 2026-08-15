/* ---------- DIGITAL GARDEN ----------
   plant flowers — each starts small but fully formed, and grows (up to 3x
   its size) each time it's watered. everything lives in this one browser's
   localStorage — no server, no accounts. */

(function(){
  const STORAGE_KEY = "shachiSiteGarden.v2";
  const WATER_COOLDOWN_MS = 30 * 60 * 1000; // 30 min between waterings per plant
  const MAX_SCALE = 3;
  const SCALE_PER_WATERING = 0.5; // 4 waterings to reach max size

  function loadGarden(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch(e){ return []; }
  }
  function saveGarden(plants){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(plants)); } catch(e){}
  }

  function getScale(plant){
    return Math.min(MAX_SCALE, 1 + (plant.waterCount || 0) * SCALE_PER_WATERING);
  }

  function canWater(plant){
    if (!plant.lastWatered) return true;
    return (Date.now() - plant.lastWatered) >= WATER_COOLDOWN_MS;
  }

  /* ---- SVG builders: one small function per plant type, always drawn full-grown —
     actual growth happens via a CSS scale on the wrapping element ---- */
  function stemPath(height, brown){
    return `<path d="M0,90 Q${brown?-3:3},${90-height*0.55} 0,${90-height}" stroke="${brown ? "#7a6a4f" : "#4C6B4A"}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  }
  function leafPair(y, brown){
    const c = brown ? "#8a7a5f" : "#5C7F58";
    return `<ellipse cx="-7" cy="${y}" rx="7" ry="3.2" fill="${c}" transform="rotate(-25 -7 ${y})"/>
            <ellipse cx="7" cy="${y}" rx="7" ry="3.2" fill="${c}" transform="rotate(25 7 ${y})"/>`;
  }

  function headDaisy(){
    const petals = [...Array(8)].map((_,i)=>{
      const a = (360/8)*i;
      return `<ellipse cx="0" cy="-11" rx="3.4" ry="9" fill="#FDFDF8" transform="rotate(${a})"/>`;
    }).join("");
    return `${petals}<circle r="5.5" fill="#E8B94A"/>`;
  }
  function headBluebell(){
    const bells = [
      { x:-10, y:-3,  s:0.82, rot:-30 },
      { x:-5,  y:-10, s:0.95, rot:-12 },
      { x:2,   y:-13, s:1.0,  rot:4   },
      { x:8,   y:-8,  s:0.9,  rot:18  },
      { x:11,  y:-1,  s:0.75, rot:32  }
    ];
    const stalks = bells.map(b => `<line x1="0" y1="-15" x2="${b.x}" y2="${b.y-8}" stroke="#4C6B4A" stroke-width="0.8" opacity="0.7"/>`).join("");
    const bellShapes = bells.map(b => `
      <g transform="translate(${b.x},${b.y}) rotate(${b.rot}) scale(${b.s})">
        <path d="M0,-13 C-3.2,-10 -4,-5.5 -3.2,-1 C-2.6,1.8 2.6,1.8 3.2,-1 C4,-5.5 3.2,-10 0,-13 Z" fill="#4A6FA5"/>
        <path d="M-3.2,-1 Q-4.8,1.6 -2.2,2.6" stroke="#324E7A" stroke-width="0.7" fill="none" stroke-linecap="round"/>
        <path d="M0,-0.6 Q0,2.4 0,3.4" stroke="#324E7A" stroke-width="0.7" fill="none" stroke-linecap="round"/>
        <path d="M3.2,-1 Q4.8,1.6 2.2,2.6" stroke="#324E7A" stroke-width="0.7" fill="none" stroke-linecap="round"/>
      </g>
    `).join("");
    return stalks + bellShapes;
  }
  function headTulip(){
    return `
      <path d="M-9,6 C-10.5,-6 -6.5,-16 0,-18 C6.5,-16 10.5,-6 9,6
               C6.5,1.5 5.5,6.5 2.2,3 C1.2,7.5 -1.2,7.5 -2.2,3 C-5.5,6.5 -6.5,1.5 -9,6 Z"
            fill="#D9536A"/>
      <path d="M0,-18 C-1.8,-11 -1.8,-3 0,3" stroke="#B83955" stroke-width="0.7" fill="none" opacity="0.55" stroke-linecap="round"/>
      <path d="M-9,6 C-8,-4 -5.5,-12 -1.5,-16" stroke="#E87791" stroke-width="0.8" fill="none" opacity="0.4" stroke-linecap="round"/>
    `;
  }
  function headSunflower(){
    const petals = [...Array(12)].map((_,i)=>{
      const a = (360/12)*i;
      return `<ellipse cx="0" cy="-14" rx="4" ry="11" fill="#F3C23B" transform="rotate(${a})"/>`;
    }).join("");
    return `${petals}<circle r="7" fill="#5C4327"/>`;
  }
  function headTree(){
    const blobs = [[0,-4,13],[-9,3,10],[9,3,10],[0,10,11]];
    return blobs.map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#4C7A54"/>`).join("");
  }
  const HEAD_BUILDERS = { daisy: headDaisy, bluebell: headBluebell, tulip: headTulip, sunflower: headSunflower, tree: headTree };

  function plantSVG(type){
    const isTree = type === "tree";
    const stemH = isTree ? 58 : 44;
    const headBuilder = HEAD_BUILDERS[type] || headDaisy;
    const headY = 90 - stemH;
    return `<svg viewBox="0 0 60 100" width="${isTree ? 64 : 40}" height="${isTree ? 90 : 60}">
      ${stemPath(stemH, isTree)}
      ${leafPair(90 - stemH*0.45, isTree)}
      <g transform="translate(0,${headY})">${headBuilder()}</g>
    </svg>`;
  }

  function iconSVG(type){
    if (type === "water") {
      return `<svg viewBox="0 0 32 26">
        <rect x="4" y="9" width="16" height="13" rx="3" fill="#3E5B66"/>
        <path d="M8 9 Q12 1 16 9" stroke="#3E5B66" stroke-width="2" fill="none"/>
        <path d="M20 12 L29 6 L27 10.5 L22 15.5 Z" fill="#3E5B66"/>
        <circle cx="30" cy="3.5" r="1.3" fill="#4A6FA5"/>
        <circle cx="27" cy="1.5" r="1" fill="#4A6FA5"/>
      </svg>`;
    }
    return plantSVG(type).replace(/width="\d+" height="\d+"/, 'width="20" height="20"');
  }

  /* ---- rendering ---- */
  let plants = [];
  let activeTool = "daisy";
  let bedEl, plantsEl, toolbarEl;

  function render(){
    if (!plantsEl) return;
    plantsEl.innerHTML = plants.map(p => {
      const scale = getScale(p);
      const watered = !canWater(p);
      const maxed = scale >= MAX_SCALE;
      const hint = maxed ? "fully grown" : (watered ? "watered recently — check back later" : "pick the water tool and click to help it grow");
      return `<div class="g-plant" data-id="${p.id}" style="left:${p.x}%;top:${p.y}%;transform:translate(-50%,-100%) scale(${scale});" title="${hint}">
        ${plantSVG(p.type)}
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
    if (getScale(p) >= MAX_SCALE) return;
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
      plants = [];
      saveGarden(plants);
      render();
    });
  }

  window.initGarden = init;
})();
