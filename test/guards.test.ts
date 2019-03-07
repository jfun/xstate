import { assert } from 'chai';
import { Machine, matchesState } from '../src/index';

describe('guard conditions', () => {
  // type LightMachineEvents =
  //   | { type: 'TIMER'; elapsed: number }
  //   | { type: 'EMERGENCY'; isEmergency: boolean };

  const lightMachine = Machine<{ elapsed: number }>(
    {
      key: 'light',
      initial: 'green',
      states: {
        green: {
          on: {
            TIMER: [
              {
                target: 'green',
                cond: ({ elapsed }) => elapsed < 100
              },
              {
                target: 'yellow',
                cond: ({ elapsed }) => elapsed >= 100 && elapsed < 200
              }
            ],
            EMERGENCY: {
              target: 'red',
              cond: (_, event) => event.isEmergency
            }
          }
        },
        yellow: {
          on: {
            TIMER: {
              target: 'red',
              cond: 'minTimeElapsed'
            }
          }
        },
        red: {
          on: {
            BAD_COND: { target: 'red', cond: 'doesNotExist' }
          }
        }
      }
    },
    {
      guards: {
        minTimeElapsed: ({ elapsed }) => elapsed >= 100 && elapsed < 200
      }
    }
  );

  it('should transition only if condition is met', async () => {
    assert.equal(
      (await lightMachine.transition('green', 'TIMER', {
        elapsed: 50
      })).value,
      'green'
    );

    assert.deepEqual(
      (await lightMachine.transition('green', 'TIMER', {
        elapsed: 120
      })).value,
      'yellow'
    );
  });

  it('should transition if condition based on event is met', async () => {
    assert.deepEqual(
      (await lightMachine.transition('green', {
        type: 'EMERGENCY',
        isEmergency: true
      })).value,
      'red'
    );
  });

  it('should not transition if condition based on event is not met', async () => {
    assert.deepEqual(
      (await lightMachine.transition('green', { type: 'EMERGENCY' })).value,
      'green'
    );
  });

  it('should not transition if no condition is met', async () => {
    const nextState = await lightMachine.transition('green', 'TIMER', {
      elapsed: 9000
    });
    assert.deepEqual(nextState.value, 'green');
    assert.isEmpty(nextState.actions);
  });

  it('should work with defined string transitions', async () => {
    const nextState = await lightMachine.transition('yellow', 'TIMER', {
      elapsed: 150
    });
    assert.equal(nextState.value, 'red');
  });

  it('should work with defined string transitions (condition not met)', async () => {
    const nextState = await lightMachine.transition('yellow', 'TIMER', {
      elapsed: 10
    });
    assert.equal(nextState.value, 'yellow');
  });

  it('should throw if string transition is not defined', async () => {
    let error;
    try {
      await lightMachine.transition('red', 'BAD_COND');
    } catch (err) {
      error = err;
    }
    assert.isDefined(error);
  });
});

describe('guard conditions', () => {
  const machine = Machine({
    key: 'microsteps',
    type: 'parallel',
    states: {
      A: {
        initial: 'A0',
        states: {
          A0: {
            on: {
              A: 'A1'
            }
          },
          A1: {
            on: {
              A: 'A2'
            }
          },
          A2: {
            on: {
              A: 'A3'
            }
          },
          A3: {
            on: {
              '': 'A4'
            }
          },
          A4: {
            on: {
              '': 'A5'
            }
          },
          A5: {}
        }
      },
      B: {
        initial: 'B0',
        states: {
          B0: {
            on: {
              T1: [
                {
                  target: 'B1',
                  cond: async (_state, _event, interim) =>
                    matchesState('A.A1', interim)
                }
              ],
              T2: [
                {
                  target: 'B2',
                  cond: async (_state, _event, interim) =>
                    matchesState('A.A2', interim)
                }
              ],
              T3: [
                {
                  target: 'B3',
                  cond: async (_state, _event, interim) =>
                    matchesState('A.A3', interim)
                }
              ],
              '': [
                {
                  target: 'B4',
                  cond: async (_state, _event, interim) =>
                    matchesState('A.A4', interim)
                }
              ]
            }
          },
          B1: {},
          B2: {},
          B3: {},
          B4: {}
        }
      }
    }
  });

  it('should guard against transition', async () => {
    assert.deepEqual(
      (await machine.transition({ A: 'A2', B: 'B0' }, 'T1')).value,
      {
        A: 'A2',
        B: 'B0'
      }
    );
  });

  it('should allow a matching transition', async () => {
    assert.deepEqual(
      (await machine.transition({ A: 'A2', B: 'B0' }, 'T2')).value,
      {
        A: 'A2',
        B: 'B2'
      }
    );
  });

  it('should check guards with interim states', async () => {
    assert.deepEqual(
      (await machine.transition({ A: 'A2', B: 'B0' }, 'A')).value,
      {
        A: 'A5',
        B: 'B4'
      }
    );
  });
});
