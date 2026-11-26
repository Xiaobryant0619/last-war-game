const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI 元素
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayDesc = document.getElementById('overlay-desc');
const earnedCoinsEl = document.getElementById('earned-coins');
const restartBtn = document.getElementById('restart-btn');

const shopOverlay = document.getElementById('shop-overlay');
const startBtn = document.getElementById('start-btn');
const hudStageEl = document.getElementById('hud-stage');
const hudCoinsEl = document.getElementById('hud-coins');

// ==========================================
// 遊戲模式系統 ('campaign' | 'endless' | 'blitz')
// ==========================================
let currentMode = 'campaign';
let bonusStartTroops = 0;

const MODES = {
  campaign: {
    id: 'campaign',
    name: '🛡️ 闖關模式',
    desc: '推進主線關卡，擊敗關底泰坦 Boss 解鎖下一關',
    color: '#00f2fe'
  },
  endless: {
    id: 'endless',
    name: '♾️ 無盡模式',
    desc: '無終點生存戰！波次無限升級，考驗極限兵團火力',
    color: '#a55eea'
  },
  blitz: {
    id: 'blitz',
    name: '⚡ 狂暴衝刺',
    desc: '雙倍射速與高頻倍率門，享受滿屏彈幕的極速快感',
    color: '#feca57'
  }
};

// ==========================================
// 英雄指揮官、等級成長與主動大招系統（共 4 位英雄）
// ==========================================
const HEROES_DEF = [
  {
    id: 'leo',
    icon: '🎖️',
    name: '鋼鐵指揮官',
    cost: 0,
    color: '#00f2fe',
    capeColor: '#0984e3',
    ultName: '🛰️ 軌道衛星轟炸',
    getPassiveDesc: (lv) => `被動：全軍基礎傷害 +${15 + (lv - 1) * 4}%`,
    getUltDesc: (lv) => `大招：軌道雷射清場，Boss 削血 ${Math.min(60, 32 + (lv - 1) * 4)}%`
  },
  {
    id: 'elsa',
    icon: '❄️',
    name: '寒冰女武神',
    cost: 250,
    color: '#48dbfb',
    capeColor: '#00a8ff',
    ultName: '❄️ 絕對零度暴風雪',
    getPassiveDesc: (lv) => `被動：開局 +${6 + (lv - 1) * 2} 援軍並配備冷凍槍`,
    getUltDesc: (lv) => `大招：全場冰凍 ${(4.5 + (lv - 1) * 0.4).toFixed(1)} 秒並造成重度冰傷`
  },
  {
    id: 'kane',
    icon: '⚡',
    name: '雷霆機甲師',
    cost: 400,
    color: '#feca57',
    capeColor: '#e1b12c',
    ultName: '⚡ 過載電漿風暴',
    getPassiveDesc: (lv) => `被動：開局自帶無人機且射速提升 (Lv.${lv})`,
    getUltDesc: (lv) => `大招：${(5.0 + (lv - 1) * 0.5).toFixed(1)} 秒極速電漿彈幕 & +${4 + (lv - 1)} 機甲兵`
  },
  {
    id: 'serena',
    icon: '🛡️',
    name: '聖光守護者',
    cost: 550,
    color: '#2ed573',
    capeColor: '#218c74',
    ultName: '🛡️ 聖光無敵聖盾',
    getPassiveDesc: (lv) => `被動：每 8 秒自動治療小隊 +${2 + (lv - 1)} 名兵力`,
    getUltDesc: (lv) => `大招：立即回血 +${12 + (lv - 1) * 3} 兵並開啟 ${(4.5 + (lv - 1) * 0.4).toFixed(1)} 秒無敵護盾`
  }
];

function getSelectedHero() {
  return HEROES_DEF.find(h => h.id === saveData.selectedHero) || HEROES_DEF[0];
}

function getHeroLevel(heroId = saveData.selectedHero) {
  if (!saveData.heroLevels) saveData.heroLevels = { leo: 1, elsa: 1, kane: 1, serena: 1 };
  return saveData.heroLevels[heroId] || 1;
}

function getHeroUpgradeCost(heroId = saveData.selectedHero) {
  const lv = getHeroLevel(heroId);
  return Math.floor(90 * Math.pow(1.48, lv - 1));
}

function initHeroShopCardUI() {
  if (document.getElementById('hero-upgrade-box')) return;

  const box = document.createElement('div');
  box.id = 'hero-upgrade-box';
  box.style.cssText = `
    width: 100%; max-width: 340px; margin: 6px 0 8px;
    background: linear-gradient(135deg, rgba(0, 210, 255, 0.14), rgba(165, 94, 234, 0.14));
    border: 1.5px solid #00f2fe; border-radius: 12px; padding: 10px 12px;
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    box-sizing: border-box;
  `;

  box.innerHTML = `
    <div style="text-align: left; flex: 1;">
      <div id="shop-hero-title" style="font-size: 14px; font-weight: 900; color: #ffffff;">
        🎖️ 鋼鐵指揮官 Lv.1
      </div>
      <div id="shop-hero-passive" style="font-size: 11px; color: #00f2fe; margin-top: 2px;">
        被動：全軍基礎傷害 +15%
      </div>
      <div id="shop-hero-ult" style="font-size: 11px; color: #feca57; margin-top: 1px;">
        大招：軌道雷射清場，Boss 削血 32%
      </div>
    </div>
    <button id="btn-upgrade-hero" style="
      padding: 9px 12px; border-radius: 9px; border: none;
      background: linear-gradient(135deg, #feca57, #ff9f43);
      color: #1e272e; font-size: 12px; font-weight: 900;
      cursor: pointer; white-space: nowrap; box-shadow: 0 3px 10px rgba(254, 202, 87, 0.35);
    ">
      強化大招<br>💰 <span id="cost-hero">90</span>
    </button>
  `;

  const anchor = document.getElementById('mode-selector-box') || document.getElementById('minigame-launcher-box') || startBtn;
  anchor.parentNode.insertBefore(box, anchor);

  document.getElementById('btn-upgrade-hero').addEventListener('click', () => {
    SoundFX.init();
    const heroId = saveData.selectedHero;
    const cost = getHeroUpgradeCost(heroId);
    if (saveData.coins >= cost) {
      saveData.coins -= cost;
      saveData.heroLevels[heroId] = getHeroLevel(heroId) + 1;
      writeSave();
      refreshUI();
      SoundFX.playGate(true);
    } else {
      SoundFX.playGate(false);
    }
  });
}

function updateHeroShopCardUI() {
  const hero = getSelectedHero();
  const lv = getHeroLevel(hero.id);
  const cost = getHeroUpgradeCost(hero.id);

  const titleEl = document.getElementById('shop-hero-title');
  const passiveEl = document.getElementById('shop-hero-passive');
  const ultEl = document.getElementById('shop-hero-ult');
  const costEl = document.getElementById('cost-hero');
  const btnEl = document.getElementById('btn-upgrade-hero');
  const boxEl = document.getElementById('hero-upgrade-box');

  if (!titleEl || !btnEl) return;

  titleEl.textContent = `${hero.icon} ${hero.name} Lv.${lv}`;
  passiveEl.textContent = hero.getPassiveDesc(lv);
  ultEl.textContent = hero.getUltDesc(lv);
  costEl.textContent = cost;
  if (boxEl) boxEl.style.borderColor = hero.color;

  const canAfford = saveData.coins >= cost;
  btnEl.style.opacity = canAfford ? '1' : '0.45';
  btnEl.style.cursor = canAfford ? 'pointer' : 'not-allowed';
}

function initBattleUltimateUI() {
  if (document.getElementById('ult-hud-bar')) return;

  const bar = document.createElement('div');
  bar.id = 'ult-hud-bar';
  bar.style.cssText = `
    position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%);
    width: 248px; display: none; z-index: 30;
  `;

  bar.innerHTML = `
    <button id="ult-cast-btn" style="
      width: 100%; padding: 10px 14px; border-radius: 24px;
      border: 2px solid #57606f; background: rgba(16, 22, 34, 0.92);
      color: #a4b0be; font-size: 13px; font-weight: 900;
      cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 15px rgba(0,0,0,0.6);
    ">
      ⚡ 充能中 0%
    </button>
  `;

  shopOverlay.parentNode.appendChild(bar);
  document.getElementById('ult-cast-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    triggerHeroUltimate();
  });
}

function updateUltimateHUD() {
  const bar = document.getElementById('ult-hud-bar');
  const btn = document.getElementById('ult-cast-btn');
  if (!bar || !btn) return;

  if (!state.running) {
    bar.style.display = 'none';
    return;
  }

  bar.style.display = 'block';
  const hero = getSelectedHero();
  const lv = getHeroLevel(hero.id);
  const pct = Math.min(100, Math.floor(state.ultCharge));

  if (state.ultShieldTimer > 0) {
    btn.textContent = `🛡️ 無敵聖盾守護中 (${(state.ultShieldTimer / 60).toFixed(1)}s)`;
    btn.style.borderColor = '#fffa65';
    btn.style.background = 'linear-gradient(135deg, #2ed573, #feca57)';
    btn.style.color = '#101622';
    btn.style.boxShadow = '0 0 20px rgba(46, 213, 115, 0.9)';
  } else if (state.ultOverdriveTimer > 0) {
    btn.textContent = `🔥 Lv.${lv} 過載狂暴 (${(state.ultOverdriveTimer / 60).toFixed(1)}s)`;
    btn.style.borderColor = '#fffa65';
    btn.style.background = 'linear-gradient(135deg, #ff9f43, #ee5253)';
    btn.style.color = '#ffffff';
    btn.style.boxShadow = '0 0 18px rgba(254, 202, 87, 0.85)';
  } else if (pct >= 100) {
    btn.textContent = `${hero.ultName} Lv.${lv} [施放]`;
    btn.style.borderColor = hero.color;
    btn.style.background = `linear-gradient(135deg, ${hero.color}, #0072ff)`;
    btn.style.color = '#101622';
    btn.style.boxShadow = `0 0 18px ${hero.color}`;
  } else {
    btn.textContent = `${hero.icon} Lv.${lv} 技能充能 ${pct}%`;
    btn.style.borderColor = '#485460';
    btn.style.background = 'rgba(16, 22, 34, 0.88)';
    btn.style.color = '#a4b0be';
    btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
  }
}

function triggerHeroUltimate() {
  if (!state.running || state.ultCharge < 100) return;

  state.ultCharge = 0;
  const hero = getSelectedHero();
  const lv = getHeroLevel(hero.id);
  SoundFX.playExplosion(true);
  triggerShake(14, 22);
  enemyBullets = [];

  if (hero.id === 'leo') {
    state.ultVisualTimer = 45;
    state.ultVisualType = 'orbital';
    const bossPct = Math.min(0.60, 0.32 + (lv - 1) * 0.04);
    const minFlat = 120 + (lv - 1) * 45;
    addFloatingText(canvas.width / 2, canvas.height * 0.45, `🛰️ Lv.${lv} 軌道衛星毀滅光束！`, '#00f2fe');
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      createParticles(e.x, e.y, '#00f2fe', 16);
      if (e.isBoss) {
        const dmg = Math.max(minFlat, Math.floor(e.maxHp * bossPct));
        e.hp -= dmg;
        addFloatingText(e.x, e.y, `-${dmg}`, '#00f2fe');
      } else {
        e.hp = 0;
      }
    }
  } else if (hero.id === 'elsa') {
    state.ultVisualTimer = 50;
    state.ultVisualType = 'blizzard';
    const freezeFrames = 270 + (lv - 1) * 24;
    const bossPct = Math.min(0.45, 0.18 + (lv - 1) * 0.03);
    const spellDmg = Math.max(25, Math.round((35 + (lv - 1) * 14) * getDamageMultiplier()));
    addFloatingText(canvas.width / 2, canvas.height * 0.45, `❄️ Lv.${lv} 絕對零度暴風雪！`, '#48dbfb');
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.freezeTimer = freezeFrames;
      createParticles(e.x, e.y, '#48dbfb', 14);
      if (e.isBoss) {
        const dmg = Math.max(80 + (lv - 1) * 30, Math.floor(e.maxHp * bossPct));
        e.hp -= dmg;
        addFloatingText(e.x, e.y, `-${dmg} 冰封`, '#48dbfb');
      } else {
        e.hp -= spellDmg;
      }
    }
  } else if (hero.id === 'kane') {
    state.ultVisualTimer = 40;
    state.ultVisualType = 'overdrive';
    const durationFrames = 300 + (lv - 1) * 30;
    const spawnTroops = 4 + (lv - 1);
    state.ultOverdriveTimer = durationFrames;
    state.weapon = 'plasma';
    state.weaponTimer = Math.max(state.weaponTimer, durationFrames);
    squad.count += spawnTroops;
    addFloatingText(canvas.width / 2, canvas.height * 0.45, `⚡ Lv.${lv} 電漿風暴 & +${spawnTroops} 機甲兵！`, '#feca57');
    createParticles(squad.x, squad.y, '#feca57', 28);
  } else if (hero.id === 'serena') {
    state.ultVisualTimer = 45;
    state.ultVisualType = 'sanctuary';
    const shieldFrames = 270 + (lv - 1) * 24;
    const healAmount = 12 + (lv - 1) * 3;
    state.ultShieldTimer = shieldFrames;
    squad.count += healAmount;
    SoundFX.playGate(true);
    addFloatingText(canvas.width / 2, canvas.height * 0.45, `🛡️ Lv.${lv} 聖光治療 +${healAmount} & 無敵聖盾！`, '#2ed573');
    createParticles(squad.x, squad.y, '#2ed573', 30);
    createParticles(squad.x, squad.y, '#fffa65', 20);
  }

  updateUltimateHUD();
}

// ==========================================
// 成就、獎勵與戰區排名系統設定
// ==========================================
const ACHIEVEMENTS_DEF = [
  { id: 'kill_50', icon: '🧟', name: '喪屍清道夫', desc: '累計消滅 50 隻喪屍', reward: 60, check: s => s.totalKills >= 50 },
  { id: 'kill_300', icon: '💀', name: '鋼鐵絞肉機', desc: '累計消滅 300 隻喪屍', reward: 180, check: s => s.totalKills >= 300 },
  { id: 'squad_80', icon: '👥', name: '百人軍團長', desc: '單局最高兵力達到 80 人', reward: 120, check: s => s.maxSquadEver >= 80 },
  { id: 'squad_200', icon: '👑', name: '無敵人海戰術', desc: '單局最高兵力達到 200 人', reward: 300, check: s => s.maxSquadEver >= 200 },
  { id: 'boss_1', icon: '🦖', name: '泰坦獵殺者', desc: '成功擊敗首隻關底泰坦 Boss', reward: 150, check: s => s.bossKills >= 1 },
  { id: 'stage_5', icon: '🚩', name: '防線突破者', desc: '主線進度推進至第 5 關', reward: 250, check: s => s.stage >= 5 },
  { id: 'wave_6', icon: '♾️', name: '無盡生存者', desc: '無盡模式撐過第 6 波', reward: 220, check: s => (s.bestWave || 1) >= 6 },
  { id: 'range_150', icon: '🎯', name: '神射手認證', desc: '靶場訓練單局達到 150 分', reward: 150, check: s => (s.bestRangeScore || 0) >= 150 }
];

const RANKS_DEF = [
  { lv: 1, title: '列兵 Private', reqCp: 0, bonus: 0 },
  { lv: 2, title: '士官 Sergeant', reqCp: 500, bonus: 100 },
  { lv: 3, title: '少尉 Lieutenant', reqCp: 1500, bonus: 200 },
  { lv: 4, title: '上校 Colonel', reqCp: 3500, bonus: 350 },
  { lv: 5, title: '五星元帥 Marshal', reqCp: 7000, bonus: 600 }
];

