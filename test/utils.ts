import { StateNode, State } from '../src/index';
import { assert } from 'chai';
import { matchesState } from '../lib';

export async function testMultiTransition<TExt>(
  machine: StateNode<TExt>,
  fromState: string,
  eventTypes: string
) {
  let resultState: string | State<TExt> = fromState;
  for (const eventType of eventTypes.split(/,\s?/)) {
    if (typeof resultState === 'string' && resultState[0] === '{') {
      resultState = JSON.parse(resultState);
    }
    resultState = (await machine.transition(resultState, eventType)) as State<
      TExt
    >;
  }

  return resultState as State<TExt>;
}

export function testAll(machine: StateNode, expected: {}): void {
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

        if (toState === undefined) {
          // undefined means that the state didn't transition
          assert.isEmpty(resultState.actions);
          assert.isFalse(resultState.changed);
        } else if (typeof toState === 'string') {
          assert.ok(
            matchesState(toState, resultState.value),
            `${JSON.stringify(resultState.value)} does not match ${toState}`
          );
        } else {
          assert.deepEqual(resultState.value, toState);
        }
      });
    }
  }
}
