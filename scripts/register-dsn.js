import { ARGOS_SETS } from "./set.js";
import { DiceSFX } from "../../dice-so-nice/api.js";

const MODULE_ID = "argos-custom-faces";
const MODULE_PATH = `modules/${MODULE_ID}`;
const FACES_BASE = `${MODULE_PATH}/assets/faces/max`;

export class PlaySoundBunny extends DiceSFX {
    static id = "Bunny";
    static specialEffectName = "BunnySound";
    static path = `${MODULE_PATH}/assets/bunny.mp3`;
    static PLAY_ONLY_ONCE_PER_MESH = true;
    /**@override init */
    static async init(){
        game.audio.pending.push(function(){
            foundry.audio.AudioHelper.preloadSound(PlaySoundBunny.path);
        }.bind(this));
        return true;
    }

    /**@override play */
    async play(){
        foundry.audio.AudioHelper.play({
            src: PlaySoundBunny.path,
            volume: this.volume
		}, false);
    }
}


/* -------------------------------------------- */
/*  Settings                                    */
/* -------------------------------------------- */

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "rareCritChance", {
    name: "Rare Crit Chance",
    hint: "Chance (%) qu'un critique déclenche l'image spéciale.",
    scope: "world",
    config: true,
    type: Number,
    default: 30,
    range: {
      min: 0,
      max: 100,
      step: 1
    }
  });

  game.settings.register(MODULE_ID, "critFailSoundChance", {
    name: "Crit Fail Sound Chance",
    hint: "Chance (%) qu'un échec critique joue le son spécial.",
    scope: "world",
    config: true,
    type: Number,
    default: 30,
    range: {
      min: 0,
      max: 100,
      step: 1
    }
  });
});

/* -------------------------------------------- */
/*  Rare crit image                             */
/* -------------------------------------------- */

Hooks.on("diceSoNiceRollComplete", (messageId) => {
  const msg = game.messages.get(messageId);
  if (!msg) return;

  const rolls = msg.rolls ?? [];
  if (!rolls.length) return;

  let hasNat20 = false;
  let hasNat1 = false;

  for (const roll of rolls) {
    for (const die of roll.dice ?? []) {
      const isD20 =
        die.faces === 20 ||
        die.number === 20 ||
        die.constructor?.DENOMINATION === "d20";

      if (!isD20) continue;

      for (const result of die.results ?? []) {
        if (result.discarded || result.rerolled) continue;

        if (result.result === 20) hasNat20 = true;
        if (result.result === 1) hasNat1 = true;

        if (hasNat20 && hasNat1) break;
      }

      if (hasNat20 && hasNat1) break;
    }

    if (hasNat20 && hasNat1) break;
  }

  /* ---------- Critique réussite ---------- */

  if (hasNat20) {
    const chance =
      Number(game.settings.get(MODULE_ID, "rareCritChance") ?? 0) / 100;

    if (Math.random() < chance) {
      setTimeout(() => {
        console.log(`[${MODULE_ID}] Showing rare crit image for roll ${messageId}`);
        showRareCritImage(`${MODULE_PATH}/assets/goat.png`);
      }, 300);
    }
  }

  /* ---------- Critique échec ---------- */

  if (hasNat1) {
    const chance =
      Number(game.settings.get(MODULE_ID, "critFailSoundChance") ?? 0) / 100;

    if (Math.random() < chance) {
      setTimeout(() => {
        console.log(`[${MODULE_ID}] Playing crit fail sound for roll ${messageId}`);
        playCritFailSound(`${MODULE_PATH}/assets/crit-fail.mp3`);
      }, 300);
    }
  }
});

function showRareCritImage(src) {
  const existing = document.getElementById("argos-rare-crit");
  if (existing) existing.remove();

  const wrapper = document.createElement("div");
  wrapper.id = "argos-rare-crit";
  wrapper.style.position = "fixed";
  wrapper.style.inset = "0";
  wrapper.style.display = "flex";
  wrapper.style.alignItems = "center";
  wrapper.style.justifyContent = "center";
  wrapper.style.pointerEvents = "none";
  wrapper.style.zIndex = "10000";
  wrapper.style.background = "rgba(0, 0, 0, 0.15)";
  wrapper.style.opacity = "0";
  wrapper.style.transition = "opacity 180ms ease";

  const img = document.createElement("img");
  img.src = src;
  img.alt = "Rare Critical";
  img.style.maxWidth = "84vw";
  img.style.maxHeight = "84vh";
  img.style.filter = "drop-shadow(0 0 24px rgba(255,255,255,0.35))";
  img.style.transform = "scale(1.68)";
  img.style.transition = "transform 220ms ease";

  wrapper.appendChild(img);
  document.body.appendChild(wrapper);

  requestAnimationFrame(() => {
    wrapper.style.opacity = "1";
    img.style.transform = "scale(2)";
  });

  setTimeout(() => {
    wrapper.style.opacity = "0";
    img.style.transform = "scale(2.12)";
    setTimeout(() => wrapper.remove(), 220);
  }, 1500);
}