const RIVAL_COMMANDERS = [
  { name: 'Valkyrie_TW', cp: 8450, stage: 12, wave: 18 },
  { name: 'IronWolf_09', cp: 6120, stage: 9, wave: 14 },
  { name: 'GhostSniper', cp: 4380, stage: 7, wave: 11 },
  { name: 'NeonBlade', cp: 2750, stage: 5, wave: 8 },
  { name: 'TacticalCat', cp: 1420, stage: 3, wave: 5 },
  { name: 'Rookie_Alpha', cp: 620, stage: 2, wave: 3 }
];

function calcPlayerCP() {
  const heroLvSum = Object.values(saveData.heroLevels || { leo: 1 }).reduce((a, b) => a + b, 0);
  return (
    (saveData.stage - 1) * 350 +
    ((saveData.bestWave || 1) - 1) * 220 +
    (saveData.totalKills || 0) * 3 +
    (saveData.maxSquadEver || 15) * 4 +
    (saveData.bossKills || 0) * 250 +
    ((saveData.unlockedHeroes?.length || 1) - 1) * 300 +
    Math.max(0, heroLvSum - 4) * 120
  );
}

function getCurrentRank(cp) {
  let current = RANKS_DEF[0];
  for (const r of RANKS_DEF) {
    if (cp >= r.reqCp) current = r;
  }
  return current;
}

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function hasUnclaimedHubItems() {
  const canDaily = saveData.lastDailyDate !== getTodayStr();
  const hasAch = ACHIEVEMENTS_DEF.some(a => a.check(saveData) && !saveData.claimedAch.includes(a.id));
  const cp = calcPlayerCP();
  const hasRank = RANKS_DEF.some(r => r.lv > 1 && cp >= r.reqCp && !saveData.claimedRanks.includes(r.lv));
  return canDaily || hasAch || hasRank;
}

function openHonorHub(defaultTab = 'achievements') {
  SoundFX.init();
  SoundFX.playBarrelHit(12);

  let hub = document.getElementById('honor-hub-modal');
  if (!hub) {
    hub = document.createElement('div');
    hub.id = 'honor-hub-modal';
    hub.style.cssText = `
      position: absolute; inset: 0; background: rgba(10, 14, 22, 0.97);
      display: flex; flex-direction: column; padding: 18px 16px;
      z-index: 55; color: #ffffff;
    `;
    shopOverlay.parentNode.appendChild(hub);
  }
  hub.style.display = 'flex';
  renderHonorHub(defaultTab);
}

