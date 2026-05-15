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
  Tengaar:  { level: 42, levels_gained: 7 }
};

const kobolds_luc = {
  Kirkis:   { level: 15, levels_gained: 3 },
  Luc:      { level: 12, levels_gained: 6 }
}

const party_sonierre = {
  McDohl:   { level: 27, levels_gained: 2 },
  Gremio:   { level: 27, levels_gained: 2, skip: true },
  Viktor:   { level: 27, levels_gained: 2, skip: true },
  Humphrey: { level: 23, levels_gained: 4, skip: true }
}

const party_lenankamp_manip = {
  McDohl:   { level: 8, levels_gained: 3 },
  Gremio:   { level: 8, levels_gained: 3 },
  Viktor:   { level: 8, levels_gained: 3 },
  Cleo:     { level: 8, levels_gained: 3 },
}

const party_res_rune = {
  McDohl:   { level: 29, levels_gained: 6 },
  Viktor:   { level: 35, levels_gained: 6 },
  Cleo:     { level: 25, levels_gained: 7 },
  Luc:      { level: 18, levels_gained: 8 },
  Flik:     { level: 31, levels_gained: 4 },
}

const party_3l1d1h = {
  McDohl:   { level: 41, levels_gained: 2 },
  Viktor:   { level: 40, levels_gained: 4, skip: true },
  Cleo:     { level: 40, levels_gained: 4 },
  Luc:      { level: 36, levels_gained: 7 },
  Flik:     { level: 41, levels_gained: 3 },
  Hix:      { level: 38, levels_gained: 5, skip: true },
}

const party_neclord = {
  Cleo:     { level: 44, levels_gained: 1 },
  Luc:      { level: 43, levels_gained: 1 },
  Flik:     { level: 44, levels_gained: 1 },
}

const party_shell = {
  McDohl:   { level: 51, levels_gained: 1, skip: true },
  Viktor:   { level: 44, levels_gained: 2, skip: true },
  Cleo:     { level: 45, levels_gained: 2, skip: true },
  Luc:      { level: 48, levels_gained: 2 },
  Grenseal: { level: 29, levels_gained: 1, skip: true },
  Tengaar:  { level: 50, levels_gained: 1 },
};

const party_sonya = {
  McDohl:   { level: 52, levels_gained: 1, skip: true },
  Viktor:   { level: 46, levels_gained: 1, skip: true },
  Cleo:     { level: 47, levels_gained: 2, skip: true },
  Luc:      { level: 48, levels_gained: 1 },
  Grenseal: { level: 30, levels_gained: 2, skip: true },
  Tengaar:  { level: 50, levels_gained: 1 },
};

const party_zombie_dragon = {
  McDohl:   { level: 22, levels_gained: 2 },
  Gremio:   { level: 22, levels_gained: 2 },
  Viktor:   { level: 22, levels_gained: 1, skip: true },
  Cleo:     { level: 22, levels_gained: 2 },
  "Tai Ho": { level: 10, levels_gained: 1, skip: true },
  Camille:  { level: 10, levels_gained: 1, skip: true },
}

const party_gregminster_b1 = {
  McDohl:   { level: 54, levels_gained: 1, skip: true },
  Viktor:   { level: 49, levels_gained: 4, skip: true },
  Flik:     { level: 52, levels_gained: 2, skip: true },
  Luc:      { level: 50, levels_gained: 4 },
  Hellion:  { level: 33, levels_gained: 6, skip: true },
  Tengaar:  { level: 53, levels_gained: 1 },
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

// B1 Luc 2nd w/Medicine
// B1 Luc 3rd w/Medicine
// B2 Luc 4th w/Medicine
// B3 Luc 3rd w/Medicine
// B3 Luc 4th w/Medicine

const STARTING_RNG = 0x42;
const levelups_to_generate = [
  // // McDohl 1st, McDohl 2nd, Kasumi Atk
  // { label: '1923 0x55', party: moravia_mcd_45, rng_indexes: [13401, 12817, 12695] },
  // // McDohl 2nd dead Krin, Kasumi Atk Krin dead
  // { label: '1923 0x55 Krin dead', party: moravia_mcd_45_krin_dies, rng_indexes: [12880, 13316] },
  // // McDohl 2nd, McDohl 1st, Kasumi Atk
  // { label: '2011 0x55', party: moravia_mcd_45, rng_indexes: [12937, 12864, 12896] },
  // // McDohl 2nd, McDohl 2nd Kasumi Atk
  // { label: '2011 0x55', party: moravia_mcd_45_krin_dies, rng_indexes: [12866, 12929] },
  // McDohl 1st WINNER, Kasumi > 160SPD Krin dies, Kasumi > 160SPD no one dies
  // { label: '2839 0x55', party: moravia_mcd_45, rng_indexes: [13895, 14334, 14339] },

  // { label: '2424 Krin dead', party: moravia_mcd_45_krin_dies, rng_indexes: [13637] },
  // McDohl 2nd, McDohl 1st
  // { label: '2431', party: moravia_mcd_45, rng_indexes: [13236, 13815] },
  // McDohl 1st Krin dead
  // { label: '2431', party: moravia_mcd_45_krin_dies, rng_indexes: [13336] },
  // { label: '2431 Krin dead', party: moravia_mcd_45_krin_dies, rng_indexes: [13260] },
  // { label: '1601 McD 1st', party: moravia_mcd_45, rng_indexes: [12441, 12450] },
  // { label: 'Sonya', party: party_sonya, rng_indexes: [28574, 28289] }
  // { label: 'Zombie Dragons', party: party_zombie_dragon, rng_indexes: [15592] },
  // McDohl 2nd, McDohl 1st, McDohl 2nd Kasumi Atk
  { label: '2050 0x55', party: moravia_mcd_45, rng_indexes: [12891, 14351, 13154] },
  // McDohl 2nd Krin dead, McDohl 2nd Krin dead Kasumi Atk
  { label: '2050 0x55 Krin dead', party: moravia_mcd_45_krin_dies, rng_indexes: [13476, 12960] },
  { label: 'Gregminster B1', party: party_gregminster_b1, rng_indexes: [24794, 24856, 26514, 26522] }
];

levelups_to_generate.forEach(levelup => generateLevelups(levelup));

function generateLevelups({ label, party, rng_indexes, headers }) {
  rng_indexes.forEach(rng_index => {
    const rng = new RNG(STARTING_RNG).next(rng_index);
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

    const csv_headers = [rng_index, 'start','index','PWR','SKL','DEF','SPD','MGC','LUK','HP'];
    const csv = [
      ...character_results
        .flat(3)
        .map(result => Object.values(result).join(','))
    ].join('\n');

    if (label) console.log(label, rng_index);
    if (headers) console.log(csv_headers.join(','));
    console.log(csv);
  });

}

