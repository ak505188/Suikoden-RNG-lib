import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ENEMY_MOVE_EVENTS,
  ENEMY_MOVE_EVENT_TICKS,
  ENEMY_MOVE_ANCHORS,
} from '../../lib/Game/Heap/EnemyMoveEvents.js';

describe('ENEMY_MOVE_EVENT_TICKS aligns with ENEMY_MOVE_EVENTS', () => {
  for (const [enemy, moves] of Object.entries(ENEMY_MOVE_EVENT_TICKS)) {
    for (const [move, tickGroups] of Object.entries(moves)) {
      const events = ENEMY_MOVE_EVENTS[enemy]?.[move];

      it(`${enemy} ${move}: total count equals the event array length`, () => {
        assert.ok(events, `no events for ${enemy}/${move}`);
        const total = tickGroups.reduce((sum, [, count]) => sum + count, 0);
        assert.equal(
          total,
          events.length,
          `tick groups total ${total} != events length ${events.length}`,
        );
      });

      it(`${enemy} ${move}: ticks are non-decreasing`, () => {
        for (let i = 1; i < tickGroups.length; i++)
          assert.ok(
            tickGroups[i][0] >= tickGroups[i - 1][0],
            `tick ${tickGroups[i][0]} at group ${i} < ${tickGroups[i - 1][0]} at group ${i - 1}`,
          );
      });

      it(`${enemy} ${move}: each tick group is homogeneous (all allocs or all frees)`, () => {
        let offset = 0;
        for (const [tick, count] of tickGroups) {
          const slice = events.slice(offset, offset + count);
          const allocs = slice.filter((e) => e > 0).length;
          const frees = slice.filter((e) => e < 0).length;
          assert.ok(
            allocs === 0 || frees === 0,
            `tick ${tick}: ${allocs} allocs and ${frees} frees mixed`,
          );
          offset += count;
        }
      });

      it(`${enemy} ${move}: every free references a valid earlier allocation`, () => {
        let allocCount = 0;
        let offset = 0;
        for (const [, count] of tickGroups) {
          for (let i = offset; i < offset + count; i++) {
            if (events[i] > 0) {
              allocCount++;
            } else {
              const k = -events[i];
              assert.ok(
                k >= 1 && k <= allocCount,
                `free -${k} at event ${i} out of range [1, ${allocCount}]`,
              );
            }
          }
          offset += count;
        }
      });

      // (a monster without an anchor is scheduled from the frame of its first allocation, which its caller gives)
      if (ENEMY_MOVE_ANCHORS[enemy])
        it(`${enemy} ${move}: has an anchor definition`, () => {
          const anchor = ENEMY_MOVE_ANCHORS[enemy]?.[move];
          assert.ok(anchor, `no anchor for ${enemy}/${move}`);
          assert.ok(
            anchor.anchor === 'hitRoll' || anchor.anchor === 'poll',
            `unknown anchor type ${anchor.anchor}`,
          );
          assert.ok(anchor.offset > 0, `non-positive offset ${anchor.offset}`);
        });
    }
  }
});
