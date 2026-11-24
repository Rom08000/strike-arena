# STRIKE ARENA — FPS navigateur style CS2

Un FPS tactique compétitif jouable **uniquement dans le navigateur** (aucune installation,
aucun téléchargement côté joueur : Three.js/WebGL est embarqué localement).

## Lancer le jeu

Les modules ES nécessitent un petit serveur HTTP local (le protocole `file://` est bloqué
par les navigateurs). Au choix :

```sh
./run.sh                      # puis ouvrir http://localhost:8000
# ou
python3 -m http.server 8000   # puis ouvrir http://localhost:8000
# ou
npx serve .
```

Puis cliquer sur **JOUER**.

## Comment jouer

- Objectif : gagner **5 rounds**. À chaque round, éliminez les **5 ennemis (T)** avant
  la fin du chrono (1:55). Vous jouez **CT** et défendez les sites A / B / mid.
- Phase d'achat de 20 s entre chaque round (touche **B** ou bouton PRÊT) : AK-47, AWP,
  Desert Eagle, Kevlar (+casque). Économie : +$300 par kill, +$3250 round gagné, +$1400 perdu.

### Contrôles

| Touche | Action |
|---|---|
| ZQSD / WASD | se déplacer |
| Souris | viser (pointer lock) |
| Clic gauche | tirer |
| Clic droit | visée (ADS) / lunette AWP |
| R | recharger |
| 1 / 2 / 3, molette, Q | changer d'arme |
| Maj | sprinter |
| Espace | sauter (caisses de 1 m franchissables) |
| C | s'accroupir |
| B | lancer le round (phase d'achat) / acheter (1-5) |
| Échap | pause |

## Réalisme implémenté

- Mouvement façon CS : accélération/friction, sprint, accroupissement, saut, gravité.
- Recul de caméra avec récupération progressive, **spread dynamique** (crosshair qui
  s'écarte en tirant / en bougeant), dégâts décroissants avec la distance, **headshots ×4**.
- Armes hitscan avec chargeur/réserve, rechargement animé, flash de bouche, traceurs,
  impacts (poussière/sang), viewmodel avec sway de marche.
- 5 bots ennemis avec IA : patrouille sur des routes (long A, tunnels B, sites, mid),
  détection (champ de vision + ligne de vue), temps de réaction, rafales, strafing,
  précision dépendante de la distance et de votre mouvement, saut s'ils sont bloqués.
- Map inspirée de Dust2 : spawn CT, mid avec portes, long A, tunnels B, sites A et B,
  couvertures (caisses, conteneurs, palettes, murs bas, barils).
- Rendu moderne : textures procédurales 1024px (fBm déformé) avec **normal maps +
  roughness maps**, **SSAO + bloom + étalonnage colorimétrique** (post-processing),
  ombres 4096 PCFSoft, ciel en dégradé avec halo solaire, brouillard, tone mapping ACES.
- HUD complet : crosshair dynamique, vie/armure, munitions, argent, chrono, score,
  killfeed, hitmarker (rouge sur headshot), indicateurs de dégâts directionnels,
  vignette de low-HP, **minimap radar**, écran de lunette AWP.
- Sons 100 % synthétisés en WebAudio : tirs (AK/Deagle/AWP), rechargements, pas,
  hitmarkers, dégâts, stingers de round, spatialisation (pan + atténuation distance),
  vent ambiant.

## Structure

```
index.html          page + HUD + menus
css/style.css       style du HUD et des overlays
js/vendor/three.module.js   moteur WebGL (embarqué, v0.160)
js/main.js          boucle de jeu, entrées, pointer lock
js/world.js         map, collisions AABB, raycasts, LOS
js/player.js        physique et caméra du joueur
js/weapons.js       armes, tir hitscan, recul, viewmodel
js/bots.js          IA ennemie
js/hud.js           HUD DOM + minimap
js/game.js          rounds, économie, achats
js/audio.js         synthèse sonore WebAudio
js/fx.js            traceurs, particules, flashs
js/textures.js      chargement textures PBR réelles (assets/) + fallback procédural
assets/textures/    textures PBR CC0 ambientCG (color + normal + rma) — ATTRIBUTION.md
assets/weapons/     modèles d'armes GLB CC0 (AK-47, AWP, Deagle, P2000) — ATTRIBUTION.md
```
