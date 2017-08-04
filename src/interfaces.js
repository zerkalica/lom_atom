// @flow

type _ResultOf<V, F: (...x: any[]) => V> = V // eslint-disable-line
export type ResultOf<F> = _ResultOf<*, F>
export type NamesOf<F> = {+[id: $Keys<ResultOf<F>>]: string}

export interface ILogger {
    pulling(atom: IAtom<*>): void;
    error<V>(atom: IAtom<V>, err: Error): void;
    newValue<V>(atom: IAtom<V>, from?: V | Error, to: V): void;
}

export interface IContext {
    last: ?IAtomInt;
    force: boolean;

    getAtom<V>(
        field: string,
        host: IAtomHost,
        key?: mixed,
        normalize?: INormalize<V>,
        isComponent?: boolean
    ): IAtom<V>;

    destroyHost(atom: IAtomInt): void;

    newValue<V>(t: IAtom<V>, from?: V | Error, to: V | Error): void;
    setLogger(logger: ILogger): void;
    proposeToPull(atom: IAtomInt): void;
    proposeToReap(atom: IAtomInt): void;
    unreap(atom: IAtomInt): void;
    run(): void;
}

export const ATOM_STATUS_DESTROYED = 0
export const ATOM_STATUS_OBSOLETE = 1
export const ATOM_STATUS_CHECKING = 2
export const ATOM_STATUS_PULLING = 3
export const ATOM_STATUS_ACTUAL = 4

export const catchedId = Symbol('lom_atom_catched')

export type IAtomStatus = typeof ATOM_STATUS_DESTROYED | typeof ATOM_STATUS_OBSOLETE
    | typeof ATOM_STATUS_CHECKING | typeof ATOM_STATUS_PULLING | typeof ATOM_STATUS_ACTUAL

export interface IAtom<V> {
    status: IAtomStatus;
    field: string;
    get(force?: boolean): V;
    set(v: V | Error, force?: boolean): V;
    value(next?: V | Error, force?: boolean): V;
    destroyed(isDestroyed?: boolean): boolean;
}

export interface IAtomInt extends IAtom<*> {
    isComponent: boolean;
    key: mixed | void;
    host: IAtomHost;
    cached: any;

    actualize(): void;
    check(): void;
    obsolete(): void;
    dislead(slave: IAtomInt): void;
    addMaster(master: IAtomInt): void;
}
//  | Error
export type IAtomHandler<V, K> = (key: K, next?: V | Error, force?: boolean, oldValue?: V) => V
    | (next?: V | Error, force?: boolean, oldValue?: V) => V

export type INormalize<V> = (next: V, prev?: V) => V

export interface IAtomHost {
    [key: string]: IAtomHandler<*, *>;
    _destroyProp?: (key: mixed, value: mixed | void) => void;
    _destroy?: () => void;
}
