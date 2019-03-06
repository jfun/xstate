import { assert } from 'chai';
import { Machine, assign } from '../src/index';

describe('onEntry/onExit actions', () => {
  const pedestrianStates = {
    initial: 'walk',
    states: {
      walk: {
        on: {
          PED_COUNTDOWN: 'wait'
        },
        onEntry: 'enter_walk',
        onExit: 'exit_walk'
      },
      wait: {
        on: {
          PED_COUNTDOWN: 'stop'
        },
        onEntry: 'enter_wait',
        onExit: 'exit_wait'
      },
      stop: {
        onEntry: ['enter_stop'],
        onExit: ['exit_stop']
      }
    }
  };

  const lightMachine = Machine({
    key: 'light',
    initial: 'green',
    states: {
      green: {
        on: {
          TIMER: 'yellow',
          POWER_OUTAGE: 'red',
          NOTHING: 'green'
        },
        onEntry: 'enter_green',
        onExit: 'exit_green'
      },
      yellow: {
        on: {
          TIMER: 'red',
          POWER_OUTAGE: 'red'
        },
        onEntry: 'enter_yellow',
        onExit: 'exit_yellow'
      },
      red: {
        on: {
          TIMER: 'green',
          POWER_OUTAGE: 'red',
          NOTHING: 'red'
        },
        onEntry: 'enter_red',
        onExit: 'exit_red',
        ...pedestrianStates
      }
    }
  });

  const parallelMachine = Machine({
    type: 'parallel',
    states: {
      a: {
        initial: 'a1',
        states: {
          a1: {
            on: {
              CHANGE: { target: 'a2', actions: ['do_a2', 'another_do_a2'] }
            },
            onEntry: 'enter_a1',
            onExit: 'exit_a1'
          },
          a2: { onEntry: 'enter_a2', onExit: 'exit_a2' }
        },
        onEntry: 'enter_a',
        onExit: 'exit_a'
      },
      b: {
        initial: 'b1',
        states: {
          b1: {
            on: { CHANGE: { target: 'b2', actions: 'do_b2' } },
            onEntry: 'enter_b1',
            onExit: 'exit_b1'
          },
          b2: { onEntry: 'enter_b2', onExit: 'exit_b2' }
        },
        onEntry: 'enter_b',
        onExit: 'exit_b'
      }
    }
  });

  const deepMachine = Machine({
    initial: 'a',
    states: {
      a: {
        initial: 'a1',
        states: {
          a1: {
            on: {
              NEXT: 'a2',
              NEXT_FN: 'a3'
            },
            onEntry: 'enter_a1',
            onExit: 'exit_a1'
          },
          a2: {
            onEntry: 'enter_a2',
            onExit: 'exit_a2'
          },
          a3: {
            on: {
              NEXT: {
                target: 'a2',
                actions: [
                  function do_a3_to_a2() {
                    return;
                  }
                ]
              }
            },
            onEntry: function enter_a3_fn() {
              return;
            },
            onExit: function exit_a3_fn() {
              return;
            }
          }
        },
        onEntry: 'enter_a',
        onExit: ['exit_a', 'another_exit_a'],
        on: { CHANGE: 'b' }
      },
      b: {
        onEntry: ['enter_b', 'another_enter_b'],
        onExit: 'exit_b',
        initial: 'b1',
        states: {
          b1: {
            onEntry: 'enter_b1',
            onExit: 'exit_b1'
          }
        }
      }
    }
  });

  const parallelMachine2 = Machine({
    initial: 'A',
    states: {
      A: {
        on: {
          'to-B': 'B'
        }
      },
      B: {
        type: 'parallel',
        on: {
          'to-A': 'A'
        },
        states: {
          C: {
            initial: 'C1',
            states: {
              C1: {},
              C2: {}
            }
          },
          D: {
            initial: 'D1',
            states: {
              D1: {
                on: {
                  'to-D2': 'D2'
                }
              },
              D2: {
                onEntry: ['D2 Entry'],
                onExit: ['D2 Exit']
              }
            }
          }
        }
      }
    }
  });

  describe('State.actions', () => {
    it('should return the entry actions of an initial state', async () => {
      assert.sameMembers(
        (await lightMachine.initialState).actions.map(a => a.type),
        ['enter_green']
      );
    });

    it('should return the entry actions of an initial state (deep)', async () => {
      assert.sameMembers(
        (await deepMachine.initialState).actions.map(a => a.type),
        ['enter_a', 'enter_a1']
      );
    });

    it('should return the entry actions of an initial state (parallel)', async () => {
      assert.sameMembers(
        (await parallelMachine.initialState).actions.map(a => a.type),
        ['enter_a', 'enter_b', 'enter_a1', 'enter_b1']
      );
    });

    it('should return the entry and exit actions of a transition', async () => {
      assert.deepEqual(
        (await lightMachine.transition('green', 'TIMER')).actions.map(
          a => a.type
        ),
        ['exit_green', 'enter_yellow']
      );
    });

    it('should return the entry and exit actions of a deep transition', async () => {
      assert.deepEqual(
        (await lightMachine.transition('yellow', 'TIMER')).actions.map(
          a => a.type
        ),
        ['exit_yellow', 'enter_red', 'enter_walk']
      );
    });

    it('should return the entry and exit actions of a nested transition', async () => {
      assert.deepEqual(
        (await lightMachine.transition(
          'red.walk',
          'PED_COUNTDOWN'
        )).actions.map(a => a.type),
        ['exit_walk', 'enter_wait']
      );
    });

    it('should not have actions for unhandled events (shallow)', async () => {
      assert.deepEqual(
        (await lightMachine.transition('green', 'FAKE')).actions.map(
          a => a.type
        ),
        []
      );
    });

    it('should not have actions for unhandled events (deep)', async () => {
      assert.deepEqual(
        (await lightMachine.transition('red', 'FAKE')).actions.map(a => a.type),
        []
      );
    });

    it('should exit and enter the state for self-transitions (shallow)', async () => {
      assert.deepEqual(
        (await lightMachine.transition('green', 'NOTHING')).actions.map(
          a => a.type
        ),
        ['exit_green', 'enter_green']
      );
    });

    it('should exit and enter the state for self-transitions (deep)', async () => {
      // 'red' state resolves to 'red.walk'
      assert.deepEqual(
        (await lightMachine.transition('red', 'NOTHING')).actions.map(
          a => a.type
        ),
        ['exit_walk', 'exit_red', 'enter_red', 'enter_walk']
      );
    });

    it('should return actions for parallel machines', async () => {
      assert.deepEqual(
        (await parallelMachine.transition(
          await parallelMachine.initialState,
          'CHANGE'
        )).actions.map(a => a.type),
        [
          'exit_a1',
          'exit_b1',
          'do_a2',
          'another_do_a2',
          'do_b2',
          'enter_a2',
          'enter_b2'
        ]
      );
    });

    it('should return nested actions in the correct (child to parent) order', async () => {
      assert.deepEqual(
        (await deepMachine.transition('a.a1', 'CHANGE')).actions.map(
          a => a.type
        ),
        [
          'exit_a1',
          'exit_a',
          'another_exit_a',
          'enter_b',
          'another_enter_b',
          'enter_b1'
        ]
      );
    });

    it('should ignore parent state actions for same-parent substates', async () => {
      assert.deepEqual(
        (await deepMachine.transition('a.a1', 'NEXT')).actions.map(a => a.type),
        ['exit_a1', 'enter_a2']
      );
    });

    it('should work with function actions', async () => {
      assert.deepEqual(
        (await deepMachine.transition(
          await deepMachine.initialState,
          'NEXT_FN'
        )).actions.map(action => action.type),
        ['exit_a1', 'enter_a3_fn']
      );

      assert.deepEqual(
        (await deepMachine.transition('a.a3', 'NEXT')).actions.map(
          action => action.type
        ),
        ['exit_a3_fn', 'do_a3_to_a2', 'enter_a2']
      );
    });

    it('should exit children of parallel state nodes', async () => {
      const stateB = await parallelMachine2.transition(
        await parallelMachine2.initialState,
        'to-B'
      );
      const stateD2 = await parallelMachine2.transition(stateB, 'to-D2');
      const stateA = await parallelMachine2.transition(stateD2, 'to-A');

      assert.deepEqual(stateA.actions.map(action => action.type), ['D2 Exit']);
    });

    describe('should ignore same-parent state actions (sparse)', () => {
      const fooBar = {
        initial: 'foo',
        states: {
          foo: {
            on: {
              TACK: 'bar',
              ABSOLUTE_TACK: '#machine.ping.bar'
            }
          },
          bar: {
            on: {
              TACK: 'foo'
            }
          }
        }
      };

      const pingPong = Machine({
        initial: 'ping',
        key: 'machine',
        states: {
          ping: {
            onEntry: ['entryEvent'],
            on: {
              TICK: 'pong'
            },
            ...fooBar
          },
          pong: {
            on: {
              TICK: 'ping'
            }
          }
        }
      });

      it('with a relative transition', async () => {
        assert.isEmpty((await pingPong.transition('ping.foo', 'TACK')).actions);
      });

      it('with an absolute transition', async () => {
        assert.isEmpty(
          (await pingPong.transition('ping.foo', 'ABSOLUTE_TACK')).actions
        );
      });
    });
  });
});

