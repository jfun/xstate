import { assert } from 'chai';
// import { Machine, State } from '../src/index';
import { toggle, sequence } from '../src/patterns';
import { Machine } from '../src';

describe('patterns', () => {
  describe('toggle pattern', () => {
    it('should produce a partial state machine with a binary toggle', () => {
      assert.deepEqual(toggle('on', 'off', 'SWITCH'), {
        on: { on: { SWITCH: 'off' } },
        off: { on: { SWITCH: 'on' } }
      });
    });
  });

  describe('sequence pattern', () => {
    it('should work with an array', async () => {
      const seq = ['one', 'two', 'three', 'last'];

      const sequenceMachine = Machine({
        id: 'sequence',
        ...sequence(seq)
      });

      assert.deepEqual(
        (await sequenceMachine.transition(seq[0], 'NEXT')).value,
        seq[1]
      );

      assert.deepEqual(
        (await sequenceMachine.transition(seq[1], 'PREV')).value,
        seq[0]
      );

      assert.deepEqual(
        (await sequenceMachine.transition(seq[seq.length - 1], 'NEXT')).value,
        seq[seq.length - 1]
      );

      assert.deepEqual(
        (await sequenceMachine.transition(seq[0], 'PREV')).value,
        seq[0]
      );
    });

    it('should customize the next/prev events', async () => {
      const seq = ['one', 'two', 'three', 'last'];

      const sequenceMachine = Machine({
        id: 'sequence',
        ...sequence(seq, {
          nextEvent: 'FORWARD',
          prevEvent: 'BACK'
        })
      });

      assert.deepEqual(
        (await sequenceMachine.transition(seq[0], 'NEXT')).value,
        seq[0]
      );

      assert.deepEqual(
        (await sequenceMachine.transition(seq[1], 'PREV')).value,
        seq[1]
      );

      assert.deepEqual(
        (await sequenceMachine.transition(seq[0], 'FORWARD')).value,
        seq[1]
      );

      assert.deepEqual(
        (await sequenceMachine.transition(seq[1], 'BACK')).value,
        seq[0]
      );
    });

    it('should allow next/prev events to be undefined', async () => {
      const seq = ['one', 'two', 'three', 'last'];

      const sequenceMachine = Machine({
        id: 'sequence',
        ...sequence(seq, {
          nextEvent: 'FORWARD',
          prevEvent: undefined
        })
      });

      assert.deepEqual(
        (await sequenceMachine.transition(seq[0], 'FORWARD')).value,
        seq[1]
      );

      assert.deepEqual(
        (await sequenceMachine.transition(seq[1], 'BACK')).value,
        seq[1]
      );

      const backSequenceMachine = Machine({
        id: 'backSequence',
        ...sequence(seq, {
          nextEvent: undefined,
          prevEvent: 'BACK'
        })
      });

      assert.deepEqual(
        (await backSequenceMachine.transition(seq[0], 'FORWARD')).value,
        seq[0]
      );

      assert.deepEqual(
        (await backSequenceMachine.transition(seq[1], 'BACK')).value,
        seq[0]
      );
    });
  });
});
