// @flow

type _ResultOf<V, F: (...x: any[]) => V> = V // eslint-disable-line
export type ResultOf<F> = _ResultOf<*, F>
export type NamesOf<F> = {+[id: $Keys<ResultOf<F>>]: string}

export type ILoggerStatus = 'waiting' | 'proposeToReap' | 'proposeToPull'

export interface ILogger {
    /**
     * Invokes before atom creating
     *
     * @param host Object Object with atom
     * @param field string property name
     * @param key mixed | void for dictionary atoms - dictionary key
     */
    create<V>(host: Object, field: string, key?: mixed, namespace: string): V | void;

    /**
     * After atom destroy
     */
    destroy(atom: IAtom<*>, namespace: string): void;

    /**
     * Atom status changes
         - 'waiting' - atom fetching from server (mem.Wait throwed)
         - 'proposeToReap' - atom probably will be destroyed on next tick
         - 'proposeToPull' - atom will be actualized on next tick
     */
    status(status: ILoggerStatus, atom: IAtom<*>, namespace: string): void;

    /**
     * Error while actualizing atom
     */
    error<V>(atom: IAtom<V>, err: Error, namespace: string): void;

    /**
     * Atom value changed
     * @param isActualize bool if true - atom handler invoked, if false - only atom.cache value getted/setted
     */
    newValue<V>(atom: IAtom<V>, from?: V | Error, to: V, isActualize?: boolean, namespace: string): void;
}

export interface IContext {
    last: ?IAtomInt;
    create<V>(host: Object, field: string, key?: mixed): V | void;
    destroyHost(atom: IAtomInt): void;
    newValue<V>(t: IAtom<V>, from?: V | Error, to: V | Error, isActualize?: boolean): void;
    setLogger(logger: ILogger): void;
    proposeToPull(atom: IAtomInt): void;
    proposeToReap(atom: IAtomInt): void;
    unreap(atom: IAtomInt): void;
    beginTransaction(namespace: string): string;
    endTransaction(oldNamespace: string): void;
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
    value: V | void;
    +field: string;
    +displayName: string;
    get(force?: boolean): V;
    set(v: V | Error, force?: boolean): V;
    destroyed(isDestroyed?: boolean): boolean;
}

export interface IAtomInt extends IAtom<*> {
    isComponent: boolean;
    key: mixed | void;
    host: IAtomHost;

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
    displayName?: string;
    [key: string]: IAtomHandler<*, *>;
    destroy?: (value: mixed, field: string, key?: mixed) => void;
}
