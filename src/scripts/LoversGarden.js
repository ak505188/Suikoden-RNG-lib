import { Areas } from '../lib/lib.js';
import RNG from '../lib/rng.js';

const rng = new RNG(0x12);

const greatForestBattles = Areas['Great Forest'].generateEncounters(rng, 40000, 0, true);

const validGreatForestBattles = [
  '6 Holly Boy',
  '3 Holly Boy 3 Holly Spirit',
  '2 Holly Boy 1 Holly Fairy',
  '5 Holly Boy 1 Holly Spirit'
];

const greatForestSpellCombos = [
  ['Firestorm', 2, false ],
  ['Firestorm', 3, false ],
  ['Firestorm', 2, true ],
  ['Firestorm', 3, true ],
  ['Dancing Flames', 2, false ],
  ['Dancing Flames', 3, false ],
  ['Dancing Flames', 2, true ],
  ['Dancing Flames', 3, true ]
]

for (const battle of greatForestBattles) {
  const spells = [
    { name: 'Firestorm', rngAdvancement: 0 },
    { name: 'Dancing Flames', rngAdvancement: 150 }
  ]
  const characterKillTurnOrder = [2, 3];
  if (validGreatForestBattles.indexOf(battle.enemyGroup.name) >= 0) {
    greatForestSpellCombos.forEach(spellCombo => {
      const rngAdvancement = calculateSpellAdvancement(spellCombo[0], spellCombo[1], battle.enemyGroup.enemies.length, spellCombo[2]);
      const rngForDrop = new RNG(battle.battleRNG)
        .getNext(rngAdvancement).rng;
      const drop = battle.enemyGroup.calculateDrop(new RNG(rngForDrop));
      if (drop === "Lover's Garden") {
        const name = spellCombo[0];
        const position = spellCombo[1];
        const attack = spellCombo[2] ? 'Attack' : 'No Attack';
        console.log(`${battle.index}, ${battle.enemyGroup.name}, ${battle.battleRNG.toString(16)}, ${name}, ${position}, ${attack}`);
      }
    })
  }
}

const dwarvesTrailBattles = Areas['Dwarves Trail'].generateEncounters(new RNG(rng.originalRNG), 40000, 0, true);

const validDwarfTrailBattles = [
  '3 Death Boar 1 Eagle Man',
  '3 Death Boar 2 Eagle Man',
  '1 Eagle Man',
  '2 Eagle Man',
  '3 Eagle Man'
];

const eaglemenOnlyBattles = validDwarfTrailBattles.slice(2, 5);

const rainstormCombos = [
  ['Rainstorm', 2, false ],
  ['Rainstorm', 3, false ],
  ['Rainstorm', 2, true ],
  ['Rainstorm', 3, true ],
]


for (const battle of dwarvesTrailBattles) {
  if (validDwarfTrailBattles.indexOf(battle.enemyGroup.name) >= 0) {
    const eaglemenOnly = eaglemenOnlyBattles.indexOf(battle.enemyGroup.name) >= 0;
    const spellCombos = eaglemenOnly ? greatForestSpellCombos.concat(rainstormCombos) : greatForestSpellCombos;
    spellCombos.forEach(spellCombo => {
      const rngAdvancement = calculateSpellAdvancement(spellCombo[0], spellCombo[1], battle.enemyGroup.enemies.length, spellCombo[2]);
      const rngForDrop = new RNG(battle.battleRNG)
        .getNext(rngAdvancement).rng;
      const drop = battle.enemyGroup.calculateDrop(new RNG(rngForDrop));
      if (drop === "Lover's Garden") {
        const name = spellCombo[0];
        const position = spellCombo[1];
        const attack = spellCombo[2] ? 'Attack' : 'No Attack';
        console.log(`${battle.index}, ${battle.enemyGroup.name}, ${battle.battleRNG.toString(16)}, ${name}, ${position}, ${attack}`);
      }
    })
  }
}

function calculateSpellAdvancement(name, position, enemyCount, withAttack) {
  const spells = {
    Firestorm: 0,
    'Dancing Flames': 150,
    Rainstorm: enemyCount => 26 + enemyCount * 2
  };

  const spellAdvancement = name === 'Rainstorm' ? spells.Rainstorm(enemyCount) : spells[name];
  const positionAdvancement = calculatePositionAdvancements(position, enemyCount);
  // hacky, not sure
  const attackAdvancements = withAttack ? 4 - position : 0;
  return 1 + spellAdvancement + positionAdvancement + attackAdvancements;
}

function calculatePositionAdvancements(position, enemyCount) {
  let advancement = 0;
  const positionAdvancements = [6, 5, 4, 3, 2, 1];
  for (let i = 0; i < positionAdvancements.length; i++) {
    if (i < position) {
      advancement += enemyCount;
    }
    advancement += positionAdvancements[i];
  }
  return advancement;
}
