/**
 * The heap events of an enemy move, by enemy and move name (the HeapSpellEvents format: a positive number is an allocation, -k the
 * free of the k-th allocation). From Suikoden-Bizhawk-HUD enemy_profiles/enemies/<slug>/heap_footprints (scripts/
 * CrystalCoreMoveFootprints.lua): the move's own allocations, without the Fight menu rebuilt at the round's end (VfxHeap.roundEnd does
 * that). Identical across the recorded seeds. Only the layout is recorded, not what the move writes into its blocks.
 * @type {Record<string, Record<string, number[]>>}
 */
export const ENEMY_MOVE_EVENTS = {
  // Clay Doll Lv44 (the generality oracle, ASK 20: 14 Attack rounds, 14 of 14 as listed): its own script's 52 / 40 / 40 resource and its 24 / 40 / 40
  // shadow, built together; a miss frees the six 42 ticks later, a hit builds the spark (52 / 80 / 80) 12 ticks after, freeing the six in that frame
  // and the spark 18 ticks later. Frees in the order packet 0, packet 1, header of each resource.
  CLAY_DOLL: {
    Attack: [52, 40, 40, 24, 40, 40, -2, -3, -1, -5, -6, -4],
    AttackHit: [52, 40, 40, 24, 40, 40, 52, 80, 80, -2, -3, -1, -5, -6, -4, -8, -9, -7],
  },
  CRYSTAL_CORE: {
    Attack: [
      52, 40, 40, 52, 40, 40, 52, 40, 40, 52, 40, 40, 52, 40, 40, 52, 40, 40, 52, 40, 40, 52, 40,
      40, 52, 40, 40, 52, 40, 40, 52, 40, 40, 52, 40, 40, 52, 80, 80, -38, -39, -37, -2, -3, -1, -5,
      -6, -4, -8, -9, -7, -11, -12, -10, -14, -15, -13, -17, -18, -16, -20, -21, -19, -23, -24, -22,
      -26, -27, -25, -29, -30, -28, -32, -33, -31, -35, -36, -34,
    ],
    Special: [
      8, 148, 16384, -3, 84, 864, 288, 864, 288, 84, 864, 288, 864, 288, 84, 360, 120, 360, 120, 40,
      80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40,
      40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 40, 80, 52, 40, 40, 80,
      52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40,
      80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52,
      40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80,
      52, 40, 40, 80, 52, 40, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40,
      40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52,
      40, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40,
      80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 40, 80, 52,
      40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80,
      52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 40, 80, 52, 40, 40, 80, 52, 40,
      40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52,
      40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40,
      80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40,
      40, 80, 52, 40, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80,
      52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40,
      40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52,
      40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80,
      52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40,
      80, 52, 40, 40, 80, 52, 40, 40, 80, 52, 40, 40, 96, 8, 8, 8, 8, 8, 8, -470, -471, -472, -473,
      -474, -475, 8, 8, 8, 8, 8, 8, -476, -477, -478, -479, -480, -481, 8, 8, 8, 8, 8, 8, -482,
      -483, -484, -485, -486, -487, -431, -432, -430, -429, -435, -436, -434, -433, -439, -440,
      -438, -437, -443, -444, -442, -441, -447, -448, -446, -445, -451, -452, -450, -449, -455,
      -456, -454, -453, -459, -460, -458, -457, -463, -464, -462, -461, -467, -468, -466, -465, -22,
      -23, -21, -20, -26, -27, -25, -24, -30, -31, -29, -28, -34, -35, -33, -32, -38, -39, -37, -36,
      -42, -43, -41, -40, -46, -47, -45, -44, -50, -51, -49, -48, -54, -55, -53, -52, -58, -59, -57,
      -56, -19, -63, -64, -62, -61, -67, -68, -66, -65, -71, -72, -70, -69, -75, -76, -74, -73, -79,
      -80, -78, -77, -83, -84, -82, -81, -87, -88, -86, -85, -91, -92, -90, -89, -95, -96, -94, -93,
      -99, -100, -98, -97, -60, -104, -105, -103, -102, -108, -109, -107, -106, -112, -113, -111,
      -110, -116, -117, -115, -114, -120, -121, -119, -118, -124, -125, -123, -122, -128, -129,
      -127, -126, -132, -133, -131, -130, -136, -137, -135, -134, -140, -141, -139, -138, -101,
      -145, -146, -144, -143, -149, -150, -148, -147, -153, -154, -152, -151, -157, -158, -156,
      -155, -161, -162, -160, -159, -165, -166, -164, -163, -169, -170, -168, -167, -173, -174,
      -172, -171, -177, -178, -176, -175, -181, -182, -180, -179, -142, -186, -187, -185, -184,
      -190, -191, -189, -188, -194, -195, -193, -192, -198, -199, -197, -196, -202, -203, -201,
      -200, -206, -207, -205, -204, -210, -211, -209, -208, -214, -215, -213, -212, -218, -219,
      -217, -216, -222, -223, -221, -220, -183, -227, -228, -226, -225, -231, -232, -230, -229,
      -235, -236, -234, -233, -239, -240, -238, -237, -243, -244, -242, -241, -247, -248, -246,
      -245, -251, -252, -250, -249, -255, -256, -254, -253, -259, -260, -258, -257, -263, -264,
      -262, -261, -224, -268, -269, -267, -266, -272, -273, -271, -270, -276, -277, -275, -274,
      -280, -281, -279, -278, -284, -285, -283, -282, -288, -289, -287, -286, -292, -293, -291,
      -290, -296, -297, -295, -294, -300, -301, -299, -298, -304, -305, -303, -302, -265, -309,
      -310, -308, -307, -313, -314, -312, -311, -317, -318, -316, -315, -321, -322, -320, -319,
      -325, -326, -324, -323, -329, -330, -328, -327, -333, -334, -332, -331, -337, -338, -336,
      -335, -341, -342, -340, -339, -345, -346, -344, -343, -306, -350, -351, -349, -348, -354,
      -355, -353, -352, -358, -359, -357, -356, -362, -363, -361, -360, -366, -367, -365, -364,
      -370, -371, -369, -368, -374, -375, -373, -372, -378, -379, -377, -376, -382, -383, -381,
      -380, -386, -387, -385, -384, -347, -391, -392, -390, -389, -395, -396, -394, -393, -399,
      -400, -398, -397, -403, -404, -402, -401, -407, -408, -406, -405, -411, -412, -410, -409,
      -415, -416, -414, -413, -419, -420, -418, -417, -423, -424, -422, -421, -427, -428, -426,
      -425, -388, -5, -7, -6, -8, -4, -10, -12, -11, -13, -9, -15, -17, -16, -18, -14, -469, -2, -1,
    ],
  },
};

