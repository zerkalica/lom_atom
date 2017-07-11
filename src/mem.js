// @flow

import type {IAtom, IAtomHandler, IAtomKeyHandler, IAtomHost} from './interfaces'
import Atom, {defaultContext} from './Atom'

interface TypedPropertyDescriptor<T> {
    enumerable?: boolean;
    configurable?: boolean;
    writable?: boolean;
    initializer?: () => T;
    value?: T;
    get?: () => T;
    set?: (value: T) => void;
}

function getAtom<V>(t: Object, handlerKey: string, cache: WeakMap<Object, IAtom<V>>): IAtom<V> {
    let atom: IAtom<V> | void = cache.get(t)
    if (atom === undefined) {
        atom = new Atom(handlerKey, t)
        cache.set(t, atom)
    }

    return atom
}

function memMethod<V>(
    proto: Object,
    name: string,
    descr: TypedPropertyDescriptor<IAtomHandler<V>>
) {
    const handler = descr.value
    const cache = new WeakMap()

    const handlerKey = `${name}@`
    proto[handlerKey] = handler

    descr.value = function(next?: V, force?: boolean) {
        return getAtom(this, handlerKey, cache)
            .value(next, force)
    }
}

function memGetSet<V>(
    proto: Object,
    name: string,
    descr: TypedPropertyDescriptor<V>
) {
    const cache = new WeakMap()

    const handlerKey = `${name}@`
    if (proto[handlerKey]) {
        return
    }
    const {get, set} = descr
    proto[handlerKey] = function handler(next?: V, force?: boolean) {
        if (next === undefined) {
            return (get: any).call(this)
        }

        (set: any).call(this, next)

        return next
    }

    descr.get = function() {
        return getAtom(this, handlerKey, cache).get()
    }

    descr.set = function(val: V) {
        getAtom(this, handlerKey, cache).set(val)
    }
}

function memValue<V>(
    proto: Object,
    name: string,
    descr: TypedPropertyDescriptor<V>
) {
    const cache = new WeakMap()

    const handlerKey = `${name}@`
    const {initializer} = descr

    proto[handlerKey] = function handler(next?: V, force?: boolean) {
        return next === undefined
            ? (initializer: any).call(this)
            : next
    }

    delete descr.writable
    delete descr.initializer

    descr.get = function() {
        return getAtom(this, handlerKey, cache).get()
    }

    descr.set = function(val: V) {
        getAtom(this, handlerKey, cache).set(val)
    }
}

export function force(
    proto: Object,
    name: string,
    descr: TypedPropertyDescriptor<*>
) {
    descr.get = function () {
        defaultContext.force = true
        return this
    }
    delete descr.initializer
}

function getKey(params: mixed): string {
    if (!params) {
        return '-'
    }

    return typeof params === 'object'
        ? Object.keys(params)
            .sort()
            .map((key: string) => `${key}:${JSON.stringify((params: any)[key])}`)
            .join('.')
        : JSON.stringify(params)
}

export function memkey<V, K>(
    proto: Object,
    name: string,
    descr: TypedPropertyDescriptor<IAtomKeyHandler<V, K>>
) {
    const handler = descr.value
    const cache: Map<string, WeakMap<Object, IAtom<*>>> = new Map()

    const handlerKey = `${name}@`
    proto[handlerKey] = handler

    descr.value = function(rawKey: K, next?: V, force?: boolean) {
        const key = getKey(rawKey)
        let subCache = cache.get(key)
        if (!subCache) {
            subCache = new WeakMap()
            cache.set(key, subCache)
        }

        return getAtom(this, handlerKey, subCache)
            .value(next, force)
    }
}

export default function mem(
    proto: Object,
    name: string,
    descr: TypedPropertyDescriptor<*>
) {
    if (typeof descr.value === 'function') {
        return memMethod(proto, name, descr)
    }
    if (descr.get !== undefined || descr.set !== undefined) {
        return memGetSet(proto, name, descr)
    }

    return memValue(proto, name, descr)
}
