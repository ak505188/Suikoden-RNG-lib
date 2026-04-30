import RNG from '../lib/rng.js';
import { generateLevelPermutations } from '../lib/lib.js';
import { generateCharacterMultipleLevelup } from '../stats/growths.js'

const NECLORD_SEGMENT_STARTING_RNG = 0x42;
const MORAVIA_RNG = 0x43;
const HOLY_STARTING_RNG = 0x30a82220;
const MARCO_STARTING_RNG = 0x12;

// Kasumi Atk Hell, McD 1st, McD 2nd
const KRIN_LIVES_RNG_INDEXES = [13268,13565,13642];

// Krin died Hell, Kasumi Atk Hell
const KRIN_DIES_RNG_INDEXES = [13555,13850];

const KOBOLD_INDEXES = [24405, 24407, 24879, 25403, 25407];

// Krin died Stallion S1 dies to soldier. Kasumi crit Ninja Black Shadow Flik Attack, Free Will Kasumi Crit
// Krin died, Kasumi crit Ninja Black Shadow Flik Tengaar Attack, Free Will Kasumi Crit
// Same but skip Tengaar Attack, Free Will McD kill
// const RNG_INDEXES = [8361, 8366, 8372];

// Krin lived McD/Tengaar/? slot 3, MBS FAN KAS, FW KC
// Krin lived, MBS FAN KAS, FW KA MC
// Krin lived, MBS FAS KAN, FW KA MC
// Krin lived, MBS FAS KAN TAS, FW KA MC
// const RNG_INDEXES = [8379, 8381, 8512, 8514];

const party_flik_died_neclord = {
  McDohl:   { level: 47, levels_gained: 3 },
  Flik:     { level: 45, levels_gained: 6 },
  Kasumi:   { level: 38, levels_gained: 8, skip: true },
  Stallion: { level: 16, levels_gained: 8, skip: true },
  Krin:     { level: 7, levels_gained: 8, skip: true },
  Tengaar:  { level: 38, levels_gained: 7 }
};

const party_flik_lived_neclord = {
  McDohl:   { level: 47, levels_gained: 3 },
  Flik:     { level: 47, levels_gained: 4 },
  Kasumi:   { level: 38, levels_gained: 8, skip: true },
  Stallion: { level: 16, levels_gained: 8, skip: true },
  Krin:     { level: 7, levels_gained: 8, skip: true },
  Tengaar:  { level: 38, levels_gained: 7 }
};

const party_flik_died_neclord_krin_dies = {
  McDohl:   { level: 47, levels_gained: 3 },
  Flik:     { level: 45, levels_gained: 6 },
  Kasumi:   { level: 38, levels_gained: 8, skip: true },
  Stallion: { level: 16, levels_gained: 8, skip: true },
  Tengaar:  { level: 38, levels_gained: 7 }
};

const party_flik_lived_neclord_krin_dies = {
  McDohl:   { level: 47, levels_gained: 3 },
  Flik:     { level: 47, levels_gained: 4 },
  Kasumi:   { level: 38, levels_gained: 8, skip: true },
  Stallion: { level: 16, levels_gained: 8, skip: true },
  Tengaar:  { level: 38, levels_gained: 7 }
};

const party_no_celadon = {
  McDohl:   { level: 1, levels_gained: 1 },
  Gremio:   { level: 1, levels_gained: 1 },
  Pahn:     { level: 1, levels_gained: 1 },
  Cleo:     { level: 1, levels_gained: 1 },
  Ted:      { level: 1, levels_gained: 1 }
};

const party_kobolds = {
  McDohl:   { level: 12, levels_gained: 10 },
  Gremio:   { level: 12, levels_gained: 10 },
  Viktor:   { level: 12, levels_gained: 10 },
  Cleo:     { level: 12, levels_gained: 10 },
}

const moravia_mcd_45 = {
  McDohl:   { level: 45, levels_gained: 6 },
  Flik:     { level: 47, levels_gained: 4 },
  Kasumi:   { level: 38, levels_gained: 8, skip: true },
  Stallion: { level: 16, levels_gained: 8, skip: true },
  Krin:     { level: 7, levels_gained: 8, skip: true },
  Tengaar:  { level: 42, levels_gained: 7 }
};

const moravia_mcd_45_krin_dies = {
  McDohl:   { level: 45, levels_gained: 6 },
  Flik:     { level: 47, levels_gained: 4 },
  Kasumi:   { level: 38, levels_gained: 8, skip: true },
  Stallion: { level: 16, levels_gained: 8, skip: true },
  Krin:     { level: 7, levels_gained: 8, skip: true },
  Tengaar:  { level: 42, levels_gained: 7 }
};

const kobolds_luc = {
  Kirkis:   { level: 15, levels_gained: 3 },
  Luc:      { level: 12, levels_gained: 6 }
}

// const party = party_flik_lived_neclord_krin_dies;

// Cleo > 48 SPD
// Cleo > 48 SPD McD Attack
// McD Medicine Cleo
// Cleo 46
// Cleo 46 McD Atk
// Cleo 48 SPD
// Cleo < 48 S3
// Cleo < 48 McD Atk S1 or S2
// const RNG_INDEXES = [11321, 11324, 11342, 11344, 11348, 11352, 11361, 11370];

// McD 2nd Hell
// McD 1st Hell
// Kasumi Atk Hell
// const RNG_INDEXES = [12441, 12457, 12839]

// const RNG_INDEXES = KRIN_DIES_RNG_INDEXES;

const RNG_INDEXES = KOBOLD_INDEXES;
const party = kobolds_luc;
const STARTING_RNG = MARCO_STARTING_RNG;

RNG_INDEXES.forEach(RNG_INDEX => {
  const rng = new RNG(STARTING_RNG).next(RNG_INDEX);
  const levels_gained = Object.values(party).map(char => char.levels_gained);

  const character_results = Object.entries(party).map(([name, data]) => {
    if (data.skip) return;
    const lvl_index = levels_gained.indexOf(data.levels_gained);
    const starting_levels = [
      ...levels_gained.slice(0, lvl_index),
      ...levels_gained.slice(lvl_index + 1)
    ];

    const permutations = generateLevelPermutations(starting_levels);
    return permutations.map(starting_levels_gained => {
      const rng_to_use = rng.cloneKeepIndex().next(starting_levels_gained * 7);
      const rng_to_use_index = rng_to_use.count;
      const stats = generateCharacterMultipleLevelup(
        rng_to_use,
        name,
        data.level,
        data.levels_gained
      ).reduce((total, stats) => {
        Object.entries(stats).forEach(([stat, value]) => {
          if (total[stat] == undefined) {
            total[stat] = value;
          } else {
            total[stat] += value
          }
        })
        return total;
      }, {});
      return { name, start: starting_levels_gained, index: rng_to_use_index, ...stats };
    })
  }).filter(res => res !== undefined);

  const csv_headers = ['name','start','index','PWR','SKL','DEF','SPD','MGC','LUK','HP'];
  const toCsv = (headers = csv_headers, results) => {
    const csv = [
      headers.join(','),
      ...results
        .flat(3)
        .map(result => Object.values(result).join(','))
    ];
    return csv.join('\n');
  }

  console.log(toCsv(csv_headers, character_results));
});
