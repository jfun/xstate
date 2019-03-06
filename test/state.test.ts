import { assert } from 'chai';
import { Machine, State } from '../src/index';
import { initEvent } from '../src/actions';

const machine = Machine({
  initial: 'one',
  states: {
    one: {
      onEntry: ['enter'],
      on: {
        EXTERNAL: {
          target: 'one',
          internal: false
        },
        INERT: {
          target: 'one',
          internal: true
        },
        INTERNAL: {
          target: 'one',
          internal: true,
          actions: ['doSomething']
        },
        TO_TWO: 'two',
        TO_THREE: 'three',
        FORBIDDEN_EVENT: undefined
      }
    },
    two: {
      initial: 'deep',
      states: {
        deep: {
          initial: 'foo',
          states: {
            foo: {
              on: {
                FOO_EVENT: 'bar',
                FORBIDDEN_EVENT: undefined
              }
            },
            bar: {
              on: {
                BAR_EVENT: 'foo'
              }
            }
          }
        }
      },
      on: {
        DEEP_EVENT: '.'
      }
    },
    three: {
      type: 'parallel',
      states: {
        first: {
          initial: 'p31',
          states: {
            p31: {
              on: { P31: '.' }
            }
          }
        },
        second: {
          initial: 'p32',
          states: {
            p32: {
              on: { P32: '.' }
            }
          }
        }
      },
      on: {
        THREE_EVENT: '.'
      }
    }
  },
  on: {
    MACHINE_EVENT: '.two'
  }
});

describe('State', () => {
  describe('.changed', () => {
    it('should indicate that it is not changed if initial state', async () => {
      assert.isUndefined((await machine.initialState).changed);
    });

    it('states from external transitions with onEntry actions should be changed', async () => {
      const changedState = await machine.transition(
        await machine.initialState,
        'EXTERNAL'
      );
      assert.isTrue(changedState.changed, 'changed due to onEntry action');
    });

    it('states from internal transitions with no actions should be unchanged', async () => {
      const changedState = await machine.transition(
        await machine.initialState,
        'EXTERNAL'
      );
      const unchangedState = await machine.transition(changedState, 'INERT');
      assert.isFalse(
        unchangedState.changed,
        'unchanged - same state, no actions'
      );
    });

    it('states from internal transitions with actions should be changed', async () => {
      const changedState = await machine.transition(
        await machine.initialState,
        'INTERNAL'
      );
      assert.isTrue(changedState.changed, 'changed - transition actions');
    });

    it('normal state transitions should be changed (initial state)', async () => {
      const changedState = await machine.transition(
        await machine.initialState,
        'TO_TWO'
      );
      assert.isTrue(
        changedState.changed,
        'changed - different state (from initial)'
      );
    });

    it('normal state transitions should be changed', async () => {
      const twoState = await machine.transition(
        await machine.initialState,
        'TO_TWO'
      );
      const changedState = await machine.transition(twoState, 'FOO_EVENT');
      assert.isTrue(changedState.changed, 'changed - different state');
    });

    it('normal state transitions with unknown event should be unchanged', async () => {
      const twoState = await machine.transition(
        await machine.initialState,
        'TO_TWO'
      );
      const changedState = await machine.transition(twoState, 'UNKNOWN_EVENT');
      assert.isFalse(changedState.changed, 'not changed - unknown event');
    });

    it('should report entering a final state as changed', async () => {
      const finalMachine = Machine({
        id: 'final',
        initial: 'one',
        states: {
          one: {
            on: {
              DONE: 'two'
            }
          },

          two: {
            type: 'final'
          }
        }
      });

      const twoState = await finalMachine.transition('one', 'DONE');

      assert.isTrue(twoState.changed);
    });
  });

  describe('.nextEvents', () => {
    it('returns the next possible events for the current state', async () => {
      assert.deepEqual((await machine.initialState).nextEvents, [
        'EXTERNAL',
        'INERT',
        'INTERNAL',
        'TO_TWO',
        'TO_THREE',
        'MACHINE_EVENT'
      ]);

      assert.deepEqual(
        (await machine.transition(await machine.initialState, 'TO_TWO'))
          .nextEvents,
        ['FOO_EVENT', 'DEEP_EVENT', 'MACHINE_EVENT']
      );

      assert.deepEqual(
        (await machine.transition(await machine.initialState, 'TO_THREE'))
          .nextEvents,
        ['P31', 'P32', 'THREE_EVENT', 'MACHINE_EVENT']
      );
    });

    xit('returns events when transitioned from StateValue', async () => {
      const initialState = await machine.initialState;
      const A = await machine.transition(initialState, 'TO_THREE');
      const B = await machine.transition(A.value, 'TO_THREE');

      assert.deepEqual(B.nextEvents, [
        'P31',
        'P32',
        'THREE_EVENT',
        'MACHINE_EVENT'
      ]);
    });
  });

  describe('State.create()', () => {
    it('should be able to create a state from a JSON config', async () => {
      const initialState = await machine.initialState;
      const jsonInitialState = JSON.parse(JSON.stringify(initialState));

      const stateFromConfig = State.create(jsonInitialState);

      assert.deepEqual(
        (await machine.transition(stateFromConfig, 'TO_TWO')).value,
        {
          two: { deep: 'foo' }
        }
      );
    });
  });

  describe('State.inert()', () => {
    it('should create an inert instance of the given State', async () => {
      const initialState = await machine.initialState;

      assert.isEmpty(State.inert(initialState, undefined).actions);
    });

    it('should create an inert instance of the given stateValue and context', async () => {
      const initialState = await machine.initialState;
      const inertState = State.inert(initialState.value, { foo: 'bar' });

      assert.isEmpty(inertState.actions);
      assert.deepEqual(inertState.context, { foo: 'bar' });
    });
  });

  describe('.inert', () => {
    it('should create an inert instance of the current State', async () => {
      const initialState = await machine.initialState;

      assert.isEmpty(initialState.inert.actions);
    });
  });

  describe('.event', () => {
    it('the .event prop should be the event (string) that caused the transition', async () => {
      const initialState = await machine.initialState;

      const nextState = await machine.transition(initialState, 'TO_TWO');

      assert.deepEqual(nextState.event, { type: 'TO_TWO' });
    });

    it('the .event prop should be the event (object) that caused the transition', async () => {
      const initialState = await machine.initialState;

      const nextState = await machine.transition(initialState, {
        type: 'TO_TWO',
        foo: 'bar'
      });

      assert.deepEqual(nextState.event, { type: 'TO_TWO', foo: 'bar' });
    });

    it('the .event prop should be the initial event for the initial state', async () => {
      const initialState = await machine.initialState;

      assert.deepEqual(initialState.event, initEvent);
    });
  });
});
