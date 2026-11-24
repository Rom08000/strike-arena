import { DEFS } from './weapons.js';

export class Game {
  constructor({ hud, audio, weapons, player, bots, world }) {
    this.hud = hud;
    this.audio = audio;
    this.weapons = weapons;
    this.player = player;
    this.bots = bots;
    this.world = world;
    this.state = 'menu'; // menu | buy | playing | roundEnd | gameover
    this.money = 800;
    this.score = { ct: 0, t: 0 };
    this.round = 0;
    this.buyT = 0;
    this.roundT = 0;
    this.endT = 0;
    this.winScore = 5;
    this.onReady = () => {}; // main: request pointer lock
  }

  buyItems() {
    return [
      { key: '1', slotKey: 'ak', name: 'AK-47', price: 2700, desc: 'Fusil d\'assaut automatique, 600 coups/min, dégâts élevés' },
      { key: '2', slotKey: 'awp', name: 'AWP', price: 4750, desc: 'Fusil de sniper à lunette — un coup, un mort' },
      { key: '3', slotKey: 'deagle', name: 'Desert Eagle', price: 700, desc: 'Pistolet lourd très puissant (remplace le P2000)' },
      { key: '4', armor: true, helmet: false, name: 'Kevlar', price: 650, desc: 'Gilet pare-balles — réduit les dégâts de 50%' },
      { key: '5', armor: true, helmet: true, name: 'Kevlar + Casque', price: 1000, desc: 'Kevlar + protection contre les tirs à la tête' },
    ];
  }

  startMatch() {
    this.round = 0;
    this.score = { ct: 0, t: 0 };
    this.money = 800;
    this.player.resetMatch();
    this.weapons.resetInventory();
    this.hud.setScore(0, 0);
    this.hud.setMoney(this.money);
    this.nextRound();
  }

  nextRound() {
    this.round++;
    this.player.resetForRound();
    this.bots.reset();
    this.weapons.refill();
    this.hud.setRound(this.round);
    this.hud.setScore(this.score.ct, this.score.t);
    this.startBuy();
  }

  startBuy() {
    this.state = 'buy';
    if (typeof document !== 'undefined' && document.pointerLockElement) document.exitPointerLock();
    this.buyT = 20;
    this.hud.setBuyTimer(this.buyT);
    this.hud.setMoney(this.money);
    this.hud.showBuy();
    this._renderBuy();
    this.hud.banner('Round ' + this.round, 'Phase d\'achat — achetez puis cliquez PRÊT', 2600);
  }

  _renderBuy() {
    this.hud.renderBuy(
      this.buyItems(),
      this.money,
      (it) => it.slotKey ? this.weapons.has(DEFS[it.slotKey].slot) : this.player.armor >= 100,
      (it) => this.buy(it)
    );
  }

  buy(item) {
    if (this.state !== 'buy') return false;
    if (this.money < item.price) {
      this.audio.denied();
      return false;
    }
    this.money -= item.price;
    if (item.slotKey) {
      this.weapons.buyWeapon(item.slotKey);
    } else {
      this.player.armor = 100;
      this.player.helmet = !!item.helmet;
    }
    this.audio.buy();
    this.hud.setMoney(this.money);
    this._renderBuy();
    return true;
  }

  buyByIndex(i) {
    const items = this.buyItems();
    if (items[i]) this.buy(items[i]);
  }

  ready() {
    if (this.state !== 'buy') return;
    this.state = 'playing';
    this.roundT = 115;
    this.hud.hideBuy();
    this.hud.banner('Round ' + this.round, 'Éliminez tous les ennemis !', 2600);
    this.audio.roundStart();
    this.onReady();
  }

  update(dt) {
    if (this.state === 'buy') {
      this.buyT -= dt;
      this.hud.setBuyTimer(this.buyT);
      if (this.buyT <= 0) this.ready();
    } else if (this.state === 'playing') {
      this.roundT -= dt;
      this.hud.setTimer(this.roundT);
      if (this.roundT <= 0) this.endRound('t', 'Temps écoulé');
    } else if (this.state === 'roundEnd') {
      this.endT -= dt;
      if (this.endT <= 0) {
        if (this.score.ct >= this.winScore || this.score.t >= this.winScore) this.gameOver();
        else this.nextRound();
      }
    }
  }

  onKill(bot, head, weaponName) {
    if (this.state !== 'playing') return;
    this.money += 300;
    this.hud.setMoney(this.money);
    this.hud.killfeed(`<b>Vous</b> ▸ ${weaponName} ▸ <span class="t">${bot.name}</span>${head ? ' <span class="hs">[tête]</span>' : ''}`);
    if (this.bots.aliveCount() === 0) {
      this.endRound('ct', 'Tous les ennemis sont éliminés');
    }
  }

  onPlayerDeath() {
    if (this.state === 'playing') this.endRound('t', 'Vous êtes mort');
  }

  endRound(winner, reason) {
    if (this.state !== 'playing') return;
    this.state = 'roundEnd';
    this.endT = 4;
    this.score[winner]++;
    const gain = winner === 'ct' ? 3250 : 1400;
    this.money += gain;
    this.hud.setScore(this.score.ct, this.score.t);
    this.hud.setMoney(this.money);
    this.hud.banner(winner === 'ct' ? 'ROUND GAGNÉ' : 'ROUND PERDU', `${reason} — +$${gain}`, 3500);
    if (winner === 'ct') this.audio.win(); else this.audio.lose();
  }

  gameOver() {
    this.state = 'gameover';
    if (document.pointerLockElement) document.exitPointerLock();
    const win = this.score.ct > this.score.t;
    this.hud.gameover(win, this.score.ct, this.score.t);
    if (win) this.audio.win(); else this.audio.lose();
  }
}
