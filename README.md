# xstate-async

This is a fork of [xstate](https://github.com/davidkpiano/xstate) by davidkpiano.

Changes have been made to allow guards to be async functions. The motivation behind this is that
in a complex state machine it is painful to know what event requires what context to pass on for the guard function to work.

In our use case, allowing the guard to retrieve the data it required to make a decision would simplify adding new features.

## TODO:

- Delayed sends are currently not functional
