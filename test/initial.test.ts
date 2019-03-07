import { Machine } from '../src';
import { assert } from 'chai';

const config = {
  initial: 'a',
  states: {
    a: {
      initial: 'b',
      states: {
        b: {
          initial: 'c',
          states: {
            c: {}
          }
        }
      }
    },
    leaf: {}
  }
};

const deepMachine = Machine(config);

const parallelDeepMachine = Machine({
  type: 'parallel',
  states: {
    foo: config,
    bar: config
  }
});

const deepParallelMachine = Machine({
  initial: 'one',
  states: {
    one: parallelDeepMachine.config,
    two: parallelDeepMachine.config
  }
});

describe('Initial states', () => {
  it('should return the correct initial state', async () => {
    const initialState = await deepMachine.initialState;
    assert.deepEqual(initialState.value, { a: { b: 'c' } });
  });

  it('should return the correct initial state (parallel)', async () => {
    const initialState = await parallelDeepMachine.initialState;
    assert.deepEqual(initialState.value, {
      foo: { a: { b: 'c' } },
      bar: { a: { b: 'c' } }
    });
  });

  it('should return the correct initial state (deep parallel)', async () => {
    const initialState = await deepParallelMachine.initialState;
    assert.deepEqual(initialState.value, {
      one: {
        foo: { a: { b: 'c' } },
        bar: { a: { b: 'c' } }
      }
    });
  });

  it('should return undefined for leaf nodes', async () => {
    let error;
    try {
      await deepMachine.states.leaf.initialState;
    } catch (err) {
      error = err;
    }
    assert.isDefined(error);
  });
});
