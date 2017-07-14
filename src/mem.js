// @flow

import {AtomForce} from './interfaces'
import type {IAtom, IAtomHandler, IAtomKeyHandler, IAtomHost, IForceable} from './interfaces'
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

function getName(obj: Object): string {
    return obj.constructor.displayName || obj.constructor.name
}

function getAtom<V>(t: Object, handler: IAtomHandler<V>, name: string, isComponent?: boolean): IAtom<V> {
    const atomCacheKey = `${getName(t)}.${name}`
    let atom: IAtom<V> | void = t[atomCacheKey]
    if (atom === undefined) {
        t[atomCacheKey] = atom = new Atom(atomCacheKey, handler, t, isComponent)
    }

    return atom
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
        value(next?: V) {
            return getAtom(this, handler, name, isComponent)
                .value(next)
        }
    }
}

function createGetSetHandler<V>(get?: () => V, set?: (v: V) => void): IAtomHandler<V> {
    return function getSetHandler(next?: V) {
        if (next === undefined) {
            return (get: any).call(this)
        }
        (set: any).call(this, next)
        return next
    }
}

function createValueHandler<V>(initializer?: () => V): IAtomHandler<V> {
    return function valueHandler(next?: V) {
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
            return getAtom(this, handler, name).get()
        },
        set(val: V) {
            getAtom(this, handler, name).set(val)
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
        value(rawKey: K, next?: V) {
            function handlerWithKey(next?: V): V {
                return handler.call(this, rawKey, next)
            }

            return getAtom(this, handlerWithKey, `${name}(${getKey(rawKey)})`)
                .value(next)
        }
    }
}

function forceGet() {
    defaultContext.force = true
    return this
}

export function forceDecorator<V>(
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

declare function force<V>(v?: V): V

declare function force<V>(
    proto: Object,
    name: string,
    descr: TypedPropertyDescriptor<V>
): TypedPropertyDescriptor<V>

export function force<V>(v?: V) {
    return arguments.length > 1
        ? forceDecorator(v, arguments[1], arguments[2])
        : ((new AtomForce(v): any): V)
}

// export const force: IForce<*> =(function<V>(v?: V) {
// }: any)

export default function mem<P: Object, V, K>(
    proto: P,
    name: string,
    descr: TypedPropertyDescriptor<*>
): TypedPropertyDescriptor<*> | void {
    return descr.value === undefined
        ? memProp(proto, name, descr)
        : memMethod(proto, name, descr)
}

export function detached<P: Object, V, K>(
    proto: P,
    name: string,
    descr: TypedPropertyDescriptor<*>
): TypedPropertyDescriptor<*> | void {
    return memMethod(proto, name, descr, true)
}
