## Suikoden RNG Generator
This is a RNG calculator for the PS1 game Suikoden. It can predict RNG based
events, such as future encounters, enemy drops, and finding your RNG Seed.
This is all pseudocode. There is actual code in the repo.

## RNG Value
The RNG value is a 32bit unsigned integer. It's stored at address `0x00009010`.
The formula to advance RNG is desribed below. Most likely, the RNG method is a
Sony PSX library method and is not exclusive to Suikoden 1. Also, according to
[this write-up](http://www.raphnet.net/electronique/psx_adaptor/Playstation.txt)
the RNG memory address is in kernel space which would explain why it sometimes
get overwritten (we'll get to this later.) Also, the first bit in the RNG value
isn't ignored to the calculation and therefore values such as
`10001111 00001010 10100000 11111111` and `00001111 00001010 10100000 11111111`
are functionally equivalent.

## What advances RNG?
There's quite a bit to cover here, so I'll break this up into sections.

### Outside of battle
First off, I'll explain what I call grace period. Grace period is a certain
amout of steps required before RNG starts advancing every step. It exists so you
don't get spammed with random battles. On the world map, the grace period is 4
steps. In dungeons (areas with random battles), the grace period is 30, 50, or 60
steps, depending on the area. 60 is default, 50 is used in a few places, and 30
is Kalekka only.

Now, onto RNG advancements.
  1. Every step on World Map (Not in grace period).
  2. Every step in Dungeon (Not in grace period).
  3. Every frame in an area with moving characters/NPCs.
    * RNG advances once per frame per persion to see if the person moves. If
      it's determined that the person moves, ? more RNG calls are made to
      determine which direction the NPC moves in and how many steps. While that
      person is moving, the RNG call to determine if they're gonna move or not
      isn't made. Funnily enough, this leads to RNG advancing less the more
      often people move.
    * These advancements is applied when areas are loading as well. Which is why
      (not) skipping the town text (Textbox with town name that appears when you enter
      a town) is important for RNG manipulation.
    * Also advances during certain menus. During most text boxes and in your
      menu RNG doesn't advance even if there are moving people. However, people
      can move during some menus and therefore RNG does advance. These 
      exceptions are:
      1. Viki's Teleportation menu
      2. Sanchez/Mathiu's Party Menus
    * Note that for some playable characters RNG advances for them even though
      they cannot currently move. This happens most often in the meeting room in
      your castle during story events.
    * A special and kind of important case: Gregminster at the start of the
      game. There's a few birds that hang out by the fountain in Gregminster.
      They're actually treated as people for RNG and advance RNG the same way. 
      However, if you get close to the birds they fly away and RNG stops 
      advancing for them. There's 7 moving people and 3 birds so after scaring 
      the birds RNG advances 30% slower. This is why you should always move left
      first during the Holy Rune setup. If you move down then left you're
      introducing more variance since the birds will be on the screen longer.
  4. Every frame during Chinchironin (#FuckTaiHo)
    * RNG advances every frame during the Chinchironin game. It also jumps by
      50~250 when a roll is made. It is most likely using cursor position + RNG
      value to determine if a roll is made. And once the roll is made, it jumps a lot
      calculating the result of the roll.
  5. During War Battles
    * RNG automatically advances 100-200 at the start and end of war battles.
    * RNG advancement depends on action. Each action advances RNG by a different
      amount. Charge, Bow, and Dragon Knights advance by a lot (several
      thousand.) Magic only advances by a little (less than 10.) I'll revisit
      war battles later as there's quite a bit worth mentioning.
    * Ninjas don't advance RNG at all.
  6. During duels
    * Seems to advance by small amount (1-2) every turn. Likely just used to determine
      Kwanda's/Teo's action
  7. Marco's Cup Game. Is usually advanced by 70-90 per game. Will also revisit this.
  8. After Barbarossa jumps off the balcony with Windy the screen starts
     shaking. While the screen is shaking RNG advances at a rate of about 3.66
     per frame. It's most likely calculating which direction the screen shakes and
     maybe how far it shakes.

### In Battle
This is really complex and I don't understand everything yet. However, this is
the most abusable and I have figured out some stuff that I'll write out here.

##### Before the battle
If it's a random encounter it advances by one to determine what encounter it is.

##### During the battle
Trying to run advances RNG by one. Let Go and Bribe (including failed bribe)
don't advance RNG.

###### Universal
I'm gonna define **Fighter** as either enemy or party member to make this easier
to explain. As an example, in a battle with McDohl vs 2 Kobolds there are 3
Fighters. **Action** will refer to a fighters turn in the battle occuring.
Defend counts as action, don't know how statuses such as paralysis or affect
action.

At the start of each turn RNG is always advances by 1. Then on each fighter's
action, before the action is done, RNG advances by the number of fighters that
haven't had their action yet (this includes the current fighter).

As an example, let's use that same fight with McDohl and 2 Kobolds. To make the
explanation easier, let's assume that all 3 Defend (I know that Kobolds can't
defend.) Turn starts, RNG advances by 1. McDohl's action, RNG advances by
3(McDohl + Kobold + Kobold.) First Kobold's turn, RNG advances by 2(current
Kobold + remaining Kobold.) Remining Kobold goes, RNG advances by 1.

###### Attacks
RNG advances by a few RNG per regular attack, not sure on specifics. I assume
there's a few calls to calculate miss or crit and damage roll. I think average
RNG advancement here is 3.

###### Defend / Item
Actions like Defend or Medicine advance 0. However, using an item on someone
affects turn order and that can affect RNG.

###### Runes
Runes are all kinda different. There's 2 kinds when it comes to RNG
advancement, Set and random. Set spells always advance RNG by the same amount.
Here's a list of known set spells and how much they advance RNG.

**Set**
  1. The Shredding (0)
  2. Storm (0)
  3. Firestorm (0)
  4. Raging Blow (0)
  5. Ball of Lightning (0)
  6. Voice of Earth (0)
  7. Angry Blow (6)
  8. Dancing Flames (150)
  9. Thunder God (476)

**Random**
  1. Flaming Arrow (~540)
  2. Explosion (~1232)
  3. Final Flame (~534)
  4. Wind of Sleep (~304)
  5. Shining Wind (~1320)
  6. Earthquake (~1620)
  7. Charm Arrow (~24600) This is not a typo
  8. Deadly Fingertips (~1100)
  9. Black Shadow (~5500) I've seen this range from about 5300 to 6800
  10. Hell (~11000)
  11. Rainstorm (26 + 2 per enemy?) Most likely set just don't know formula yet.

###### Unites
Haven't tested really but the 3 I use in runs don't advance RNG much. These are:
  1. Talisman Attack (Gremio & Pahn)
  2. Master Pupil Attack (McDohl & Kai)
  3. Wild Arrow Attack (Kirkis & Stallion)

##### After the battle
RNG is advanced after the battles ends (last action completed) twice.
  1. To calculate item drop (Explained in later section)
  2. To calculate stat growths. RNG is advanced 7 times (Once per each stat)
     per level up per character.

##### Other
RNG never advances while you're inputting your actions with two exceptions:
  1. Golden Hydra battle. Sometimes the heads roar or lunge at you. It seems
     like RNG advances every few seconds to determine if it will a head will do
     anything.
  2. After Barbarossa jumps off with Windy the screen starts shaking. This was
     mentioned earlier and still happens during battles. As a result, RNG is
     advanced about 3.7 times per frame during battles (including menus)

### Methods
These are the methods used to determine the results of RNG based actions by the
game. The PS1 processor doesn't support floating point arithmetic, so for
multipliction and division the results are stored in two registers, mhi and mlo.
For multiplication, mhi holds the first 32 bits and mlo holds the next 32 bits.
For division, mflo stores the quotient and mhi stores the remainder. A division
where we take the result as the quotient will be signified by `/`. A division
where we take the result as the reminder will be signified by `%` aka modulo.

You will also see `r2` mentioned quite a bit in these methods. This refers to
the value stored in register 2 after each RNG call. It's used for most
calculations.

###### RNG Call Method
```javascript
// In some languages proper multiplication without loss of precision
// requires custom implementation
rng = ((rng * 0x41c64e6d) & 0xFFFFFFFF) + 0x3039;
// This register is used in quite a few RNG based subroutines
// and is calculated in the RNG call
r2 = (rng >> 16) & 0x7FFF;
```

#### Run Success
Each battle has the same change of a run being successful or not successful
(Assuming the battle is escapable of course.) You have a 49% chance of
successfully running from a battle.

###### Run Method
```javascript
// On run attempt RNG call is made
// r2 is set in RNG call
if (r2 % 100 > 50)
  return true;
return false;
```

#### Is Battle Call
Called every step in Dungeons & World Map when not in grace period. This is the
reason RNG advances every step in these areas. World Map and Dungeons use
different methods. Note that World Map always has an encounter rate of 8 while
Dungeons can have encounter rates of 2 or 3.
 * Some Dungeon's can have multiple encounter rates. Known example is Mt.
   Tigerwolf where encounter rate is 2 or 3 depending on what screen you're on.

###### isBattle(World Map) Method
```javascript
// r2 is set in RNG call
r2 = r2 - (r2 & 0xFFFFFF00);
if (r2 < 8)
  return true;
return false;
```

###### isBattle(Dungeon) Method
```javascript
// r2 is set in RNG call
r3 = 0x7F;
// The below won't need the Math.floor if language doesn't autoconvert integers
// when doing integer division
r2 = Math.floor(r2/r3) & 0xFF;
r3 = getAreaEncounterRate(); // 2 or 3
if (r2 < r3)
  return true;
return false;
```
#### determineEncounter
Once the game decides you're getting into a battle, it still has to figure out
what enemy group you'll get. This is the method it uses. Note that it also
advances the RNG once, so for each battle you get you advance RNG at least twice
(once to check if you got into a battle and once to see what enemy group you're
fighting.)

###### determineEncounter Method
```javascript
// Once the game determines that you are getting a battle
// It calls RNG again
// r2 is set from RNG call

// The game references the encounter table for this function
// The encounter table is essentially an array of possible groups of enemies
// for every area with random battles
// it starts at 1 with the first battle
r3 = div32ulo(0x7FFF, this.encounterTable.length);
encounterIndex = div32ulo(r2, r3);
while (encounterIndex >= this.encounterTable.length) {
  encounterIndex--;
}
// If you're looking at the game's encounter table add 1 to this.
// The game index's from 1 here while this app index from 0
return encounterIndex;
```

#### Champion's Rune
The way Champion's Rune works is
  1. If getting into a battle
  2. determineEncounter
  3. If Champion's Rune equipped and below requirement met don't get into battle

```javascript
r17 = Math.floor(((sumOfEnemyLevels << 4) - sumOfEnemyLevels) / 0xa);
r16 = sumOfPartyLevels;
if (r16 < r17)
  return true;
return false;
```

#### Calculating Drop
The way the game calculates drops is pretty straightforward. Each enemy in the
game has 3 drop slots. It first uses RNG to determine which drop slot you're
rolling for. And if that slot is not empty it uses RNG to determine to decide if
the enemy drops that item. It does this until you get a drop or you go through
all the enemies in the group. It goes through the enemies in the order they're
shown in the battle menu (top to bottom.)

###### Calculate Drop Method
```
// Copied straight from app codebase since I'm lazy
for (enemy in enemyGroup) {
    let r2 = rng.getNext().rng2;
    const dropIndex = r2 % 3;
    if (dropIndex < enemy.drops.length) {
      const dropRate = enemy.drops[dropIndex].rate;
      r2 = rng.getNext(2).rng2;
      if (r2 % 100 < dropRate) {
        return enemy.drops[dropIndex].item;
      }
    }
}
return '';
```

## Other Sources
[Suikosource: All things Suikoden](http://www.suikosource.com/)

[Google Sheet with useful technical data and links](https://docs.google.com/spreadsheets/d/1W8mEcTqByBVljRmb6CSyWFFkM-l3QIoeBds1c2qjGWs/edit?usp=sharing)

[Google Doc Sheet with explanation of how the game uses RNG](https://docs.google.com/document/d/1ORCe1okh8RIpOGH8WegaFMKsi_aFC3QN5OZ96w3019Y/edit?usp=sharing)

