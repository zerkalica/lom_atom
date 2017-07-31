// @flow

type s = string

export {default as Atom} from './Atom'
export {default as mem, memkey, detached, force} from './mem'
export {defaultContext, animationFrame} from './Context'

export type {
    ResultOf,
    IAtom,
    IAtomStatus,
    IContext,
    IAtomHandler,
    NamesOf
} from './interfaces'