describe('actions on invalid transition', () => {
  const stopMachine = Machine({
    initial: 'idle',
    states: {
      idle: {
        on: {
          STOP: {
            target: 'stop',
            actions: ['action1']
          }
        }
      },
      stop: {}
    }
  });

  it('should not recall previous actions', async () => {
    const nextState = await stopMachine.transition('idle', 'STOP');
    assert.isEmpty(
      (await stopMachine.transition(nextState, 'INVALID')).actions
    );
  });
});

describe('actions option', () => {
  type EventType =
    | { type: 'definedAction' }
    | { type: 'updateContext' }
    | { type: 'EVENT' }
    | { type: 'E' };
  interface Context {
    count: number;
  }
  interface State {
    states: {
      a: {};
      b: {};
    };
  }

  // tslint:disable-next-line:no-empty
  const definedAction = () => {};
  const simpleMachine = Machine<Context, State, EventType>(
    {
      initial: 'a',
      context: {
        count: 0
      },
      states: {
        a: {
          onEntry: [
            'definedAction',
            { type: 'definedAction' },
            'undefinedAction'
          ],
          on: {
            EVENT: {
              target: 'b',
              actions: [{ type: 'definedAction' }, { type: 'updateContext' }]
            }
          }
        },
        b: {}
      },
      on: {
        E: 'a'
      }
    },
    {
      actions: {
        definedAction,
        updateContext: assign({ count: 10 })
      }
    }
  );
  it('should reference actions defined in actions parameter of machine options', async () => {
    const initialState = await simpleMachine.initialState;
    const nextState = await simpleMachine.transition(initialState, 'E');

    assert.includeMembers(nextState.actions.map(a => a.type), [
      'definedAction',
      'undefinedAction'
    ]);

    assert.deepEqual(nextState.actions, [
      { type: 'definedAction', exec: definedAction },
      { type: 'definedAction', exec: definedAction },
      { type: 'undefinedAction', exec: undefined }
    ]);
  });

  it('should reference actions defined in actions parameter of machine options (initial state)', async () => {
    const initialState = await simpleMachine.initialState;

    assert.includeMembers(initialState.actions.map(a => a.type), [
      'definedAction',
      'undefinedAction'
    ]);
  });

  it('should be able to reference action implementations from action objects', async () => {
    const state = await simpleMachine.transition('a', 'EVENT');

    assert.deepEqual(state.actions, [
      { type: 'definedAction', exec: definedAction }
    ]);

    assert.deepEqual(state.context, { count: 10 });
  });

  it('should work with anonymous functions (with warning)', async () => {
    let onEntryCalled = false;
    let actionCalled = false;
    let onExitCalled = false;

    const anonMachine = Machine({
      id: 'anon',
      initial: 'active',
      states: {
        active: {
          onEntry: () => (onEntryCalled = true),
          onExit: () => (onExitCalled = true),
          on: {
            EVENT: {
              target: 'inactive',
              actions: [() => (actionCalled = true)]
            }
          }
        },
        inactive: {}
      }
    });

    const initialState = await anonMachine.initialState;

    initialState.actions.forEach(action => {
      if (action.exec) {
        action.exec(
          initialState.context,
          { type: 'any' },
          {
            action
          }
        );
      }
    });

    assert.isTrue(onEntryCalled);

    const inactiveState = await anonMachine.transition(initialState, 'EVENT');

    assert.lengthOf(inactiveState.actions, 2);

    inactiveState.actions.forEach(action => {
      if (action.exec) {
        action.exec(
          inactiveState.context,
          { type: 'EVENT' },
          {
            action
          }
        );
      }
    });

    assert.isTrue(onExitCalled, 'onExit should be called');
    assert.isTrue(actionCalled, 'action should be called');
  });
});