function renderHonorHub(activeTab) {
  const hub = document.getElementById('honor-hub-modal');
  if (!hub) return;

  const cp = calcPlayerCP();
  const rank = getCurrentRank(cp);
  const canDaily = saveData.lastDailyDate !== getTodayStr();
  const unclaimedAchCount = ACHIEVEMENTS_DEF.filter(a => a.check(saveData) && !saveData.claimedAch.includes(a.id)).length;
  const unclaimedRankCount = RANKS_DEF.filter(r => r.lv > 1 && cp >= r.reqCp && !saveData.claimedRanks.includes(r.lv)).length;

  let contentHtml = '';

  if (activeTab === 'achievements') {
    contentHtml = ACHIEVEMENTS_DEF.map(a => {
      const unlocked = a.check(saveData);
      const claimed = saveData.claimedAch.includes(a.id);
      let btnHtml = `<span style="font-size:11px; color:#7f8fa6;">未達成</span>`;
      if (claimed) {
        btnHtml = `<span style="font-size:11px; color:#2ed573; font-weight:bold;">✔ 已領取</span>`;
      } else if (unlocked) {
        btnHtml = `<button data-claim-ach="${a.id}" style="padding:6px 10px; border-radius:6px; border:none; background:#feca57; color:#1e272e; font-weight:900; font-size:12px; cursor:pointer;">領取 +${a.reward}💰</button>`;
      }

      return `
        <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.05); border:1px solid ${unlocked && !claimed ? '#feca57' : 'rgba(255,255,255,0.1)'}; border-radius:10px; padding:10px; margin-bottom:8px;">
          <div style="display:flex; align-items:center; gap:10px; text-align:left;">
            <div style="font-size:24px;">${a.icon}</div>
            <div>
              <div style="font-size:13px; font-weight:bold; color:${unlocked ? '#ffffff' : '#a4b0be'};">${a.name}</div>
              <div style="font-size:11px; color:#7f8fa6;">${a.desc}</div>
            </div>
          </div>
          <div>${btnHtml}</div>
        </div>
      `;
    }).join('');
  } else if (activeTab === 'rewards') {
    const rankCards = RANKS_DEF.map(r => {
      const reached = cp >= r.reqCp;
      const claimed = saveData.claimedRanks.includes(r.lv);
      let actionHtml = `<span style="font-size:11px; color:#7f8fa6;">需 ${r.reqCp} CP</span>`;
      if (r.lv === 1) {
        actionHtml = `<span style="font-size:11px; color:#00f2fe;">初始軍階</span>`;
      } else if (claimed) {
        actionHtml = `<span style="font-size:11px; color:#2ed573; font-weight:bold;">✔ 已領賞金</span>`;
      } else if (reached) {
        actionHtml = `<button data-claim-rank="${r.lv}" style="padding:6px 10px; border-radius:6px; border:none; background:#00f2fe; color:#1e272e; font-weight:900; font-size:12px; cursor:pointer;">晉升禮 +${r.bonus}💰</button>`;
      }

      return `
        <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.05); border:1px solid ${reached && !claimed && r.lv > 1 ? '#00f2fe' : 'rgba(255,255,255,0.1)'}; border-radius:10px; padding:10px; margin-bottom:8px;">
          <div style="text-align:left;">
            <div style="font-size:13px; font-weight:bold; color:${reached ? '#ffffff' : '#808e9b'};">🎖️ Lv.${r.lv} ${r.title}</div>
            <div style="font-size:11px; color:#7f8fa6;">戰力門檻：${r.reqCp} CP</div>
          </div>
          <div>${actionHtml}</div>
        </div>
      `;
    }).join('');

    contentHtml = `
      <div style="background:linear-gradient(135deg, rgba(46,213,115,0.2), rgba(0,168,255,0.15)); border:1.5px solid #2ed573; border-radius:12px; padding:12px; margin-bottom:12px; display:flex; align-items:center; justify-content:space-between;">
        <div style="text-align:left;">
          <div style="font-size:14px; font-weight:900; color:#2ed573;">📅 每日戰備補給包</div>
          <div style="font-size:11px; color:#d2dae2;">每天登入可免費領取軍團補給金</div>
        </div>
        <button id="claim-daily-btn" ${canDaily ? '' : 'disabled'} style="padding:8px 12px; border-radius:8px; border:none; background:${canDaily ? '#2ed573' : '#2f3542'}; color:${canDaily ? '#1e272e' : '#7f8fa6'}; font-weight:900; font-size:12px; cursor:${canDaily ? 'pointer' : 'default'};">
          ${canDaily ? '領取 +120💰' : '今日已領'}
        </button>
      </div>
      <div style="font-size:12px; color:#a4b0be; text-align:left; margin-bottom:8px; font-weight:bold;">
        當前軍階：<span style="color:#00f2fe;">${rank.title}</span>（綜合戰力 ${cp} CP）
      </div>
      ${rankCards}
    `;
  } else if (activeTab === 'ranking') {
    const allPlayers = [
      ...RIVAL_COMMANDERS.map(r => ({ ...r, isMe: false })),
      { name: '你 (指揮官)', cp: cp, stage: saveData.stage, wave: saveData.bestWave || 1, isMe: true }
    ].sort((a, b) => b.cp - a.cp);

    const myIdx = allPlayers.findIndex(p => p.isMe);
    const abovePlayer = myIdx > 0 ? allPlayers[myIdx - 1] : null;
    const tipText = abovePlayer
      ? `距離第 ${myIdx} 名「${abovePlayer.name}」還差 ${abovePlayer.cp - cp} CP！`
      : '👑 恭喜！你已登頂戰區第一名傳奇指揮官！';

    const rowsHtml = allPlayers.map((p, idx) => {
      const medal = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `#${idx + 1}`));
      return `
        <div style="display:flex; align-items:center; justify-content:space-between; background:${p.isMe ? 'rgba(0, 242, 254, 0.18)' : 'rgba(255,255,255,0.04)'}; border:1.5px solid ${p.isMe ? '#00f2fe' : 'rgba(255,255,255,0.08)'}; border-radius:10px; padding:9px 12px; margin-bottom:7px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:15px; font-weight:900; width:28px; text-align:center; color:#feca57;">${medal}</span>
            <div style="text-align:left;">
              <div style="font-size:13px; font-weight:bold; color:${p.isMe ? '#00f2fe' : '#ffffff'};">${p.name}</div>
              <div style="font-size:10px; color:#a4b0be;">主線第 ${p.stage} 關 • 無盡 W${p.wave}</div>
            </div>
          </div>
          <div style="font-size:14px; font-weight:900; color:#feca57;">${p.cp} CP</div>
        </div>
      `;
    }).join('');

    contentHtml = `
      <div style="background:rgba(254,202,87,0.12); border:1px solid rgba(254,202,87,0.4); border-radius:8px; padding:8px; font-size:12px; color:#feca57; margin-bottom:10px;">
        ${tipText}
      </div>
      ${rowsHtml}
    `;
  }

  hub.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
      <div style="font-size:17px; font-weight:900; color:#00f2fe;">🏛️ 戰區榮譽與補給中心</div>
      <div style="font-size:13px; font-weight:bold; color:#feca57;">💰 ${saveData.coins}</div>
    </div>

    <div style="display:flex; gap:6px; margin-bottom:12px;">
      <button id="tab-achievements" style="flex:1; padding:8px 4px; border-radius:8px; border:1.5px solid ${activeTab === 'achievements' ? '#feca57' : '#3d3d3d'}; background:${activeTab === 'achievements' ? 'rgba(254,202,87,0.2)' : '#1e272e'}; color:#fff; font-size:12px; font-weight:bold; cursor:pointer;">
        🏅 成就 ${unclaimedAchCount > 0 ? `(${unclaimedAchCount})` : ''}
      </button>
      <button id="tab-rewards" style="flex:1; padding:8px 4px; border-radius:8px; border:1.5px solid ${activeTab === 'rewards' ? '#2ed573' : '#3d3d3d'}; background:${activeTab === 'rewards' ? 'rgba(46,213,115,0.2)' : '#1e272e'}; color:#fff; font-size:12px; font-weight:bold; cursor:pointer;">
        🎁 獎勵 ${(canDaily || unclaimedRankCount > 0) ? '(!)' : ''}
      </button>
      <button id="tab-ranking" style="flex:1; padding:8px 4px; border-radius:8px; border:1.5px solid ${activeTab === 'ranking' ? '#00f2fe' : '#3d3d3d'}; background:${activeTab === 'ranking' ? 'rgba(0,242,254,0.2)' : '#1e272e'}; color:#fff; font-size:12px; font-weight:bold; cursor:pointer;">
        🏆 排名
      </button>
    </div>

    <div style="flex:1; overflow-y:auto; padding-right:2px; margin-bottom:12px;">
      ${contentHtml}
    </div>

    <button id="hub-close-btn" style="width:100%; padding:10px; border-radius:10px; border:1px solid #57606f; background:#2f3542; color:#fff; font-size:14px; font-weight:bold; cursor:pointer;">
      返回
    </button>
  `;

  document.getElementById('tab-achievements').addEventListener('click', () => renderHonorHub('achievements'));
  document.getElementById('tab-rewards').addEventListener('click', () => renderHonorHub('rewards'));
  document.getElementById('tab-ranking').addEventListener('click', () => renderHonorHub('ranking'));
  document.getElementById('hub-close-btn').addEventListener('click', () => {
    hub.style.display = 'none';
    refreshUI();
  });

  hub.querySelectorAll('[data-claim-ach]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-claim-ach');
      const ach = ACHIEVEMENTS_DEF.find(x => x.id === id);
      if (ach && !saveData.claimedAch.includes(id)) {
        saveData.claimedAch.push(id);
        saveData.coins += ach.reward;
        writeSave();
        SoundFX.playGate(true);
        renderHonorHub('achievements');
        refreshUI();
      }
    });
  });

  hub.querySelectorAll('[data-claim-rank]').forEach(btn => {
    btn.addEventListener('click', () => {
      const lv = Number(btn.getAttribute('data-claim-rank'));
      const rk = RANKS_DEF.find(x => x.lv === lv);
      if (rk && !saveData.claimedRanks.includes(lv)) {
        saveData.claimedRanks.push(lv);
        saveData.coins += rk.bonus;
        writeSave();
        SoundFX.playGate(true);
        renderHonorHub('rewards');
        refreshUI();
      }
    });
  });

  const dailyBtn = document.getElementById('claim-daily-btn');
  if (dailyBtn && canDaily) {
    dailyBtn.addEventListener('click', () => {
      saveData.lastDailyDate = getTodayStr();
      saveData.coins += 120;
      writeSave();
      SoundFX.playGate(true);
      renderHonorHub('rewards');
      refreshUI();
    });
  }
}

// ==========================================
// 遊戲首頁 (Title Screen) 系統
// ==========================================
function initHomeScreenUI() {
  if (document.getElementById('home-overlay')) return;

  shopOverlay.classList.add('hidden');

  const home = document.createElement('div');
  home.id = 'home-overlay';
  home.style.cssText = `
    position: absolute; inset: 0;
    background: radial-gradient(circle at 50% 22%, rgba(0, 168, 255, 0.22), rgba(10, 14, 22, 0.95) 75%);
    display: flex; flex-direction: column; align-items: center; justify-content: space-between;
    padding: 16px 16px 16px; z-index: 40; color: #ffffff; text-align: center;
    backdrop-filter: blur(4px);
  `;

  home.innerHTML = `
    <div style="width: 100%;">
      <div id="home-rank-badge" style="display:inline-block; padding:3px 10px; border-radius:20px; background:rgba(0, 242, 254, 0.14); border:1px solid rgba(0, 242, 254, 0.45); color:#00f2fe; font-size:11px; font-weight:bold; letter-spacing:1px; margin-bottom:3px;">
        🎖️ 列兵 Private • 0 CP
      </div>
      <h1 style="margin:0; font-size:30px; font-weight:900; letter-spacing:2px; background:linear-gradient(180deg, #ffffff 20%, #00f2fe 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">
        LAST WAR
      </h1>
    </div>

    <!-- 指揮官戰績總覽卡片 -->
    <div style="width:100%; max-width:348px; background:rgba(16, 22, 34, 0.85); border:1.5px solid rgba(0, 242, 254, 0.28); border-radius:12px; padding:7px;">
      <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px;">
        <div style="background:rgba(255,255,255,0.04); padding:5px 4px; border-radius:8px;">
          <div style="font-size:10px; color:#a4b0be;">主線進度</div>
          <div id="home-stat-stage" style="font-size:14px; font-weight:900; color:#00f2fe;">第 1 關</div>
        </div>
        <div style="background:rgba(255,255,255,0.04); padding:5px 4px; border-radius:8px;">
          <div style="font-size:10px; color:#a4b0be;">無盡紀錄</div>
          <div id="home-stat-wave" style="font-size:14px; font-weight:900; color:#a55eea;">WAVE 1</div>
        </div>
        <div style="background:rgba(255,255,255,0.04); padding:5px 4px; border-radius:8px;">
          <div style="font-size:10px; color:#a4b0be;">軍團金幣</div>
          <div id="home-stat-coins" style="font-size:14px; font-weight:900; color:#feca57;">0</div>
        </div>
      </div>
    </div>

    <!-- 4 位出戰英雄選擇器（2x2 網格） -->
    <div style="width:100%; max-width:348px; background:rgba(16, 22, 34, 0.88); border:1.5px solid rgba(255, 255, 255, 0.14); border-radius:12px; padding:8px;">
      <div style="font-size:11px; color:#d2dae2; font-weight:bold; margin-bottom:5px; text-align:left;">
        🦸‍♂️ 選擇領軍英雄（共 4 位 • 可至基地強化大招）
      </div>
      <div id="home-hero-row" style="display:grid; grid-template-columns:repeat(2, 1fr); gap:5px; margin-bottom:6px;"></div>
      <div id="home-hero-passive" style="font-size:11px; color:#00f2fe; text-align:left;"></div>
      <div id="home-hero-ult" style="font-size:11px; color:#feca57; text-align:left; margin-top:2px;"></div>
    </div>

    <!-- 成就 / 獎勵 / 排名 快捷列 -->
    <div style="width:100%; max-width:348px; display:flex; gap:6px;">
      <button id="home-btn-ach" style="flex:1; padding:7px 4px; border-radius:9px; border:1.5px solid #feca57; background:rgba(254,202,87,0.14); color:#fff; font-size:12px; font-weight:bold; cursor:pointer;">
        🏅 成就
      </button>
      <button id="home-btn-rew" style="flex:1; padding:7px 4px; border-radius:9px; border:1.5px solid #2ed573; background:rgba(46,213,115,0.14); color:#fff; font-size:12px; font-weight:bold; cursor:pointer;">
        🎁 獎勵
      </button>
      <button id="home-btn-rank" style="flex:1; padding:7px 4px; border-radius:9px; border:1.5px solid #a55eea; background:rgba(165,94,234,0.14); color:#fff; font-size:12px; font-weight:bold; cursor:pointer;">
        🏆 排名
      </button>
    </div>

    <!-- 首頁快速模式切換 -->
    <div style="width:100%; max-width:348px;">
      <div id="home-mode-row" style="display:flex; gap:6px; margin-bottom:3px;"></div>
      <div id="home-mode-desc" style="font-size:11px; color:#00f2fe; min-height:14px;"></div>
    </div>

    <!-- 主操作按鈕群 -->
    <div style="width:100%; max-width:348px; display:flex; flex-direction:column; gap:7px;">
      <button id="home-quick-start" style="
        width:100%; padding:11px; border-radius:12px; border:none;
        background:linear-gradient(135deg, #00d2ff 0%, #0072ff 100%);
        color:#ffffff; font-size:14px; font-weight:900; letter-spacing:1px;
        cursor:pointer; box-shadow:0 6px 20px rgba(0, 168, 255, 0.45);
      ">
        🚀 立即出擊
      </button>

      <div style="display:flex; gap:8px;">
        <button id="home-open-base" style="
          flex:1.2; padding:8px; border-radius:10px;
          border:1.5px solid #00f2fe; background:rgba(0, 242, 254, 0.12);
          color:#ffffff; font-size:12px; font-weight:bold; cursor:pointer;
        ">
          🛠️ 科技升級基地
        </button>
        <button id="home-open-minigame" style="
          flex:1; padding:8px; border-radius:10px;
          border:1.5px solid #2ed573; background:rgba(46, 213, 115, 0.12);
          color:#ffffff; font-size:12px; font-weight:bold; cursor:pointer;
        ">
          🎮 休閒訓練場
        </button>
      </div>
    </div>
  `;

  shopOverlay.parentNode.appendChild(home);

  const heroRow = document.getElementById('home-hero-row');
  HEROES_DEF.forEach(h => {
    const btn = document.createElement('button');
    btn.id = `hero-card-${h.id}`;
    btn.style.cssText = `
      padding: 6px 6px; border-radius: 8px; font-size: 11px; font-weight: bold;
      cursor: pointer; border: 1.5px solid #485460; background: rgba(20, 26, 38, 0.9);
      color: #d2dae2; transition: all 0.2s; text-align: left;
    `;
    btn.addEventListener('click', () => {
      SoundFX.init();
      const unlocked = saveData.unlockedHeroes.includes(h.id);
      if (unlocked) {
        saveData.selectedHero = h.id;
        writeSave();
        SoundFX.playBarrelHit(14);
        refreshUI();
      } else if (saveData.coins >= h.cost) {
        saveData.coins -= h.cost;
        saveData.unlockedHeroes.push(h.id);
        saveData.selectedHero = h.id;
        writeSave();
        SoundFX.playGate(true);
        refreshUI();
      } else {
        SoundFX.playGate(false);
      }
    });
    heroRow.appendChild(btn);
  });

  const modeRow = document.getElementById('home-mode-row');
  Object.values(MODES).forEach(m => {
    const btn = document.createElement('button');
    btn.id = `home-mode-btn-${m.id}`;
    btn.textContent = m.name;
    btn.style.cssText = `
      flex: 1; padding: 6px 4px; border-radius: 8px; font-size: 11px; font-weight: bold;
      cursor: pointer; border: 1.5px solid #485460; background: rgba(20, 26, 38, 0.9);
      color: #d2dae2; transition: all 0.2s;
    `;
    btn.addEventListener('click', () => {
      SoundFX.init();
      SoundFX.playBarrelHit(10);
      currentMode = m.id;
      updateModeSelectorUI();
    });
    modeRow.appendChild(btn);
  });

  document.getElementById('home-btn-ach').addEventListener('click', () => openHonorHub('achievements'));
  document.getElementById('home-btn-rew').addEventListener('click', () => openHonorHub('rewards'));
  document.getElementById('home-btn-rank').addEventListener('click', () => openHonorHub('ranking'));

  document.getElementById('home-quick-start').addEventListener('click', () => {
    SoundFX.init();
    home.style.display = 'none';
    startStage();
  });

  document.getElementById('home-open-base').addEventListener('click', () => {
    SoundFX.init();
    SoundFX.playBarrelHit(12);
    home.style.display = 'none';
    shopOverlay.classList.remove('hidden');
    refreshUI();
  });

  document.getElementById('home-open-minigame').addEventListener('click', () => {
    SoundFX.init();
    SoundFX.playBarrelHit(12);
    openShootingRange();
  });

  if (!document.getElementById('shop-back-home-btn')) {
    const backBtn = document.createElement('button');
    backBtn.id = 'shop-back-home-btn';
    backBtn.textContent = '🏠 首頁';
    backBtn.style.cssText = `
      position: absolute; top: 14px; left: 14px; padding: 6px 10px;
      border-radius: 8px; border: 1px solid rgba(255,255,255,0.25);
      background: rgba(20, 26, 38, 0.85); color: #d2dae2;
      font-size: 12px; font-weight: bold; cursor: pointer;
    `;
    backBtn.addEventListener('click', () => {
      SoundFX.init();
      SoundFX.playBarrelHit(8);
      shopOverlay.classList.add('hidden');
      showHomeScreen();
    });
    shopOverlay.appendChild(backBtn);

    const honorShopBtn = document.createElement('button');
    honorShopBtn.id = 'shop-honor-btn';
    honorShopBtn.textContent = '🏅 成就/排名';
    honorShopBtn.style.cssText = `
      position: absolute; top: 14px; right: 14px; padding: 6px 10px;
      border-radius: 8px; border: 1px solid #feca57;
      background: rgba(254, 202, 87, 0.16); color: #feca57;
      font-size: 12px; font-weight: bold; cursor: pointer;
    `;
    honorShopBtn.addEventListener('click', () => openHonorHub('achievements'));
    shopOverlay.appendChild(honorShopBtn);
  }

  refreshHomeStats();
}

function showHomeScreen() {
  const home = document.getElementById('home-overlay');
  if (home) {
    home.style.display = 'flex';
    refreshHomeStats();
    updateModeSelectorUI();
  }
}

function refreshHomeStats() {
  const stStage = document.getElementById('home-stat-stage');
  const stWave = document.getElementById('home-stat-wave');
  const stCoins = document.getElementById('home-stat-coins');
  const rankBadge = document.getElementById('home-rank-badge');

  const cp = calcPlayerCP();
  const rank = getCurrentRank(cp);

  if (stStage) stStage.textContent = `第 ${saveData.stage} 關`;
  if (stWave) stWave.textContent = `WAVE ${saveData.bestWave || 1}`;
  if (stCoins) stCoins.textContent = saveData.coins;
  if (rankBadge) rankBadge.textContent = `🎖️ ${rank.title} • ${cp} CP`;

  HEROES_DEF.forEach(h => {
    const card = document.getElementById(`hero-card-${h.id}`);
    if (!card) return;
    const unlocked = saveData.unlockedHeroes.includes(h.id);
    const selected = saveData.selectedHero === h.id;
    const lv = getHeroLevel(h.id);
    card.innerHTML = unlocked
      ? `<div style="display:flex; justify-content:space-between; align-items:center;">
           <span>${h.icon} ${h.name}</span>
           <span style="font-size:10px; color:${selected ? '#2ed573' : '#a4b0be'};">Lv.${lv} ${selected ? '✔' : ''}</span>
         </div>`
      : `<div style="display:flex; justify-content:space-between; align-items:center;">
           <span>${h.icon} ${h.name}</span>
           <span style="font-size:10px; color:#feca57;">🔒${h.cost}💰</span>
         </div>`;
    card.style.borderColor = selected ? h.color : (unlocked ? '#57606f' : '#3d3d3d');
    card.style.background = selected ? 'rgba(0, 210, 255, 0.18)' : 'rgba(20, 26, 38, 0.9)';
  });

  const activeHero = getSelectedHero();
  const activeLv = getHeroLevel(activeHero.id);
  const pEl = document.getElementById('home-hero-passive');
  const uEl = document.getElementById('home-hero-ult');
  if (pEl) pEl.textContent = activeHero.getPassiveDesc(activeLv);
  if (uEl) uEl.textContent = activeHero.getUltDesc(activeLv);

  const achBtn = document.getElementById('home-btn-ach');
  const rewBtn = document.getElementById('home-btn-rew');
  const unclaimedAch = ACHIEVEMENTS_DEF.some(a => a.check(saveData) && !saveData.claimedAch.includes(a.id));
  const unclaimedRew = saveData.lastDailyDate !== getTodayStr() || RANKS_DEF.some(r => r.lv > 1 && cp >= r.reqCp && !saveData.claimedRanks.includes(r.lv));

  if (achBtn) achBtn.textContent = unclaimedAch ? '🏅 成就 🔴' : '🏅 成就';
  if (rewBtn) rewBtn.textContent = unclaimedRew ? '🎁 獎勵 🔴' : '🎁 獎勵';
}

// ==========================================
// 基地額外小遊戲系統（靶場打靶 + 戰術掃雷）
// ==========================================
let miniGame = {
  active: null,
  rangeTime: 15,
  rangeScore: 0,
  rangeCombo: 0,
  rangeTimerId: null,
  rangeSlots: Array(9).fill(null),
  minesGrid: [],
  minesPot: 0,
  minesOver: false,
  minesSafeLeft: 0
};

function initMiniGamesUI() {
  if (document.getElementById('minigame-launcher-box')) return;

  const launcher = document.createElement('div');
  launcher.id = 'minigame-launcher-box';
  launcher.style.cssText = 'margin: 6px 0 10px; width: 100%; max-width: 340px; text-align: center;';

  const title = document.createElement('div');
  title.textContent = '🎮 基地休閒訓練場（賺金幣 & 援軍）';
  title.style.cssText = 'font-size: 11px; color: #7bed9f; margin-bottom: 5px; font-weight: bold;';

  const row = document.createElement('div');
  row.style.cssText = 'display: flex; gap: 8px;';

  const btnRange = document.createElement('button');
  btnRange.innerHTML = '🎯 靶場打靶';
  btnRange.style.cssText = `
    flex: 1; padding: 7px; border-radius: 8px; font-size: 12px; font-weight: bold;
    cursor: pointer; border: 1.5px solid #2ed573; background: rgba(46, 213, 115, 0.16);
    color: #ffffff;
  `;
  btnRange.addEventListener('click', openShootingRange);

  const btnMines = document.createElement('button');
  btnMines.innerHTML = '💣 戰術掃雷';
  btnMines.style.cssText = `
    flex: 1; padding: 7px; border-radius: 8px; font-size: 12px; font-weight: bold;
    cursor: pointer; border: 1.5px solid #ff9f43; background: rgba(255, 159, 67, 0.16);
    color: #ffffff;
  `;
  btnMines.addEventListener('click', openMinesweeper);

  row.appendChild(btnRange);
  row.appendChild(btnMines);
  launcher.appendChild(title);
  launcher.appendChild(row);
  startBtn.parentNode.insertBefore(launcher, startBtn);

  const modal = document.createElement('div');
  modal.id = 'minigame-modal';
  modal.style.cssText = `
    position: absolute; inset: 0; background: rgba(10, 14, 22, 0.96);
    display: none; flex-direction: column; align-items: center; justify-content: center;
    padding: 20px; z-index: 50; color: #fff; text-align: center;
  `;
  shopOverlay.parentNode.appendChild(modal);
}

function closeMiniGame() {
  if (miniGame.rangeTimerId) {
    clearInterval(miniGame.rangeTimerId);
    miniGame.rangeTimerId = null;
  }
  miniGame.active = null;
  const modal = document.getElementById('minigame-modal');
  if (modal) modal.style.display = 'none';
  refreshUI();
  refreshHomeStats();
}

function openShootingRange() {
  SoundFX.init();
  miniGame.active = 'range';
  miniGame.rangeTime = 15;
  miniGame.rangeScore = 0;
  miniGame.rangeCombo = 0;
  miniGame.rangeSlots = Array(9).fill(null);

  const modal = document.getElementById('minigame-modal');
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div style="display:flex; gap:8px; margin-bottom:12px;">
      <button id="switch-to-range" style="padding:5px 12px; border-radius:6px; border:1.5px solid #2ed573; background:rgba(46,213,115,0.25); color:#fff; font-size:12px; font-weight:bold; cursor:pointer;">🎯 靶場打靶</button>
      <button id="switch-to-mines" style="padding:5px 12px; border-radius:6px; border:1px solid #57606f; background:#1e272e; color:#a4b0be; font-size:12px; font-weight:bold; cursor:pointer;">💣 戰術掃雷</button>
    </div>
    <h2 style="color:#2ed573; margin:0 0 6px;">🎯 靶場極速反應</h2>
    <p style="font-size:12px; color:#a4b0be; margin:0 0 12px;">點擊 🧟 喪屍靶得分，切勿誤擊 🪖 友軍！達 150 分下局 +5 援軍</p>
    <div style="display:flex; gap:20px; font-size:15px; font-weight:bold; margin-bottom:14px;">
      <span>⏱️ 剩餘: <b id="mg-range-time" style="color:#feca57;">15</b>s</span>
      <span>🏆 分數: <b id="mg-range-score" style="color:#00f2fe;">0</b></span>
      <span>🔥 連擊: <b id="mg-range-combo" style="color:#ff6b81;">0</b></span>
    </div>
    <div id="mg-range-grid" style="display:grid; grid-template-columns:repeat(3, 86px); gap:10px; margin-bottom:18px;"></div>
    <button id="mg-close-btn" style="padding:8px 22px; border-radius:8px; border:1px solid #57606f; background:#2f3542; color:#fff; cursor:pointer;">結束並返回</button>
  `;

  document.getElementById('switch-to-mines').addEventListener('click', () => {
    if (miniGame.rangeTimerId) {
      clearInterval(miniGame.rangeTimerId);
      miniGame.rangeTimerId = null;
    }
    openMinesweeper();
  });
  document.getElementById('mg-close-btn').addEventListener('click', closeMiniGame);

  const gridEl = document.getElementById('mg-range-grid');
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('button');
    cell.id = `mg-slot-${i}`;
    cell.style.cssText = `
      width:86px; height:86px; border-radius:12px; border:2px solid #3d3d3d;
      background:#1e272e; font-size:34px; cursor:pointer; transition:transform 0.08s;
    `;
    cell.addEventListener('click', () => handleRangeHit(i));
    gridEl.appendChild(cell);
  }

  spawnRangeTargets();
  miniGame.rangeTimerId = setInterval(() => {
    miniGame.rangeTime--;
    const tEl = document.getElementById('mg-range-time');
    if (tEl) tEl.textContent = miniGame.rangeTime;

    if (miniGame.rangeTime <= 0) {
      clearInterval(miniGame.rangeTimerId);
      miniGame.rangeTimerId = null;
      finishShootingRange();
    } else {
      spawnRangeTargets();
    }
  }, 1000);
}

