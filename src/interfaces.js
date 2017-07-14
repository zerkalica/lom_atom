// @flow

export interface ILogger {
    pulling(atom: IAtom<*>): void;
    error<V>(atom: IAtom<V>, err: Error): void;
    newValue<V>(atom: IAtom<V>, from?: V | Error, to: V): void;
}

export interface IContext {
    last: ?IAtomInt;
    force: boolean;

    newValue<V>(t: IAtom<V>, from?: V | Error, to: V | Error): void;
    setLogger(logger: ILogger): void;
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
    field: string;
    get(force?: boolean): V;
    set(v: V, force?: boolean): V;
    value(next?: V, force?: boolean): V;
    destroyed(isDestroyed?: boolean): boolean;
}

export interface IAtomInt extends IAtom<*> {
    isComponent: boolean;

    actualize(): void;
    check(): void;
    obsolete(): void;
    dislead(slave: IAtomInt): void;
    addMaster(master: IAtomInt): void;
}

export type IAtomForce = boolean

export type IAtomHost<V> = {
    __lom?: string[];
    [key: string]: (next?: V, force?: IAtomForce) => V;
    _destroy?: () => void;
}

export type IAtomHandler<V> = (next?: V, force?: IAtomForce) => V

export type IAtomKeyHandler<V, K> = (key: K, next?: V, force?: IAtomForce) => V
