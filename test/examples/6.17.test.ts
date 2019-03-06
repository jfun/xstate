import { assert } from 'chai';
import { Machine } from '../../src/index';
import { testMultiTransition } from '../utils';

describe('Example 6.17', () => {
  const machine = Machine({
    initial: 'X',
    states: {
      X: {
        on: {
          1: 'Y',
          2: 'Y.A.C', // 6.18
          // 3: { Y: { A: 'C', B: 'F' } } // 6.19
          4: 'Y.A.hist'
        }
      },
      Y: {
        type: 'parallel',
        states: {
          A: {
            initial: 'D',
            states: { C: {}, D: {}, E: {}, hist: { history: true } }
          },
          B: {
            initial: 'G',
            states: { F: {}, G: {}, H: {} }
          }
        },
        on: {
          back: 'X'
        }
      }
    }
  });

  const expected = {
    X: {
      1: { Y: { A: 'D', B: 'G' } },
      2: { Y: { A: 'C', B: 'G' } }, // 6.18
      // 3: { Y: { A: 'C', B: 'F' } }, //  6.19
      '2, back, 4': { Y: { A: 'C', B: 'G' } }
    },
    '{"Y":{"A":"C","B":"G"}}': {
      back: 'X'
    },
    'Y.A.C': {
      back: 'X'
    },
    'Y.B.G': {
      back: 'X'
    }
  };

  for (const fromState of Object.keys(expected)) {
    for (const eventTypes of Object.keys(expected[fromState])) {
      const toState = expected[fromState][eventTypes];

      it(`should go from ${fromState} to ${JSON.stringify(
        toState
      )} on ${eventTypes}`, async () => {
        const resultState = await testMultiTransition(
          machine,
          fromState,
          eventTypes
        );

        assert.deepEqual(resultState.value, toState);
      });
    }
  }
});

describe('Jump to ID', () => {
  const machine = Machine({
    initial: 'X',
    states: {
      X: {
        id: 'X',
        on: {
          1: 'Y',
          2: 'Y.A.C', // 6.18
          // 3: { Y: { A: 'C', B: 'F' } } // 6.19
          4: 'Y.A.hist'
        }
      },
      Y: {
        type: 'parallel',
        states: {
          A: {
            initial: 'D',
            states: {
              C: {
                on: {
                  finish: '#X'
                }
              },
              D: {},
              E: {},
              hist: { history: true }
            }
          },
          B: {
            initial: 'G',
            states: { F: {}, G: {}, H: {} }
          }
        },
        on: {
          kill: '#X'
        }
      }
    }
  });

  const expected = {
    'Y.B.G': {
      kill: 'X'
    },
    '{"Y":{"A":"C","B":"H"}}': {
      finish: 'X'
    }
  };

  for (const fromState of Object.keys(expected)) {
    for (const eventTypes of Object.keys(expected[fromState])) {
      const toState = expected[fromState][eventTypes];

      it(`should go from ${fromState} to ${JSON.stringify(
        toState
      )} on ${eventTypes}`, async () => {
        const resultState = await testMultiTransition(
          machine,
          fromState,
          eventTypes
        );

        assert.deepEqual(resultState.value, toState);
      });
    }
  }
});