function spawnRangeTargets() {
  miniGame.rangeSlots = Array(9).fill(null);
  const count = 2 + Math.floor(Math.random() * 2);
  for (let k = 0; k < count; k++) {
    const idx = Math.floor(Math.random() * 9);
    miniGame.rangeSlots[idx] = Math.random() < 0.72 ? 'zombie' : 'civilian';
  }
  renderRangeGrid();
}

function renderRangeGrid() {
  for (let i = 0; i < 9; i++) {
    const cell = document.getElementById(`mg-slot-${i}`);
    if (!cell) continue;
    const type = miniGame.rangeSlots[i];
    if (type === 'zombie') {
      cell.textContent = '🧟';
      cell.style.background = 'rgba(46, 213, 115, 0.2)';
      cell.style.borderColor = '#2ed573';
    } else if (type === 'civilian') {
      cell.textContent = '🪖';
      cell.style.background = 'rgba(0, 168, 255, 0.2)';
      cell.style.borderColor = '#00a8ff';
    } else {
      cell.textContent = '';
      cell.style.background = '#1e272e';
      cell.style.borderColor = '#3d3d3d';
    }
  }
}

function handleRangeHit(idx) {
  if (miniGame.rangeTime <= 0) return;
  const type = miniGame.rangeSlots[idx];
  if (!type) return;

  if (type === 'zombie') {
    miniGame.rangeCombo++;
    const pts = 10 + Math.min(15, miniGame.rangeCombo * 2);
    miniGame.rangeScore += pts;
    SoundFX.playBarrelHit(miniGame.rangeCombo * 3);
  } else {
    miniGame.rangeCombo = 0;
    miniGame.rangeScore = Math.max(0, miniGame.rangeScore - 15);
    SoundFX.playGate(false);
  }

  miniGame.rangeSlots[idx] = null;
  renderRangeGrid();

  const sEl = document.getElementById('mg-range-score');
  const cEl = document.getElementById('mg-range-combo');
  if (sEl) sEl.textContent = miniGame.rangeScore;
  if (cEl) cEl.textContent = miniGame.rangeCombo;
}

function finishShootingRange() {
  const rewardCoins = Math.max(15, Math.floor(miniGame.rangeScore * 0.45));
  saveData.coins += rewardCoins;
  if (miniGame.rangeScore > (saveData.bestRangeScore || 0)) {
    saveData.bestRangeScore = miniGame.rangeScore;
  }
  let bonusMsg = '';
  if (miniGame.rangeScore >= 150) {
    bonusStartTroops = 5;
    bonusMsg = '<div style="color:#00f2fe; font-weight:bold; margin-top:6px;">🎖️ 達成神射手！下場戰鬥額外 +5 名援軍！</div>';
  }
  writeSave();
  refreshUI();
  refreshHomeStats();
  SoundFX.playGate(true);

  const modal = document.getElementById('minigame-modal');
  modal.innerHTML = `
    <h2 style="color:#feca57; margin:0 0 8px;">🎯 靶場訓練結算</h2>
    <p style="font-size:16px; margin:6px 0;">最終得分：<b style="color:#00f2fe;">${miniGame.rangeScore}</b></p>
    <p style="font-size:16px; margin:6px 0;">獲得賞金：<b style="color:#feca57;">+${rewardCoins} 💰</b></p>
    ${bonusMsg}
    <button id="mg-done-btn" style="margin-top:18px; padding:10px 26px; border-radius:8px; border:none; background:#2ed573; color:#1e272e; font-weight:bold; font-size:15px; cursor:pointer;">領取獎勵並返回</button>
  `;
  document.getElementById('mg-done-btn').addEventListener('click', closeMiniGame);
}

function openMinesweeper() {
  SoundFX.init();
  miniGame.active = 'mines';
  miniGame.minesPot = 15;
  miniGame.minesOver = false;
  miniGame.minesSafeLeft = 13;

  const cells = Array(16).fill(null).map((_, idx) => ({
    id: idx,
    isMine: false,
    revealed: false
  }));
  let placed = 0;
  while (placed < 3) {
    const r = Math.floor(Math.random() * 16);
    if (!cells[r].isMine) {
      cells[r].isMine = true;
      placed++;
    }
  }
  miniGame.minesGrid = cells;

  renderMinesweeper();
}

