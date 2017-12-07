// @flow
import type {TypedPropertyDescriptor, IAtom, IAtomStatus} from '../interfaces'
import {ATOM_STATUS_DEEP_RESET} from '../interfaces'
import {defaultContext} from '../Context'
import {getId, setFunctionName} from '../utils'
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

let isForceCache = 0

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

    function value(next?: V): V {
        let atom: IAtom<V> | void = hostAtoms.get(this)
        if (atom === undefined) {
            atom = new Atom(name, this, defaultContext, hostAtoms, deepReset)
            hostAtoms.set(this, atom)
        }
        return atom.value(next, isForceCache)
    }
    if (descr.value !== undefined) {
        proto[handlerKey] = descr.value
        descr.value = value
        return descr
    }

    const longName = getId(proto, name)
    if (descr.initializer) setFunctionName(descr.initializer, longName)
    if (descr.get) setFunctionName(descr.get, `get#${longName}`)
    if (descr.set) setFunctionName(descr.set, `set#${longName}`)

    proto[handlerKey] = descr.get === undefined && descr.set === undefined
        ? createValueHandler(descr.initializer)
        : createGetSetHandler(descr.get, descr.set)

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

function getKeyFromObj(params: Object): string {
    const keys = Object.keys(params)
        .sort()

    let result = ''
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i]
        const value = params[key]
        result += `.${key}:${typeof value === 'object' ? JSON.stringify(value) : value}`
    }

    return result
}

function getKey(params: any): string {
    if (!params) return ''
    if (params instanceof Array) return JSON.stringify(params)
    if (typeof params === 'object') return getKeyFromObj(params)

    return '' + params
}

function memkey<V, K>(
    proto: Object,
    name: string,
    descr: TypedPropertyDescriptor<(k: K, next?: V) => V>,
    deepReset?: boolean
): TypedPropertyDescriptor<(k: K, next?: V) => V> {
    const longName = getId(proto, name)
    const handler = descr.value
    if (handler === undefined) {
        throw new TypeError(`${longName} is not an function (rawKey: K, next?: V)`)
    }
    proto[`${name}$`] = handler
    const hostAtoms: WeakMap<Object, Map<string, IAtom<V>>> = new WeakMap()
    Object.defineProperty(proto, `${name}()`, {
        get() {
            return hostAtoms.get(this)
        }
    })

    function value(rawKey: K, next?: V): V {
        let atomMap: Map<string, IAtom<V>> | void = hostAtoms.get(this)
        if (atomMap === undefined) {
            atomMap = new Map()
            hostAtoms.set(this, atomMap)
        }
        const key = getKey(rawKey)
        let atom: IAtom<V> | void = atomMap.get(key)
        if (atom === undefined) {
            atom = new Atom(name, this, defaultContext, atomMap, deepReset, rawKey, key)
            atomMap.set(key, atom)
        }

        return atom.value(next, isForceCache)
    }

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
    isForceCache = 0
    return data
}

Object.defineProperties(mem, {
    cache: ({
        get<V>(): (v: V) => V {
            isForceCache = 1
            return cache
        }
    }: any),
    async: ({
        get<V>(): (v: V) => V {
            isForceCache = 2
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

    key: IMemKey;
}
export default ((mem: any): IMem)
