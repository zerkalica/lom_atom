// @flow
import type {TypedPropertyDescriptor, IAtom, IAtomForce, IAtomStatus} from '../interfaces'
import {ATOM_STATUS_DEEP_RESET, ATOM_FORCE_NONE, ATOM_FORCE_RETRY, ATOM_FORCE_CACHE, ATOM_FORCE_ASYNC} from '../interfaces'
import {defaultContext} from '../Context'
import {atomId, getId, setFunctionName} from '../utils'
import Atom from '../Atom'

function createGetSetHandler<V>(
    get?: () => V,
    set?: (v: V) => void
): (next?: V) => V {
    return function getSetHandler(next?: V): V {
        if (next === undefined) {
            return (get: any).call(this)
        }
        ;(set: any).call(this, next)
        return next
    }
}

function createValueHandler<V>(initializer?: () => V): (next?: V | Error) => V {
    return function valueHandler(next?: V | Error): V {
        return next === undefined && initializer
            ? initializer.call(this)
            : (next: any)
    }
}

let forceCache: IAtomForce = ATOM_FORCE_NONE

function mem<V>(
    proto: Object,
    name: string,
    descr: TypedPropertyDescriptor<V>,
    deepReset?: boolean
): TypedPropertyDescriptor<V> {
    const handlerKey = `${name}$`
    if (proto[handlerKey] !== undefined) return descr
    const hostAtoms: WeakMap<Object, IAtom<V>> = new WeakMap()

    Object.defineProperty(proto, `${name}()`, {
        get() {
            return hostAtoms.get(this)
        }
    })

    let handler: (next?: V) => V
    const longName = getId(proto, name)

    function value(next?: V): V {
        let atom: IAtom<V> | void = hostAtoms.get(this)
        if (atom === undefined) {
            atom = new Atom(
                longName,
                handler.bind(this),
                this,
                hostAtoms,
                deepReset
            )
            hostAtoms.set(this, atom)
        }
        return forceCache === ATOM_FORCE_RETRY ? (atom: any) : atom.value(next, forceCache)
    }

    if (descr.value !== undefined) {
        handler = (descr.value: any)
        descr.value = value
        return descr
    }

    if (descr.initializer) setFunctionName(descr.initializer, longName)
    if (descr.get) setFunctionName(descr.get, `get#${longName}`)
    if (descr.set) setFunctionName(descr.set, `set#${longName}`)

    handler = descr.get === undefined && descr.set === undefined
        ? createValueHandler(descr.initializer)
        : createGetSetHandler(descr.get, descr.set)
    proto[handlerKey] = handler

    return {
        enumerable: descr.enumerable,
        configurable: descr.configurable,
        get: value,
        set: (value: Function)
    }
}

function memManual<V>(
    proto: Object,
    name: string,
    descr: TypedPropertyDescriptor<V>
) {
    return mem(proto, name, descr, true)
}

function getKey(params: any): string {
    if (!params) return ''
    if (typeof params === 'object') return JSON.stringify(params)

    return '' + params
}

function memkey<V, K>(
    proto: Object,
    name: string,
    descr: TypedPropertyDescriptor<(k: K, next?: V) => V>,
    deepReset?: boolean
): TypedPropertyDescriptor<(k: K, next?: V) => V> {
    const handlerKey = `${name}$`
    if (proto[handlerKey] !== undefined) return descr
    const hostAtoms: WeakMap<Object, Map<string, IAtom<V>>> = new WeakMap()
    Object.defineProperty(proto, `${name}()`, {
        get() {
            return hostAtoms.get(this)
        }
    })

    const longName = getId(proto, name)
    const handler = descr.value
    if (handler === undefined) {
        throw new TypeError(`${longName} is not an function (rawKey: K, next?: V)`)
    }

    function value(rawKey: K, next?: V): V {
        let atomMap: Map<string, IAtom<V>> | void = hostAtoms.get(this)
        if (atomMap === undefined) {
            atomMap = new Map()
            hostAtoms.set(this, atomMap)
        }
        const key = getKey(rawKey)
        let atom: IAtom<V> | void = atomMap.get(key)
        if (atom === undefined) {
            atom = new Atom(
                longName,
                handler.bind(this, rawKey),
                key,
                atomMap,
                deepReset
            )
            atomMap.set(key, atom)
        }
        return forceCache === ATOM_FORCE_RETRY ? (atom: any) : atom.value(next, forceCache)
    }

    proto[handlerKey] = handler

    descr.value = value

    return descr
}

function memkeyManual<V, K>(
    proto: Object,
    name: string,
    descr: TypedPropertyDescriptor<(k: K, next?: V) => V>
) {
    return memkey(proto, name, descr, true)
}
memkey.manual = memkeyManual

type IDecorator<V> = (proto: Object, name: string, descr: TypedPropertyDescriptor<V>) => TypedPropertyDescriptor<V>;

function cache<V>(data: V): V {
    forceCache = ATOM_FORCE_NONE
    return data
}

function getRetryResult<V>(atom: IAtom<V>): () => void {
    forceCache = ATOM_FORCE_NONE
    return atom.getRetry()
}

function getRetry(error: Error): void | () => void {
    const atom = (error: Object)[atomId]
    return atom ? atom.getRetry() : undefined
}

Object.defineProperties(mem, {
    cache: ({
        get<V>(): (v: V) => V {
            forceCache = ATOM_FORCE_CACHE
            return cache
        }
    }: any),
    getRetry: ({
        get<V>(): (v: IAtom<V>) => () => void {
            forceCache = ATOM_FORCE_RETRY
            return getRetryResult
        }
    }: any),
    retry: {
        value: getRetry
    },
    async: ({
        get<V>(): (v: V) => V {
            forceCache = ATOM_FORCE_ASYNC
            return cache
        }
    }: any),
    manual: { value: memManual },
    key: { value: memkey }
})


type IMemKey = {
    <V, K>(proto: Object, name: string, descr: TypedPropertyDescriptor<(k: K, next?: V) => V>): TypedPropertyDescriptor<(k: K, next?: V) => V>;
    manual: IDecorator<<V, K>(k: K, next?: V) => V>;
}

type IMem = {
    <V>(proto: Object, name: string, descr: TypedPropertyDescriptor<V>): TypedPropertyDescriptor<V>;
    manual: IDecorator<*>;
    cache<V>(v: V): V;
    async<V>(v: V): V;
    getRetry<V>(v: V): () => void;
    retry(error: Error): void | () => void;
    key: IMemKey;
}
export default ((mem: any): IMem)
