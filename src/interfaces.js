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

export class AtomForce<V> {
    value: V | void

    constructor(value?: V) {
        this.value = value
    }

    valueOf(): V | void {
        return this.value
    }
}

export type IForceable<V> = V | AtomForce<V>

export interface IAtom<V> {
    status: IAtomStatus;
    field: string;
    get(force?: IForceable<V>): V;
    set(v: IForceable<V>): V;
    value(next?: IForceable<V>): V;
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

export type IAtomHandler<V> = (next?: V) => V
export type IAtomKeyHandler<V, K> = (key: K, next?: V) => V

export type IAtomHost<V> = {
    [key: string]: IAtomHandler<V> | IAtomKeyHandler<V, *>;
    _destroy?: () => void;
}

export interface IHooks<Props: Object, Context> {
    // constructor(): IHooks<Props, Context>;
    +_destroy?: () => void;
    +initContext?: (props: Props) => Context;
    +updateContext?: (oldProps: Props, newProps: Props, oldContext: Context) => Context;
}

// export interface IHasHooks<Props: Object, Context> {
//     hooks?: Class<IHooks<Props, Context>>;
// }
//
export type IHooksFromComponent<Props, Context> = (component: Function) => ?IHooks<Props, Context>
