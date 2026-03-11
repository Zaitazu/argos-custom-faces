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

export class PlaySoundMwiline extends DiceSFX {
    static id = "Mwiline";
    static specialEffectName = "MwilineSound";
    static path = `${MODULE_PATH}/assets/mwiline.mp3`;
    static PLAY_ONLY_ONCE_PER_MESH = true;
    /**@override init */
    static async init(){
        game.audio.pending.push(function(){
            foundry.audio.AudioHelper.preloadSound(PlaySoundMwiline.path);
        }.bind(this));
        return true;
    }

    /**@override play */
    async play(){
        foundry.audio.AudioHelper.play({
            src: PlaySoundMwiline.path,
            volume: this.volume
		}, false);
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
  dice3d.addSFXMode(PlaySoundMwiline);
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
  }
  console.log(`[${MODULE_ID}] Registered ${sets.length} DSN system(s).`);
}