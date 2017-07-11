// @flow

import type {IAtom, IAtomHost} from './interfaces'
import Atom from './Atom'

interface TypedPropertyDescriptor<T> {
    enumerable?: boolean;
    configurable?: boolean;
    writable?: boolean;
    initializer?: () => T;
    value?: T;
    get?: () => T;
    set?: (value: T) => void;
}

type IHandler<V> = (next?: V, force?: boolean) => V;

function memMethod<V>(
    proto: Object,
    name: string,
    descr: TypedPropertyDescriptor<IHandler<V>>
) {
    const handler = descr.value
    const cache = new WeakMap()

    const handlerKey = `${name}@`
    proto[handlerKey] = handler

    descr.value = function(next?: V, force?: boolean) {
        let atom: IAtom<V> | void = cache.get(this)
        if (atom === undefined) {
            atom = new Atom(handlerKey, this)
            cache.set(this, atom)
        }

        return atom.value(next, force)
    }
}

function getAtom<V>(t: Object, handlerKey: string, cache: WeakMap<Object, IAtom<V>>): IAtom<V> {
    let atom: IAtom<V> | void = cache.get(t)
    if (atom === undefined) {
        atom = new Atom(handlerKey, t)
        cache.set(t, atom)
    }

    return atom
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
        const force = this._force
        this._force = false
        return getAtom(this, handlerKey, cache).get(force)
    }

    descr.set = function(val: V) {
        const force = this._force
        this._force = false
        getAtom(this, handlerKey, cache).set(val, force)
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
        this._force = true
        return this
    }
    delete descr.initializer
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
