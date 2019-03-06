import { assert } from 'chai';
import { Machine } from '../src/Machine';

describe('deterministic machine', () => {
  const pedestrianStates = {
    initial: 'walk',
    states: {
      walk: {
        on: {
          PED_COUNTDOWN: 'wait',
          TIMER: undefined // forbidden event
        }
      },
      wait: {
        on: {
          PED_COUNTDOWN: 'stop',
          TIMER: undefined // forbidden event
        }
      },
      stop: {}
    }
  };

  const lightMachine = Machine({
    key: 'light',
    initial: 'green',
    states: {
      green: {
        on: {
          TIMER: 'yellow',
          POWER_OUTAGE: 'red'
        }
      },
      yellow: {
        on: {
          TIMER: 'red',
          POWER_OUTAGE: 'red'
        }
      },
      red: {
        on: {
          TIMER: 'green',
          POWER_OUTAGE: 'red'
        },
        ...pedestrianStates
      }
    }
  });

  const testMachine = Machine({
    key: 'test',
    initial: 'a',
    states: {
      a: {
        on: {
          T: 'b.b1',
          F: 'c'
        }
      },
      b: {
        initial: 'b1',
        states: {
          b1: {}
        }
      }
    }
  });

  const deepMachine = Machine({
    key: 'deep',
    initial: 'a',
    states: {
      a1: {
        initial: 'a2',
        states: {
          a2: {
            initial: 'a3',
            states: {
              a3: {
                initial: 'a4',
                states: {
                  a4: {}
                }
              }
            }
          }
        }
      }
    }
  });

  describe('machine.initialState', () => {
    it('should return the initial state value', async () => {
      assert.deepEqual((await lightMachine.initialState).value, 'green');
    });

    it('should not have any history', async () => {
      assert.isUndefined((await lightMachine.initialState).history);
    });
  });

  describe('machine.transition()', () => {
    it('should properly transition states based on string event', async () => {
      assert.deepEqual(
        (await lightMachine.transition('green', 'TIMER')).value,
        'yellow'
      );
    });

    it('should properly transition states based on event-like object', async () => {
      const event = {
        type: 'TIMER'
      };

      assert.deepEqual(
        (await lightMachine.transition('green', event)).value,
        'yellow'
      );
    });

    it('should not transition states for illegal transitions', async () => {
      assert.equal(
        (await lightMachine.transition('green', 'FAKE')).value,
        'green'
      );
      assert.isEmpty((await lightMachine.transition('green', 'FAKE')).actions);
    });

    it('should throw an error if not given an event', async () => {
      // @ts-ignore
      let error;
      try {
        await (lightMachine.transition as any)('red', undefined);
      } catch (err) {
        error = err;
      }

      assert.isDefined(error);
    });

    it('should transition to nested states as target', async () => {
      assert.deepEqual((await testMachine.transition('a', 'T')).value, {
        b: 'b1'
      });
    });

    it('should throw an error for transitions from invalid states', async () => {
      let error;
      try {
        await testMachine.transition('fake', 'T');
      } catch (err) {
        error = err;
      }

      assert.isDefined(error);
    });

    it('should throw an error for transitions to invalid states', async () => {
      let error;
      try {
        await testMachine.transition('a', 'F');
      } catch (err) {
        error = err;
      }
      assert.isDefined(error);
    });

    it('should throw an error for transitions from invalid substates', async () => {
      let error;
      try {
        await testMachine.transition('a.fake', 'T');
      } catch (err) {
        error = err;
      }
      assert.isDefined(error);
    });
  });

  describe('machine.transition() with nested states', () => {
    it('should properly transition a nested state', async () => {
      assert.deepEqual(
        (await lightMachine.transition('red.walk', 'PED_COUNTDOWN')).value,
        { red: 'wait' }
      );
    });

    it('should transition from initial nested states', async () => {
      assert.deepEqual(
        (await lightMachine.transition('red', 'PED_COUNTDOWN')).value,
        {
          red: 'wait'
        }
      );
    });

    it('should transition from deep initial nested states', async () => {
      assert.deepEqual(
        (await lightMachine.transition('red', 'PED_COUNTDOWN')).value,
        {
          red: 'wait'
        }
      );
    });

    it('should bubble up events that nested states cannot handle', async () => {
      assert.equal(
        (await lightMachine.transition('red.stop', 'TIMER')).value,
        'green'
      );
    });

    it('should not transition from illegal events', async () => {
      assert.deepEqual(
        (await lightMachine.transition('red.walk', 'FAKE')).value,
        {
          red: 'walk'
        }
      );
      assert.isEmpty(
        (await lightMachine.transition('red.walk', 'FAKE')).actions
      );

      assert.deepEqual((await deepMachine.transition('a1', 'FAKE')).value, {
        a1: { a2: { a3: 'a4' } }
      });
      assert.isEmpty((await deepMachine.transition('a1', 'FAKE')).actions);
    });

    it('should transition to the deepest initial state', async () => {
      assert.deepEqual(
        (await lightMachine.transition('yellow', 'TIMER')).value,
        {
          red: 'walk'
        }
      );
    });

    it('should return the equivalent state if no transition occurs', async () => {
      const initialState = await lightMachine.transition(
        await lightMachine.initialState,
        'NOTHING'
      );
      const nextState = await lightMachine.transition(initialState, 'NOTHING');

      assert.equal(initialState.value, nextState.value);
      assert.isFalse(nextState.changed);
    });
  });

  describe('state key names', () => {
    const machine = Machine({
      key: 'test',
      initial: 'test',
      states: {
        test: {
          activities: ['activity'],
          onEntry: ['onEntry'],
          on: {
            NEXT: 'test'
          },
          onExit: ['onExit']
        }
      }
    });

    it('should work with substate nodes that have the same key', async () => {
      assert.deepEqual(
        (await machine.transition(await machine.initialState, 'NEXT')).value,
        'test'
      );
    });
  });

  describe('forbidden events', () => {
    it('undefined transitions should forbid events', async () => {
      const walkState = await lightMachine.transition('red.walk', 'TIMER');

      assert.deepEqual(
        walkState.value,
        { red: 'walk' },
        'Machine should not transition to "green" when in "red.walk"'
      );
    });
  });
});
