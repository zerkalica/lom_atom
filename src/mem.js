// @flow

import type {IAtom, IAtomHandler, IAtomHost, INormalize} from './interfaces'
import {defaultContext} from './Context'
import {AtomWait} from './utils'

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
    field: string,
    descr: TypedPropertyDescriptor<*>,
    normalize?: INormalize<V>,
    isComponent?: boolean
): TypedPropertyDescriptor<*> {
    const handlerKey = `${field}$`
    if (descr.value === undefined) {
        throw new TypeError(`${field} is not an function (next?: V)`)
    }
    proto[handlerKey] = descr.value

    return {
        enumerable: descr.enumerable,
        configurable: descr.configurable,
        value(next?: V | Error, force?: boolean) {
            return defaultContext.getAtom(handlerKey, this, undefined, normalize, isComponent)
                .value(next, force)
        }
    }
}

function createGetSetHandler<V>(
    get?: () => V,
    set?: (v: V | Error) => void
): IAtomHandler<V, *> {
    return function getSetHandler(next?: V) {
        if (next === undefined) {
            return (get: any).call(this)
        }
        (set: any).call(this, next)
        return next
    }
}

function createValueHandler<V>(initializer?: () => V): IAtomHandler<V, *> {
    return function valueHandler(next?: V | Error) {
        return next === undefined && initializer !== undefined
            ? initializer.call(this)
            : (next: any)
    }
}

function memProp<V, P: Object>(
    proto: P,
    name: string,
    descr: TypedPropertyDescriptor<V>,
    normalize?: INormalize<V>
): TypedPropertyDescriptor<V> {
    const handlerKey = `${name}$`
    if (proto[handlerKey] !== undefined) {
        return (undefined: any)
    }

    const handler = proto[handlerKey] = descr.get === undefined && descr.set === undefined
        ? createValueHandler(descr.initializer)
        : createGetSetHandler(descr.get, descr.set)

    return {
        enumerable: descr.enumerable,
        configurable: descr.configurable,
        get() {
            return defaultContext.getAtom(handlerKey, this, undefined, normalize).get()
        },
        set(val: V | Error) {
            defaultContext.getAtom(handlerKey, this, undefined, normalize).set(val)
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

function memkeyProp<V, K, P: Object>(
    proto: P,
    name: string,
    descr: TypedPropertyDescriptor<IAtomHandler<V, K>>,
    normalize?: INormalize<V>
): TypedPropertyDescriptor<IAtomHandler<V, K>> {
    const handler = descr.value
    if (handler === undefined) {
        throw new TypeError(`${name} is not an function (rawKey: K, next?: V)`)
    }

    const handlerKey = `${name}$`

    proto[handlerKey] = handler

    return {
        enumerable: descr.enumerable,
        configurable: descr.configurable,
        value(rawKey: K, next?: V | Error, force?: boolean) {
            return defaultContext.getAtom(
                handlerKey,
                this,
                typeof rawKey === 'function' ? rawKey : `${name}(${getKey(rawKey)})`,
                normalize
            )
                .value(next, force)
        }
    }
}

type IMemKeyProp<V, K, P: Object> = (
    proto: P,
    name: string,
    descr: TypedPropertyDescriptor<IAtomHandler<V, K>>,
    normalize?: INormalize<V>
) => TypedPropertyDescriptor<IAtomHandler<V, K>>

declare function memkey<V, K, P: Object>(normalize: INormalize<V>): () => IMemKeyProp<V, K, P>
declare function memkey<V, K, P: Object>(
    proto: P,
    name: string,
    descr: TypedPropertyDescriptor<IAtomHandler<V, K>>,
    normalize?: INormalize<V>
): TypedPropertyDescriptor<IAtomHandler<V, K>>

export function memkey() {
    if (arguments.length === 3) {
        return memkeyProp(arguments[0], arguments[1], arguments[2])
    }

    const normalize: INormalize<*> = arguments[0]
    return function (
        proto: Object,
        name: string,
        descr: TypedPropertyDescriptor<IAtomHandler<*, *>>
    ): TypedPropertyDescriptor<IAtomHandler<*, *>> {
        return memkeyProp(proto, name, descr, normalize)
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

export function detached<P: Object, V, K>(
    proto: P,
    name: string,
    descr: TypedPropertyDescriptor<*>
): TypedPropertyDescriptor<any> | void {
    return memMethod(proto, name, descr, undefined, true)
}

type IMemProp<V, P: Object> = (
    proto: P,
    name: string,
    descr: TypedPropertyDescriptor<IAtomHandler<V>>,
    normalize?: INormalize<V>
) => TypedPropertyDescriptor<IAtomHandler<V>>

declare function mem<V, P: Object>(normalize: INormalize<V>): () => IMemProp<V, P>
declare function mem<V, P: Object>(
    proto: P,
    name: string,
    descr: TypedPropertyDescriptor<V>,
    normalize?: INormalize<V>
): TypedPropertyDescriptor<*>

export default function mem() {
    if (arguments.length === 3) {
        return arguments[2].value === undefined
            ? memProp(arguments[0], arguments[1], arguments[2])
            : memMethod(arguments[0], arguments[1], arguments[2])
    }

    const normalize: INormalize<*> = arguments[0]

    return function (
        proto: Object,
        name: string,
        descr: TypedPropertyDescriptor<*>
    ): TypedPropertyDescriptor<*> {
        return descr.value === undefined
            ? memProp(proto, name, descr, normalize)
            : memMethod(proto, name, descr, normalize)
    }
}

mem.Wait = AtomWait
mem.key = memkey
mem.detached = detached
