import { RUNES } from './Magic/Runes.js';

export default class Character {
  constructor(characterData) {
    this.name = characterData.name;
    this.LVL = characterData.LVL ?? 1;
    this.EXP = characterData.EXP ?? 0;

    this.HP = characterData.HP;
    this.currentHP = characterData.currentHP ?? this.HP;

    this.MP = characterData.MP ?? [0, 0, 0, 0];
    this.currentMP = characterData.currentMP ?? [...this.MP];

    this.PWR = characterData.PWR;
    this.SKL = characterData.SKL;
    this.DEF = characterData.DEF;
    this.SPD = characterData.SPD;
    this.MGC = characterData.MGC;
    this.LUK = characterData.LUK;

    this.weapon = characterData.weapon;
    this.growths = characterData.growths;

    this.rune = characterData.rune ?? RUNES.NONE;
  }
}
