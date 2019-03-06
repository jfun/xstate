import { assert } from 'chai';
import { Machine, actions } from '../src/index';

interface CounterContext {
  count: number;
  foo: string;
  maybe?: string;
}

const counterMachine = Machine<CounterContext>({
  initial: 'counting',
  context: { count: 0, foo: 'bar' },
  states: {
    counting: {
      on: {
        INC: [
          {
            target: 'counting',
            actions: [
              actions.assign<CounterContext>(xs => ({
                count: xs.count + 1
              }))
            ]
          }
        ],
        DEC: [
          {
            target: 'counting',
            actions: [
              actions.assign<CounterContext>({
                count: xs => xs.count - 1
              })
            ]
          }
        ],
        WIN_PROP: [
          {
            target: 'counting',
            actions: [
              actions.assign<CounterContext>({
                count: () => 100,
                foo: () => 'win'
              })
            ]
          }
        ],
        WIN_STATIC: [
          {
            target: 'counting',
            actions: [
              actions.assign<CounterContext>({
                count: 100,
                foo: 'win'
              })
            ]
          }
        ],
        WIN_MIX: [
          {
            target: 'counting',
            actions: [
              actions.assign<CounterContext>({
                count: () => 100,
                foo: 'win'
              })
            ]
          }
        ],
        WIN: [
          {
            target: 'counting',
            actions: [
              actions.assign<CounterContext>(() => ({
                count: 100,
                foo: 'win'
              }))
            ]
          }
        ],
        SET_MAYBE: [
          {
            actions: [
              actions.assign<CounterContext>({
                maybe: 'defined'
              })
            ]
          }
        ]
      }
    }
  }
});

describe('assign', () => {
  it('applies the assignment to the external state (property assignment)', async () => {
    const oneState = await counterMachine.transition(
      await counterMachine.initialState,
      'DEC'
    );

    assert.deepEqual(oneState.value, 'counting');
    assert.deepEqual(oneState.context, { count: -1, foo: 'bar' });

    const twoState = await counterMachine.transition(oneState, 'DEC');

    assert.deepEqual(twoState.value, 'counting');
    assert.deepEqual(twoState.context, { count: -2, foo: 'bar' });
  });

  it('applies the assignment to the external state', async () => {
    const oneState = await counterMachine.transition(
      await counterMachine.initialState,
      'INC'
    );

    assert.deepEqual(oneState.value, 'counting');
    assert.deepEqual(oneState.context, { count: 1, foo: 'bar' });

    const twoState = await counterMachine.transition(oneState, 'INC');

    assert.deepEqual(twoState.value, 'counting');
    assert.deepEqual(twoState.context, { count: 2, foo: 'bar' });
  });

  it('applies the assignment to multiple properties (property assignment)', async () => {
    const nextState = await counterMachine.transition(
      await counterMachine.initialState,
      'WIN_PROP'
    );

    assert.deepEqual(nextState.context, { count: 100, foo: 'win' });
  });

  it('applies the assignment to multiple properties (static)', async () => {
    const nextState = await counterMachine.transition(
      await counterMachine.initialState,
      'WIN_STATIC'
    );

    assert.deepEqual(nextState.context, { count: 100, foo: 'win' });
  });

  it('applies the assignment to multiple properties (static + prop assignment)', async () => {
    const nextState = await counterMachine.transition(
      await counterMachine.initialState,
      'WIN_MIX'
    );

    assert.deepEqual(nextState.context, { count: 100, foo: 'win' });
  });

  it('applies the assignment to multiple properties', async () => {
    const nextState = await counterMachine.transition(
      await counterMachine.initialState,
      'WIN'
    );

    assert.deepEqual(nextState.context, { count: 100, foo: 'win' });
  });

  it('applies the assignment to the explicit external state (property assignment)', async () => {
    const oneState = await counterMachine.transition(
      await counterMachine.initialState,
      'DEC',
      { count: 50, foo: 'bar' }
    );

    assert.deepEqual(oneState.value, 'counting');
    assert.deepEqual(oneState.context, { count: 49, foo: 'bar' });

    const twoState = await counterMachine.transition(oneState, 'DEC');

    assert.deepEqual(twoState.value, 'counting');
    assert.deepEqual(twoState.context, { count: 48, foo: 'bar' });

    const threeState = await counterMachine.transition(twoState, 'DEC', {
      count: 100,
      foo: 'bar'
    });

    assert.deepEqual(threeState.value, 'counting');
    assert.deepEqual(threeState.context, { count: 99, foo: 'bar' });
  });

  it('applies the assignment to the explicit external state', async () => {
    const oneState = await counterMachine.transition(
      await counterMachine.initialState,
      'INC',
      { count: 50, foo: 'bar' }
    );

    assert.deepEqual(oneState.value, 'counting');
    assert.deepEqual(oneState.context, { count: 51, foo: 'bar' });

    const twoState = await counterMachine.transition(oneState, 'INC');

    assert.deepEqual(twoState.value, 'counting');
    assert.deepEqual(twoState.context, { count: 52, foo: 'bar' });

    const threeState = await counterMachine.transition(twoState, 'INC', {
      count: 102,
      foo: 'bar'
    });

    assert.deepEqual(threeState.value, 'counting');
    assert.deepEqual(threeState.context, { count: 103, foo: 'bar' });
  });

  it('should maintain state after unhandled event', async () => {
    const initialState = await counterMachine.initialState;

    const nextState = await counterMachine.transition(
      initialState,
      'FAKE_EVENT'
    );

    assert.isDefined(nextState.context);
    assert.deepEqual(nextState.context, { count: 0, foo: 'bar' });
  });

  it('sets undefined properties', async () => {
    const initialState = await counterMachine.initialState;

    const nextState = await counterMachine.transition(
      initialState,
      'SET_MAYBE'
    );

    assert.isDefined(nextState.context.maybe);
    assert.deepEqual(nextState.context, {
      count: 0,
      foo: 'bar',
      maybe: 'defined'
    });
  });
});