function renderMinesweeper() {
  const modal = document.getElementById('minigame-modal');
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div style="display:flex; gap:8px; margin-bottom:12px;">
      <button id="switch-to-range-2" style="padding:5px 12px; border-radius:6px; border:1px solid #57606f; background:#1e272e; color:#a4b0be; font-size:12px; font-weight:bold; cursor:pointer;">🎯 靶場打靶</button>
      <button id="switch-to-mines-2" style="padding:5px 12px; border-radius:6px; border:1.5px solid #ff9f43; background:rgba(255,159,67,0.25); color:#fff; font-size:12px; font-weight:bold; cursor:pointer;">💣 戰術掃雷</button>
    </div>
    <h2 style="color:#ff9f43; margin:0 0 6px;">💣 戰術雷區拆彈</h2>
    <p style="font-size:12px; color:#a4b0be; margin:0 0 10px;">雷區藏有 3 顆地雷，每翻開安全格獎金翻倍！隨時可見好就收</p>
    <div style="font-size:16px; font-weight:bold; margin-bottom:12px;">
      當前累積獎金：<span style="color:#feca57;">${miniGame.minesPot} 💰</span>
    </div>
    <div id="mg-mines-grid" style="display:grid; grid-template-columns:repeat(4, 64px); gap:8px; margin-bottom:16px;"></div>
    <div style="display:flex; gap:10px;">
      <button id="mg-cashout-btn" style="padding:9px 18px; border-radius:8px; border:none; background:#2ed573; color:#1e272e; font-weight:bold; cursor:pointer;">
        ${miniGame.minesOver ? '再玩一局' : `見好就收 (+${miniGame.minesPot} 💰)`}
      </button>
      <button id="mg-mines-close" style="padding:9px 16px; border-radius:8px; border:1px solid #57606f; background:#2f3542; color:#fff; cursor:pointer;">返回</button>
    </div>
  `;

  document.getElementById('switch-to-range-2').addEventListener('click', openShootingRange);

  const gridEl = document.getElementById('mg-mines-grid');
  miniGame.minesGrid.forEach((cell, idx) => {
    const btn = document.createElement('button');
    btn.style.cssText = `
      width:64px; height:64px; border-radius:10px; font-size:24px; font-weight:bold;
      cursor:pointer; border:2px solid #485460;
      background:${cell.revealed ? (cell.isMine ? '#ff4757' : '#218c74') : '#1e272e'};
      color:#fff;
    `;
    if (cell.revealed) {
      btn.textContent = cell.isMine ? '💥' : '💎';
    } else {
      btn.textContent = '?';
      btn.addEventListener('click', () => handleMineClick(idx));
    }
    gridEl.appendChild(btn);
  });

  document.getElementById('mg-cashout-btn').addEventListener('click', () => {
    if (miniGame.minesOver) {
      openMinesweeper();
    } else {
      saveData.coins += miniGame.minesPot;
      writeSave();
      SoundFX.playGate(true);
      closeMiniGame();
    }
  });
  document.getElementById('mg-mines-close').addEventListener('click', closeMiniGame);
}

function handleMineClick(idx) {
  if (miniGame.minesOver) return;
  const cell = miniGame.minesGrid[idx];
  if (cell.revealed) return;

  cell.revealed = true;
  if (cell.isMine) {
    miniGame.minesOver = true;
    miniGame.minesPot = 0;
    miniGame.minesGrid.forEach(c => { if (c.isMine) c.revealed = true; });
    SoundFX.playExplosion(true);
  } else {
    miniGame.minesSafeLeft--;
    miniGame.minesPot = Math.floor(miniGame.minesPot * 1.32) + 8;
    SoundFX.playBarrelHit(15);
    if (miniGame.minesSafeLeft <= 0) {
      miniGame.minesOver = true;
      saveData.coins += miniGame.minesPot;
      writeSave();
      SoundFX.playGate(true);
    }
  }
  renderMinesweeper();
}

function initModeSelectorUI() {
  if (document.getElementById('mode-selector-box')) return;
  const box = document.createElement('div');
  box.id = 'mode-selector-box';
  box.style.cssText = 'margin: 6px 0 6px; width: 100%; max-width: 340px; text-align: center;';

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display: flex; gap: 6px; justify-content: center; margin-bottom: 4px;';

  Object.values(MODES).forEach(m => {
    const btn = document.createElement('button');
    btn.id = `mode-btn-${m.id}`;
    btn.textContent = m.name;
    btn.style.cssText = `
      flex: 1; padding: 7px 4px; border-radius: 8px; font-size: 11px; font-weight: bold;
      cursor: pointer; border: 1.5px solid #485460; background: rgba(20, 26, 38, 0.9);
      color: #d2dae2; transition: all 0.2s;
    `;
    btn.addEventListener('click', () => {
      SoundFX.init();
      SoundFX.playBarrelHit(10);
      currentMode = m.id;
      updateModeSelectorUI();
    });
    btnRow.appendChild(btn);
  });

  const descEl = document.createElement('div');
  descEl.id = 'mode-desc-text';
  descEl.style.cssText = 'font-size: 11px; color: #00f2fe; min-height: 15px;';

  box.appendChild(btnRow);
  box.appendChild(descEl);
  startBtn.parentNode.insertBefore(box, startBtn);
  updateModeSelectorUI();
}

function updateModeSelectorUI() {
  Object.values(MODES).forEach(m => {
    [`mode-btn-${m.id}`, `home-mode-btn-${m.id}`].forEach(elId => {
      const btn = document.getElementById(elId);
      if (!btn) return;
      const active = currentMode === m.id;
      btn.style.borderColor = active ? m.color : '#485460';
      btn.style.background = active ? 'rgba(0, 210, 255, 0.18)' : 'rgba(20, 26, 38, 0.9)';
      btn.style.color = active ? '#ffffff' : '#808e9b';
      btn.style.boxShadow = active ? `0 0 10px ${m.color}55` : 'none';
    });
  });

  const descEl = document.getElementById('mode-desc-text');
  if (descEl) {
    descEl.textContent = MODES[currentMode].desc;
    descEl.style.color = MODES[currentMode].color;
  }
  const homeDescEl = document.getElementById('home-mode-desc');
  if (homeDescEl) {
    homeDescEl.textContent = MODES[currentMode].desc;
    homeDescEl.style.color = MODES[currentMode].color;
  }

  const hero = getSelectedHero();
  const lv = getHeroLevel(hero.id);
  const bonusTag = bonusStartTroops > 0 ? ` [+${bonusStartTroops}援軍]` : '';
  const modeShortName = MODES[currentMode].name.replace(/^[^\s]+\s/, '');
  startBtn.textContent = `開始戰鬥（${modeShortName}）${bonusTag}`;

  const homeStartBtn = document.getElementById('home-quick-start');
  if (homeStartBtn) {
    homeStartBtn.textContent = `🚀 Lv.${lv} ${hero.name}出擊 • ${modeShortName}${bonusTag}`;
  }
}

// ==========================================
// 遊戲節奏與難度總控中心
// ==========================================
const PACE = {
  speedScale: 0.68,
  spawnGapScale: 1.15,
  fireRateBase: 12
};

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    triggerHeroUltimate();
  } else if (e.key === '-' || e.key === '_') {
    PACE.speedScale = Math.max(0.3, +(PACE.speedScale - 0.1).toFixed(2));
    addFloatingText(squad.x, squad.y - 60, `節奏速度: ${PACE.speedScale}x`, '#00d2ff');
  } else if (e.key === '=' || e.key === '+') {
    PACE.speedScale = Math.min(1.5, +(PACE.speedScale + 0.1).toFixed(2));
    addFloatingText(squad.x, squad.y - 60, `節奏速度: ${PACE.speedScale}x`, '#00d2ff');
  }
});

// ==========================================
// 永久存檔系統 (localStorage)
// ==========================================
const SAVE_KEY = 'last_war_web_save_v1';
let saveData = {
  stage: 1,
  coins: 0,
  troopLv: 1,
  dmgLv: 1,
  bestWave: 1,
  totalKills: 0,
  bossKills: 0,
  maxSquadEver: 15,
  bestRangeScore: 0,
  claimedAch: [],
  claimedRanks: [1],
  lastDailyDate: '',
  selectedHero: 'leo',
  unlockedHeroes: ['leo'],
  heroLevels: { leo: 1, elsa: 1, kane: 1, serena: 1 }
};

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      saveData = { ...saveData, ...JSON.parse(raw) };
      if (!Array.isArray(saveData.claimedAch)) saveData.claimedAch = [];
      if (!Array.isArray(saveData.claimedRanks)) saveData.claimedRanks = [1];
      if (!Array.isArray(saveData.unlockedHeroes)) saveData.unlockedHeroes = ['leo'];
      if (!saveData.selectedHero) saveData.selectedHero = 'leo';
      saveData.heroLevels = { leo: 1, elsa: 1, kane: 1, serena: 1, ...(saveData.heroLevels || {}) };
    }
  } catch (e) {
    console.warn('讀取存檔失敗，使用預設進度');
  }
}

function writeSave() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
  } catch (e) {
    console.warn('寫入存檔失敗');
  }
}

function getInitialTroops() {
  return 14 + saveData.troopLv;
}

function getDamageMultiplier() {
  const leoLv = getHeroLevel('leo');
  const heroMult = saveData.selectedHero === 'leo'
    ? (1.15 + (leoLv - 1) * 0.04)
    : 1.0;
  return (1 + (saveData.dmgLv - 1) * 0.22) * heroMult;
}

function getTroopUpgradeCost() {
  return Math.floor(60 * Math.pow(1.42, saveData.troopLv - 1));
}

function getDmgUpgradeCost() {
  return Math.floor(75 * Math.pow(1.45, saveData.dmgLv - 1));
}

function refreshUI() {
  hudStageEl.textContent = currentMode === 'endless' ? `W${state.wave || 1}` : saveData.stage;
  hudCoinsEl.textContent = saveData.coins;

  document.getElementById('shop-stage').textContent = saveData.stage;
  document.getElementById('shop-coins').textContent = saveData.coins;

  document.getElementById('lv-troop').textContent = saveData.troopLv;
  document.getElementById('val-troop').textContent = getInitialTroops();
  const troopCost = getTroopUpgradeCost();
  document.getElementById('cost-troop').textContent = troopCost;

  document.getElementById('lv-dmg').textContent = saveData.dmgLv;
  document.getElementById('val-dmg').textContent = `+${(saveData.dmgLv - 1) * 22}%`;
  const dmgCost = getDmgUpgradeCost();
  document.getElementById('cost-dmg').textContent = dmgCost;

  const troopBtn = document.querySelector('#btn-upgrade-troop .buy-btn');
  const dmgBtn = document.querySelector('#btn-upgrade-dmg .buy-btn');
  troopBtn.classList.toggle('disabled', saveData.coins < troopCost);
  dmgBtn.classList.toggle('disabled', saveData.coins < dmgCost);

  const honorShopBtn = document.getElementById('shop-honor-btn');
  if (honorShopBtn) {
    honorShopBtn.textContent = hasUnclaimedHubItems() ? '🏅 成就/排名 🔴' : '🏅 成就/排名';
  }

  updateHeroShopCardUI();
  updateModeSelectorUI();
  refreshHomeStats();
}

// ==========================================
// Web Audio API 合成音效引擎
// ==========================================
const SoundFX = (() => {
  let audioCtx = null;
  let noiseBuffer = null;

  function init() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const bufferSize = audioCtx.sampleRate;
      noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playShoot(weapon) {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    if (weapon === 'laser') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1100, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.09);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } else if (weapon === 'plasma') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.11);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.11);
    } else if (weapon === 'freeze') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(650, now + 0.07);
      gain.gain.setValueAtTime(0.055, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    } else if (weapon === 'shotgun') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } else {
      osc.type = 'square';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.055);
      gain.gain.setValueAtTime(0.045, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.055);
    }
  }

  function playBarrelHit(val) {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    const baseFreq = Math.min(1200, Math.max(300, 520 + val * 14));
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.25, now + 0.045);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  function playGate(isGood) {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    if (isGood) {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.06);
      osc.frequency.setValueAtTime(783.99, now + 0.12);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.24);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(95, now + 0.22);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    }
  }

  function playExplosion(isBig = false) {
    if (!audioCtx || !noiseBuffer) return;
    const now = audioCtx.currentTime;
    const duration = isBig ? 0.65 : 0.16;

    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isBig ? 650 : 900, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + duration);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(isBig ? 0.28 : 0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    noise.start(now);
    noise.stop(now + duration);
  }

  return { init, playShoot, playBarrelHit, playGate, playExplosion };
})();

// ==========================================
// 遊戲狀態與系統變數
// ==========================================
let state = {
  running: false,
  mode: 'campaign',
  wave: 1,
  frame: 0,
  distance: 0,
  targetDistance: 3200,
  bossSpawned: false,
  roadOffset: 0,
  fireRate: PACE.fireRateBase,
  fireTimer: 0,
  gateTimer: 0,
  barrelTimer: 0,
  enemyTimer: 0,
  trapTimer: 0,
  eventTimer: 0,
  weather: 'clear',
  weatherTimer: 0,
  weapon: 'normal',
  weaponTimer: 0,
  weaponMaxTime: 780,
  muzzleFlashTimer: 0,
  shakeTime: 0,
  shakeIntensity: 0,
  runCoins: 0,
  ultCharge: 0,
  ultOverdriveTimer: 0,
  ultShieldTimer: 0,
  ultVisualTimer: 0,
  ultVisualType: '',
  passiveHealTimer: 0
};

let squad = {
  x: canvas.width / 2,
  y: canvas.height - 135,
  targetX: canvas.width / 2,
  count: 15,
  radius: 25,
  trapCooldown: 0,
  drones: 0,
  droneTimer: 0
};

let bullets = [];
let enemyBullets = [];
let gates = [];
let barrels = [];
let traps = [];
let enemies = [];
let particles = [];
let floatingTexts = [];

function triggerShake(intensity = 5, duration = 8) {
  state.shakeIntensity = Math.max(state.shakeIntensity, intensity);
  state.shakeTime = Math.max(state.shakeTime, duration);
}

function addCoins(amount) {
  const mult = state.mode === 'blitz' ? 1.2 : 1.0;
  const finalAmt = Math.ceil(amount * mult);
  state.runCoins += finalAmt;
  saveData.coins += finalAmt;
  hudCoinsEl.textContent = saveData.coins;
}

document.getElementById('btn-upgrade-troop').addEventListener('click', () => {
  SoundFX.init();
  const cost = getTroopUpgradeCost();
  if (saveData.coins >= cost) {
    saveData.coins -= cost;
    saveData.troopLv++;
    writeSave();
    refreshUI();
    SoundFX.playGate(true);
  } else {
    SoundFX.playGate(false);
  }
});

document.getElementById('btn-upgrade-dmg').addEventListener('click', () => {
  SoundFX.init();
  const cost = getDmgUpgradeCost();
  if (saveData.coins >= cost) {
    saveData.coins -= cost;
    saveData.dmgLv++;
    writeSave();
    refreshUI();
    SoundFX.playGate(true);
  } else {
    SoundFX.playGate(false);
  }
});

function startStage() {
  SoundFX.init();
  const stageScale = saveData.stage - 1;
  const isBlitz = currentMode === 'blitz';
  const hero = getSelectedHero();
  const lv = getHeroLevel(hero.id);

  const heroBonusTroops = hero.id === 'elsa' ? (6 + (lv - 1) * 2) : 0;
  const startTroopTotal = (isBlitz ? getInitialTroops() + 10 : getInitialTroops()) + bonusStartTroops + heroBonusTroops;
  bonusStartTroops = 0;

  let startFireRate = isBlitz ? 7 : PACE.fireRateBase;
  if (hero.id === 'kane') startFireRate = Math.max(4, startFireRate - 2 - Math.floor((lv - 1) / 3));

  state = {
    running: true,
    mode: currentMode,
    wave: 1,
    frame: 0,
    distance: 0,
    targetDistance: isBlitz ? 4200 + stageScale * 400 : 3200 + stageScale * 380,
    bossSpawned: false,
    roadOffset: 0,
    fireRate: startFireRate,
    fireTimer: 0,
    gateTimer: 60,
    barrelTimer: 10,
    enemyTimer: 65,
    trapTimer: 140,
    eventTimer: 750,
    weather: 'clear',
    weatherTimer: 0,
    weapon: isBlitz ? 'plasma' : (hero.id === 'elsa' ? 'freeze' : 'normal'),
    weaponTimer: isBlitz ? 600 : (hero.id === 'elsa' ? 720 + (lv - 1) * 60 : 0),
    weaponMaxTime: 780,
    muzzleFlashTimer: 0,
    shakeTime: 0,
    shakeIntensity: 0,
    runCoins: 0,
    ultCharge: 35,
    ultOverdriveTimer: 0,
    ultShieldTimer: 0,
    ultVisualTimer: 0,
    ultVisualType: '',
    passiveHealTimer: 0
  };

  squad = {
    x: canvas.width / 2,
    y: canvas.height - 135,
    targetX: canvas.width / 2,
    count: startTroopTotal,
    radius: 25,
    trapCooldown: 0,
    drones: Math.min(2, (isBlitz ? 1 : 0) + (hero.id === 'kane' ? 1 : 0)),
    droneTimer: 0
  };

  bullets = [];
  enemyBullets = [];
  gates = [];
  barrels = [];
  traps = [];
  enemies = [];
  particles = [];
  floatingTexts = [];

  const home = document.getElementById('home-overlay');
  if (home) home.style.display = 'none';
  shopOverlay.classList.add('hidden');
  overlay.classList.add('hidden');
  refreshUI();
  updateUltimateHUD();

  addFloatingText(canvas.width / 2, 185, `${hero.icon} Lv.${lv} ${hero.name} 領軍出擊！`, hero.color);
}

startBtn.addEventListener('click', startStage);

restartBtn.addEventListener('click', () => {
  SoundFX.init();
  overlay.classList.add('hidden');
  shopOverlay.classList.remove('hidden');
  refreshUI();
});

function updateTargetX(clientX) {
  if (!state.running) return;
  SoundFX.init();
  const rect = canvas.getBoundingClientRect();
  const relX = clientX - rect.left;
  squad.targetX = Math.max(48, Math.min(canvas.width - 48, relX));
}

canvas.addEventListener('mousemove', (e) => updateTargetX(e.clientX));
canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  updateTargetX(e.touches[0].clientX);
}, { passive: false });

function addFloatingText(x, y, text, color) {
  floatingTexts.push({ x, y, text, color, life: 38 });
}

function triggerWeatherEvent() {
  const events = [
    { id: 'fog', name: '⚠️ 濃霧夜戰來襲！', color: '#a55eea' },
    { id: 'wind_left', name: '🌪️ 強側風（向左吹襲）！', color: '#00d2ff' },
    { id: 'wind_right', name: '🌪️ 強側風（向右吹襲）！', color: '#00d2ff' }
  ];
  const chosen = events[Math.floor(Math.random() * events.length)];
  state.weather = chosen.id;
  state.weatherTimer = 360;
  addFloatingText(canvas.width / 2, 160, chosen.name, chosen.color);
  SoundFX.playGate(false);
}

function getEffectiveScale() {
  if (state.mode === 'endless') {
    return state.wave - 1;
  }
  return saveData.stage - 1;
}

function spawnGatePair() {
  const scale = getEffectiveScale();
  const stageBonus = Math.floor(scale * 3);
  const presets = state.mode === 'blitz'
    ? [
        { type: 'add', val: 12, shootable: true },
        { type: 'mul', val: 2, shootable: false },
        { type: 'mul', val: 2, shootable: false },
        { type: 'rate', val: 1, shootable: false }
      ]
    : [
        { type: 'add', val: -5 - stageBonus, shootable: true },
        { type: 'add', val: -9 - stageBonus, shootable: true },
        { type: 'add', val: 6, shootable: true },
        { type: 'add', val: 10, shootable: true },
        { type: 'mul', val: 2, shootable: false },
        { type: 'rate', val: 1, shootable: false }
      ];

  const leftP = presets[Math.floor(Math.random() * presets.length)];
  let rightP = presets[Math.floor(Math.random() * presets.length)];
  if (leftP.type === 'mul' && rightP.type === 'mul') {
    rightP = { type: 'add', val: 10, shootable: true };
  }

  const gateWidth = (canvas.width - 68) / 2;
  gates.push(
    { x: 34, y: -60, w: gateWidth, h: 52, ...leftP, triggered: false, hitScale: 1, maxGain: 18 },
    { x: 34 + gateWidth, y: -60, w: gateWidth, h: 52, ...rightP, triggered: false, hitScale: 1, maxGain: 18 }
  );
}

function spawnBarrels() {
  const scale = getEffectiveScale();
  const stageHardness = scale * 6;
  const roll = Math.random();
  const laneX = Math.random() < 0.5 ? 118 : canvas.width - 118;
  const moveVx = state.distance > 750 ? (Math.random() < 0.5 ? 1.15 : -1.15) : 0;

  const weaponChance = state.mode === 'blitz' ? 0.42 : 0.28;
  const supportChance = state.mode === 'blitz' ? 0.58 : 0.42;

  if (roll < weaponChance) {
    const weaponPool = [
      { id: 'shotgun', label: '散彈槍' },
      { id: 'laser', label: '雷射砲' },
      { id: 'plasma', label: '電漿砲' },
      { id: 'freeze', label: '冷凍槍' }
    ];
    const chosen = weaponPool[Math.floor(Math.random() * weaponPool.length)];
    barrels.push({
      x: laneX,
      y: -50,
      vx: moveVx,
      r: 30,
      kind: 'weapon',
      weapon: chosen.id,
      label: chosen.label,
      val: -28 - stageHardness - Math.floor(state.distance / 450) * 4,
      hitScale: 1
    });
  } else if (roll < supportChance) {
    const supportType = Math.random() < 0.55 ? 'drone' : 'airstrike';
    barrels.push({
      x: laneX,
      y: -50,
      vx: moveVx,
      r: 30,
      kind: 'support',
      supportType: supportType,
      label: supportType === 'drone' ? '僚機無人機' : '戰術空襲',
      val: -24 - stageHardness - Math.floor(state.distance / 500) * 4,
      hitScale: 1
    });
  } else {
    const initialVal = -5 - stageHardness - Math.floor(Math.random() * 5);
    barrels.push({
      x: laneX,
      y: -50,
      vx: moveVx,
      r: 28,
      kind: 'troop',
      val: initialVal,
      maxGain: 25,
      hitScale: 1
    });
  }
}

function spawnSpikeTrap() {
  const trapW = 105 + Math.random() * 25;
  const trapH = 52;
  const isLeft = Math.random() < 0.5;
  const trapX = isLeft ? 38 : canvas.width - 38 - trapW;

  traps.push({
    x: trapX,
    y: -70,
    w: trapW,
    h: trapH
  });
}

function spawnEnemyWave(forceCenter = false) {
  const scale = getEffectiveScale();
  const maxCount = state.mode === 'blitz' ? 22 : 15;
  const count = Math.min(maxCount, 6 + Math.floor(state.distance / 550) + scale);
  const baseHp = 3 + scale * 2 + Math.floor(state.distance / 650);
  const formation = forceCenter ? 'grid' : ['grid', 'wedge', 'wall', 'escort'][Math.floor(Math.random() * 4)];

  if (formation === 'escort') {
    const cx = 110 + Math.random() * (canvas.width - 220);
    [-28, 28].forEach(dx => {
      enemies.push({
        x: cx + dx, y: -40, hp: Math.floor(baseHp * 3.2), maxHp: Math.floor(baseHp * 3.2),
        r: 17, speed: 1.75, kind: 'elite', isBoss: false, damageToSquad: 2,
        freezeTimer: 0, phase: Math.random() * 6
      });
      enemies.push({
        x: cx + dx * 1.3, y: -85, hp: Math.floor(baseHp * 1.8), maxHp: Math.floor(baseHp * 1.8),
        r: 14, speed: 1.75, kind: 'spitter', isBoss: false, damageToSquad: 1,
        shootCooldown: 95, freezeTimer: 0, phase: Math.random() * 6
      });
    });
    return;
  }

  const startX = forceCenter ? 110 : (60 + Math.random() * (canvas.width - 180));

  for (let i = 0; i < count; i++) {
    const roll = Math.random();
    let kind = 'normal';
    let hp = baseHp;
    let r = 13;
    let speed = 2.15 + Math.min(0.6, scale * 0.06);
    let dmg = 1;

    if (roll < 0.14) {
      kind = 'exploder';
      hp = Math.floor(baseHp * 1.2);
      r = 14;
      speed = 2.95 + Math.min(0.7, scale * 0.06);
      dmg = 3;
    } else if (roll < 0.28) {
      kind = 'elite';
      hp = Math.floor(baseHp * 3.2);
      r = 17;
      speed = 1.75 + Math.min(0.5, scale * 0.05);
      dmg = 2;
    } else if (roll < 0.38 && !forceCenter) {
      kind = 'spitter';
      hp = Math.floor(baseHp * 1.8);
      r = 14;
      speed = 1.85;
      dmg = 1;
    }

    let ex = startX + (i % 5) * 26;
    let ey = -40 - Math.floor(i / 5) * 28;

    if (formation === 'wedge') {
      const offset = i - Math.floor(count / 2);
      ex = canvas.width / 2 + offset * 20;
      ey = -40 - Math.abs(offset) * 16;
    } else if (formation === 'wall') {
      const cols = 7;
      ex = 58 + (i % cols) * 42;
      ey = -40 - Math.floor(i / cols) * 32;
    }

    enemies.push({
      x: Math.max(48, Math.min(canvas.width - 48, ex)),
      y: ey,
      hp: hp,
      maxHp: hp,
      r: r,
      speed: speed,
      kind: kind,
      isBoss: false,
      damageToSquad: dmg,
      shootCooldown: 90 + Math.random() * 50,
      freezeTimer: 0,
      phase: Math.random() * Math.PI * 2
    });
  }
}

function spawnBoss(isMiniBoss = false) {
  if (!isMiniBoss) state.bossSpawned = true;
  state.weather = 'clear';
  triggerShake(8, 22);
  const scale = getEffectiveScale();
  const mult = isMiniBoss ? 0.65 : 1.0;
  const bossHp = Math.floor(720 * mult * Math.pow(1.42, scale));
  enemies.push({
    x: canvas.width / 2,
    y: -100,
    vx: 1.2,
    hp: bossHp,
    maxHp: bossHp,
    r: isMiniBoss ? 46 : 58,
    speed: isMiniBoss ? 0.85 : 0.68,
    kind: 'boss',
    isBoss: true,
    isMiniBoss: isMiniBoss,
    attackTimer: 65,
    freezeTimer: 0,
    phase: 0
  });
}

function triggerAirstrike() {
  SoundFX.playExplosion(true);
  triggerShake(16, 25);
  addFloatingText(canvas.width / 2, canvas.height / 2, '🚀 戰術空襲轟炸！', '#feca57');
  enemyBullets = [];

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    createParticles(e.x, e.y, '#ff9f43', 18);
    if (e.isBoss) {
      const bossDmg = Math.floor(e.maxHp * 0.35);
      e.hp -= bossDmg;
      addFloatingText(e.x, e.y, `-${bossDmg}`, '#ff4757');
    } else {
      e.hp = 0;
    }
  }
}

function getSoldierPositions() {
  const positions = [];
  const visualCount = Math.min(squad.count, 120);
  const c = 6.6;

  for (let i = 0; i < visualCount; i++) {
    const angle = i * 2.39996;
    const r = c * Math.sqrt(i);
    positions.push({
      x: squad.x + r * Math.cos(angle),
      y: squad.y + r * Math.sin(angle),
      phase: i * 0.7
    });
  }
  squad.radius = Math.max(22, c * Math.sqrt(visualCount) + 10);
  return positions;
}

function createParticles(x, y, color, amount = 6) {
  for (let i = 0; i < amount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 4;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 20,
      color
    });
  }
}

function fireWeapons(positions) {
  state.muzzleFlashTimer = 3;
  SoundFX.playShoot(state.weapon);

  const shooters = Math.min(positions.length, 14);
  const step = Math.max(1, Math.floor(positions.length / shooters));

  const effectiveCount = squad.count <= 40 ? squad.count : 40 + (squad.count - 40) * 0.65;
  const rawDmg = Math.max(1, Math.ceil(effectiveCount / 14));
  const baseDmg = Math.max(1, Math.round(rawDmg * getDamageMultiplier()));

  for (let i = 0; i < positions.length; i += step) {
    const p = positions[i];
    if (state.weapon === 'shotgun') {
      [-0.18, 0, 0.18].forEach(spread => {
        bullets.push({
          x: p.x + 4,
          y: p.y - 12,
          vx: Math.sin(spread) * 10,
          vy: -Math.cos(spread) * 10,
          damage: baseDmg,
          color: '#ff9f43'
        });
      });
    } else if (state.weapon === 'laser') {
      bullets.push({
        x: p.x + 4,
        y: p.y - 14,
        vx: 0,
        vy: -14,
        damage: baseDmg * 2,
        color: '#00d2ff',
        isLaser: true
      });
    } else if (state.weapon === 'plasma') {
      bullets.push({
        x: p.x + 4,
        y: p.y - 14,
        vx: 0,
        vy: -11,
        damage: Math.ceil(baseDmg * 1.4),
        color: '#a55eea',
        pierce: 4
      });
    } else if (state.weapon === 'freeze') {
      bullets.push({
        x: p.x + 4,
        y: p.y - 12,
        vx: 0,
        vy: -11,
        damage: baseDmg,
        color: '#48dbfb',
        isFreeze: true
      });
    } else {
      bullets.push({
        x: p.x + 4,
        y: p.y - 12,
        vx: 0,
        vy: -10,
        damage: baseDmg,
        color: '#feca57'
      });
    }
  }
}

function update() {
  if (!state.running) {
    state.frame++;
    state.roadOffset = (state.roadOffset + 1.5) % 60;
    return;
  }

  if (squad.count > (saveData.maxSquadEver || 0)) {
    saveData.maxSquadEver = squad.count;
  }

  const modeMult = state.mode === 'blitz' ? 1.35 : 1.0;
  const spd = PACE.speedScale * modeMult;

  state.frame++;
  if (state.muzzleFlashTimer > 0) state.muzzleFlashTimer--;
  if (squad.trapCooldown > 0) squad.trapCooldown--;
  if (state.ultVisualTimer > 0) state.ultVisualTimer--;

  // 聖光守護者被動：每 8 秒自動治療小隊
  if (saveData.selectedHero === 'serena' && squad.count > 0) {
    state.passiveHealTimer++;
    if (state.passiveHealTimer >= 480) {
      state.passiveHealTimer = 0;
      const healAmt = 2 + (getHeroLevel('serena') - 1);
      squad.count += healAmt;
      addFloatingText(squad.x, squad.y - 42, `💚 聖光醫療 +${healAmt}`, '#2ed573');
      createParticles(squad.x, squad.y, '#2ed573', 10);
    }
  }

  // 無敵聖盾倒數與結束爆波
  if (state.ultShieldTimer > 0) {
    state.ultShieldTimer--;
    if (state.ultShieldTimer === 0) {
      enemyBullets = [];
      addFloatingText(squad.x, squad.y - 42, '✨ 聖盾淨化彈幕！', '#fffa65');
      createParticles(squad.x, squad.y, '#fffa65', 22);
    }
  }

  if (state.ultOverdriveTimer > 0) {
    state.ultOverdriveTimer--;
  } else if (state.ultShieldTimer <= 0) {
    state.ultCharge = Math.min(100, state.ultCharge + 0.085);
  }
  if (state.frame % 6 === 0) updateUltimateHUD();

  if (state.weather !== 'clear') {
    state.weatherTimer--;
    if (state.weatherTimer <= 0) {
      state.weather = 'clear';
      addFloatingText(squad.x, squad.y - 50, '天氣恢復晴朗', '#2ed573');
    }
  }

  if (state.weapon !== 'normal') {
    state.weaponTimer--;
    if (state.weaponTimer <= 0) {
      state.weapon = 'normal';
      addFloatingText(squad.x, squad.y - 45, '特殊武器能量耗盡！', '#ffa502');
    }
  }

  if (state.shakeTime > 0) {
    state.shakeTime--;
    if (state.shakeTime === 0) state.shakeIntensity = 0;
  }

  state.roadOffset = (state.roadOffset + 4.2 * spd) % 60;

  if (!state.bossSpawned) {
    state.distance += 2.6 * spd;

    if (state.mode === 'endless') {
      const newWave = Math.floor(state.distance / 900) + 1;
      if (newWave > state.wave) {
        state.wave = newWave;
        hudStageEl.textContent = `W${state.wave}`;
        addFloatingText(canvas.width / 2, 160, `♾️ WAVE ${state.wave} 來襲！`, '#a55eea');
        SoundFX.playGate(true);
        if (state.wave % 5 === 0) {
          spawnBoss(true);
        }
      }
    } else if (state.distance >= state.targetDistance) {
      spawnBoss(false);
    }
  }

  let windPush = 0;
  if (state.weather === 'wind_left') windPush = -0.75 * spd;
  if (state.weather === 'wind_right') windPush = 0.75 * spd;
  squad.targetX = Math.max(48, Math.min(canvas.width - 48, squad.targetX + windPush));
  squad.x += (squad.targetX - squad.x) * 0.22;

  if (!state.bossSpawned) {
    state.gateTimer += spd;
    state.barrelTimer += spd;
    state.enemyTimer += spd;
    state.trapTimer += spd;
    state.eventTimer += spd;

    if (state.gateTimer >= 180 * PACE.spawnGapScale) {
      state.gateTimer = 0;
      spawnGatePair();
    }
    if (state.barrelTimer >= 165 * PACE.spawnGapScale) {
      state.barrelTimer = 0;
      spawnBarrels();
    }
    if (state.enemyTimer >= 135 * PACE.spawnGapScale) {
      state.enemyTimer = 0;
      spawnEnemyWave();
    }
    if (state.trapTimer >= 260 * PACE.spawnGapScale && state.mode !== 'blitz') {
      state.trapTimer = 0;
      spawnSpikeTrap();
    }
    if (state.eventTimer >= 1200 && state.mode !== 'blitz') {
      state.eventTimer = 0;
      triggerWeatherEvent();
    }
  }

  const effectiveFireRate = state.ultOverdriveTimer > 0 ? 4 : state.fireRate;
  state.fireTimer++;
  if (state.fireTimer >= effectiveFireRate && squad.count > 0) {
    state.fireTimer = 0;
    fireWeapons(getSoldierPositions());
  }

  if (squad.drones > 0 && squad.count > 0) {
    squad.droneTimer++;
    if (squad.droneTimer >= 18) {
      squad.droneTimer = 0;
      for (let d = 0; d < squad.drones; d++) {
        const dx = squad.x + (d === 0 ? -36 : 36);
        const dy = squad.y - 18;
        bullets.push({
          x: dx,
          y: dy,
          vx: 0,
          vy: -13,
          damage: Math.max(2, Math.round(3 * getDamageMultiplier())),
          color: '#feca57',
          isLaser: true
        });
      }
    }
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx + windPush * 0.45;
    b.y += b.vy;
    if (b.y < -20 || b.x < 34 || b.x > canvas.width - 34) {
      bullets.splice(i, 1);
    }
  }

  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const eb = enemyBullets[i];
    eb.x += eb.vx * spd;
    eb.y += eb.vy * spd;

    if (Math.hypot(eb.x - squad.x, eb.y - squad.y) < eb.r + squad.radius * 0.65) {
      enemyBullets.splice(i, 1);
      if (state.ultShieldTimer > 0) {
        SoundFX.playBarrelHit(18);
        createParticles(eb.x, eb.y, '#fffa65', 8);
        continue;
      }

      const dmg = eb.damage || 1;
      squad.count = Math.max(0, squad.count - dmg);
      SoundFX.playExplosion(false);
      triggerShake(5, 6);
      addFloatingText(squad.x, squad.y - 35, `-${dmg}`, eb.color || '#ff3838');
      createParticles(eb.x, eb.y, eb.color || '#ff3838', 8);

      if (squad.count <= 0) {
        endGame(false);
        return;
      }
      continue;
    }

    if (eb.y > canvas.height + 30 || eb.x < 34 || eb.x > canvas.width - 34) {
      enemyBullets.splice(i, 1);
    }
  }

  for (let i = traps.length - 1; i >= 0; i--) {
    const t = traps[i];
    t.y += 2.6 * spd;

    if (
      squad.x + 10 > t.x &&
      squad.x - 10 < t.x + t.w &&
      squad.y + 8 > t.y &&
      squad.y - 8 < t.y + t.h
    ) {
      if (state.ultShieldTimer <= 0 && squad.trapCooldown <= 0) {
        squad.trapCooldown = 22;
        squad.count = Math.max(0, squad.count - 1);
        SoundFX.playGate(false);
        triggerShake(3, 4);
        addFloatingText(squad.x, squad.y - 30, '-1 (地刺!)', '#ff4757');
        createParticles(squad.x, squad.y, '#ff4757', 6);

        if (squad.count <= 0) {
          endGame(false);
          return;
        }
      }
    }

    if (t.y > canvas.height + 80) traps.splice(i, 1);
  }

  for (let i = barrels.length - 1; i >= 0; i--) {
    const bar = barrels[i];
    bar.y += 2.6 * spd;
    if (bar.vx) {
      bar.x += bar.vx * spd;
      if (bar.x < 75 || bar.x > canvas.width - 75) bar.vx *= -1;
    }
    bar.hitScale += (1 - bar.hitScale) * 0.25;

    for (let j = bullets.length - 1; j >= 0; j--) {
      const b = bullets[j];
      if (Math.hypot(b.x - bar.x, b.y - bar.y) < bar.r + 5) {
        const prevVal = bar.val;
        bullets.splice(j, 1);

        if (bar.kind === 'weapon' || bar.kind === 'support') {
          bar.val = Math.min(0, bar.val + b.damage);
        } else {
          if (bar.val < 0) {
            bar.val += b.damage;
            if (bar.val > 0) bar.val = 2;
          } else {
            bar.val = Math.min(bar.maxGain, +(bar.val + b.damage * 0.9).toFixed(2));
          }
        }

        bar.hitScale = 1.15;
        createParticles(b.x, b.y, bar.val >= 0 ? '#2ed573' : '#ff6b81', 3);

        if (prevVal < 0 && bar.val >= 0) {
          SoundFX.playGate(true);
          addCoins(12);
        } else {
          SoundFX.playBarrelHit(bar.val);
        }
      }
    }

    const distToSquad = Math.hypot(bar.x - squad.x, bar.y - squad.y);
    if (distToSquad < bar.r + squad.radius * 0.8) {
      if (bar.kind === 'weapon') {
        if (bar.val >= 0) {
          state.weapon = bar.weapon;
          state.weaponTimer = state.weaponMaxTime;
          SoundFX.playGate(true);
          triggerShake(4, 6);
          addFloatingText(squad.x, squad.y - 45, `裝備 ${bar.label}！`, '#00d2ff');
          createParticles(bar.x, bar.y, '#00d2ff', 20);
        } else if (state.ultShieldTimer > 0) {
          SoundFX.playBarrelHit(18);
          addFloatingText(squad.x, squad.y - 45, '🛡️ 聖盾格擋！', '#fffa65');
        } else {
          const loss = Math.min(squad.count, Math.ceil(Math.abs(bar.val) / 4));
          squad.count -= loss;
          SoundFX.playGate(false);
          triggerShake(6, 8);
          addFloatingText(squad.x, squad.y - 45, `-${loss} 兵力`, '#ff4757');
        }
      } else if (bar.kind === 'support') {
        if (bar.val >= 0) {
          SoundFX.playGate(true);
          if (bar.supportType === 'drone') {
            squad.drones = Math.min(2, squad.drones + 1);
            addFloatingText(squad.x, squad.y - 45, `獲得支援無人機 (${squad.drones}/2)！`, '#feca57');
          } else {
            triggerAirstrike();
          }
          createParticles(bar.x, bar.y, '#feca57', 25);
        } else if (state.ultShieldTimer > 0) {
          SoundFX.playBarrelHit(18);
          addFloatingText(squad.x, squad.y - 45, '🛡️ 聖盾格擋！', '#fffa65');
        } else {
          const loss = Math.min(squad.count, Math.ceil(Math.abs(bar.val) / 4));
          squad.count -= loss;
          SoundFX.playGate(false);
          triggerShake(6, 8);
          addFloatingText(squad.x, squad.y - 45, `-${loss} 兵力`, '#ff4757');
        }
      } else {
        const finalGain = Math.floor(bar.val);
        if (finalGain < 0 && state.ultShieldTimer > 0) {
          SoundFX.playBarrelHit(18);
          addFloatingText(squad.x, squad.y - 45, '🛡️ 聖盾免疫扣兵！', '#fffa65');
        } else {
          squad.count += finalGain;
          const isGood = finalGain >= 0;
          SoundFX.playGate(isGood);
          if (!isGood) triggerShake(5, 7);
          const color = isGood ? '#2ed573' : '#ff4757';
          const prefix = isGood ? '+' : '';
          addFloatingText(squad.x, squad.y - 45, `${prefix}${finalGain}`, color);
          createParticles(bar.x, bar.y, color, 15);
        }
      }

      barrels.splice(i, 1);
      if (squad.count <= 0) {
        squad.count = 0;
        endGame(false);
        return;
      }
      continue;
    }

    if (bar.y > canvas.height + 60) barrels.splice(i, 1);
  }

  for (let i = gates.length - 1; i >= 0; i--) {
    const g = gates[i];
    g.y += 2.6 * spd;
    g.hitScale += (1 - g.hitScale) * 0.25;

    if (!g.triggered && g.shootable) {
      for (let j = bullets.length - 1; j >= 0; j--) {
        const b = bullets[j];
        if (b.x > g.x && b.x < g.x + g.w && b.y > g.y && b.y < g.y + g.h) {
          bullets.splice(j, 1);
          if (g.val < 0) {
            g.val += 1;
          } else {
            g.val = Math.min(g.maxGain, g.val + 1);
          }
          g.hitScale = 1.06;
          SoundFX.playBarrelHit(g.val);
          createParticles(b.x, b.y, '#70a1ff', 2);
        }
      }
    }

    if (!g.triggered && g.y + g.h >= squad.y - 15 && g.y <= squad.y + 15) {
      if (squad.x >= g.x && squad.x <= g.x + g.w) {
        g.triggered = true;
        gates.forEach(other => {
          if (Math.abs(other.y - g.y) < 10) other.triggered = true;
        });

        applyGateEffect(g);
        const isGood = g.type === 'mul' || g.type === 'rate' || (g.type !== 'div' && Math.floor(g.val) >= 0);
        SoundFX.playGate(isGood);
        if (!isGood && state.ultShieldTimer <= 0) triggerShake(5, 8);
        createParticles(squad.x, squad.y, isGood ? '#00d2ff' : '#ff4757', 15);
      }
    }
    if (g.y > canvas.height + 50) gates.splice(i, 1);
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (e.freezeTimer > 0) e.freezeTimer--;
    const freezeFactor = e.freezeTimer > 0 ? (e.freezeTimer > 120 ? 0.05 : 0.45) : 1.0;

    if (e.kind === 'spitter' && e.y >= 230) {
      e.shootCooldown -= spd * freezeFactor;
      if (e.shootCooldown <= 0) {
        e.shootCooldown = 165;
        const angle = Math.atan2(squad.y - e.y, squad.x - e.x);
        enemyBullets.push({
          x: e.x,
          y: e.y + 10,
          vx: Math.cos(angle) * 3.6,
          vy: Math.sin(angle) * 3.6,
          r: 6,
          damage: 1,
          color: '#7bed9f'
        });
      }
    } else {
      e.y += e.speed * spd * freezeFactor;
    }

    if (e.isBoss) {
      e.x += e.vx * spd * freezeFactor;
      if (e.x < 95 || e.x > canvas.width - 95) e.vx *= -1;

      e.attackTimer -= spd * freezeFactor;
      if (e.attackTimer <= 0 && e.y > 40) {
        e.attackTimer = Math.max(115, 165 - getEffectiveScale() * 5);
        [-0.25, 0, 0.25].forEach(angle => {
          enemyBullets.push({
            x: e.x,
            y: e.y + e.r * 0.7,
            vx: Math.sin(angle) * 3.8,
            vy: Math.cos(angle) * 3.8,
            r: 8,
            damage: 2 + Math.floor(getEffectiveScale() * 0.4),
            color: '#ff3838'
          });
        });
        if (Math.random() < 0.35) {
          spawnEnemyWave(true);
        }
      }
    }

    for (let j = bullets.length - 1; j >= 0; j--) {
      const b = bullets[j];
      if (Math.hypot(b.x - e.x, b.y - e.y) < e.r + 5) {
        e.hp -= b.damage;
        if (b.isFreeze) e.freezeTimer = 110;

        createParticles(b.x, b.y, b.isFreeze ? '#48dbfb' : (e.isBoss ? '#ffa502' : '#7bed9f'), 3);

        if (b.pierce && b.pierce > 1) {
          b.pierce--;
          b.y -= 18;
        } else {
          bullets.splice(j, 1);
        }

        if (e.hp <= 0) break;
      }
    }

    if (e.hp <= 0) {
      const wasMainBoss = e.isBoss && !e.isMiniBoss;
      saveData.totalKills = (saveData.totalKills || 0) + 1;
      if (e.isBoss) {
        saveData.bossKills = (saveData.bossKills || 0) + 1;
      }

      if (state.ultOverdriveTimer <= 0 && state.ultShieldTimer <= 0) {
        state.ultCharge = Math.min(100, state.ultCharge + (e.isBoss ? 40 : (e.kind !== 'normal' ? 6 : 2.2)));
      }

      SoundFX.playExplosion(e.isBoss);
      triggerShake(e.isBoss ? 14 : (e.kind !== 'normal' ? 5 : 2.5), e.isBoss ? 28 : 5);
      createParticles(e.x, e.y, e.isBoss ? '#ff4757' : '#2ed573', e.isBoss ? 55 : 10);

      const coinDrop = e.isBoss
        ? (e.isMiniBoss ? 90 : 150 + saveData.stage * 50)
        : (e.kind !== 'normal' ? 16 + getEffectiveScale() : 4 + Math.floor(getEffectiveScale() * 0.5));
      addCoins(coinDrop);
      if (e.isBoss || e.kind !== 'normal') {
        addFloatingText(e.x, e.y, `+${coinDrop} 💰`, '#feca57');
      }

      enemies.splice(i, 1);
      if (wasMainBoss) endGame(true);
      continue;
    }

    if (Math.hypot(e.x - squad.x, e.y - squad.y) < e.r + squad.radius * 0.72) {
      if (state.ultShieldTimer > 0) {
        // 無敵聖盾反彈與擊殺保護
        SoundFX.playBarrelHit(20);
        createParticles(e.x, e.y, '#fffa65', 14);
        if (e.isBoss) {
          e.y -= 35;
          const reflectDmg = Math.max(40, Math.floor(e.maxHp * 0.08));
          e.hp -= reflectDmg;
          addFloatingText(e.x, e.y, `🛡️ 反震 -${reflectDmg}`, '#fffa65');
        } else {
          e.hp = 0;
        }
        continue;
      }

      if (e.isBoss) {
        squad.count = 0;
        SoundFX.playExplosion(true);
        triggerShake(15, 25);
      } else {
        const loss = e.damageToSquad || 1;
        squad.count = Math.max(0, squad.count - loss);
        enemies.splice(i, 1);
        SoundFX.playExplosion(e.kind === 'exploder');
        triggerShake(e.kind === 'exploder' ? 8 : 4, 7);
        if (loss > 1) {
          const tag = e.kind === 'exploder' ? `自爆 -${loss}!` : `-${loss}`;
          addFloatingText(squad.x, squad.y - 35, tag, '#ff4757');
        }
        createParticles(squad.x, squad.y, e.kind === 'exploder' ? '#2ed573' : '#ff4757', 14);
      }
      if (squad.count <= 0) {
        endGame(false);
        return;
      }
    } else if (e.y > canvas.height + 60) {
      enemies.splice(i, 1);
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }

  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.y -= 1.2;
    ft.life--;
    if (ft.life <= 0) floatingTexts.splice(i, 1);
  }
}

function applyGateEffect(g) {
  if (g.type === 'mul') {
    squad.count *= g.val;
    addFloatingText(squad.x, squad.y - 40, `×${g.val}`, '#00d2ff');
  } else if (g.type === 'div') {
    if (state.ultShieldTimer > 0) {
      addFloatingText(squad.x, squad.y - 40, '🛡️ 聖盾免疫減半！', '#fffa65');
      return;
    }
    squad.count = Math.max(1, Math.floor(squad.count / g.val));
    addFloatingText(squad.x, squad.y - 40, `÷${g.val}`, '#ff4757');
  } else if (g.type === 'rate') {
    state.fireRate = Math.max(5, state.fireRate - g.val);
    addFloatingText(squad.x, squad.y - 40, '射速提升！', '#00d2ff');
  } else {
    const finalVal = Math.floor(g.val);
    if (finalVal < 0 && state.ultShieldTimer > 0) {
      addFloatingText(squad.x, squad.y - 40, '🛡️ 聖盾格擋！', '#fffa65');
      return;
    }
    squad.count = Math.max(0, squad.count + finalVal);
    const prefix = finalVal >= 0 ? '+' : '';
    addFloatingText(squad.x, squad.y - 40, `${prefix}${finalVal}`, finalVal >= 0 ? '#2ed573' : '#ff4757');
    if (squad.count <= 0) endGame(false);
  }
}

function endGame(victory) {
  state.running = false;
  updateUltimateHUD();

  if (state.mode === 'endless') {
    if (state.wave > (saveData.bestWave || 1)) {
      saveData.bestWave = state.wave;
    }
    writeSave();
    refreshUI();

    overlay.classList.remove('hidden');
    overlayTitle.textContent = `WAVE ${state.wave} END`;
    overlayTitle.style.color = '#a55eea';
    overlayDesc.textContent = `無盡生存紀錄：最高撐過第 ${saveData.bestWave} 波！`;
    earnedCoinsEl.textContent = state.runCoins;
    return;
  }

  if (victory) {
    saveData.stage++;
  }
  writeSave();
  refreshUI();

  overlay.classList.remove('hidden');
  overlayTitle.textContent = victory ? 'STAGE CLEAR!' : 'DEFEAT';
  overlayTitle.style.color = victory ? '#2ed573' : '#ff4757';
  overlayDesc.textContent = victory
    ? `成功突破防線！已解鎖第 ${saveData.stage} 關`
    : '資源耗盡，小隊全軍覆沒！';
  earnedCoinsEl.textContent = state.runCoins;
}

// ==========================================
// 科幻末日高質感畫面渲染引擎
// ==========================================
function drawRoad() {
  const roadGrad = ctx.createLinearGradient(34, 0, canvas.width - 34, 0);
  roadGrad.addColorStop(0, '#161b26');
  roadGrad.addColorStop(0.5, '#1e2534');
  roadGrad.addColorStop(1, '#161b26');
  ctx.fillStyle = roadGrad;
  ctx.fillRect(34, 0, canvas.width - 68, canvas.height);

  ctx.strokeStyle = 'rgba(0, 210, 255, 0.04)';
  ctx.lineWidth = 1;
  for (let x = 74; x < canvas.width - 34; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  ctx.fillStyle = '#0d1017';
  ctx.fillRect(0, 0, 34, canvas.height);
  ctx.fillRect(canvas.width - 34, 0, 34, canvas.height);

  for (let y = state.roadOffset - 60; y < canvas.height; y += 60) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(34, y, canvas.width - 68, 2);

    ctx.fillStyle = '#e84118';
    ctx.fillRect(24, y, 8, 26);
    ctx.fillRect(canvas.width - 32, y, 8, 26);
    ctx.fillStyle = '#2f3640';
    ctx.fillRect(24, y + 26, 8, 34);
    ctx.fillRect(canvas.width - 32, y + 26, 8, 34);

    ctx.fillStyle = 'rgba(0, 210, 255, 0.22)';
    ctx.beginPath();
    ctx.roundRect(canvas.width / 2 - 2.5, y + 12, 5, 30, 2.5);
    ctx.fill();
  }

  const borderColor = state.mode === 'endless'
    ? 'rgba(165, 94, 234, 0.55)'
    : (state.mode === 'blitz' ? 'rgba(254, 202, 87, 0.55)' : 'rgba(0, 210, 255, 0.45)');
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(34, 0);
  ctx.lineTo(34, canvas.height);
  ctx.moveTo(canvas.width - 34, 0);
  ctx.lineTo(canvas.width - 34, canvas.height);
  ctx.stroke();
}

function drawTraps() {
  traps.forEach(t => {
    ctx.save();
    const grad = ctx.createLinearGradient(t.x, t.y, t.x, t.y + t.h);
    grad.addColorStop(0, 'rgba(255, 56, 56, 0.35)');
    grad.addColorStop(1, 'rgba(130, 20, 20, 0.5)');
    ctx.fillStyle = grad;
    ctx.strokeStyle = '#ff3838';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(t.x, t.y, t.w, t.h, 6);
    ctx.fill();
    ctx.stroke();

    for (let sx = t.x + 14; sx < t.x + t.w - 10; sx += 22) {
      for (let sy = t.y + 15; sy < t.y + t.h - 8; sy += 22) {
        ctx.fillStyle = '#7f8fa6';
        ctx.beginPath();
        ctx.moveTo(sx, sy - 8);
        ctx.lineTo(sx - 6, sy + 5);
        ctx.lineTo(sx + 6, sy + 5);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#f5f6fa';
        ctx.beginPath();
        ctx.moveTo(sx, sy - 8);
        ctx.lineTo(sx, sy + 5);
        ctx.lineTo(sx + 6, sy + 5);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  });
}

function drawHeroCommander() {
  if (squad.count <= 0 || !state.running) return;
  const hero = getSelectedHero();
  const hx = squad.x;
  const hy = squad.y - Math.min(22, squad.radius * 0.45);
  const bob = Math.abs(Math.sin(state.frame * 0.25)) * 2.5;

  ctx.save();
  ctx.translate(hx, hy - bob);

  ctx.strokeStyle = hero.color;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(0, 9 + bob, 13, 6, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = hero.capeColor;
  ctx.beginPath();
  ctx.moveTo(-8, -4);
  ctx.lineTo(8, -4);
  ctx.lineTo(11, 10 + Math.sin(state.frame * 0.3) * 2);
  ctx.lineTo(-11, 10 - Math.sin(state.frame * 0.3) * 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#1e272e';
  ctx.strokeStyle = hero.color;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(-8.5, -6, 17, 12, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = hero.color;
  ctx.beginPath();
  ctx.arc(0, -9, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(-4.5, -10.5, 9, 3, 1.5);
  ctx.fill();

  ctx.restore();
}

function drawSanctuaryShield() {
  if (state.ultShieldTimer <= 0 || squad.count <= 0) return;
  const r = squad.radius + 12 + Math.sin(state.frame * 0.2) * 3;
  ctx.save();
  const grad = ctx.createRadialGradient(squad.x, squad.y, r * 0.3, squad.x, squad.y, r);
  grad.addColorStop(0, 'rgba(46, 213, 115, 0.08)');
  grad.addColorStop(0.75, 'rgba(255, 250, 101, 0.26)');
  grad.addColorStop(1, 'rgba(46, 213, 115, 0.65)');

  ctx.fillStyle = grad;
  ctx.strokeStyle = '#fffa65';
  ctx.lineWidth = 2.6;
  ctx.shadowColor = '#2ed573';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(squad.x, squad.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawSoldier(x, y, phase) {
  const runCycle = Math.sin(state.frame * 0.25 + phase);
  const bobY = Math.abs(runCycle) * 2;

  ctx.save();
  ctx.translate(x, y - bobY);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 8 + bobY, 7.5, 3.8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#192a56';
  ctx.beginPath();
  ctx.roundRect(-4.5, 3 + runCycle * 2.5, 3.5, 5.5, 1.5);
  ctx.roundRect(1, 3 - runCycle * 2.5, 3.5, 5.5, 1.5);
  ctx.fill();

  const armorGrad = ctx.createLinearGradient(-6, -4, 6, 5);
  armorGrad.addColorStop(0, '#3867d6');
  armorGrad.addColorStop(1, '#1e3799');
  ctx.fillStyle = armorGrad;
  ctx.strokeStyle = '#70a1ff';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(-6.5, -4.5, 13, 9.5, 3.5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#0984e3';
  ctx.beginPath();
  ctx.arc(0, -6.5, 5.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#00f2fe';
  ctx.shadowColor = '#00f2fe';
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.roundRect(-4, -8.2, 8, 2.6, 1.2);
  ctx.fill();
  ctx.shadowBlur = 0;

  const weaponColors = {
    laser: '#00f2fe',
    plasma: '#be2edd',
    freeze: '#7ed6df',
    shotgun: '#f0932b',
    normal: '#dfe4ea'
  };
  const wColor = weaponColors[state.weapon] || '#dfe4ea';

  ctx.fillStyle = '#2f3542';
  ctx.fillRect(3, -12, 4, 11);
  ctx.fillStyle = wColor;
  ctx.fillRect(3.8, -11.5, 2.2, 8);

  if (state.muzzleFlashTimer > 0) {
    ctx.fillStyle = wColor;
    ctx.shadowColor = wColor;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(5, -13.5, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

function drawDrones() {
  if (squad.drones <= 0 || squad.count <= 0) return;
  for (let d = 0; d < squad.drones; d++) {
    const hover = Math.sin(state.frame * 0.15 + d * 2) * 3.5;
    const dx = squad.x + (d === 0 ? -40 : 40);
    const dy = squad.y - 22 + hover;

    ctx.save();
    ctx.translate(dx, dy);

    ctx.strokeStyle = 'rgba(254, 202, 87, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.stroke();

    const coreGrad = ctx.createRadialGradient(-2, -2, 1, 0, 0, 7.5);
    coreGrad.addColorStop(0, '#fff200');
    coreGrad.addColorStop(1, '#ff9f43');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
    ctx.fill();

    const bladeW = 12 * Math.cos(state.frame * 0.6);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-bladeW, -4);
    ctx.lineTo(bladeW, -4);
    ctx.stroke();
    ctx.restore();
  }
}

function drawEnemy(e) {
  ctx.save();
  ctx.translate(e.x, e.y);

  if (e.isBoss) {
    const pulse = Math.sin(state.frame * 0.1) * 2.5;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(0, e.r * 0.85, e.r * 0.95, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2f3542';
    ctx.strokeStyle = '#ff4757';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-e.r - 10, -18, 18, 40, 4);
    ctx.roundRect(e.r - 8, -18, 18, 40, 4);
    ctx.fill();
    ctx.stroke();

    const bossGrad = ctx.createRadialGradient(-12, -15, 8, 0, 0, e.r);
    bossGrad.addColorStop(0, '#c23616');
    bossGrad.addColorStop(0.7, '#6F1E51');
    bossGrad.addColorStop(1, '#2f3640');
    ctx.fillStyle = bossGrad;
    ctx.strokeStyle = '#ff6b81';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, e.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ff9f43';
    ctx.shadowColor = '#ff9f43';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(0, 10, 15 + pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff200';
    ctx.beginPath();
    ctx.arc(0, 10, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#fffa65';
    ctx.shadowColor = '#fffa65';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(-24, -22, 16, 6, 3);
    ctx.roundRect(8, -22, 16, 6, 3);
    ctx.fill();
    ctx.shadowBlur = 0;

    const barW = 120;
    ctx.fillStyle = 'rgba(10, 14, 22, 0.85)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(-barW / 2, -e.r - 24, barW, 13, 6);
    ctx.fill();
    ctx.stroke();

    const hpGrad = ctx.createLinearGradient(-barW / 2, 0, barW / 2, 0);
    hpGrad.addColorStop(0, '#ff4757');
    hpGrad.addColorStop(1, '#2ed573');
    ctx.fillStyle = hpGrad;
    ctx.beginPath();
    ctx.roundRect(-barW / 2 + 2, -e.r - 22, (barW - 4) * (e.hp / e.maxHp), 9, 4);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    const title = e.isMiniBoss ? `WAVE BOSS • ${e.hp}` : `TITAN BOSS • ${e.hp}`;
    ctx.fillText(title, 0, -e.r - 30);
  } else if (e.kind === 'exploder') {
    const pulse = Math.sin(state.frame * 0.35) * 3;
    ctx.fillStyle = 'rgba(46, 213, 115, 0.25)';
    ctx.beginPath();
    ctx.arc(0, 0, e.r + 6 + pulse, 0, Math.PI * 2);
    ctx.fill();

    const expGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, e.r);
    expGrad.addColorStop(0, '#7bed9f');
    expGrad.addColorStop(1, '#218c74');
    ctx.fillStyle = expGrad;
    ctx.strokeStyle = '#fffa65';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, e.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1e272e';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('☢', 0, 0.5);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(e.hp, 0, -20);
  } else if (e.kind === 'spitter') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 11, 10, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#006266';
    ctx.strokeStyle = '#12CBC4';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(-9.5, -7, 19, 15, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#C4E538';
    ctx.beginPath();
    ctx.arc(0, -8.5, 6.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(e.hp, 0, -19);
  } else if (e.kind === 'elite') {
    const sway = Math.sin(state.frame * 0.14 + e.phase) * 2;
    ctx.translate(sway, 0);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.ellipse(0, 13.5, 13.5, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#6D214F';
    ctx.beginPath();
    ctx.roundRect(-14, 1, 5.5, 14, 2);
    ctx.roundRect(8.5, 1, 5.5, 14, 2);
    ctx.fill();

    const eliteGrad = ctx.createLinearGradient(-10, -7, 10, 8);
    eliteGrad.addColorStop(0, '#82589F');
    eliteGrad.addColorStop(1, '#2C3A47');
    ctx.fillStyle = eliteGrad;
    ctx.strokeStyle = '#D980FA';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-10.5, -7.5, 21, 16, 4.5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#B33771';
    ctx.beginPath();
    ctx.arc(0, -9.5, 8.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fffa65';
    ctx.fillRect(-5, -8.5, 4, 2.5);
    ctx.fillRect(1, -8.5, 4, 2.5);

    ctx.fillStyle = '#fffa65';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(e.hp, 0, -22);
  } else {
    const sway = Math.sin(state.frame * 0.16 + e.phase) * 2;
    ctx.translate(sway, 0);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 10, 9.5, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4cd137';
    ctx.beginPath();
    ctx.roundRect(-9.5, 2, 3.8, 10.5, 1.5);
    ctx.roundRect(5.7, 2, 3.8, 10.5, 1.5);
    ctx.fill();

    ctx.fillStyle = '#485460';
    ctx.beginPath();
    ctx.roundRect(-7.5, -5.5, 15, 11.5, 3.5);
    ctx.fill();

    ctx.fillStyle = '#44bd32';
    ctx.beginPath();
    ctx.arc(0, -7.5, 6.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff3838';
    ctx.fillRect(-3.8, -6.5, 2.6, 2.2);
    ctx.fillRect(1.2, -6.5, 2.6, 2.2);

    if (e.hp > 1) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(e.hp, 0, -17);
    }
  }

  if (e.freezeTimer > 0) {
    ctx.fillStyle = 'rgba(72, 219, 251, 0.38)';
    ctx.beginPath();
    ctx.arc(0, 0, e.r + 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawWeatherEffects() {
  if (state.weather === 'wind_left' || state.weather === 'wind_right') {
    const dir = state.weather === 'wind_left' ? -1 : 1;
    ctx.strokeStyle = 'rgba(0, 210, 255, 0.28)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const wy = ((state.frame * 5 + i * 95) % canvas.height);
      const wx = ((state.frame * 9 * dir + i * 70) % canvas.width + canvas.width) % canvas.width;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(wx + 35 * dir, wy + 4);
      ctx.stroke();
    }
  }

  if (state.weather === 'fog') {
    const grad = ctx.createRadialGradient(squad.x, squad.y - 60, 95, squad.x, squad.y - 60, 280);
    grad.addColorStop(0, 'rgba(10, 14, 22, 0)');
    grad.addColorStop(1, 'rgba(10, 14, 22, 0.82)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function drawUltimateVisuals() {
  if (state.ultVisualTimer <= 0) return;
  const alpha = state.ultVisualTimer / 45;

  if (state.ultVisualType === 'orbital') {
    const beamGrad = ctx.createLinearGradient(0, 0, canvas.width, 0);
    beamGrad.addColorStop(0, 'rgba(0, 242, 254, 0)');
    beamGrad.addColorStop(0.5, `rgba(0, 242, 254, ${alpha * 0.55})`);
    beamGrad.addColorStop(1, 'rgba(0, 242, 254, 0)');
    ctx.fillStyle = beamGrad;
    ctx.fillRect(34, 0, canvas.width - 68, canvas.height);
  } else if (state.ultVisualType === 'blizzard') {
    ctx.fillStyle = `rgba(72, 219, 251, ${alpha * 0.35})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (state.ultVisualType === 'overdrive') {
    ctx.fillStyle = `rgba(254, 202, 87, ${alpha * 0.28})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (state.ultVisualType === 'sanctuary') {
    ctx.fillStyle = `rgba(46, 213, 115, ${alpha * 0.30})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function draw() {
  ctx.save();

  if (state.shakeTime > 0) {
    const dx = (Math.random() - 0.5) * 2 * state.shakeIntensity;
    const dy = (Math.random() - 0.5) * 2 * state.shakeIntensity;
    ctx.translate(dx, dy);
  }

  ctx.clearRect(-20, -20, canvas.width + 40, canvas.height + 40);

  drawRoad();
  drawTraps();

  gates.forEach(g => {
    if (g.triggered) return;
    const displayVal = Math.floor(g.val);
    const isGood = g.type === 'mul' || g.type === 'rate' || (g.type !== 'div' && displayVal >= 0);

    const grad = ctx.createLinearGradient(g.x, g.y, g.x, g.y + g.h);
    if (isGood) {
      grad.addColorStop(0, 'rgba(0, 210, 255, 0.52)');
      grad.addColorStop(0.5, 'rgba(0, 168, 255, 0.25)');
      grad.addColorStop(1, 'rgba(0, 210, 255, 0.45)');
    } else {
      grad.addColorStop(0, 'rgba(255, 71, 87, 0.52)');
      grad.addColorStop(0.5, 'rgba(255, 71, 87, 0.22)');
      grad.addColorStop(1, 'rgba(255, 71, 87, 0.45)');
    }

    ctx.fillStyle = grad;
    ctx.strokeStyle = isGood ? '#00f2fe' : '#ff4757';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(g.x + 3, g.y, g.w - 6, g.h, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let sy = g.y + 8; sy < g.y + g.h - 4; sy += 8) {
      ctx.fillRect(g.x + 6, sy, g.w - 12, 2);
    }

    let label = '';
    if (g.type === 'mul') label = `×${g.val}`;
    else if (g.type === 'div') label = `÷${g.val}`;
    else if (g.type === 'rate') label = '射速 +1';
    else label = (displayVal >= 0 ? `+${displayVal}` : `${displayVal}`);

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = isGood ? '#00d2ff' : '#ff4757';
    ctx.shadowBlur = 8;
    ctx.font = `900 ${Math.round(23 * g.hitScale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, g.x + g.w / 2, g.y + g.h / 2);
    ctx.shadowBlur = 0;
  });

  barrels.forEach(bar => {
    ctx.save();
    ctx.translate(bar.x, bar.y);
    ctx.scale(bar.hitScale, bar.hitScale);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, bar.r + 5, bar.r * 0.88, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();

    const displayVal = Math.floor(bar.val);
    const unlocked = displayVal >= 0;
    if (bar.kind === 'weapon' || bar.kind === 'support') {
      const boxGrad = ctx.createLinearGradient(-bar.r, -bar.r, bar.r, bar.r);
      if (bar.kind === 'support') {
        boxGrad.addColorStop(0, unlocked ? '#fbc531' : '#574b29');
        boxGrad.addColorStop(1, unlocked ? '#e1b12c' : '#2f2918');
      } else {
        boxGrad.addColorStop(0, unlocked ? '#00a8ff' : '#353b48');
        boxGrad.addColorStop(1, unlocked ? '#0097e6' : '#1e272e');
      }

      ctx.fillStyle = boxGrad;
      ctx.strokeStyle = unlocked ? '#4cd137' : (bar.kind === 'support' ? '#feca57' : '#ff6b81');
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-bar.r, -bar.r, bar.r * 2, bar.r * 2, 9);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(-bar.r + 4, -bar.r + 4, bar.r * 2 - 8, 3);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(bar.label, 0, -6);
      ctx.font = '900 14px sans-serif';
      ctx.fillStyle = unlocked ? '#4cd137' : '#fffa65';
      ctx.fillText(unlocked ? 'READY!' : displayVal, 0, 13);
    } else {
      const barrelGrad = ctx.createRadialGradient(-8, -8, 3, 0, 0, bar.r);
      if (unlocked) {
        barrelGrad.addColorStop(0, '#7bed9f');
        barrelGrad.addColorStop(1, '#218c74');
      } else {
        barrelGrad.addColorStop(0, '#ff6b81');
        barrelGrad.addColorStop(1, '#b33939');
      }

      ctx.fillStyle = barrelGrad;
      ctx.strokeStyle = '#f5f6fa';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, bar.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.32)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-bar.r + 5, -9);
      ctx.lineTo(bar.r - 5, -9);
      ctx.moveTo(-bar.r + 5, 9);
      ctx.lineTo(bar.r - 5, 9);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(displayVal >= 0 ? `+${displayVal}` : displayVal, 0, 0);
    }
    ctx.restore();
  });

  enemies.sort((a, b) => a.y - b.y).forEach(e => drawEnemy(e));

  enemyBullets.forEach(eb => {
    ctx.fillStyle = eb.color || '#ff3838';
    ctx.shadowColor = eb.color || '#ff3838';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(eb.x, eb.y, eb.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(eb.x, eb.y, eb.r * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  bullets.forEach(b => {
    if (b.isLaser) {
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(b.x - 2, b.y - 16, 4, 24, 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(b.x - 0.8, b.y - 14, 1.6, 18);
      ctx.shadowBlur = 0;
    } else if (b.pierce) {
      ctx.fillStyle = '#a55eea';
      ctx.shadowColor = '#a55eea';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      const trailGrad = ctx.createLinearGradient(b.x, b.y - 8, b.x, b.y + 12);
      trailGrad.addColorStop(0, b.color);
      trailGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = trailGrad;
      ctx.beginPath();
      ctx.roundRect(b.x - 2.2, b.y - 8, 4.4, 18, 2);
      ctx.fill();
    }
  });

  const positions = getSoldierPositions().sort((a, b) => a.y - b.y);
  positions.forEach(pos => drawSoldier(pos.x, pos.y, pos.phase));
  drawHeroCommander();
  drawSanctuaryShield();
  drawDrones();

  drawUltimateVisuals();
  drawWeatherEffects();

  if (squad.count > 0 && state.running) {
    ctx.fillStyle = 'rgba(10, 15, 25, 0.88)';
    ctx.strokeStyle = state.ultShieldTimer > 0 ? '#fffa65' : '#00f2fe';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(squad.x - 32, squad.y - squad.radius - 34, 64, 23, 11.5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = state.ultShieldTimer > 0 ? '#fffa65' : '#00f2fe';
    ctx.font = '900 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(squad.count, squad.x, squad.y - squad.radius - 22.5);

    if (state.weapon !== 'normal' && state.weaponTimer > 0) {
      const ratio = state.weaponTimer / state.weaponMaxTime;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.beginPath();
      ctx.roundRect(squad.x - 28, squad.y - squad.radius - 42, 56, 5, 2.5);
      ctx.fill();
      ctx.fillStyle = state.weapon === 'plasma' ? '#a55eea' : (state.weapon === 'freeze' ? '#48dbfb' : '#00f2fe');
      ctx.beginPath();
      ctx.roundRect(squad.x - 28, squad.y - squad.radius - 42, 56 * ratio, 5, 2.5);
      ctx.fill();
    }
  }

  particles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life / 20;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  floatingTexts.forEach(ft => {
    ctx.fillStyle = ft.color;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.globalAlpha = Math.min(1, ft.life / 15);
    ctx.font = '900 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  });

  ctx.restore();

  if (state.running) {
    ctx.fillStyle = 'rgba(10, 14, 22, 0.75)';
    ctx.strokeStyle = state.mode === 'endless' ? 'rgba(165, 94, 234, 0.5)' : 'rgba(0, 242, 254, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(46, 12, canvas.width - 92, 16, 8);
    ctx.fill();
    ctx.stroke();

    if (state.mode === 'endless') {
      const waveProgress = (state.distance % 900) / 900;
      const waveGrad = ctx.createLinearGradient(48, 0, canvas.width - 48, 0);
      waveGrad.addColorStop(0, '#8854d0');
      waveGrad.addColorStop(1, '#a55eea');
      ctx.fillStyle = waveGrad;
      ctx.beginPath();
      ctx.roundRect(48, 14, (canvas.width - 96) * waveProgress, 12, 6);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`ENDLESS • WAVE ${state.wave} (BEST: W${saveData.bestWave || 1})`, canvas.width / 2, 20);
    } else {
      const progress = Math.min(1, state.distance / state.targetDistance);
      const progGrad = ctx.createLinearGradient(48, 0, canvas.width - 48, 0);
      progGrad.addColorStop(0, state.mode === 'blitz' ? '#ff9f43' : '#0097e6');
      progGrad.addColorStop(1, state.mode === 'blitz' ? '#feca57' : '#00f2fe');
      ctx.fillStyle = progGrad;
      ctx.beginPath();
      ctx.roundRect(48, 14, (canvas.width - 96) * progress, 12, 6);
      ctx.fill();
    }
  }
}

// ==========================================
// 60 FPS 穩定鎖幀主迴圈
// ==========================================
let lastTime = 0;
const frameInterval = 1000 / 60;

function loop(timestamp) {
  requestAnimationFrame(loop);

  const deltaTime = timestamp - lastTime;
  if (deltaTime < frameInterval) return;
  lastTime = timestamp - (deltaTime % frameInterval);

  update();
  draw();
}

loadSave();
squad.count = getInitialTroops();
initMiniGamesUI();
initModeSelectorUI();
initHeroShopCardUI();
initHomeScreenUI();
initBattleUltimateUI();
refreshUI();
requestAnimationFrame(loop);