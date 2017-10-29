// @flow

export {default as Atom} from './Atom'
export {default as mem, memkey, detached, force, action} from './mem'
export {defaultContext, BaseLogger, ConsoleLogger} from './Context'

export type {
    ResultOf,
    IAtom,
    IAtomForce,
    IAtomStatus,
    IContext,
    IAtomHandler,
    NamesOf,
    ILoggerStatus,
    ILogger
} from './interfaces'

export {
    ATOM_FORCE_NONE,
    ATOM_FORCE_CACHE,
    ATOM_FORCE_UPDATE
} from './interfaces'
