// @flow

type _ResultOf<V, F: (...x: any[]) => V> = V // eslint-disable-line
export type ResultOf<F> = _ResultOf<*, F>
export type NamesOf<F> = {+[id: $Keys<ResultOf<F>>]: string}

export type ILoggerStatus = 'waiting' | 'proposeToReap' | 'proposeToPull'

export interface ILogger {
    sync(): void;

    /**
     * Invokes before atom creating
     *
     * @param owner Object Object with atom
     * @param field string property name
     * @param key mixed | void for dictionary atoms - dictionary key
     */
    create<V>(owner: Object, field: string, key?: mixed, namespace: string): V | void;

    /**
     * After atom destructor
     */
    onDestruct(atom: IAtom<*>, namespace: string): void;

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
    create<V>(atom: IAtomInt): V | void;
    destroyHost(atom: IAtomInt): void;
    newValue<V>(t: IAtom<V>, from?: V | Error, to: V | Error, isActualize?: boolean): void;
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

export type IAtomStatus = typeof ATOM_STATUS_OBSOLETE
    | typeof ATOM_STATUS_CHECKING | typeof ATOM_STATUS_PULLING | typeof ATOM_STATUS_ACTUAL

export interface IAtom<V> {
    status: IAtomStatus;
    current: V | Error | void;
    +field: string;
    +displayName: string;
    value(v?: V | Error, force?: IAtomForce): V;
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
//  | Error
export type IAtomHandler<V, K> = (key: K, next?: V | Error, force?: IAtomForce, oldValue?: V) => V
    | (next?: V | Error, force?: IAtomForce, oldValue?: V) => V

export interface IAtomOwner {
    displayName?: string;
    [key: string]: IAtomHandler<*, *>;
}