/**
 * The heap events of an ordinary enemy's basic Attack hit (any monster whose slot-1 attack hits): the spark child's header and its two
 * 80-byte packet buffers, freed 21 ticks later packet 0, packet 1, header (Suikoden-Bizhawk-HUD notes/2026-11-10_vfx_generic_effects.md
 * section 1, observed 21 of 21 hits in 4 Magician's Island groups, static). A miss, a Flee or any other move allocates nothing in
 * this list. The words written into the blocks are not modelled (they stay unknown).
 * Caveat (notes/2026-11-09_vfx_followup_recordings.md, 12d recordings): in Attack rounds against the S-hit party (Rock Buster, Clay Doll,
 * 17 of 17) a second resource (52, 40, 40 and a 24-byte shadow with 40, 40) is allocated as well. It is absent in the Magician's Island
 * Defend rounds, and whether it belongs to the hit or to the target is not settled, so it is not in this list.
 * @type {number[]}
 */
export const ENEMY_ATTACK_HIT = [52, 80, 80, -2, -3, -1];

/**
 * Per-event tick offsets for the enemy moves in ENEMY_MOVE_EVENTS, from the agent's frame tables
 * (Suikoden-Bizhawk-HUD enemy_profiles/vfx_effects/ask11_cc_move_frames_v10.json). Each move's schedule is an array of [relTick, count]
 * pairs: the next `count` events in ENEMY_MOVE_EVENTS happen at `relTick` ticks from A (the move's first allocation). The sum of counts
 * equals the event array's length; the ticks are non-decreasing; and each group is homogeneous (all allocs or all frees).
 *
 * Anchors: Attack A = hitRoll + 8 frames (H from the AI scan, 15 of 15 runs); Special A = lastPoll + 3 (15 of 15 runs). In the
 * simulator's tick: Attack A = dispatch tick + 10 (the hit roll is 2 frames after the poll); Special A = sim tick + 3.
 * First and repeated Specials have identical tick schedules (the frame-level lag differs but not the ticks).
 * @type {Record<string, Record<string, [number, number][]>>}
 */
export const ENEMY_MOVE_EVENT_TICKS = {
  CRYSTAL_CORE: {
    Attack: [
      [0, 36], // 12 launch groups (52 + 40 + 40 each)
      [34, 3], // hit child (52, 80, 80)
      [55, 3], // child freed
      [98, 36], // 12 launch groups freed
    ],
    Special: [
      [0, 1], // container (8)
      [2, 2], // struct (148) + loader (16384)
      [13, 1], // loader freed
      [14, 466], // bulk: particle systems, sprites, ring arrays
      [100, 6], // hit objects wave 1 (8 x 6)
      [132, 6], // wave 1 freed
      [136, 6], // hit objects wave 2 (8 x 6)
      [168, 6], // wave 2 freed
      [172, 6], // hit objects wave 3 (8 x 6)
      [204, 6], // wave 3 freed
      [254, 467], // bulk + rings + ring blocks freed
      [257, 1], // container freed
    ],
  },
};

/**
 * The anchor of each enemy move: how to compute A (the first allocation frame) from a simulator tick.
 * `hitRoll`: A = sim dispatch tick + offset (the hit roll is 2 ticks after the poll, A is 8 after that).
 * `poll`: A = sim tick + offset (the sim tick for the Special is the poll).
 * @type {Record<string, Record<string, { anchor: 'hitRoll' | 'poll', offset: number }>>}
 */
export const ENEMY_MOVE_ANCHORS = {
  CRYSTAL_CORE: {
    Attack: { anchor: 'hitRoll', offset: 10 },
    Special: { anchor: 'poll', offset: 3 },
  },
};
