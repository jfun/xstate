import { assert } from 'chai';
import { Machine } from '../src/index';

const machine = Machine({
  type: 'parallel',
  states: {
    a: {
      initial: 'a1',
      states: {
        a1: {
          on: {
            EVENT1: {
              target: 'a2',
              in: 'b.b2'
            },
            EVENT2: {
              target: 'a2',
              in: { b: 'b2' }
            },
            EVENT3: {
              target: 'a2',
              in: '#b_b2'
            }
          }
        },
        a2: {}
      }
    },
    b: {
      initial: 'b1',
      states: {
        b1: {
          on: {
            EVENT: {
              target: 'b2',
              in: 'a.a2'
            }
          }
        },
        b2: {
          id: 'b_b2',
          type: 'parallel',
          states: {
            foo: {
              initial: 'foo1',
              states: {
                foo1: {
                  on: {
                    EVENT_DEEP: { target: 'foo2', in: 'bar.bar1' }
                  }
                },
                foo2: {}
              }
            },
            bar: {
              initial: 'bar1',
              states: {
                bar1: {},
                bar2: {}
              }
            }
          }
        }
      }
    }
  }
});

const lightMachine = Machine({
  id: 'light',
  initial: 'green',
  states: {
    green: { on: { TIMER: 'yellow' } },
    yellow: { on: { TIMER: 'red' } },
    red: {
      initial: 'walk',
      states: {
        walk: {},
        wait: {},
        stop: {}
      },
      on: {
        TIMER: [
          {
            target: 'green',
            in: { red: 'stop' }
          }
        ]
      }
    }
  }
});

describe('transition "in" check', () => {
  it('should transition if string state path matches current state value', async () => {
    const state = await machine.transition(
      {
        a: 'a1',
        b: {
          b2: {
            foo: 'foo2',
            bar: 'bar1'
          }
        }
      },
      'EVENT1'
    );
    assert.deepEqual(state.value, {
      a: 'a2',
      b: {
        b2: {
          foo: 'foo2',
          bar: 'bar1'
        }
      }
    });
  });

  it('should transition if state node ID matches current state value', async () => {
    assert.deepEqual(
      (await machine.transition(
        {
          a: 'a1',
          b: {
            b2: {
              foo: 'foo2',
              bar: 'bar1'
            }
          }
        },
        'EVENT3'
      )).value,
      {
        a: 'a2',
        b: {
          b2: {
            foo: 'foo2',
            bar: 'bar1'
          }
        }
      }
    );
  });

  it('should not transition if string state path does not match current state value', async () => {
    assert.deepEqual(
      (await machine.transition({ a: 'a1', b: 'b1' }, 'EVENT1')).value,
      {
        a: 'a1',
        b: 'b1'
      }
    );
  });

  it('should not transition if state value matches current state value', async () => {
    assert.deepEqual(
      (await machine.transition(
        {
          a: 'a1',
          b: {
            b2: {
              foo: 'foo2',
              bar: 'bar1'
            }
          }
        },
        'EVENT2'
      )).value,
      {
        a: 'a2',
        b: {
          b2: {
            foo: 'foo2',
            bar: 'bar1'
          }
        }
      }
    );
  });

  it('matching should be relative to grandparent (match)', async () => {
    assert.deepEqual(
      (await machine.transition(
        { a: 'a1', b: { b2: { foo: 'foo1', bar: 'bar1' } } },
        'EVENT_DEEP'
      )).value,
      {
        a: 'a1',
        b: {
          b2: {
            foo: 'foo2',
            bar: 'bar1'
          }
        }
      }
    );
  });

  it('matching should be relative to grandparent (no match)', async () => {
    assert.deepEqual(
      (await machine.transition(
        { a: 'a1', b: { b2: { foo: 'foo1', bar: 'bar2' } } },
        'EVENT_DEEP'
      )).value,
      {
        a: 'a1',
        b: {
          b2: {
            foo: 'foo1',
            bar: 'bar2'
          }
        }
      }
    );
  });

  it('should work to forbid events', async () => {
    const walkState = await lightMachine.transition('red.walk', 'TIMER');

    assert.deepEqual(walkState.value, { red: 'walk' });

    const waitState = await lightMachine.transition('red.wait', 'TIMER');

    assert.deepEqual(waitState.value, { red: 'wait' });

    const stopState = await lightMachine.transition('red.stop', 'TIMER');

    assert.deepEqual(
      stopState.value,
      'green',
      'Transition allowed due to "in" clause'
    );
  });
});
