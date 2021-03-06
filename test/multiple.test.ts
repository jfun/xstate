import { assert } from 'chai';
import { Machine } from '../src/index';

describe('multiple', () => {
  const machine = Machine({
    key: 'machine',
    initial: 'simple',
    states: {
      simple: {
        on: {
          DEEP_M: 'para.K.M',
          DEEP_CM: [{ target: ['para.A.C', 'para.K.M'] }],
          DEEP_MR: [{ target: ['para.K.M', 'para.P.R'] }],
          DEEP_CMR: [{ target: ['para.A.C', 'para.K.M', 'para.P.R'] }],
          BROKEN_SAME_REGION: [{ target: ['para.A.C', 'para.A.B'] }],
          BROKEN_DIFFERENT_REGIONS: [
            { target: ['para.A.C', 'para.K.M', 'other'] }
          ],
          BROKEN_DIFFERENT_REGIONS_2: [{ target: ['para.A.C', 'para2.K2.M2'] }],
          BROKEN_DIFFERENT_REGIONS_3: [
            { target: ['para2.K2.L2.L2A', 'other'] }
          ],
          BROKEN_DIFFERENT_REGIONS_4: [
            { target: ['para2.K2.L2.L2A.L2C', 'para2.K2.M2'] }
          ],
          INITIAL: 'para'
        }
      },
      other: {
        initial: 'X',
        states: {
          X: {}
        }
      },
      para: {
        type: 'parallel',
        states: {
          A: {
            initial: 'B',
            states: {
              B: {},
              C: {}
            }
          },
          K: {
            initial: 'L',
            states: {
              L: {},
              M: {}
            }
          },
          P: {
            initial: 'Q',
            states: {
              Q: {},
              R: {}
            }
          }
        }
      },
      para2: {
        type: 'parallel',
        states: {
          A2: {
            initial: 'B2',
            states: {
              B2: {},
              C2: {}
            }
          },
          K2: {
            initial: 'L2',
            states: {
              L2: {
                type: 'parallel',
                states: {
                  L2A: {
                    initial: 'L2B',
                    states: {
                      L2B: {},
                      L2C: {}
                    }
                  },
                  L2K: {
                    initial: 'L2L',
                    states: {
                      L2L: {},
                      L2M: {}
                    }
                  },
                  L2P: {
                    initial: 'L2Q',
                    states: {
                      L2Q: {},
                      L2R: {}
                    }
                  }
                }
              },
              M2: {
                type: 'parallel',
                states: {
                  M2A: {
                    initial: 'M2B',
                    states: {
                      M2B: {},
                      M2C: {}
                    }
                  },
                  M2K: {
                    initial: 'M2L',
                    states: {
                      M2L: {},
                      M2M: {}
                    }
                  },
                  M2P: {
                    initial: 'M2Q',
                    states: {
                      M2Q: {},
                      M2R: {}
                    }
                  }
                }
              }
            }
          },
          P2: {
            initial: 'Q2',
            states: {
              Q2: {},
              R2: {}
            }
          }
        }
      }
    }
  });

  describe('transitions to parallel states', () => {
    let stateSimple;
    let stateInitial;
    let stateM;

    before(async () => {
      stateSimple = await machine.initialState;
      stateInitial = await machine.transition(stateSimple, 'INITIAL');
      stateM = await machine.transition(stateSimple, 'DEEP_M');
    });

    it('should enter initial states of parallel states', () => {
      assert.deepEqual(stateInitial.value, {
        para: { A: 'B', K: 'L', P: 'Q' }
      });
    });

    it('should enter specific states in one region', () => {
      assert.deepEqual(stateM.value, { para: { A: 'B', K: 'M', P: 'Q' } });
    });

    it('should enter specific states in all regions', async () => {
      const stateCMR = await machine.transition(stateSimple, 'DEEP_CMR');
      assert.deepEqual(stateCMR.value, { para: { A: 'C', K: 'M', P: 'R' } });
    });

    it('should enter specific states in some regions', async () => {
      const stateMR = await machine.transition(stateSimple, 'DEEP_MR');
      assert.deepEqual(stateMR.value, { para: { A: 'B', K: 'M', P: 'R' } });
    });

    it('should reject two targets in the same region', async () => {
      let error;
      try {
        await machine.transition(stateSimple, 'BROKEN_SAME_REGION');
      } catch (err) {
        error = err;
      }
      assert.isDefined(error);
    });

    it('should reject targets inside and outside a region', async () => {
      let error;
      try {
        await machine.transition(stateSimple, 'BROKEN_DIFFERENT_REGIONS');
      } catch (err) {
        error = err;
      }
      assert.isDefined(error);
    });

    it('should reject two targets in different regions', async () => {
      let error;
      try {
        await machine.transition(stateSimple, 'BROKEN_DIFFERENT_REGIONS_2');
      } catch (err) {
        error = err;
      }
      assert.isDefined(error);
    });

    it('should reject two targets in different regions at different levels', async () => {
      let error;
      try {
        await machine.transition(stateSimple, 'BROKEN_DIFFERENT_REGIONS_3');
      } catch (err) {
        error = err;
      }
      assert.isDefined(error);
    });

    it('should reject two deep targets in different regions at top level', async () => {
      let error;
      try {
        await machine.transition(stateSimple, 'BROKEN_DIFFERENT_REGIONS_3');
      } catch (err) {
        error = err;
      }
      assert.isDefined(error);
    });

    it('should reject two deep targets in different regions at different levels', async () => {
      let error;
      try {
        await machine.transition(stateSimple, 'BROKEN_DIFFERENT_REGIONS_4');
      } catch (err) {
        error = err;
      }
      assert.isDefined(error);
    });
  });
});
