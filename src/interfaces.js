// @flow
import type Collection from './Collection'
export type ILoggerStatus = 'waiting' | 'proposeToReap' | 'proposeToPull'
export const actionId = Symbol('lom_action')
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

export const ATOM_STATUS_DESTROYED: 0 = 0
export const ATOM_STATUS_OBSOLETE: 1 = 1
export const ATOM_STATUS_CHECKING: 2 = 2
export const ATOM_STATUS_PULLING: 3 = 3
export const ATOM_STATUS_ACTUAL: 4 = 4
export const ATOM_STATUS_DEEP_RESET: 5 = 5

export type IAtomStatus = typeof ATOM_STATUS_OBSOLETE
    | typeof ATOM_STATUS_CHECKING | typeof ATOM_STATUS_PULLING | typeof ATOM_STATUS_ACTUAL
    | typeof ATOM_STATUS_DEEP_RESET | typeof ATOM_STATUS_DESTROYED

export const ATOM_FORCE_NONE: 0 = 0
export const ATOM_FORCE_CACHE: 1 = 1
export const ATOM_FORCE_ASYNC: 2 = 2
export const ATOM_FORCE_RETRY: 3 = 3

export type IAtomForce = typeof ATOM_FORCE_NONE | typeof ATOM_FORCE_CACHE | typeof ATOM_FORCE_ASYNC | typeof ATOM_FORCE_RETRY

export interface IAtom<V> {
    status: IAtomStatus;
    current: V;
    +field: string;
    value(v?: V | Error, forceCache?: IAtomForce): V;
    refresh(): void;
    destructor(): void;
    getRetry(): () => void;
}

export interface IAtomInt extends IAtom<*> {
    isComponent: boolean;
    manualReset: boolean;

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
