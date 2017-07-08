// @flow

import SimpleSet from './SimpleSet'

export interface IContext {
    last: ?IAtomInt;
    lastId: number;

    proposeToPull(atom: IAtomInt): void;
    proposeToReap(atom: IAtomInt): void;
    unreap(atom: IAtomInt): void;
    run(): void;
}

export const ATOM_STATUS = {
    DESTROYED: 0,
    OBSOLETE: 1,
    CHECKING: 2,
    PULLING: 3,
    ACTUAL: 4
}

export const catchedId = Symbol('lom_atom_catched')

type $Object<V> = { +[ key : string] : V }
type $ObjectValues<V, O : $Object<V>> = V
type $Values<O: Object> = $ObjectValues<*, O>

export type IAtomStatus = $Values<typeof ATOM_STATUS>

export interface IAtom<V> {
    status: IAtomStatus;
    get(): V;
    set(v: V): V;
    destroyed(isDestroyed?: boolean): boolean;
}

export interface IAtomInt extends IAtom<*> {
    id: number;
    actualize(): void;
    check(): void;
    obsolete(): void;
    dislead(slave: IAtomInt): void;
    addMaster(master: IAtomInt): void;
}

export type IAtomForce = boolean

export type IAtomHandler<V> = (next?: V, force?: IAtomForce) => V
