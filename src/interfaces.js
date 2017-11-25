// @flow

export type ILoggerStatus = 'waiting' | 'proposeToReap' | 'proposeToPull'

export interface ILogger {
    beginGroup(name: string): void;
    endGroup(): void;

    /**
     * After atom destructor
     */
    onDestruct<V>(atom: IAtom<V>): void;

    /**
     * Error while actualizing atom
     */
    error<V>(atom: IAtom<V>, err: Error): void;

    /**
     * Atom value changed
     */
    newValue<V>(atom: IAtom<V>, from?: V | Error, to: V | Error): void;
}

export interface IContext {
    current: ?IAtomInt;
    force: IAtomForce;
    prevForce: IAtomForce;
    destroyHost(atom: IAtomInt): void;
    newValue<V>(t: IAtom<V>, from?: V | Error, to: V | Error): void;
    setLogger(logger: ILogger): void;
    proposeToPull(atom: IAtomInt): void;
    proposeToReap(atom: IAtomInt): void;
    unreap(atom: IAtomInt): void;
    beginTransaction(namespace: string): string;
    endTransaction(oldNamespace: string): void;
}

export const ATOM_FORCE_NONE = 0
export const ATOM_FORCE_CACHE = 1
export const ATOM_FORCE_UPDATE = 2

export type IAtomForce = typeof ATOM_FORCE_CACHE | typeof ATOM_FORCE_UPDATE | typeof ATOM_FORCE_NONE

export const ATOM_STATUS_DESTROYED = 0
export const ATOM_STATUS_OBSOLETE = 1
export const ATOM_STATUS_CHECKING = 2
export const ATOM_STATUS_PULLING = 3
export const ATOM_STATUS_ACTUAL = 4

export const catchedId = Symbol('lom_atom_catched')
export const origId = Symbol('orig_error')
export type IAtomStatus = typeof ATOM_STATUS_OBSOLETE
    | typeof ATOM_STATUS_CHECKING | typeof ATOM_STATUS_PULLING | typeof ATOM_STATUS_ACTUAL

export interface IAtom<V> {
    status: IAtomStatus;
    current: V | Error | void;
    +field: string;
    +displayName: string;
    value(v?: V | Error): V;
    destructor(): void;
}

export interface IAtomInt extends IAtom<*> {
    isComponent: boolean;
    key: mixed | void;
    owner: IAtomOwner;

    actualize(): void;
    check(): void;
    obsolete(): void;
    dislead(slave: IAtomInt): void;
    addMaster(master: IAtomInt): void;
}

export type IAtomHandler<V, K> = (key: K, next?: V | Error) => V
    | (next?: V | Error) => V

export interface IAtomOwner {
    displayName?: string;
    [key: string]: IAtomHandler<*, *>;
}

export type TypedPropertyDescriptor<T> = {
    enumerable?: boolean;
    configurable?: boolean;
    writable?: boolean;
    value?: T;
    initializer?: () => T;
    get?: () => T;
    set?: (value: T) => void;
}
