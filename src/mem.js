// @flow

import type {IAtom, IAtomHandler, IAtomKeyHandler, IAtomHost} from './interfaces'
import {defaultContext} from './Context'

type TypedPropertyDescriptor<T> = {
    enumerable?: boolean;
    configurable?: boolean;
    writable?: boolean;
    value?: T;
    initializer?: () => T;
    get?: () => T;
    set?: (value: T | Error) => void;
}

function memMethod<V, P: Object>(
    proto: P,
    name: string,
    descr: TypedPropertyDescriptor<IAtomHandler<V>>,
    isComponent?: boolean
): TypedPropertyDescriptor<IAtomHandler<V>> {
    proto[`${name}$`] = descr.value
    const handler = descr.value
    if (handler === undefined) {
        throw new TypeError(`${name} is not an function (next?: V)`)
    }

    return {
        enumerable: descr.enumerable,
        configurable: descr.configurable,
        value(next?: V | Error, force?: boolean) {
            return defaultContext.getAtom(this, handler, name, isComponent)
                .value(next, force)
        }
    }
}

function createGetSetHandler<V>(
    get?: () => V,
    set?: (v: V | Error) => void
): IAtomHandler<V> {
    return function getSetHandler(next?: V) {
        if (next === undefined) {
            return (get: any).call(this)
        }
        (set: any).call(this, next)
        return next
    }
}

function createValueHandler<V>(initializer?: () => V): IAtomHandler<V> {
    return function valueHandler(next?: V | Error) {
        return next === undefined && initializer !== undefined
            ? initializer.call(this)
            : (next: any)
    }
}

function memProp<V, P: Object>(
    proto: P,
    name: string,
    descr: TypedPropertyDescriptor<V>
): TypedPropertyDescriptor<*> | void {
    const handlerKey = `${name}$`
    if (proto[handlerKey] !== undefined) {
        return
    }

    const handler = proto[handlerKey] = descr.get === undefined && descr.set === undefined
        ? createValueHandler(descr.initializer)
        : createGetSetHandler(descr.get, descr.set)

    return {
        enumerable: descr.enumerable,
        configurable: descr.configurable,
        get() {
            return defaultContext.getAtom(this, handler, name).get()
        },
        set(val: V | Error) {
            defaultContext.getAtom(this, handler, name).set(val)
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
    const handler = descr.value
    if (handler === undefined) {
        throw new TypeError(`${name} is not an function (rawKey: K, next?: V)`)
    }

    proto[`${name}$`] = handler

    return {
        enumerable: descr.enumerable,
        configurable: descr.configurable,
        value(rawKey: K, next?: V | Error, force?: boolean) {
            return defaultContext.getKeyAtom(
                this,
                handler,
                typeof rawKey === 'function' ? rawKey : `${name}(${getKey(rawKey)})`
            )
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
): TypedPropertyDescriptor<any> | void {
    return descr.value === undefined
        ? memProp(proto, name, descr)
        : memMethod(proto, name, descr)
}

export function detached<P: Object, V, K>(
    proto: P,
    name: string,
    descr: TypedPropertyDescriptor<*>
): TypedPropertyDescriptor<any> | void {
    return memMethod(proto, name, descr, true)
}
