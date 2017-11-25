// @flow
import type {IAtomForce, TypedPropertyDescriptor, IAtom} from './interfaces'
import {ATOM_FORCE_CACHE, ATOM_FORCE_UPDATE} from './interfaces'
import {defaultContext} from './Context'
import {AtomWait, getId, setFunctionName} from './utils'
import Atom from './Atom'

function createGetSetHandler<V>(
    get?: () => V,
    set?: (v: V) => void
): (next?: V) => V {
    return function getSetHandler(next?: V): V {
        if (next === undefined) {
            return (get: any).call(this)
        }
        (set: any).call(this, next)
        return (next: any)
    }
}

function createValueHandler<V>(initializer?: () => V): (next?: V | Error) => V {
    return function valueHandler(next?: V | Error): V {
        return next === undefined && initializer
            ? initializer.call(this)
            : (next: any)
    }
}

function mem<V, P: Object>(
    proto: P,
    name: string,
    descr: TypedPropertyDescriptor<V>
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
            atom = new Atom(name, this, defaultContext, hostAtoms)
            hostAtoms.set(this, atom)
        }
        return atom.value(next)
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

function memkey<V, K, P: Object>(
    proto: P,
    name: string,
    descr: TypedPropertyDescriptor<(k: K, next?: V) => V>
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

    function value(rawKey: K, next?: V | Error): V {
        let atomMap: Map<string, IAtom<V>> | void = hostAtoms.get(this)
        if (atomMap === undefined) {
            atomMap = new Map()
            hostAtoms.set(this, atomMap)
        }
        const key = getKey(rawKey)
        let atom: IAtom<V> | void = atomMap.get(key)
        if (atom === undefined) {
            atom = new Atom(name, this, defaultContext, atomMap, rawKey, key)
            atomMap.set(key, atom)
        }

        return (atom: IAtom<V>).value(next)
    }

    descr.value = value

    return descr
}

const proxyHandler = {
    get<V: Object, T: $Keys<V>>(obj: V, key: T): IAtom<$ElementType<V, T>> {
        return obj[key + '()']
    }
}

function toAtom<V: Object>(obj: V): $ObjMap<V, <T>(T) => IAtom<T>> {
    return new Proxy(obj, proxyHandler)
}


function cache<V>(data: V): V {
    defaultContext.prevForce = defaultContext.force
    defaultContext.force = ATOM_FORCE_CACHE
    return data
}

function force<V>(data: V): V {
    defaultContext.prevForce = defaultContext.force
    defaultContext.force = ATOM_FORCE_UPDATE
    return data
}

mem.cache = cache
mem.force = force
mem.key = memkey
mem.Wait = AtomWait
mem.toAtom = toAtom

type IMem = {
    <V, P: Object>(proto: P, name: string, descr: TypedPropertyDescriptor<V>): TypedPropertyDescriptor<V>;
    cache: typeof cache;
    force: typeof force;
    key: typeof memkey;
    toAtom: typeof toAtom;
    Wait: Class<AtomWait>;
}

export default (mem: IMem)
