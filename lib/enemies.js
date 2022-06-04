export const enemies = {
  "Cave of the Past": {
    "name": "Cave of the Past",
    "encounterRate": 2,
    "encounters": [
      { "name": "1 Banshee",
        "parseString": "1 Banshee" },
      { "name": "2 Banshee",
        "parseString": "2 Banshee" },
      { "name": "3 Banshee",
        "parseString": "3 Banshee" },
      { "name": "1 Clay Doll",
        "parseString": "1 ClayDoll" },
      { "name": "2 Clay Doll",
        "parseString": "2 ClayDoll" },
      { "name": "3 Clay Doll",
        "parseString": "3 ClayDoll" },
      { "name": "1 Banshee 1 Clay Doll ",
        "parseString": "1 Banshee 1 ClayDoll " },
      { "name": "2 Banshee 1 Clay Doll",
        "parseString": "2 Banshee 1 ClayDoll" },
      { "name": "3 Red Elemental 1 Clay Doll",
        "parseString": "3 RedElemental 1 ClayDoll" },
      { "name": "3 Red Elemental 1 Banshee",
        "parseString": "3 RedElemental 1 Banshee" },
      { "name": "3 Red Elemental 2 Banshee",
        "parseString": "3 RedElemental 2 Banshee" }],
    "enemies": {
      "Banshee": {
        "bits": 2200,
        "drops": [
          {
            "item": "Escape Talisman",
            "rate": 15
          },
          {
            "item": "Graffiti",
            "rate": 6
          },
          {
            "item": "Landscape Painting",
            "rate": 3
          }
        ],
        "stats": {
          "DEF": 40,
          "HP": 120,
          "LUK": 70,
          "MGC": 180,
          "PWR": 270,
          "SKL": 110,
          "SPD": 90,
          "lvl": 41
        }
      },
      "ClayDoll": {
        "bits": 1500,
        "drops": [
          {
            "item": "Full Armor",
            "rate": 5
          },
          {
            "item": "Mega Medicine x3",
            "rate": 7
          }
        ],
        "stats": {
          "DEF": 70,
          "HP": 450,
          "LUK": 35,
          "MGC": 160,
          "PWR": 280,
          "SKL": 35,
          "SPD": 65,
          "lvl": 44
        }
      },
      "RedElemental": {
        "bits": 1300,
        "drops": [
          {
            "item": "Speed Rune Piece",
            "rate": 5
          }
        ],
        "stats": {
          "DEF": 40,
          "HP": 80,
          "LUK": 66,
          "MGC": 150,
          "PWR": 250,
          "SKL": 90,
          "SPD": 130,
          "lvl": 42
        }
      }
    },
    "areaType": "Dungeon"
  },
  "Dragon Knights Area": {
    "name": "Dragon Knights Area",
    "encounterRate": 8,
    "encounters": [
      { "name": "1 Ivy",
        "parseString": "1 Ivy" },
      { "name": "2 Ivy",
        "parseString": "2 Ivy" },
      { "name": "3 Ivy",
        "parseString": "3 Ivy" },
      { "name": "1 Shadow Man",
        "parseString": "1 ShadowMan" },
      { "name": "2 Shadow Man",
        "parseString": "2 ShadowMan" },
      { "name": "2 Mirage",
        "parseString": "2 Mirage" },
      { "name": "4 Mirage",
        "parseString": "4 Mirage" },
      { "name": "3 Ivy 1 Shadow Man 1 Mirage",
        "parseString": "3 Ivy 1 ShadowMan 1 Mirage" }],
    "enemies": {
      "Ivy": {
        "bits": 2000,
        "drops": [
          {
            "item": "Hex Doll",
            "rate": 6
          },
          {
            "item": "Peeing Boy",
            "rate": 6
          },
          {
            "item": "Knight Statue",
            "rate": 2
          }
        ],
        "stats": {
          "DEF": 80,
          "HP": 250,
          "LUK": 25,
          "MGC": 170,
          "PWR": 290,
          "SKL": 70,
          "SPD": 110,
          "lvl": 49
        }
      },
      "Mirage": {
        "bits": 2400,
        "drops": [
          {
            "item": "Speed Ring",
            "rate": 6
          }
        ],
        "stats": {
          "DEF": 95,
          "HP": 400,
          "LUK": 70,
          "MGC": 175,
          "PWR": 330,
          "SKL": 130,
          "SPD": 120,
          "lvl": 52
        }
      },
      "ShadowMan": {
        "bits": 2000,
        "drops": [
          {
            "item": "Silverlet",
            "rate": 10
          },
          {
            "item": "Rose Brooch",
            "rate": 10
          }
        ],
        "stats": {
          "DEF": 60,
          "HP": 400,
          "LUK": 90,
          "MGC": 60,
          "PWR": 310,
          "SKL": 150,
          "SPD": 130,
          "lvl": 50
        }
      }
    },
    "areaType": "World Map"
  },
  "Dragons Den": {
    "name": "Dragon's Den",
    "encounterRate": 3,
    "encounters": [
      { "name": "1 Sunshine King",
        "parseString": "1 SunshineKing" },
      { "name": "1 Magic Shield",
        "parseString": "1 MagicShield" },
      { "name": "2 Magic Shield",
        "parseString": "2 MagicShield" },
      { "name": "3 Magic Shield",
        "parseString": "3 MagicShield" },
      { "name": "1 Magic Shield 1 Sunshine King",
        "parseString": "1 MagicShield 1 SunshineKing" },
      { "name": "3 Black Elemental 1 Sunshine King",
        "parseString": "3 BlackElemental 1 SunshineKing" },
      { "name": "3 Black Elemental 2 Magic Shield",
        "parseString": "3 BlackElemental 2 MagicShield" }],
    "enemies": {
      "BlackElemental": {
        "bits": 1600,
        "drops": [
          {
            "item": "Magic Rune Piece",
            "rate": 5
          }
        ],
        "stats": {
          "DEF": 60,
          "HP": 120,
          "LUK": 66,
          "MGC": 240,
          "PWR": 270,
          "SKL": 100,
          "SPD": 140,
          "lvl": 48
        }
      },
      "MagicShield": {
        "bits": 2700,
        "drops": [
          {
            "item": "Earth Shield",
            "rate": 10
          }
        ],
        "stats": {
          "DEF": 130,
          "HP": 190,
          "LUK": 37,
          "MGC": 230,
          "PWR": 280,
          "SKL": 80,
          "SPD": 100,
          "lvl": 49
        }
      },
      "SunshineKing": {
        "bits": 6000,
        "drops": [
          {
            "item": "Window Setting #3",
            "rate": 15
          },
          {
            "item": "Cyclone Rune",
            "rate": 6
          }
        ],
        "stats": {
          "DEF": 100,
          "HP": 1600,
          "LUK": 50,
          "MGC": 280,
          "PWR": 340,
          "SKL": 95,
          "SPD": 95,
          "lvl": 50
        }
      }
    },
    "areaType": "Dungeon"
  },
  "Dwarves Trail": {
    "name": "Dwarves Trail",
    "encounterRate": 2,
    "encounters": [
      { "name": "3 Dwarf 2 Eagle Man",
        "parseString": "3 Dwarf 2 EagleMan" },
      { "name": "1 Eagle Man",
        "parseString": "1 EagleMan" },
      { "name": "2 Eagle Man",
        "parseString": "2 EagleMan" },
      { "name": "3 Eagle Man",
        "parseString": "3 EagleMan" },
      { "name": "1 Dwarf",
        "parseString": "1 Dwarf" },
      { "name": "2 Dwarf",
        "parseString": "2 Dwarf" },
      { "name": "3 Dwarf",
        "parseString": "3 Dwarf" },
      { "name": "1 Death Boar",
        "parseString": "1 DeathBoar" },
      { "name": "2 Death Boar",
        "parseString": "2 DeathBoar" },
      { "name": "3 Death Boar",
        "parseString": "3 DeathBoar" },
      { "name": "3 Death Boar 1 Eagle Man",
        "parseString": "3 DeathBoar 1 EagleMan" },
      { "name": "3 Death Boar 1 Dwarf",
        "parseString": "3 DeathBoar 1 Dwarf" },
      { "name": "3 Death Boar 2 Eagle Man",
        "parseString": "3 DeathBoar 2 EagleMan" },
      { "name": "3 Death Boar 1 Dwarf 1 Eagle Man",
        "parseString": "3 DeathBoar 1 Dwarf 1 EagleMan" }],
    "enemies": {
      "DeathBoar": {
        "bits": 800,
        "drops": [
          {
            "item": "Fur Cape",
            "rate": 10
          },
          {
            "item": "Boar Rune",
            "rate": 4
          }
        ],
        "stats": {
          "DEF": 45,
          "HP": 350,
          "LUK": 25,
          "MGC": 10,
          "PWR": 182,
          "SKL": 40,
          "SPD": 35,
          "lvl": 17
        }
      },
      "Dwarf": {
        "bits": 400,
        "drops": [
          {
            "item": "Karate Uniform",
            "rate": 10
          }
        ],
        "stats": {
          "DEF": 55,
          "HP": 300,
          "LUK": 36,
          "MGC": 25,
          "PWR": 170,
          "SKL": 58,
          "SPD": 56,
          "lvl": 21
        }
      },
      "EagleMan": {
        "bits": 550,
        "drops": [
          {
            "item": "Graffiti",
            "rate": 6
          },
          {
            "item": "Flower Painting",
            "rate": 6
          },
          {
            "item": "Lover's Garden",
            "rate": 2
          }
        ],
        "stats": {
          "DEF": 55,
          "HP": 150,
          "LUK": 40,
          "MGC": 40,
          "PWR": 165,
          "SKL": 75,
          "SPD": 68,
          "lvl": 22
        }
      }
    },
    "areaType": "Dungeon"
  },
  "Dwarves Vault": {
    "name": "Dwarves Vault",
    "encounterRate": 2,
    "encounters": [
      { "name": "1 Red Machine",
        "parseString": "1 DeathMachine(sword)" },
      { "name": "2 Red Machine",
        "parseString": "2 DeathMachine(sword)" },
      { "name": "3 Red Machine",
        "parseString": "3 DeathMachine(sword)" },
      { "name": "1 Blue Machine",
        "parseString": "1 DeathMachine(spear)" },
      { "name": "2 Blue Machine",
        "parseString": "2 DeathMachine(spear)" },
      { "name": "3 Blue Machine",
        "parseString": "3 DeathMachine(spear)" },
      { "name": "1 Crimson Dwarf",
        "parseString": "1 CrimsonDwarf" },
      { "name": "2 Crimson Dwarf",
        "parseString": "2 CrimsonDwarf" },
      { "name": "3 Crimson Dwarf",
        "parseString": "3 CrimsonDwarf" },
      { "name": "2 Death Boar",
        "parseString": "2 DeathBoar" },
      { "name": "3 Death Boar",
        "parseString": "3 DeathBoar" },
      { "name": "3 Crimson Dwarf 1 Red Machine",
        "parseString": "3 CrimsonDwarf 1 DeathMachine(sword)" },
      { "name": "3 Crimson Dwarf 2 Red Machine",
        "parseString": "3 CrimsonDwarf 2 DeathMachine(sword)" },
      { "name": "3 Crimson Dwarf 3 Red Machine",
        "parseString": "3 CrimsonDwarf 3 DeathMachine(sword)" }],
    "enemies": {
      "CrimsonDwarf": {
        "bits": 600,
        "drops": [
          {
            "item": "Medicine x6",
            "rate": 12
          },
          {
            "item": "Escape Talisman",
            "rate": 6
          }
        ],
        "stats": {
          "DEF": 35,
          "HP": 250,
          "LUK": 38,
          "MGC": 27,
          "PWR": 175,
          "SKL": 45,
          "SPD": 60,
          "lvl": 23
        }
      },
      "DeathBoar": {
        "bits": 800,
        "drops": [
          {
            "item": "Fur Cape",
            "rate": 10
          },
          {
            "item": "Boar Rune",
            "rate": 4
          }
        ],
        "stats": {
          "DEF": 45,
          "HP": 350,
          "LUK": 25,
          "MGC": 10,
          "PWR": 182,
          "SKL": 40,
          "SPD": 35,
          "lvl": 17
        }
      },
      "DeathMachine(sword)": {
        "bits": 550,
        "drops": [
          {
            "item": "Steel Shield",
            "rate": 10
          }
        ],
        "stats": {
          "DEF": 60,
          "HP": 150,
          "LUK": 0,
          "MGC": 0,
          "PWR": 180,
          "SKL": 40,
          "SPD": 55,
          "lvl": 25
        }
      },
      "DeathMachine(spear)": {
        "bits": 400,
        "drops": [
          {
            "item": "Steel Shield",
            "rate": 10
          }
        ],
        "stats": {
          "DEF": 65,
          "HP": 170,
          "LUK": 0,
          "MGC": 0,
          "PWR": 185,
          "SKL": 45,
          "SPD": 50,
          "lvl": 25
        }
      }
    },
    "areaType": "Dungeon"
  },
  "Grady's Mansion": {
    "name": "Grady's Mansion",
    "encounterRate": 0,
    "encounters": [
      { "name": "2 Empire Soldier",
        "parseString": "2 EmpireSoldierSword" },
      { "name": "5 Empire Soldier 1 Empire Captain",
        "parseString": "3 EmpireSoldierSpear 2 EmpireSoldierBow 1 EmpireCaptain" }
    ],
    "enemies": {
      "EmpireCaptain": {
        "bits": 250,
        "drops": [
          {
            "item": "Graffiti",
            "rate": 6
          },
          {
            "item": "Flower Painting",
            "rate": 6
          },
          {
            "item": "Lover's Garden",
            "rate": 2
          }
        ],
        "stats": {
          "DEF": 15,
          "HP": 90,
          "LUK": 26,
          "MGC": 15,
          "PWR": 80,
          "SKL": 45,
          "SPD": 10,
          "lvl": 10
        }
      },
      "EmpireSoldierSword": {
        "bits": 140,
        "drops": [
          {
            "item": "Headband",
            "rate": 9
          }
        ],
        "stats": {
          "DEF": 5,
          "HP": 50,
          "LUK": 25,
          "MGC": 12,
          "PWR": 65,
          "SKL": 55,
          "SPD": 25,
          "lvl": 8
        }
      },
      "EmpireSoldierBow": {
        "bits": 130,
        "drops": [],
        "stats": {
          "DEF": 5,
          "HP": 44,
          "LUK": 17,
          "MGC": 9,
          "PWR": 60,
          "SKL": 65,
          "SPD": 33,
          "lvl": 8
        }
      },
      "EmpireSoldierSpear": {
        "bits": 100,
        "drops": [],
        "stats": {
          "DEF": 7,
          "HP": 55,
          "LUK": 14,
          "MGC": 8,
          "PWR": 60,
          "SKL": 55,
          "SPD": 15,
          "lvl": 8
        }
      }
    },
    "areaType": null
  },
  "Great Forest": {
    "name": "Great Forest",
    "encounterRate": 2,
    "encounters": [
      { "name": "1 Kobold",
        "parseString": "1 Kobold(sword)" },
      { "name": "3 Kobold",
        "parseString": "3 Kobold(sword)" },
      { "name": "6 Kobold",
        "parseString": "3 Kobold(sword) 3 Kobold(bow)" },
      { "name": "2 Kobold",
        "parseString": "2 Kobold(bow)" },
      { "name": "2 Holly Boy 1 Holly Spirit",
        "parseString": "2 HollyBoy 1 HollySpirit" },
      { "name": "5 Holly Boy 1 Holly Spirit",
        "parseString": "5 HollyBoy 1 HollySpirit" },
      { "name": "3 Holly Boy 3 Holly Spirit",
        "parseString": "3 HollyBoy 3 HollySpirit" },
      { "name": "6 Holly Boy",
        "parseString": "6 HollyBoy" }],
    "enemies": {
      "HollyBoy": {
        "bits": 150,
        "drops": [
          {
            "item": "Graffiti",
            "rate": 6
          },
          {
            "item": "Flower Painting",
            "rate": 6
          },
          {
            "item": "Lover's Garden",
            "rate": 2
          }
        ],
        "stats": {
          "DEF": 40,
          "HP": 80,
          "LUK": 30,
          "MGC": 20,
          "PWR": 100,
          "SKL": 60,
          "SPD": 80,
          "lvl": 5
        }
      },
      "HollySpirit": {
        "bits": 500,
        "drops": [
          {
            "item": "Toe Shoes",
            "rate": 10
          },
          {
            "item": "Needle x4",
            "rate": 15
          }
        ],
        "stats": {
          "DEF": 55,
          "HP": 350,
          "LUK": 70,
          "MGC": 60,
          "PWR": 150,
          "SKL": 55,
          "SPD": 65,
          "lvl": 21
        }
      },
      "Kobold(sword)": {
        "bits": 200,
        "drops": [
          {
            "item": "Wooden Shield",
            "rate": 7
          }
        ],
        "stats": {
          "DEF": 42,
          "HP": 150,
          "LUK": 35,
          "MGC": 20,
          "PWR": 150,
          "SKL": 40,
          "SPD": 43,
          "lvl": 20
        }
      },
      "Kobold(bow)": {
        "bits": 150,
        "drops": [
          {
            "item": "Necklace",
            "rate": 7
          },
          {
            "item": "Medicine x6",
            "rate": 9
          }
        ],
        "stats": {
          "DEF": 42,
          "HP": 120,
          "LUK": 35,
          "MGC": 10,
          "PWR": 140,
          "SKL": 35,
          "SPD": 45,
          "lvl": 20
        }
      }
    },
    "areaType": "Dungeon"
  },
  "Gregminster Area 1": {
    "name": "Gregminster Area 1",
    "encounterRate": 8,
    "encounters": [
      { "name": "1 BonBon",
        "parseString": "1 BonBon" },
      { "name": "3 BonBon",
        "parseString": "3 BonBon" },
      { "name": "6 Mosquito",
        "parseString": "6 Mosquito" },
      { "name": "2 Crow",
        "parseString": "2 Crow" },
      { "name": "1 Wild Boar",
        "parseString": "1 WildBoar" },
      { "name": "1 Red Soldier Ant",
        "parseString": "1 RedSoldierAnt" },
      { "name": "2 Red Soldier Ant",
        "parseString": "2 RedSoldierAnt" },
      { "name": "3 Mosquito 1 Red Soldier Ant",
        "parseString": "3 Mosquito 1 RedSoldierAnt" },
      { "name": "2 Crow 1 Wild Boar",
        "parseString": "2 Crow 1 WildBoar" }],
    "enemies": {
      "BonBon": {
        "bits": 70,
        "drops": [
          {
            "item": "Failure Urn",
            "rate": 6
          },
          {
            "item": "Octopus Urn",
            "rate": 6
          },
          {
            "item": "Celadon Urn",
            "rate": 2
          }
        ],
        "stats": {
          "DEF": 5,
          "HP": 18,
          "LUK": 12,
          "MGC": 9,
          "PWR": 31,
          "SKL": 5,
          "SPD": 16,
          "lvl": 5
        }
      },
      "Crow": {
        "bits": 50,
        "drops": [
          {
            "item": "Bandanna",
            "rate": 6
          }
        ],
        "stats": {
          "DEF": 7,
          "HP": 15,
          "LUK": 24,
          "MGC": 5,
          "PWR": 30,
          "SKL": 70,
          "SPD": 27,
          "lvl": 4
        }
      },
      "Mosquito": {
        "bits": 20,
        "drops": [
          {
            "item": "Medicine x6",
            "rate": 5
          },
          {
            "item": "Holy Rune",
            "rate": 5
          }
        ],
        "stats": {
          "DEF": 6,
          "HP": 17,
          "LUK": 35,
          "MGC": 0,
          "PWR": 30,
          "SKL": 50,
          "SPD": 29,
          "lvl": 4
        }
      },
      "RedSoldierAnt": {
        "bits": 60,
        "drops": [
          {
            "item": "Pointed Hat",
            "rate": 10
          }
        ],
        "stats": {
          "DEF": 10,
          "HP": 28,
          "LUK": 3,
          "MGC": 0,
          "PWR": 48,
          "SKL": 18,
          "SPD": 22,
          "lvl": 8
        }
      },
      "WildBoar": {
        "bits": 300,
        "drops": [
          {
            "item": "Wind Rune Piece",
            "rate": 4
          }
        ],
        "stats": {
          "DEF": 19,
          "HP": 60,
          "LUK": 14,
          "MGC": 0,
          "PWR": 65,
          "SKL": 15,
          "SPD": 20,
          "lvl": 7
        }
      }
    },
    "areaType": "World Map"
  },
  "Gregminster Area 2": {
    "name": "Gregminster Area 2",
    "encounterRate": 8,
    "encounters": [
      { "name": "3 Ninja Master 1 Simurgh",
        "parseString": "3 NinjaMaster 1 Simurgh" },
      { "name": "1 Ninja Master",
        "parseString": "1 NinjaMaster" },
      { "name": "2 Ninja Master",
        "parseString": "2 NinjaMaster" },
      { "name": "3 Ninja Master",
        "parseString": "3 NinjaMaster" },
      { "name": "1 Simurgh",
        "parseString": "1 Simurgh" },
      { "name": "2 Simurgh",
        "parseString": "2 Simurgh" },
      { "name": "3 Simurgh",
        "parseString": "3 Simurgh" },
      { "name": "1 Orc",
        "parseString": "1 Orc" },
      { "name": "2 Orc",
        "parseString": "2 Orc" },
      { "name": "3 Orc",
        "parseString": "3 Orc" },
      { "name": "3 Ninja Master 1 Orc",
        "parseString": "3 NinjaMaster 1 Orc" },
      { "name": "3 Ninja Master 2 Simurgh",
        "parseString": "3 NinjaMaster 2 Simurgh" },
      { "name": "3 Ninja Master 2 Orc",
        "parseString": "3 NinjaMaster 2 Orc" }],
    "enemies": {
      "NinjaMaster": {
        "bits": 5500,
        "drops": [
          {
            "item": "Crimson Cape",
            "rate": 12
          }
        ],
        "stats": {
          "DEF": 30,
          "HP": 400,
          "LUK": 60,
          "MGC": 120,
          "PWR": 330,
          "SKL": 140,
          "SPD": 170,
          "lvl": 55
        }
      },
      "Orc": {
        "bits": 7100,
        "drops": [
          {
            "item": "Graffiti",
            "rate": 6
          },
          {
            "item": "Lover's Garden",
            "rate": 6
          },
          {
            "item": "Beauties of Nature",
            "rate": 2
          }
        ],
        "stats": {
          "DEF": 5,
          "HP": 1500,
          "LUK": 30,
          "MGC": 30,
          "PWR": 340,
          "SKL": 30,
          "SPD": 15,
          "lvl": 57
        }
      },
      "Simurgh": {
        "bits": 6500,
        "drops": [
          {
            "item": "Thunder Rune",
            "rate": 8
          }
        ],
        "stats": {
          "DEF": 45,
          "HP": 700,
          "LUK": 55,
          "MGC": 160,
          "PWR": 315,
          "SKL": 80,
          "SPD": 130,
          "lvl": 56
        }
      }
    },
    "areaType": "World Map"
  },
  "Gregminster Palace": {
    "name": "Gregminster Palace",
    "encounterRate": 3,
    "encounters": [
      { "name": "1 Colossus",
        "parseString": "1 Colossus" },
      { "name": "2 Imperial Guards(sabre)",
        "parseString": "2 ImperialGuards(sabre)" },
      { "name": "3 Imperial Guards",
        "parseString": "3 ImperialGuards(sabre)" },
      { "name": "2 Imperial Guards(sword)",
        "parseString": "2 ImperialGuards(sword)" },
      { "name": "1 Phantom",
        "parseString": "1 Phantom" },
      { "name": "2 Phantom",
        "parseString": "2 Phantom" },
      { "name": "3 Phantom",
        "parseString": "3 Phantom" },
      { "name": "3 Imperial Guards 1 Ekidonna",
        "parseString": "3 ImperialGuards(sabre) 1 Ekidonna" },
      { "name": "3 Phantom 1 Ekidonna",
        "parseString": "3 Phantom 1 Ekidonna" },
      { "name": "3 Phantom 1 Colossus",
        "parseString": "3 Phantom 1 Colossus" },
      { "name": "3 ImperialGuards 1 Colossus",
        "parseString": "2 ImperialGuards(sabre) 1 ImperialGuards(sword) 1 Colossus" }],
    "enemies": {
      "Colossus": {
        "bits": 15000,
        "drops": [
          {
            "item": "Mother Earth Rune",
            "rate": 6
          },
          {
            "item": "Power Ring",
            "rate": 13
          }
        ],
        "stats": {
          "DEF": 90,
          "HP": 800,
          "LUK": 75,
          "MGC": 100,
          "PWR": 350,
          "SKL": 80,
          "SPD": 60,
          "lvl": 59
        }
      },
      "Ekidonna": {
        "bits": 20000,
        "drops": [
          {
            "item": "Windspun Armor",
            "rate": 8
          }
        ],
        "stats": {
          "DEF": 40,
          "HP": 1000,
          "LUK": 60,
          "MGC": 310,
          "PWR": 370,
          "SKL": 100,
          "SPD": 90,
          "lvl": 60
        }
      },
      "ImperialGuards(sabre)": {
        "bits": 5000,
        "drops": [],
        "stats": {
          "DEF": 130,
          "HP": 500,
          "LUK": 115,
          "MGC": 220,
          "PWR": 325,
          "SKL": 110,
          "SPD": 95,
          "lvl": 56
        }
      },
      "ImperialGuards(sword)": {
        "bits": 4500,
        "drops": [
          {
            "item": "Mega Medicine x3",
            "rate": 15
          }
        ],
        "stats": {
          "DEF": 130,
          "HP": 550,
          "LUK": 110,
          "MGC": 200,
          "PWR": 330,
          "SKL": 100,
          "SPD": 90,
          "lvl": 56
        }
      },
      "Phantom": {
        "bits": 6500,
        "drops": [
          {
            "item": "Earth Boots",
            "rate": 12
          }
        ],
        "stats": {
          "DEF": 70,
          "HP": 550,
          "LUK": 95,
          "MGC": 190,
          "PWR": 335,
          "SKL": 150,
          "SPD": 120,
          "lvl": 58
        }
      }
    },
    "areaType": "Dungeon"
  },
  "Kalekka": {
    "name": "Kalekka",
    "encounterRate": 4,
    "encounters": [
      { "name": "1 Demon Hound",
        "parseString": "1 DemonHound" },
      { "name": "2 Hawk Man",
        "parseString": "2 HawkMan" },
      { "name": "3 Hawk Man",
        "parseString": "3 HawkMan" },
      { "name": "4 Hawk Man",
        "parseString": "4 HawkMan" },
      { "name": "2 Shadow",
        "parseString": "2 Shadow" },
      { "name": "4 Shadow",
        "parseString": "4 Shadow" },
      { "name": "2 Hawk Man 2 Shadow",
        "parseString": "2 HawkMan 2 Shadow" }],
    "enemies": {
      "DemonHound": {
        "bits": 900,
        "drops": [
          {
            "item": "Silver Necklace",
            "rate": 7
          }
        ],
        "stats": {
          "DEF": 60,
          "HP": 700,
          "LUK": 45,
          "MGC": 75,
          "PWR": 250,
          "SKL": 70,
          "SPD": 65,
          "lvl": 37
        }
      },
      "HawkMan": {
        "bits": 1300,
        "drops": [
          {
            "item": "Failure Urn",
            "rate": 6
          },
          {
            "item": "Wide Urn",
            "rate": 6
          },
          {
            "item": "Black Urn",
            "rate": 2
          }
        ],
        "stats": {
          "DEF": 55,
          "HP": 300,
          "LUK": 55,
          "MGC": 40,
          "PWR": 245,
          "SKL": 90,
          "SPD": 99,
          "lvl": 35
        }
      },
      "Shadow": {
        "bits": 2000,
        "drops": [
          {
            "item": "Silverlet",
            "rate": 10
          },
          {
            "item": "Rose Brooch",
            "rate": 10
          }
        ],
        "stats": {
          "DEF": 45,
          "HP": 170,
          "LUK": 90,
          "MGC": 60,
          "PWR": 260,
          "SKL": 120,
          "SPD": 88,
          "lvl": 36
        }
      }
    },
    "areaType": "Dungeon"
  },
  "Kalekka Area": {
    "name": "Kalekka Area",
    "encounterRate": 8,
    "encounters": [
      { "name": "1 Dagon",
        "parseString": "1 Dagon" },
      { "name": "2 Dagon",
        "parseString": "2 Dagon" },
      { "name": "3 Dagon",
        "parseString": "3 Dagon" },
      { "name": "2 Grizzly Bear",
        "parseString": "2 GrizzlyBear" },
      { "name": "3 Grizzly Bear",
        "parseString": "3 GrizzlyBear" },
      { "name": "2 Dagon 1 Siren",
        "parseString": "2 Dagon 1 Siren" },
      { "name": "1 Grizzly Bear",
        "parseString": "1 GrizzlyBear" },
      { "name": "1 Siren",
        "parseString": "1 Siren" },
      { "name": "2 Siren",
        "parseString": "2 Siren" }],
    "enemies": {
      "Dagon": {
        "bits": 1100,
        "drops": [
          {
            "item": "Dragon Armor",
            "rate": 9
          },
          {
            "item": "Water Rune",
            "rate": 6
          }
        ],
        "stats": {
          "DEF": 50,
          "HP": 400,
          "LUK": 35,
          "MGC": 80,
          "PWR": 230,
          "SKL": 70,
          "SPD": 75,
          "lvl": 31
        }
      },
      "GrizzlyBear": {
        "bits": 1200,
        "drops": [
          {
            "item": "Head Gear",
            "rate": 10
          }
        ],
        "stats": {
          "DEF": 30,
          "HP": 470,
          "LUK": 10,
          "MGC": 35,
          "PWR": 280,
          "SKL": 50,
          "SPD": 50,
          "lvl": 34
        }
      },
      "Siren": {
        "bits": 2000,
        "drops": [
          {
            "item": "Prosperity Rune",
            "rate": 6
          }
        ],
        "stats": {
          "DEF": 20,
          "HP": 250,
          "LUK": 40,
          "MGC": 160,
          "PWR": 260,
          "SKL": 60,
          "SPD": 90,
          "lvl": 32
        }
      }
    },
    "areaType": "World Map"
  },
  "Kobold Village": {
    "name": "Kobold Village",
    "encounterRate": 0,
    "encounters": [
      { "name": "6 VeteranSoldier",
        "parseString": "6 VeteranSoldier(spear)" }
    ],
    "enemies": {
      "VeteranSoldier(spear)": {
        "bits": 700,
        "drops": [
          {
            "item": "Leather Armor",
            "rate": 8
          }
        ],
        "stats": {
          "DEF": 55,
          "HP": 270,
          "LUK": 45,
          "MGC": 40,
          "PWR": 190,
          "SKL": 55,
          "SPD": 70,
          "lvl": 26
        }
      }
    },
    "areaType": null
  },
  "Krazes Mansion": {
    "name": "Kraze's Mansion",
    "encounterRate": 0,
    "encounters": [],
    "enemies": {
      "EmpireSoldier": {
        "bits": 300,
        "drops": [
          {
            "item": "Brass Armor",
            "rate": 6
          }
        ],
        "stats": {
          "DEF": 40,
          "HP": 150,
          "LUK": 40,
          "MGC": 35,
          "PWR": 120,
          "SKL": 60,
          "SPD": 50,
          "lvl": 20
        }
      }
    },
    "areaType": null
  },
  "Lenankamp": {
    "name": "Lenankamp",
    "encounterRate": 0,
    "encounters": [],
    "enemies": {
      "EmpireSoldier": {
        "bits": 140,
        "drops": [],
        "stats": {
          "DEF": 6,
          "HP": 54,
          "LUK": 29,
          "MGC": 9,
          "PWR": 70,
          "SKL": 65,
          "SPD": 33,
          "lvl": 12
        }
      }
    },
    "areaType": null
  },
  "Lepants Mansion": {
    "name": "Lepant's Mansion",
    "encounterRate": 2,
    "encounters": [
      { "name": "1 Slot Man",
        "parseString": "1 SlotMan" },
      { "name": "3 Robot Soldier",
        "parseString": "3 RobotSoldier" },
      { "name": "6 Robot Soldier",
        "parseString": "6 RobotSoldier" }],
    "enemies": {
      "RobotSoldier": {
        "bits": 400,
        "drops": [
          {
            "item": "Failure Urn",
            "rate": 6
          },
          {
            "item": "Vase",
            "rate": 6
          },
          {
            "item": "Persian Lamp",
            "rate": 2
          }
        ],
        "stats": {
          "DEF": 70,
          "HP": 150,
          "LUK": 0,
          "MGC": 0,
          "PWR": 135,
          "SKL": 20,
          "SPD": 45,
          "lvl": 18
        }
      },
      "SlotMan": {
        "bits": 700,
        "drops": [
          {
            "item": "Failure Urn",
            "rate": 6
          },
          {
            "item": "Vase",
            "rate": 6
          },
          {
            "item": "Persian Lamp",
            "rate": 2
          }
        ],
        "stats": {
          "DEF": 50,
          "HP": 200,
          "LUK": 30,
          "MGC": 110,
          "PWR": 180,
          "SKL": 70,
          "SPD": 80,
          "lvl": 19
        }
      }
    },
    "areaType": "Dungeon"
  },
  "Lorimar Area": {
    "name": "Lorimar Area",
    "encounterRate": 8,
    "encounters": [
      { "name": "3 Hell Hound 1 Whip Wolf",
        "parseString": "3 HellHound 1 WhipWolf" },
      { "name": "1 Grave Master",
        "parseString": "1 GraveMaster" },
      { "name": "2 Grave Master",
        "parseString": "2 GraveMaster" },
      { "name": "1 Hell Hound",
        "parseString": "1 HellHound" },
      { "name": "2 Hell Hound",
        "parseString": "2 HellHound" },
      { "name": "3 Hell Hound",
        "parseString": "3 HellHound" },
      { "name": "1 Sorcerer",
        "parseString": "1 Sorcerer" },
      { "name": "2 Sorcerer",
        "parseString": "2 Sorcerer" },
      { "name": "3 Hell Hound 1 Sorcerer",
        "parseString": "3 HellHound 1 Sorcerer" },
      { "name": "3 Hell Hound 1 Grave Master",
        "parseString": "3 HellHound 1 GraveMaster" },
      { "name": "3 Hell Hound 2 Grave Master",
        "parseString": "3 HellHound 2 GraveMaster" }],
    "enemies": {
      "GraveMaster": {
        "bits": 2000,
        "drops": [
          {
            "item": "Full Helmet",
            "rate": 10
          },
          {
            "item": "Guard Ring",
            "rate": 7
          }
        ],
        "stats": {
          "DEF": 80,
          "HP": 400,
          "LUK": 55,
          "MGC": 75,
          "PWR": 270,
          "SKL": 30,
          "SPD": 50,
          "lvl": 39
        }
      },
      "HellHound": {
        "bits": 700,
        "drops": [],
        "stats": {
          "DEF": 65,
          "HP": 300,
          "LUK": 40,
          "MGC": 30,
          "PWR": 258,
          "SKL": 70,
          "SPD": 70,
          "lvl": 37
        }
      },
      "Sorcerer": {
        "bits": 3000,
        "drops": [
          {
            "item": "Master Robe",
            "rate": 10
          }
        ],
        "stats": {
          "DEF": 30,
          "HP": 200,
          "LUK": 90,
          "MGC": 190,
          "PWR": 270,
          "SKL": 100,
          "SPD": 90,
          "lvl": 40
        }
      },
      "WhipWolf": {
        "bits": 2500,
        "drops": [
          {
            "item": "Resurrection Rune",
            "rate": 5
          }
        ],
        "stats": {
          "DEF": 70,
          "HP": 350,
          "LUK": 55,
          "MGC": 75,
          "PWR": 240,
          "SKL": 90,
          "SPD": 150,
          "lvl": 38
        }
      }
    },
    "areaType": "World Map"
  },
  "Magicians Island": {
    "name": "Magician's Island",
    "encounterRate": 4,
    "encounters": [
      { "name": "4 Holly Boy",
        "parseString": "4 HollyBoy" },
      { "name": "6 Holly Boy",
        "parseString": "6 HollyBoy" },
      { "name": "3 Holly Boy 2 FurFur",
        "parseString": "3 HollyBoy 2 FurFur" },
      { "name": "2 FurFur",
        "parseString": "2 FurFur" },
      { "name": "4 Holly Boy",
        "parseString": "4 HollyBoy" },
      { "name": "6 Holly Boy",
        "parseString": "6 HollyBoy" },
      { "name": "3 Holly Boy 2 FurFur",
        "parseString": "3 HollyBoy 2 FurFur" },
      { "name": "2 FurFur",
        "parseString": "2 FurFur" },
      { "name": "3 FurFur",
        "parseString": "3 FurFur" }],
    "enemies": {
      "FurFur": {
        "bits": 50,
        "drops": [
          {
            "item": "Wooden Shoes",
            "rate": 6
          },
          {
            "item": "Medicine x6",
            "rate": 8
          }
        ],
        "stats": {
          "DEF": 5,
          "HP": 18,
          "LUK": 5,
          "MGC": 7,
          "PWR": 31,
          "SKL": 5,
          "SPD": 16,
          "lvl": 4
        }
      },
      "HollyBoy": {
        "bits": 10,
        "drops": [
          {
            "item": "Medicine x6",
            "rate": 8
          },
          {
            "item": "Robe",
            "rate": 6
          }
        ],
        "stats": {
          "DEF": 7,
          "HP": 10,
          "LUK": 70,
          "MGC": 10,
          "PWR": 29,
          "SKL": 5,
          "SPD": 15,
          "lvl": 3
        }
      }
    },
    "areaType": "Dungeon"
  },
  "Moravia Area": {
    "name": "Moravia Area",
    "encounterRate": 8,
    "encounters": [
      { "name": "1 Rabbit Bird",
        "parseString": "1 RabbitBird" },
      { "name": "2 Rabbit Bird",
        "parseString": "2 RabbitBird" },
      { "name": "3 Rabbit Bird",
        "parseString": "3 RabbitBird" },
      { "name": "1 Mirage",
        "parseString": "1 Mirage" },
      { "name": "2 Mirage",
        "parseString": "2 Mirage" },
      { "name": "3 Mirage",
        "parseString": "3 Mirage" },
      { "name": "1 Earth Golem",
        "parseString": "1 EarthGolem" },
      { "name": "2 Earth Golem",
        "parseString": "2 EarthGolem" },
      { "name": "3 Rabbit Bird 1 Earth Golem",
        "parseString": "3 RabbitBird 1 EarthGolem" },
      { "name": "3 Mirage 1 Earth Golem",
        "parseString": "3 Mirage 1 EarthGolem" },
      { "name": "3 Rabbit Bird 2 Earth Golem",
        "parseString": "3 RabbitBird 2 EarthGolem" },
      { "name": "3 Mirage 2 Earth Golem",
        "parseString": "3 Mirage 2 EarthGolem" }],
    "enemies": {
      "EarthGolem": {
        "bits": 3000,
        "drops": [
          {
            "item": "Master Garb",
            "rate": 10
          }
        ],
        "stats": {
          "DEF": 110,
          "HP": 600,
          "LUK": 35,
          "MGC": 230,
          "PWR": 340,
          "SKL": 70,
          "SPD": 70,
          "lvl": 53
        }
      },
      "Mirage": {
        "bits": 2400,
        "drops": [
          {
            "item": "Speed Ring",
            "rate": 6
          }
        ],
        "stats": {
          "DEF": 95,
          "HP": 400,
          "LUK": 70,
          "MGC": 175,
          "PWR": 330,
          "SKL": 130,
          "SPD": 120,
          "lvl": 52
        }
      },
      "RabbitBird": {
        "bits": 2200,
        "drops": [
          {
            "item": "Sacrificial Buddha",
            "rate": 10
          }
        ],
        "stats": {
          "DEF": 50,
          "HP": 300,
          "LUK": 110,
          "MGC": 160,
          "PWR": 305,
          "SKL": 110,
          "SPD": 60,
          "lvl": 51
        }
      }
    },
    "areaType": "World Map"
  },
  "Moravia Castle": {
    "name": "Moravia Castle",
    "encounterRate": 3,
    "encounters": [
      { "name": "3 Hell Hound 1 Whip Master",
        "parseString": "3 HellHound 1 WhipMaster" },
      { "name": "3 Hell Hound 2 Whip Master",
        "parseString": "3 HellHound 2 WhipMaster" },
      { "name": "5 Hell Hound 1 Whip Master",
        "parseString": "5 HellHound 1 WhipMaster" },
      { "name": "1 Ninja",
        "parseString": "1 Ninja" },
      { "name": "2 Ninja",
        "parseString": "2 Ninja" },
      { "name": "1 Magus",
        "parseString": "1 Magus" },
      { "name": "2 Magus",
        "parseString": "2 Magus" },
      { "name": "1 Elite Soldier",
        "parseString": "1 EliteSoldier" },
      { "name": "2 Elite Soldier",
        "parseString": "2 EliteSoldier" },
      { "name": "3 Hell Hound 1 Magus 1 Whip Master",
        "parseString": "3 HellHound 1 Magus 1 WhipMaster" },
      { "name": "3 Ninja 1 Magus",
        "parseString": "3 Ninja 1 Magus" },
      { "name": "3 Elite Soldier 1 Magus",
        "parseString": "3 EliteSoldier 1 Magus" },
      { "name": "3 Hell Hound 2 Ninja",
        "parseString": "3 HellHound 2 Ninja" },
      { "name": "3 Ninja 2 Magus",
        "parseString": "3 Ninja 2 Magus" },
      { "name": "2 Elite Soldier 1 Ninja 2 Magus",
        "parseString": "2 EliteSoldier 1 Ninja 2 Magus" },
      { "name": "3 Hell Hound 2 Elite Soldier 1 Whip Master",
        "parseString": "3 HellHound 2 EliteSoldier 1 WhipMaster" }],
    "enemies": {
      "EliteSoldier": {
        "bits": 2800,
        "drops": [
          {
            "item": "Rage Rune",
            "rate": 6
          }
        ],
        "stats": {
          "DEF": 120,
          "HP": 400,
          "LUK": 60,
          "MGC": 190,
          "PWR": 340,
          "SKL": 120,
          "SPD": 110,
          "lvl": 52
        }
      },
      "HellHound": {
        "bits": 700,
        "drops": [],
        "stats": {
          "DEF": 80,
          "HP": 300,
          "LUK": 40,
          "MGC": 30,
          "PWR": 335,
          "SKL": 80,
          "SPD": 80,
          "lvl": 50
        }
      },
      "Magus": {
        "bits": 7100,
        "drops": [
          {
            "item": "Fortune Rune",
            "rate": 6
          }
        ],
        "stats": {
          "DEF": 50,
          "HP": 300,
          "LUK": 120,
          "MGC": 290,
          "PWR": 270,
          "SKL": 90,
          "SPD": 125,
          "lvl": 54
        }
      },
      "Ninja": {
        "bits": 5500,
        "drops": [
          {
            "item": "Cape Of Darkness",
            "rate": 10
          },
          {
            "item": "Wing Boots",
            "rate": 6
          }
        ],
        "stats": {
          "DEF": 70,
          "HP": 450,
          "LUK": 90,
          "MGC": 60,
          "PWR": 340,
          "SKL": 140,
          "SPD": 160,
          "lvl": 52
        }
      },
      "WhipMaster": {
        "bits": 8000,
        "drops": [
          {
            "item": "Hex Doll",
            "rate": 6
          },
          {
            "item": "Bonsai",
            "rate": 6
          },
          {
            "item": "Goddess Statue",
            "rate": 2
          }
        ],
        "stats": {
          "DEF": 90,
          "HP": 700,
          "LUK": 55,
          "MGC": 175,
          "PWR": 320,
          "SKL": 85,
          "SPD": 180,
          "lvl": 51
        }
      }
    },
    "areaType": "Dungeon"
  },
  "Mt Seifu": {
    "name": "Mt. Seifu",
    "encounterRate": 2,
    "encounters": [
      { "name": "6 Soldier Ant",
        "parseString": "6 SoldierAnt" },
      { "name": "2 Red Bandit",
        "parseString": "2 Bandit(red)" },
      { "name": "3 Bandit",
        "parseString": "1 Bandit(yellow) 2 Bandit(green)" },
      { "name": "2 Black Wild Boar",
        "parseString": "2 BlackWildBoar" },
      { "name": "2 Green Bandit",
        "parseString": "2 Bandit(green)" }],
    "enemies": {
      "Bandit(green)": {
        "bits": 70,
        "drops": [
          {
            "item": "Medicine x6",
            "rate": 7
          },
          {
            "item": "Tunic",
            "rate": 6
          }
        ],
        "stats": {
          "DEF": 3,
          "HP": 32,
          "LUK": 22,
          "MGC": 10,
          "PWR": 47,
          "SKL": 19,
          "SPD": 22,
          "lvl": 5
        }
      },
      "Bandit(red)": {
        "bits": 80,
        "drops": [],
        "stats": {
          "DEF": 6,
          "HP": 34,
          "LUK": 18,
          "MGC": 14,
          "PWR": 49,
          "SKL": 15,
          "SPD": 18,
          "lvl": 5
        }
      },
      "Bandit(yellow)": {
        "bits": 150,
        "drops": [
          {
            "item": "Shoulder Pads",
            "rate": 9
          }
        ],
        "stats": {
          "DEF": 8,
          "HP": 55,
          "LUK": 16,
          "MGC": 12,
          "PWR": 52,
          "SKL": 20,
          "SPD": 15,
          "lvl": 7
        }
      },
      "BlackWildBoar": {
        "bits": 300,
        "drops": [
          {
            "item": "Wind Rune Piece",
            "rate": 2
          }
        ],
        "stats": {
          "DEF": 19,
          "HP": 60,
          "LUK": 20,
          "MGC": 0,
          "PWR": 65,
          "SKL": 15,
          "SPD": 20,
          "lvl": 7
        }
      },
      "SoldierAnt": {
        "bits": 30,
        "drops": [
          {
            "item": "Pointed Hat",
            "rate": 9
          }
        ],
        "stats": {
          "DEF": 10,
          "HP": 28,
          "LUK": 6,
          "MGC": 0,
          "PWR": 48,
          "SKL": 18,
          "SPD": 22,
          "lvl": 4
        }
      }
    },
    "areaType": "Dungeon"
  },
  "Mt Tigerwolf": {
    "name": "Mt. Tigerwolf",
    "encounterRate": 3,
    "encounters": [
      { "name": "6 Slasher Rabbit",
        "parseString": "6 SlasherRabbit" },
      { "name": "2 Giant Snail",
        "parseString": "2 GiantSnail" },
      { "name": "3 Killer Slime",
        "parseString": "3 KillerSlime" },
      { "name": "3 Killer Slime",
        "parseString": "3 KillerSlime" },
      { "name": "1 Giant Snail",
        "parseString": "1 GiantSnail" }],
    "enemies": {
      "GiantSnail": {
        "bits": 250,
        "drops": [
          {
            "item": "Defense Rune Piece",
            "rate": 6
          }
        ],
        "stats": {
          "DEF": 24,
          "HP": 120,
          "LUK": 30,
          "MGC": 18,
          "PWR": 95,
          "SKL": 35,
          "SPD": 22,
          "lvl": 9
        }
      },
      "KillerSlime": {
        "bits": 100,
        "drops": [
          {
            "item": "Water Rune Piece",
            "rate": 10
          }
        ],
        "stats": {
          "DEF": 34,
          "HP": 40,
          "LUK": 23,
          "MGC": 55,
          "PWR": 72,
          "SKL": 20,
          "SPD": 22,
          "lvl": 7
        }
      },
      "SlasherRabbit": {
        "bits": 70,
        "drops": [
          {
            "item": "Karate Uniform",
            "rate": 5
          }
        ],
        "stats": {
          "DEF": 10,
          "HP": 60,
          "LUK": 6,
          "MGC": 6,
          "PWR": 65,
          "SKL": 30,
          "SPD": 29,
          "lvl": 6
        }
      }
    },
    "areaType": "Dungeon"
  },
  "Neclords Castle": {
    "name": "Neclord's Castle",
    "encounterRate": 2,
    "encounters": [
      { "name": "1 Demon Sorcerer",
        "parseString": "1 DemonSorcerer" },
      { "name": "1 Hell Unicorn",
        "parseString": "1 HellUnicorn" },
      { "name": "2 Demon Sorcerer",
        "parseString": "2 DemonSorcerer" },
      { "name": "1 Larvae",
        "parseString": "1 Larvae" },
      { "name": "2 Larvae",
        "parseString": "2 Larvae" },
      { "name": "3 Larvae",
        "parseString": "3 Larvae" },
      { "name": "3 Larvae 1 Demon Sorcerer",
        "parseString": "3 Larvae 1 DemonSorcerer" },
      { "name": "3 Larvae 1 Hell Unicorn",
        "parseString": "3 Larvae 1 HellUnicorn" },
      { "name": "3 Larvae 1 Demon Sorcerer 1 Hell Unicorn",
        "parseString": "3 Larvae 1 DemonSorcerer 1 HellUnicorn" }],
    "enemies": {
      "DemonSorcerer": {
        "bits": 3500,
        "drops": [
          {
            "item": "Wind Rune",
            "rate": 6
          },
          {
            "item": "Mega Medicine x3",
            "rate": 15
          }
        ],
        "stats": {
          "DEF": 50,
          "HP": 350,
          "LUK": 60,
          "MGC": 290,
          "PWR": 320,
          "SKL": 70,
          "SPD": 100,
          "lvl": 46
        }
      },
      "HellUnicorn": {
        "bits": 5000,
        "drops": [
          {
            "item": "Star Earrings",
            "rate": 6
          }
        ],
        "stats": {
          "DEF": 60,
          "HP": 700,
          "LUK": 100,
          "MGC": 265,
          "PWR": 380,
          "SKL": 85,
          "SPD": 90,
          "lvl": 47
        }
      },
      "Larvae": {
        "bits": 2000,
        "drops": [
          {
            "item": "Failure Urn",
            "rate": 6
          },
          {
            "item": "Blue Dragon Urn",
            "rate": 6
          },
          {
            "item": "Fine Bone China",
            "rate": 2
          }
        ],
        "stats": {
          "DEF": 80,
          "HP": 180,
          "LUK": 50,
          "MGC": 100,
          "PWR": 260,
          "SKL": 90,
          "SPD": 110,
          "lvl": 45
        }
      }
    },
    "areaType": "Dungeon"
  },
  "Panna Yakuta Area": {
    "name": "Panna Yakuta Area",
    "encounterRate": 8,
    "encounters": [
      { "name": "2 Kobold",
        "parseString": "2 Kobold(bow)" },
      { "name": "3 Kobold",
        "parseString": "3 Kobold(sword)" },
      { "name": "3 Kobold(sword) 1 Kobold(mage)",
        "parseString": "3 Kobold(sword) 1 Kobold(mage)" },
      { "name": "3 Kobold(bow) 1 Kobold(mage)",
        "parseString": "3 Kobold(bow) 1 Kobold(mage)" },
      { "name": "2 Kobold(bow) 1 Strong Arm 1 Kobold(mage)",
        "parseString": "2 Kobold(bow) 1 StrongArm 1 Kobold(mage)" },
      { "name": "3 Kobold(sword) 2 Kobold(mage)",
        "parseString": "3 Kobold(sword) 2 Kobold(mage)" },
      { "name": "3 Kobold(bow) 2 Kobold(mage)",
        "parseString": "3 Kobold(bow) 2 Kobold(mage)" },
      { "name": "2 Kobold(sword) 1 Strong Arm 2 Kobold(mage)",
        "parseString": "2 Kobold(sword) 1 StrongArm 2 Kobold(mage)" }],
    "enemies": {
      "StrongArm": {
        "bits": 500,
        "drops": [
          {
            "item": "Silver Ring",
            "rate": 6
          }
        ],
        "stats": {
          "DEF": 60,
          "HP": 300,
          "LUK": 29,
          "MGC": 20,
          "PWR": 200,
          "SKL": 50,
          "SPD": 40,
          "lvl": 21
        }
      },
      "Kobold(mage)": {
        "bits": 250,
        "drops": [
          {
            "item": "Guard Robe",
            "rate": 10
          },
          {
            "item": "Fire Rune",
            "rate": 6
          }
        ],
        "stats": {
          "DEF": 40,
          "HP": 50,
          "LUK": 37,
          "MGC": 130,
          "PWR": 100,
          "SKL": 70,
          "SPD": 60,
          "lvl": 20
        }
      },
      "Kobold(sword)": {
        "bits": 200,
        "drops": [
          {
            "item": "Wooden Shield",
            "rate": 7
          }
        ],
        "stats": {
          "DEF": 42,
          "HP": 150,
          "LUK": 35,
          "MGC": 20,
          "PWR": 150,
          "SKL": 40,
          "SPD": 43,
          "lvl": 20
        }
      },
      "Kobold(bow)": {
        "bits": 150,
        "drops": [
          {
            "item": "Necklace",
            "rate": 7
          },
          {
            "item": "Medicine x6",
            "rate": 9
          }
        ],
        "stats": {
          "DEF": 42,
          "HP": 120,
          "LUK": 35,
          "MGC": 10,
          "PWR": 140,
          "SKL": 35,
          "SPD": 45,
          "lvl": 20
        }
      }
    },
    "areaType": "World Map"
  },
  "Panna Yakuta": {
    "name": "Panna Yakuta",
    "encounterRate": 2,
    "encounters": [
      { "name": "3 Soldier(spear)",
        "parseString": "3 VeteranSoldier(spear)" },
      { "name": "1 Devil Armor",
        "parseString": "1 DevilArmor" },
      { "name": "3 Devil Shield 1 Devil Armor",
        "parseString": "3 DevilShield 1 DevilArmor" },
      { "name": "2 Soldier(sabre)",
        "parseString": "2 VeteranSoldier(sabre)" },
      { "name": "3 Soldier(sabre)",
        "parseString": "3 VeteranSoldier(sabre)" },
      { "name": "3 Soldier(bow)",
        "parseString": "3 VeteranSoldier(bow)" },
      { "name": "1 Soldier(sabre) 1 Soldier(spear) 2 Soldier(bow)",
        "parseString": "1 VeteranSoldier(sabre) 1 VeteranSoldier(spear) 2 VeteranSoldier(bow)" },
      { "name": "1 Soldier(sabre) 1 Soldier(spear) 3 Soldier(bow)",
        "parseString": "1 VeteranSoldier(sabre) 1 VeteranSoldier(spear) 3 VeteranSoldier(bow)" },
      { "name": "2 Devil Shield",
        "parseString": "2 DevilShield" },
      { "name": "3 Devil Shield",
        "parseString": "3 DevilShield" }],
    "enemies": {
      "DevilArmor": {
        "bits": 1100,
        "drops": [
          {
            "item": "Mangosh",
            "rate": 5
          }
        ],
        "stats": {
          "DEF": 60,
          "HP": 400,
          "LUK": 40,
          "MGC": 50,
          "PWR": 210,
          "SKL": 40,
          "SPD": 50,
          "lvl": 27
        }
      },
      "DevilShield": {
        "bits": 700,
        "drops": [
          {
            "item": "Chaos Shield",
            "rate": 5
          }
        ],
        "stats": {
          "DEF": 55,
          "HP": 250,
          "LUK": 30,
          "MGC": 90,
          "PWR": 195,
          "SKL": 56,
          "SPD": 45,
          "lvl": 27
        }
      },
      "VeteranSoldier(spear)": {
        "bits": 700,
        "drops": [
          {
            "item": "Leather Armor",
            "rate": 8
          }
        ],
        "stats": {
          "DEF": 55,
          "HP": 270,
          "LUK": 45,
          "MGC": 40,
          "PWR": 190,
          "SKL": 55,
          "SPD": 70,
          "lvl": 26
        }
      },
      "VeteranSoldier(bow)": {
        "bits": 700,
        "drops": [
          {
            "item": "Emblem",
            "rate": 6
          }
        ],
        "stats": {
          "DEF": 45,
          "HP": 250,
          "LUK": 47,
          "MGC": 38,
          "PWR": 175,
          "SKL": 50,
          "SPD": 80,
          "lvl": 26
        }
      },
      "VeteranSoldier(sabre)": {
        "bits": 700,
        "drops": [],
        "stats": {
          "DEF": 50,
          "HP": 260,
          "LUK": 44,
          "MGC": 42,
          "PWR": 185,
          "SKL": 53,
          "SPD": 80,
          "lvl": 26
        }
      }
    },
    "areaType": "Dungeon"
  },
  "Rockland": {
    "name": "Rockland",
    "encounterRate": 0,
    "encounters": [],
    "enemies": {
      "EmpireSoldier(bow#1)": {
        "bits": 130,
        "drops": [],
        "stats": {
          "DEF": 5,
          "HP": 44,
          "LUK": 17,
          "MGC": 9,
          "PWR": 60,
          "SKL": 65,
          "SPD": 33,
          "lvl": 8
        }
      },
      "EmpireSoldier(spear#1)": {
        "bits": 100,
        "drops": [],
        "stats": {
          "DEF": 7,
          "HP": 55,
          "LUK": 14,
          "MGC": 8,
          "PWR": 60,
          "SKL": 55,
          "SPD": 15,
          "lvl": 8
        }
      },
      "EmpireSoldier(sword#1)": {
        "bits": 150,
        "drops": [],
        "stats": {
          "DEF": 7,
          "HP": 48,
          "LUK": 12,
          "MGC": 10,
          "PWR": 65,
          "SKL": 40,
          "SPD": 15,
          "lvl": 8
        }
      }
    },
    "areaType": null
  },
  "Scarleticia Area": {
    "name": "Scarleticia Area",
    "encounterRate": 8,
    "encounters": [
      { "name": "1 Holly Fairy",
        "parseString": "1 HollyFairy" },
      { "name": "2 Holly Fairy",
        "parseString": "2 HollyFairy" },
      { "name": "3 Holly Fairy",
        "parseString": "3 HollyFairy" },
      { "name": "1 Mad Ivy",
        "parseString": "1 MadIvy" },
      { "name": "2 Mad Ivy",
        "parseString": "2 MadIvy" },
      { "name": "3 Mad Ivy",
        "parseString": "3 MadIvy" },
      { "name": "1 Creeper",
        "parseString": "1 Creeper" },
      { "name": "2 Creeper",
        "parseString": "2 Creeper" },
      { "name": "3 Creeper",
        "parseString": "3 Creeper" },
      { "name": "3 Holly Fairy 1 Creeper",
        "parseString": "3 HollyFairy 1 Creeper" },
      { "name": "3 Holly Fairy 1 Mad Ivy",
        "parseString": "3 HollyFairy 1 MadIvy" },
      { "name": "3 Mad Ivy 1 Creeper",
        "parseString": "3 MadIvy 1 Creeper" }],
    "enemies": {
      "Creeper": {
        "bits": 600,
        "drops": [
          {
            "item": "Earth Rune",
            "rate": 5
          }
        ],
        "stats": {
          "DEF": 35,
          "HP": 300,
          "LUK": 25,
          "MGC": 40,
          "PWR": 210,
          "SKL": 90,
          "SPD": 73,
          "lvl": 29
        }
      },
      "HollyFairy": {
        "bits": 800,
        "drops": [
          {
            "item": "Nameless Urn",
            "rate": 13
          },
          {
            "item": "Magic Robe",
            "rate": 7
          },
          {
            "item": "Needle x4",
            "rate": 13
          }
        ],
        "stats": {
          "DEF": 35,
          "HP": 400,
          "LUK": 90,
          "MGC": 75,
          "PWR": 240,
          "SKL": 50,
          "SPD": 80,
          "lvl": 26
        }
      },
      "MadIvy": {
        "bits": 600,
        "drops": [
          {
            "item": "Head Gear",
            "rate": 10
          }
        ],
        "stats": {
          "DEF": 25,
          "HP": 600,
          "LUK": 33,
          "MGC": 35,
          "PWR": 235,
          "SKL": 75,
          "SPD": 70,
          "lvl": 28
        }
      }
    },
    "areaType": "World Map"
  },
  "Scarleticia": {
    "name": "Scarleticia",
    "encounterRate": 3,
    "encounters": [
      { "name": "2 Mad Ivy",
        "parseString": "2 MadIvy" },
      { "name": "2 Creeper",
        "parseString": "2 Creeper" },
      { "name": "3 Creeper",
        "parseString": "3 Creeper" },
      { "name": "6 Creeper",
        "parseString": "6 Creeper" },
      { "name": "1 Nightmare",
        "parseString": "1 Nightmare" },
      { "name": "3 Creeper 1 Nightmare",
        "parseString": "3 Creeper 1 Nightmare" }],
    "enemies": {
      "Creeper": {
        "bits": 600,
        "drops": [
          {
            "item": "Earth Rune",
            "rate": 5
          }
        ],
        "stats": {
          "DEF": 35,
          "HP": 300,
          "LUK": 25,
          "MGC": 40,
          "PWR": 210,
          "SKL": 90,
          "SPD": 73,
          "lvl": 29
        }
      },
      "MadIvy": {
        "bits": 600,
        "drops": [
          {
            "item": "Head Gear",
            "rate": 10
          }
        ],
        "stats": {
          "DEF": 25,
          "HP": 600,
          "LUK": 33,
          "MGC": 35,
          "PWR": 235,
          "SKL": 75,
          "SPD": 70,
          "lvl": 28
        }
      },
      "Nightmare": {
        "bits": 1100,
        "drops": [
          {
            "item": "Opal",
            "rate": 20
          }
        ],
        "stats": {
          "DEF": 45,
          "HP": 150,
          "LUK": 70,
          "MGC": 240,
          "PWR": 250,
          "SKL": 60,
          "SPD": 90,
          "lvl": 32
        }
      }
    },
    "areaType": "Dungeon"
  },
  "Seek Valley": {
    "name": "Seek Valley",
    "encounterRate": 2,
    "encounters": [
      { "name": "1 Ivy",
        "parseString": "1 Ivy" },
      { "name": "2 Ivy",
        "parseString": "2 Ivy" },
      { "name": "3 Ivy",
        "parseString": "3 Ivy" },
      { "name": "1 Rock Buster",
        "parseString": "1 RockBuster" },
      { "name": "2 Rock Buster",
        "parseString": "2 RockBuster" },
      { "name": "3 Rock Buster",
        "parseString": "3 RockBuster" },
      { "name": "1 Wyvern",
        "parseString": "1 Wyvern" },
      { "name": "1 Queen Ant",
        "parseString": "1 QueenAnt" },
      { "name": "2 Ivy 1 Rock Buster",
        "parseString": "2 Ivy 1 RockBuster" },
      { "name": "2 Ivy 1 Wyvern",
        "parseString": "2 Ivy 1 Wyvern" },
      { "name": "2 Rock Buster 1 Queen Ant",
        "parseString": "2 RockBuster 1 QueenAnt" },
      { "name": "2 Rock Buster 1 Wyvern",
        "parseString": "2 RockBuster 1 Wyvern" }],
    "enemies": {
      "Ivy": {
        "bits": 2000,
        "drops": [
          {
            "item": "Hex Doll",
            "rate": 6
          },
          {
            "item": "Peeing Boy",
            "rate": 6
          },
          {
            "item": "Knight Statue",
            "rate": 2
          }
        ],
        "stats": {
          "DEF": 80,
          "HP": 250,
          "LUK": 25,
          "MGC": 170,
          "PWR": 290,
          "SKL": 70,
          "SPD": 110,
          "lvl": 49
        }
      },
      "QueenAnt": {
        "bits": 6500,
        "drops": [
          {
            "item": "Silver Hat",
            "rate": 5
          }
        ],
        "stats": {
          "DEF": 80,
          "HP": 800,
          "LUK": 60,
          "MGC": 270,
          "PWR": 310,
          "SKL": 60,
          "SPD": 110,
          "lvl": 52
        }
      },
      "RockBuster": {
        "bits": 2500,
        "drops": [
          {
            "item": "Taikioku Wear",
            "rate": 10
          },
          {
            "item": "Mega Medicine x3",
            "rate": 15
          }
        ],
        "stats": {
          "DEF": 90,
          "HP": 600,
          "LUK": 39,
          "MGC": 240,
          "PWR": 300,
          "SKL": 75,
          "SPD": 80,
          "lvl": 51
        }
      },
      "Wyvern": {
        "bits": 5500,
        "drops": [
          {
            "item": "Power Gloves",
            "rate": 8
          }
        ],
        "stats": {
          "DEF": 85,
          "HP": 1000,
          "LUK": 75,
          "MGC": 260,
          "PWR": 320,
          "SKL": 110,
          "SPD": 120,
          "lvl": 53
        }
      }
    },
    "areaType": "Dungeon"
  },
  "Seika": {
    "name": "Seika",
    "encounterRate": 0,
    "encounters": [],
    "enemies": {
      "EmpireSoldier": {
        "bits": 200,
        "drops": [
          {
            "item": "Failure Urn",
            "rate": 6
          },
          {
            "item": "Vase",
            "rate": 5
          },
          {
            "item": "Blue Dragon Urn",
            "rate": 2
          }
        ],
        "stats": {
          "DEF": 11,
          "HP": 68,
          "LUK": 24,
          "MGC": 16,
          "PWR": 70,
          "SKL": 55,
          "SPD": 28,
          "lvl": 13
        }
      }
    },
    "areaType": null
  },
  "Seika Area": {
    "name": "Seika Area",
    "encounterRate": 8,
    "encounters": [
      { "name": "3 Flying Squirrel 1 Beast Commander ",
        "parseString": "3 FlyingSquirrel 1 BeastCommander " },
      { "name": "2 Flying Squirrel",
        "parseString": "2 FlyingSquirrel" },
      { "name": "6 Flying Squirrel",
        "parseString": "6 FlyingSquirrel" },
      { "name": "1 Roc",
        "parseString": "1 Roc" },
      { "name": "6 Killer Rabbit",
        "parseString": "6 KillerRabbit" },
      { "name": "2 Roc",
        "parseString": "2 Roc" },
      { "name": "3 Killer Rabbit 1 Beast Commander",
        "parseString": "3 KillerRabbit 1 BeastCommander" },
      { "name": "3 Flying Squirrel 2 Killer Rabbit 1 Beast Commander",
        "parseString": "3 FlyingSquirrel 2 KillerRabbit 1 BeastCommander" }],
    "enemies": {
      "BeastCommander": {
        "bits": 200,
        "drops": [
          {
            "item": "Blue Ribbon",
            "rate": 9
          },
          {
            "item": "Phero Rune",
            "rate": 3
          }
        ],
        "stats": {
          "DEF": 40,
          "HP": 90,
          "LUK": 60,
          "MGC": 35,
          "PWR": 60,
          "SKL": 30,
          "SPD": 70,
          "lvl": 13
        }
      },
      "FlyingSquirrel": {
        "bits": 100,
        "drops": [
          {
            "item": "Holy Rune",
            "rate": 5
          }
        ],
        "stats": {
          "DEF": 25,
          "HP": 90,
          "LUK": 30,
          "MGC": 9,
          "PWR": 99,
          "SKL": 40,
          "SPD": 35,
          "lvl": 11
        }
      },
      "KillerRabbit": {
        "bits": 80,
        "drops": [
          {
            "item": "Hex Doll",
            "rate": 6
          },
          {
            "item": "Japanese Dish",
            "rate": 6
          },
          {
            "item": "Peeing Boy",
            "rate": 2
          }
        ],
        "stats": {
          "DEF": 15,
          "HP": 60,
          "LUK": 7,
          "MGC": 7,
          "PWR": 90,
          "SKL": 30,
          "SPD": 29,
          "lvl": 10
        }
      },
      "Roc": {
        "bits": 70,
        "drops": [
          {
            "item": "Feather",
            "rate": 9
          }
        ],
        "stats": {
          "DEF": 55,
          "HP": 110,
          "LUK": 20,
          "MGC": 16,
          "PWR": 125,
          "SKL": 55,
          "SPD": 60,
          "lvl": 14
        }
      }
    },
    "areaType": "World Map"
  },
  "Shasarazade Fortress": {
    "name": "Shasarazade Fortress",
    "encounterRate": 3,
    "encounters": [
      { "name": "4 Elite Soldier",
        "parseString": "4 EliteSoldier" },
      { "name": "2 Elite Soldier",
        "parseString": "2 EliteSoldier" },
      { "name": "3 Elite Soldier",
        "parseString": "3 EliteSoldier" },
      { "name": "2 Siren",
        "parseString": "2 Siren" },
      { "name": "3 Siren",
        "parseString": "3 Siren" },
      { "name": "4 Siren",
        "parseString": "4 Siren" },
      { "name": "1 Kerberos",
        "parseString": "1 Kerberos" }],
    "enemies": {
      "EliteSoldier": {
        "bits": 3500,
        "drops": [
          {
            "item": "Horned Helmet",
            "rate": 10
          },
          {
            "item": "Mega Medicine x3",
            "rate": 12
          }
        ],
        "stats": {
          "DEF": 120,
          "HP": 550,
          "LUK": 100,
          "MGC": 180,
          "PWR": 360,
          "SKL": 130,
          "SPD": 130,
          "lvl": 54
        }
      },
      "Kerberos": {
        "bits": 4000,
        "drops": [
          {
            "item": "Gold Necklace",
            "rate": 8
          }
        ],
        "stats": {
          "DEF": 70,
          "HP": 900,
          "LUK": 60,
          "MGC": 160,
          "PWR": 370,
          "SKL": 150,
          "SPD": 180,
          "lvl": 55
        }
      },
      "Siren": {
        "bits": 6000,
        "drops": [
          {
            "item": "Sound Setting #3",
            "rate": 18
          },
          {
            "item": "Flowing Rune",
            "rate": 6
          }
        ],
        "stats": {
          "DEF": 45,
          "HP": 300,
          "LUK": 80,
          "MGC": 210,
          "PWR": 260,
          "SKL": 70,
          "SPD": 90,
          "lvl": 53
        }
      }
    },
    "areaType": "Dungeon"
  },
  "Soniere Prison": {
    "name": "Soniere Prison",
    "encounterRate": 2,
    "encounters": [
      { "name": "1 Delf 1 Viperman",
        "parseString": "1 Delf 1 Viperman" },
      { "name": "3 Delf 1 Viperman",
        "parseString": "3 Delf 1 Viperman" },
      { "name": "1 Red Slime",
        "parseString": "1 RedSlime" },
      { "name": "3 Red Slime",
        "parseString": "3 RedSlime" },
      { "name": "3 Red Slime 2 Nightmare",
        "parseString": "3 RedSlime 2 Nightmare" },
      { "name": "1 Nightmare",
        "parseString": "1 Nightmare" },
      { "name": "3 Nightmare",
        "parseString": "3 Nightmare" },
      { "name": "3 Red Slime 1 Nightmare",
        "parseString": "3 RedSlime 1 Nightmare" }],
    "enemies": {
      "Delf": {
        "bits": 0,
        "drops": [],
        "stats": {
          "DEF": 85,
          "HP": 150,
          "LUK": 30,
          "MGC": 40,
          "PWR": 180,
          "SKL": 30,
          "SPD": 30,
          "lvl": 25
        }
      },
      "Nightmare": {
        "bits": 1100,
        "drops": [
          {
            "item": "Opal",
            "rate": 20
          }
        ],
        "stats": {
          "DEF": 45,
          "HP": 150,
          "LUK": 70,
          "MGC": 240,
          "PWR": 250,
          "SKL": 60,
          "SPD": 90,
          "lvl": 32
        }
      },
      "RedSlime": {
        "bits": 400,
        "drops": [
          {
            "item": "Hex Doll",
            "rate": 6
          },
          {
            "item": "Chinese Dish",
            "rate": 6
          },
          {
            "item": "Bonsai",
            "rate": 2
          }
        ],
        "stats": {
          "DEF": 55,
          "HP": 150,
          "LUK": 45,
          "MGC": 60,
          "PWR": 225,
          "SKL": 50,
          "SPD": 60,
          "lvl": 27
        }
      },
      "VeteranSoldier(bow)": {
        "bits": 700,
        "drops": [
          {
            "item": "Emblem",
            "rate": 6
          }
        ],
        "stats": {
          "DEF": 45,
          "HP": 250,
          "LUK": 47,
          "MGC": 38,
          "PWR": 175,
          "SKL": 50,
          "SPD": 80,
          "lvl": 26
        }
      },
      "Viperman": {
        "bits": 900,
        "drops": [
          {
            "item": "Antitoxin x4",
            "rate": 13
          },
          {
            "item": "Ninja Suit",
            "rate": 9
          }
        ],
        "stats": {
          "DEF": 60,
          "HP": 200,
          "LUK": 56,
          "MGC": 55,
          "PWR": 203,
          "SKL": 45,
          "SPD": 70,
          "lvl": 30
        }
      }
    },
    "areaType": "Dungeon"
  },
  "Soniere Prison Guards": {
    "name": "Soniere Prison Guards",
    "encounterRate": 0,
    "encounters": [
      { "name": "3 VeteranSoldier #1",
        "parseString": "3 VeteranSoldier(spear)" },
      { "name": "3 VeteranSoldier #2",
        "parseString": "1 VeteranSoldier(bow) 2 VeteranSoldier(spear)" },
      { "name": "5 VeteranSoldier #1",
        "parseString": "3 VeteranSoldier(spear) 2 VeteranSoldier(bow)" },
      { "name": "5 VeteranSoldier #2",
        "parseString": "1 VeteranSoldier(bow) 3 VeteranSoldier(spear) 1 VeteranSoldier(bow)"
      }
    ],
    "enemies": {
      "VeteranSoldier(spear)": {
        "bits": 700,
        "drops": [
          {
            "item": "Leather Armor",
            "rate": 8
          }
        ],
        "stats": {
          "DEF": 55,
          "HP": 270,
          "LUK": 45,
          "MGC": 40,
          "PWR": 190,
          "SKL": 55,
          "SPD": 70,
          "lvl": 26
        }
      },
      "VeteranSoldier(bow)": {
        "bits": 700,
        "drops": [
          {
            "item": "Emblem",
            "rate": 6
          }
        ],
        "stats": {
          "DEF": 45,
          "HP": 250,
          "LUK": 47,
          "MGC": 38,
          "PWR": 175,
          "SKL": 50,
          "SPD": 80,
          "lvl": 26
        }
      }
    },
    "areaType": null
  },
  "Toran Lake Castle": {
    "name": "Toran Lake Castle",
    "encounterRate": 2,
    "encounters": [
    { "name": "2 Oannes",
      "parseString": "2 Oannes" },
    { "name": "3 Oannes",
      "parseString": "3 Oannes" },
    { "name": "2 Giant Slug",
      "parseString": "2 GiantSlug" },
    { "name": "3 Giant Slug",
      "parseString": "3 GiantSlug" },
    { "name": "1 Ghost Armor",
      "parseString": "1 GhostArmor" },
    { "name": "3 Giant Slug 1 Ghost Armor",
      "parseString": "3 GiantSlug 1 GhostArmor" },
    { "name": "3 Oannes 1 Ghost Armor",
      "parseString": "3 Oannes 1 GhostArmor" }
    ],
    "enemies": {
      "GhostArmor": {
        "bits": 600,
        "drops": [
          {
            "item": "Brass Armor",
            "rate": 6
          }
        ],
        "stats": {
          "DEF": 30,
          "HP": 250,
          "LUK": 27,
          "MGC": 35,
          "PWR": 110,
          "SKL": 30,
          "SPD": 40,
          "lvl": 17
        }
      },
      "GiantSlug": {
        "bits": 250,
        "drops": [
          {
            "item": "Defense Rune Piece",
            "rate": 6
          },
          {
            "item": "Medicine x6",
            "rate": 8
          }
        ],
        "stats": {
          "DEF": 35,
          "HP": 120,
          "LUK": 26,
          "MGC": 15,
          "PWR": 95,
          "SKL": 35,
          "SPD": 22,
          "lvl": 15
        }
      },
      "Oannes": {
        "bits": 200,
        "drops": [
          {
            "item": "Antitoxin x4",
            "rate": 14
          }
        ],
        "stats": {
          "DEF": 30,
          "HP": 200,
          "LUK": 12,
          "MGC": 17,
          "PWR": 90,
          "SKL": 10,
          "SPD": 45,
          "lvl": 16
        }
      }
    },
    "areaType": "Dungeon"
  },
  "Bosses": {
    "name": "Boss Fights",
    "encounterRate": 0,
      "encounters": [
    { "name": "Golem",
      "parseString": "1 Golem" },
    { "name": "Zombie Dragon",
      "parseString": "1 ZombieDragon" },
    { "name": "Gigantes",
      "parseString": "1 Gigantes" },
    { "name": "Dragon",
      "parseString": "1 Dragon" },
    { "name": "Pirates",
      "parseString": "1 Anji 1 Kanak 1 Leonardo" },
    { "name": "Neclord",
      "parseString": "1 Neclord" },
    { "name": "Crystal Core",
      "parseString": "1 CrystalCore" },
    { "name": "Shell Venus",
      "parseString": "1 ShellVenus" },
    { "name": "Sonya Shulen",
      "parseString": "1 SonyaShulen" },
    { "name": "Ain Gide",
      "parseString": "1 AinGide" }
    ],
    "enemies": {
      "Golem": {
        "bits": 1500,
        "drops": [
          {
            "item": "Medicine x6",
            "rate": 15
          }
        ],
        "stats": {
          "DEF": 2,
          "HP": 300,
          "LUK": 20,
          "MGC": 25,
          "PWR": 40,
          "SKL": 21,
          "SPD": 17,
          "lvl": 12
        }
      },
      "QueenAnt": {
        "bits": 2000,
        "drops": [
          {
            "item": "Pointed Hat",
            "rate": 10
          }
        ],
        "stats": {
          "DEF": 50,
          "HP": 7100,
          "LUK": 55,
          "MGC": 55,
          "PWR": 75,
          "SKL": 25,
          "SPD": 20,
          "lvl": 15
        }
      },
      "Varkas": {
        "bits": 400,
        "drops": [],
        "stats": {
          "DEF": 15,
          "HP": 210,
          "LUK": 16,
          "MGC": 18,
          "PWR": 76,
          "SKL": 40,
          "SPD": 27,
          "lvl": 12
        }
      },
      "Sydonia": {
        "bits": 300,
        "drops": [],
        "stats": {
          "DEF": 8,
          "HP": 140,
          "LUK": 19,
          "MGC": 30,
          "PWR": 67,
          "SKL": 55,
          "SPD": 42,
          "lvl": 10
        }
      },
      "ZombieDragon": {
        "bits": 2000,
        "drops": [
          {
            "item": "Lightning Rune",
            "rate": 80
          }
        ],
        "stats": {
          "DEF": 35,
          "HP": 3700,
          "LUK": 40,
          "MGC": 130,
          "PWR": 175,
          "SKL": 50,
          "SPD": 65,
          "lvl": 30
        }
      },
      "Assassin": {
        "bits": 400,
        "drops": [],
        "stats": {
          "DEF": 9,
          "HP": 2000,
          "LUK": 19,
          "MGC": 30,
          "PWR": 120,
          "SKL": 60,
          "SPD": 35,
          "lvl": 18
        }
      },
      "Gigantes": {
        "bits": 3000,
        "drops": [
          {
            "item": "Goldlet",
            "rate": 6
          }
        ],
        "stats": {
          "DEF": 25,
          "HP": 3900,
          "LUK": 55,
          "MGC": 120,
          "PWR": 260,
          "SKL": 60,
          "SPD": 80,
          "lvl": 35
        }
      },
      "Dragon": {
        "bits": 3500,
        "drops": [
          {
            "item": "Half Armor",
            "rate": 80
          }
        ],
        "stats": {
          "DEF": 35,
          "HP": 6000,
          "LUK": 65,
          "MGC": 150,
          "PWR": 250,
          "SKL": 60,
          "SPD": 40,
          "lvl": 40
        }
      },
      "Anji": {
        "bits": 1000,
        "drops": [],
        "stats": {
          "DEF": 60,
          "HP": 1700,
          "LUK": 30,
          "MGC": 80,
          "PWR": 250,
          "SKL": 68,
          "SPD": 80,
          "lvl": 39
        }
      },
      "Leonardo": {
        "bits": 400,
        "drops": [],
        "stats": {
          "DEF": 55,
          "HP": 1400,
          "LUK": 40,
          "MGC": 60,
          "PWR": 270,
          "SKL": 98,
          "SPD": 100,
          "lvl": 36
        }
      },
      "Kanak": {
        "bits": 400,
        "drops": [],
        "stats": {
          "DEF": 70,
          "HP": 2200,
          "LUK": 70,
          "MGC": 50,
          "PWR": 240,
          "SKL": 38,
          "SPD": 60,
          "lvl": 35
        }
      },
      "Neclord": {
        "bits": 10000,
        "drops": [],
        "stats": {
          "DEF": 80,
          "HP": 7500,
          "LUK": 30,
          "MGC": 275,
          "PWR": 450,
          "SKL": 100,
          "SPD": 75,
          "lvl": 55
        }
      },
      "CrystalCore": {
        "bits": 70000,
        "drops": [],
        "stats": {
          "DEF": 90,
          "HP": 5000,
          "LUK": 80,
          "MGC": 275,
          "PWR": 350,
          "SKL": 70,
          "SPD": 65,
          "lvl": 60
        }
      },
      "ShellVenus": {
        "bits": 100000,
        "drops": [],
        "stats": {
          "DEF": 40,
          "HP": 15000,
          "LUK": 100,
          "MGC": 350,
          "PWR": 470,
          "SKL": 80,
          "SPD": 80,
          "lvl": 65
        }
      },
      "SonyaShulen": {
        "bits": 1500,
        "drops": [],
        "stats": {
          "DEF": 110,
          "HP": 6000,
          "LUK": 120,
          "MGC": 390,
          "PWR": 480,
          "SKL": 125,
          "SPD": 160,
          "lvl": 58
        }
      },
      "AinGide": {
        "bits": 2000,
        "drops": [],
        "stats": {
          "DEF": 120,
          "HP": 8000,
          "LUK": 90,
          "MGC": 410,
          "PWR": 500,
          "SKL": 80,
          "SPD": 130,
          "lvl": 60
        }
      }
    },
    "areaType": null
  }
};