async function playCritFailSound(src) {
  try {
    await foundry.audio.AudioHelper.play(
      {
        src,
        volume: 0.8,
        loop: false
      },
      true
    );
  } catch (err) {
    console.error(`[${MODULE_ID}] Failed to play crit fail sound`, err);
  }
}

/* -------------------------------------------- */
/*  Dice So Nice                                */
/* -------------------------------------------- */

Hooks.once("diceSoNiceReady", (dice3d) => {
  if (!Array.isArray(ARGOS_SETS) || !ARGOS_SETS.length) {
    console.warn(`[${MODULE_ID}] No sets found in set.js`);
    return;
  }
  dice3d.addSFXMode(PlaySoundBunny);
  registerArgosSystems(dice3d, ARGOS_SETS);
});

function registerArgosSystems(dice3d, sets) {
  const STANDARD_DICE = [
    { type: "d4", max: 4 },
    { type: "d6", max: 6 },
    { type: "d8", max: 8 },
    { type: "d12", max: 12 },
    { type: "d20", max: 20 }
  ];

  const numericLabels = (max) =>
    Array.from({ length: max }, (_, i) => String(i + 1));

  const d10Labels = (mode) =>
    mode === "zero"
      ? ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]
      : ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

  const replaceMax = (labels, imgPath) => {
    const out = [...labels];
    out[out.length - 1] = imgPath;
    return out;
  };

  const bumpMapsForMaxOnly = (length, bumpPathOrNull) => {
    const out = Array.from({ length }, () => null);
    out[out.length - 1] = bumpPathOrNull ?? null;
    return out;
  };

  const imageFor = (setId, dieType) => `${FACES_BASE}/${setId}/${dieType}.png`;
  const bumpFor = (setId, dieType, hasBump) =>
    hasBump ? `${FACES_BASE}/${setId}/${dieType}_bump.png` : null;

  const addPreset = ({ systemId, dieType, baseLabels, imgMax, bumpMax }) => {
    dice3d.addDicePreset({
      type: dieType,
      system: systemId,
      labels: replaceMax(baseLabels, imgMax),
      bumpMaps: bumpMapsForMaxOnly(baseLabels.length, bumpMax)
    });
  };

  for (const rawSet of sets) {
    if (!rawSet?.id || !rawSet?.name) {
      console.warn(`[${MODULE_ID}] Skipping invalid set entry:`, rawSet);
      continue;
    }

    const setId = String(rawSet.id);
    const systemId = `argos-${setId}`;
    const systemName = String(rawSet.name);
    const hasBump = Boolean(rawSet.bump);
    const setGroup = String(rawSet.group ?? "Argos");
    const d10Mode = String(rawSet.d10Mode ?? "auto").toLowerCase();

    dice3d.addSystem(
      {
        id: systemId,
        name: systemName,
        group: setGroup
      },
      "preferred"
    );

    for (const die of STANDARD_DICE) {
      addPreset({
        systemId,
        dieType: die.type,
        baseLabels: numericLabels(die.max),
        imgMax: imageFor(setId, die.type),
        bumpMax: bumpFor(setId, die.type, hasBump)
      });
    }

    const d10Img = imageFor(setId, "d10");
    const d10Bump = bumpFor(setId, "d10", hasBump);

    if (d10Mode === "auto") {
      addPreset({
        systemId,
        dieType: "d10",
        baseLabels: d10Labels("ten"),
        imgMax: d10Img,
        bumpMax: d10Bump
      });

      addPreset({
        systemId,
        dieType: "d10",
        baseLabels: d10Labels("zero"),
        imgMax: d10Img,
        bumpMax: d10Bump
      });
    } else {
      addPreset({
        systemId,
        dieType: "d10",
        baseLabels: d10Labels(d10Mode),
        imgMax: d10Img,
        bumpMax: d10Bump
      });
    }

    console.log(
      `[${MODULE_ID}] Registered set "${systemName}" as system "${systemId}"`
    );
  }

  console.log(`[${MODULE_ID}] Registered ${sets.length} DSN system(s).`);
}