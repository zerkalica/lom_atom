// @flow

import type {IAtom, IAtomHandler, IAtomHost, INormalize, IContext} from './interfaces'
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
                rawKey,
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

function createActionMethod(t: Object, hk: string, context: IContext): (...args: any[]) => any {
    function action() {
        let result: mixed | void
        context.beginTransaction()
        switch (arguments.length) {
            case 0: result = t[hk](); break
            case 1: result = t[hk](arguments[0]); break
            case 2: result = t[hk](arguments[0], arguments[1]); break
            case 3: result = t[hk](arguments[0], arguments[1], arguments[2]); break
            case 4: result = t[hk](arguments[0], arguments[1], arguments[2], arguments[3]); break
            case 5: result = t[hk](arguments[0], arguments[1], arguments[2], arguments[3], arguments[4]); break
            default: result = t[hk].apply(t, arguments)
        }
        context.endTransaction()

        return result
    }
    action.displayName = hk

    return action
}

function createActionFn<F: Function>(fn: F, name?: string, context: IContext): F {
    function action(): any {
        let result: mixed | void
        context.beginTransaction()
        switch (arguments.length) {
            case 0: result = fn(); break
            case 1: result = fn(arguments[0]); break
            case 2: result = fn(arguments[0], arguments[1]); break
            case 3: result = fn(arguments[0], arguments[1], arguments[2]); break
            case 4: result = fn(arguments[0], arguments[1], arguments[2], arguments[3]); break
            case 5: result = fn(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4]); break
            default: result = fn.apply(null, arguments)
        }
        context.endTransaction()

        return result
    }
    action.displayName = name || fn.displayName || fn.name

    return (action: any)
}

function actionMethod<V, P: Object>(
    proto: P,
    field: string,
    descr: TypedPropertyDescriptor<*>,
    context: IContext
): TypedPropertyDescriptor<*> {
    const hk = `${field}$`
    if (descr.value === undefined) {
        throw new TypeError(`${field} is not an function (next?: V)`)
    }
    proto[hk] = descr.value
    let definingProperty = false

    return {
        enumerable: descr.enumerable,
        configurable: descr.configurable,
        get() {
            if (definingProperty) {
                return this[hk]
            }
            definingProperty = true
            const actionFn = createActionMethod(this, hk, context)
            Object.defineProperty(this, field, {
                configurable: true,
                get() {
                    return actionFn
                }
            })
            definingProperty = false

            return actionFn
        }
    }
}

declare function action<F: Function>(fn: F, name?: string): F
declare function action(
    proto: Object,
    name: string,
    descr: TypedPropertyDescriptor<*>
): TypedPropertyDescriptor<*>

export function action() {
    if (arguments.length === 3) {
        return actionMethod(arguments[0], arguments[1], arguments[2], defaultContext)
    }

    return createActionFn(arguments[0], arguments[1], defaultContext)
}

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
