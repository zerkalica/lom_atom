// @flow

import type {IAtom, IAtomHandler, IAtomKeyHandler, IAtomHost} from './interfaces'
import Atom, {defaultContext} from './Atom'

type TypedPropertyDescriptor<T> = {
    enumerable?: boolean;
    configurable?: boolean;
    writable?: boolean;
    value?: T;
    initializer?: () => T;
    get?: () => T;
    set?: (value: T) => void;
}

function getAtom<V>(t: Object, handlerKey: string, subKey: string): IAtom<V> {
    let atom: IAtom<V> | void = t[subKey]
    if (atom === undefined) {
        t[subKey] = atom = new Atom(handlerKey, t)
    }

    return atom
}

function memMethod<V, P: Object>(
    proto: P,
    name: string,
    descr: TypedPropertyDescriptor<IAtomHandler<V>>
): TypedPropertyDescriptor<IAtomHandler<V>> {
    const handlerKey = `${name}@`
    const subKey = `${name}$`
    proto[handlerKey] = descr.value

    return {
        enumerable: descr.enumerable,
        configurable: descr.configurable,
        value(next?: V, force?: boolean) {
            return getAtom(this, handlerKey, subKey)
                .value(next, force)
        }
    }
}

function createGetSetHandler<V>(get?: () => V, set?: (v: V) => void): IAtomHandler<V> {
    return function getSetHandler(next?: V, force?: boolean) {
        if (next === undefined) {
            return (get: any).call(this)
        }
        (set: any).call(this, next)
        return next
    }
}

function createValueHandler<V>(initializer?: () => V): IAtomHandler<V> {
    return function valueHandler(next?: V, force?: boolean) {
        return next === undefined && initializer !== undefined
            ? initializer.call(this)
            : (next: any)
    }
}

function memProp<V, P: Object>(
    proto: P,
    name: string,
    descr: TypedPropertyDescriptor<V>
): TypedPropertyDescriptor<V> | void {
    const handlerKey = `${name}@`
    const subKey = `${name}$`
    if (proto[handlerKey]) {
        return
    }

    proto[handlerKey] = descr.get === undefined && descr.set === undefined
        ? createValueHandler(descr.initializer)
        : createGetSetHandler(descr.get, descr.set)

    return {
        enumerable: descr.enumerable,
        configurable: descr.configurable,
        get() {
            return getAtom(this, handlerKey, subKey).get()
        },
        set(val: V) {
            getAtom(this, handlerKey, subKey).set(val)
        }
    }
}

function getKey(params: mixed): string {
    if (!params) {
        return ''
    }

    return typeof params === 'object'
        ? Object.keys(params)
            .sort()
            .map((key: string) => `${key}:${JSON.stringify((params: any)[key])}`)
            .join('.')
        : JSON.stringify(params)
}

export function memkey<V, K, P: Object>(
    proto: P,
    name: string,
    descr: TypedPropertyDescriptor<IAtomKeyHandler<V, K>>
): TypedPropertyDescriptor<IAtomKeyHandler<V, K>> {
    const handlerKey = `${name}@`
    proto[handlerKey] = descr.value

    return {
        enumerable: descr.enumerable,
        configurable: descr.configurable,
        value(rawKey: K, next?: V, force?: boolean) {
            return getAtom(this, handlerKey, `${name}#${getKey(rawKey)}$`)
                .value(next, force)
        }
    }
}

function forceGet() {
    defaultContext.force = true
    return this
}

export function force<V>(
    proto: mixed,
    name: string,
    descr: TypedPropertyDescriptor<V>
): TypedPropertyDescriptor<V> {
    return {
        enumerable: descr.enumerable,
        configurable: descr.configurable,
        get: forceGet
    }
}

export default function mem<P: Object, V, K>(
    proto: P,
    name: string,
    descr: TypedPropertyDescriptor<*>
): TypedPropertyDescriptor<*> | void {
    return descr.value === undefined
        ? memProp(proto, name, descr)
        : memMethod(proto, name, descr)
}
