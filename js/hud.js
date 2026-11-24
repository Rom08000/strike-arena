const $ = id => document.getElementById(id);

export class HUD {
  constructor() {
    this.el = {
      hud: $('hud'), vignette: $('vignette'), dmgOverlay: $('damage-overlay'),
      crosshair: $('crosshair'), hitmarker: $('hitmarker'),
      scoreCt: $('score-ct'), scoreT: $('score-t'), timer: $('timer'), roundNum: $('round-num'),
      killfeed: $('killfeed'), minimap: $('minimap'),
      hp: $('hp'), hpBar: $('hp-bar'), armor: $('armor'), armorBar: $('armor-bar'),
      weaponName: $('weapon-name'), mag: $('mag'), reserve: $('reserve'), money: $('money'),
      hint: $('hint'), dmgInd: $('dmg-indicators'), scope: $('scope'),
      banner: $('banner'), bannerMain: $('banner-main'), subBanner: $('sub-banner'),
      menu: $('menu'), pause: $('pause'), buy: $('buy'), gameover: $('gameover'),
      buyItems: $('buy-items'), buyMoney: $('buy-money'), buyTimer: $('buy-timer'),
      goTitle: $('go-title'), goScore: $('go-score'),
    };
    this._hmTimer = null;
    this._bannerTimer = null;
    this._mmCtx = this.el.minimap.getContext('2d');
  }

  show(name) { this.el[name].classList.remove('hidden'); }
  hide(name) { this.el[name].classList.add('hidden'); }

  setHp(v) {
    v = Math.max(0, Math.ceil(v));
    this.el.hp.textContent = v;
    this.el.hpBar.style.width = v + '%';
    this.el.vignette.classList.toggle('low', v < 35 && v > 0);
    if (v === 0) this.el.vignette.classList.remove('low');
  }

  setArmor(v) {
    v = Math.max(0, Math.ceil(v));
    this.el.armor.textContent = v;
    this.el.armorBar.style.width = v + '%';
  }

  setAmmo(mag, reserve, name) {
    this.el.mag.textContent = mag;
    this.el.mag.classList.toggle('low', mag <= 5);
    this.el.reserve.textContent = '/ ' + reserve;
    this.el.weaponName.textContent = name;
  }

  setMoney(m) { this.el.money.textContent = '$' + m; this.el.buyMoney.textContent = '$' + m; }

  setTimer(sec) {
    sec = Math.max(0, Math.ceil(sec));
    const m = (sec / 60) | 0;
    const s = sec % 60;
    this.el.timer.textContent = m + ':' + String(s).padStart(2, '0');
    this.el.timer.classList.toggle('low', sec < 20);
  }

  setScore(ct, t) {
    this.el.scoreCt.textContent = ct;
    this.el.scoreT.textContent = t;
  }

  setRound(n) { this.el.roundNum.textContent = 'Round ' + n; }

  setCrosshairGap(px) {
    this.el.crosshair.style.setProperty('--gap', Math.max(2, px).toFixed(1) + 'px');
  }

  setCrosshairVisible(v) {
    this.el.crosshair.style.display = v ? 'block' : 'none';
  }

  hitmarker(head) {
    const el = this.el.hitmarker;
    el.classList.remove('show', 'head');
    void el.offsetWidth;
    el.classList.add('show');
    if (head) el.classList.add('head');
    clearTimeout(this._hmTimer);
    this._hmTimer = setTimeout(() => el.classList.remove('show', 'head'), 130);
  }

  killfeed(html) {
    const d = document.createElement('div');
    d.className = 'kf';
    d.innerHTML = html;
    this.el.killfeed.prepend(d);
    while (this.el.killfeed.children.length > 5) this.el.killfeed.lastChild.remove();
    setTimeout(() => { d.style.opacity = '0'; }, 4600);
    setTimeout(() => { d.remove(); }, 5200);
  }

  banner(main, sub = '', ms = 2500) {
    this.el.bannerMain.textContent = main;
    this.el.subBanner.textContent = sub;
    this.el.banner.classList.remove('hidden');
    clearTimeout(this._bannerTimer);
    this._bannerTimer = setTimeout(() => this.el.banner.classList.add('hidden'), ms);
  }

  damageFlash() {
    const el = this.el.dmgOverlay;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }

  damageFrom(relAngle) {
    const d = document.createElement('div');
    d.className = 'dmg-ind';
    d.style.transform = `rotate(${relAngle}rad)`;
    this.el.dmgInd.appendChild(d);
    setTimeout(() => d.remove(), 950);
  }

  scope(on) {
    this.el.scope.classList.toggle('hidden', !on);
  }

  hint(text) {
    if (!text) {
      this.el.hint.classList.add('hidden');
    } else {
      this.el.hint.textContent = text;
      this.el.hint.classList.remove('hidden');
    }
  }

  renderBuy(items, money, owned, onBuy) {
    this.el.buyItems.innerHTML = '';
    for (const it of items) {
      const d = document.createElement('div');
      d.className = 'buy-item' + (owned(it) ? ' owned' : '') + (money < it.price && !owned(it) ? ' cant' : '');
      d.innerHTML = `<span class="key">${it.key}</span><span class="nm">${it.name}</span><span class="ds">${it.desc}</span><span class="pr">$${it.price}</span>`;
      d.addEventListener('click', () => onBuy(it));
      this.el.buyItems.appendChild(d);
    }
  }

  showBuy() { this.show('buy'); }
  hideBuy() { this.hide('buy'); }
  setBuyTimer(s) { this.el.buyTimer.textContent = Math.max(0, Math.ceil(s)); }

  gameover(win, ct, t) {
    this.el.goTitle.textContent = win ? 'VICTOIRE' : 'DÉFAITE';
    this.el.goTitle.className = win ? 'win' : 'lose';
    this.el.goScore.textContent = ct + ' — ' + t;
    this.show('gameover');
  }

  minimap(player, bots, rects) {
    const ctx = this._mmCtx;
    const W = this.el.minimap.width, H = this.el.minimap.height;
    const scale = W / 112;
    const ox = 56, oz = 56;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(18,22,17,0.92)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#8a8f84';
    for (const r of rects) {
      ctx.fillRect((r.x1 + ox) * scale, (r.z1 + oz) * scale, Math.max(1, (r.x2 - r.x1) * scale), Math.max(1, (r.z2 - r.z1) * scale));
    }
    ctx.fillStyle = '#ff5040';
    for (const b of bots) {
      if (!b.alive) continue;
      ctx.beginPath();
      ctx.arc((b.pos.x + ox) * scale, (b.pos.z + oz) * scale, 3, 0, 7);
      ctx.fill();
    }
    const px = (player.pos.x + ox) * scale;
    const py = (player.pos.z + oz) * scale;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(player.yaw);
    ctx.fillStyle = '#7dff6a';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4.5, 5);
    ctx.lineTo(-4.5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
