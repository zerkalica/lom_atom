// @flow

import type {IAtom, IAtomHandler, IContext} from './interfaces'
import {defaultContext} from './Context'
import {AtomWait} from './utils'
import Atom from './Atom'

type TypedPropertyDescriptor<T> = {
    enumerable?: boolean;
    configurable?: boolean;
    writable?: boolean;
    value?: T;
    initializer?: () => T;
    get?: () => T;
    set?: (value: T | Error) => void;
}

function getId(t: Object, hk: string): string {
    return `${t.constructor.displayName || t.constructor.name}.${hk}`
}

function memMethod<V, P: Object>(
    proto: P,
    rname: string,
    descr: TypedPropertyDescriptor<*>,
    isComponent?: boolean
): TypedPropertyDescriptor<*> {
    const name = getId(proto, rname)
    if (descr.value === undefined) {
        throw new TypeError(`${name} is not an function (next?: V)`)
    }
    proto[`${name}$`] = descr.value
    const hostAtoms: WeakMap<Object, IAtom<V>> = new WeakMap()

    Object.defineProperty(proto, `${name}()`, {
        get() {
            return hostAtoms.get(this)
        }
    })
    const forcedFn = function (next?: V | Error, force?: boolean) {
        return this[rname](next, force === undefined ? true : force)
    }
    setFunctionName(forcedFn, `${name}*`)
    proto[`${rname}*`] = forcedFn

    return {
        enumerable: descr.enumerable,
        configurable: descr.configurable,
        value(next?: V | Error, force?: boolean): V {
            let atom: IAtom<V> | void = hostAtoms.get(this)
            if (atom === undefined) {
                atom = new Atom(name, this, defaultContext, hostAtoms, undefined, undefined, isComponent)
                hostAtoms.set(this, atom)
            }

            return next === undefined
                ? (atom: IAtom<V>).get(force)
                : (atom: IAtom<V>).set(next, force)
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
        return next === undefined && initializer
            ? initializer.call(this)
            : (next: any)
    }
}

let isForced = false

function setFunctionName(fn: Function, name: string) {
    Object.defineProperty(fn, 'name', {value: name, writable: false})
    fn.displayName = name
}

function memProp<V, P: Object>(
    proto: P,
    rname: string,
    descr: TypedPropertyDescriptor<V>
): TypedPropertyDescriptor<V> {
    const name = getId(proto, rname)
    const handlerKey = `${name}$`
    if (proto[handlerKey] !== undefined) {
        return (undefined: any)
    }

    if (descr.initializer) setFunctionName(descr.initializer, name)
    if (descr.get) setFunctionName(descr.get, `get#${name}`)
    if (descr.set) setFunctionName(descr.set, `set#${name}`)
    const handler = proto[handlerKey] = descr.get === undefined && descr.set === undefined
        ? createValueHandler(descr.initializer)
        : createGetSetHandler(descr.get, descr.set)

    setFunctionName(handler, `${name}()`)

    const hostAtoms: WeakMap<Object, IAtom<V>> = new WeakMap()

    Object.defineProperty(proto, `${name}()`, {
        get() {
            return hostAtoms.get(this)
        }
    })

    return {
        enumerable: descr.enumerable,
        configurable: descr.configurable,
        get() {
            let atom: IAtom<V> | void = hostAtoms.get(this)
            if (atom === undefined) {
                atom = new Atom(name, this, defaultContext, hostAtoms)
                hostAtoms.set(this, atom)
            }
            if (isForced) {
                isForced = false
                return atom.get(true)
            }
            return atom.get()
        },
        set(val: V | Error) {
            let atom: IAtom<V> | void = hostAtoms.get(this)
            if (atom === undefined) {
                atom = new Atom(name, this, defaultContext, hostAtoms)
                hostAtoms.set(this, atom)
            }
            if (isForced) {
                isForced = false
                ;(atom: IAtom<V>).set(val, true)
                return
            }
            ;(atom: IAtom<V>).set(val)
        }
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

function memKeyMethod<V, K, P: Object>(
    proto: P,
    rname: string,
    descr: TypedPropertyDescriptor<IAtomHandler<V, K>>
): TypedPropertyDescriptor<IAtomHandler<V, K>> {
    const name = getId(proto, rname)
    const handler = descr.value
    if (handler === undefined) {
        throw new TypeError(`${name} is not an function (rawKey: K, next?: V)`)
    }
    proto[`${name}$`] = handler
    const hostAtoms: WeakMap<Object, Map<string, IAtom<V>>> = new WeakMap()
    Object.defineProperty(proto, `${name}()`, {
        get() {
            return hostAtoms.get(this)
        }
    })
    const forcedFn = function (rawKey: K, next?: V | Error, force?: boolean) {
        return this[rname](rawKey, next, force === undefined ? true : force)
    }
    setFunctionName(forcedFn, `${name}*`)
    proto[`${rname}*`] = forcedFn

    return {
        enumerable: descr.enumerable,
        configurable: descr.configurable,
        value(rawKey: K, next?: V | Error, force?: boolean) {
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

            return next === undefined ? (atom: IAtom<V>).get(force) : (atom: IAtom<V>).set(next, force)
        }
    }
}

type IMemKeyMethod<V, K, P: Object> = (
    proto: P,
    name: string,
    descr: TypedPropertyDescriptor<IAtomHandler<V, K>>
) => TypedPropertyDescriptor<IAtomHandler<V, K>>

declare function memkey<V, K, P: Object>(): () => IMemKeyMethod<V, K, P>
declare function memkey<V, K, P: Object>(
    proto: P,
    name: string,
    descr: TypedPropertyDescriptor<IAtomHandler<V, K>>
): TypedPropertyDescriptor<IAtomHandler<V, K>>

export function memkey() {
    if (arguments.length === 3) {
        return memKeyMethod(arguments[0], arguments[1], arguments[2])
    }

    return function (
        proto: Object,
        name: string,
        descr: TypedPropertyDescriptor<IAtomHandler<*, *>>
    ): TypedPropertyDescriptor<IAtomHandler<*, *>> {
        return memKeyMethod(proto, name, descr)
    }
}

const forceProxyOpts = {
    get(t: Object, name: string) {
        const forceFn = t[`${name}*`]
        // is property or get/set magic ?
        if (forceFn === undefined) {
            isForced = true
            return t[name]
        }

        return forceFn.bind(t)
    },
    set(t: Object, name: string, val: mixed) {
        // is property or get/set magic ?
        if (t[`${name}*`] === undefined) {
            isForced = true
            t[name] = val
            return true
        }

        return false
    }
}

export function force<V>(
    proto: mixed,
    name: string,
    descr: TypedPropertyDescriptor<V>
): TypedPropertyDescriptor<V> {
    const proxyMap: WeakMap<V, any> = new WeakMap()
    return {
        enumerable: descr.enumerable,
        configurable: descr.configurable,
        get() {
            let proxy: V | void = proxyMap.get(this)
            if (proxy === undefined) {
                proxy = new Proxy(this, forceProxyOpts)
                proxyMap.set(this, proxy)
            }
            return proxy
        }
    }
}

export function detached<P: Object, V, K>(
    proto: P,
    name: string,
    descr: TypedPropertyDescriptor<*>
): TypedPropertyDescriptor<any> | void {
    return memMethod(proto, name, descr, true)
}

type IMemProp<V, P: Object> = (
    proto: P,
    name: string,
    descr: TypedPropertyDescriptor<IAtomHandler<V>>
) => TypedPropertyDescriptor<IAtomHandler<V>>

function createActionMethod(t: Object, hk: string, context: IContext): (...args: any[]) => any {
    const name = getId(t, hk)
    function action() {
        let result: mixed | void
        const oldNamespace = context.beginTransaction(name)
        try {
            switch (arguments.length) {
                case 0: result = t[hk](); break
                case 1: result = t[hk](arguments[0]); break
                case 2: result = t[hk](arguments[0], arguments[1]); break
                case 3: result = t[hk](arguments[0], arguments[1], arguments[2]); break
                case 4: result = t[hk](arguments[0], arguments[1], arguments[2], arguments[3]); break
                case 5: result = t[hk](arguments[0], arguments[1], arguments[2], arguments[3], arguments[4]); break
                default: result = t[hk].apply(t, arguments)
            }
        } finally {
            context.endTransaction(oldNamespace)
        }

        return result
    }
    setFunctionName(action, name)

    return action
}

function createActionFn<F: Function>(fn: F, rawName?: string, context: IContext): F {
    const name = rawName || fn.displayName || fn.name
    function action(): any {
        let result: mixed | void
        const oldNamespace = context.beginTransaction(name)
        try {
            switch (arguments.length) {
                case 0: result = fn(); break
                case 1: result = fn(arguments[0]); break
                case 2: result = fn(arguments[0], arguments[1]); break
                case 3: result = fn(arguments[0], arguments[1], arguments[2]); break
                case 4: result = fn(arguments[0], arguments[1], arguments[2], arguments[3]); break
                case 5: result = fn(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4]); break
                default: result = fn.apply(null, arguments)
            }
        } finally {
            context.endTransaction(oldNamespace)
        }

        return result
    }
    setFunctionName(action, name)

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
                value: actionFn
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

declare function mem<V, P: Object>(): () => IMemProp<V, P>
declare function mem<V, P: Object>(
    proto: P,
    name: string,
    descr: TypedPropertyDescriptor<V>
): TypedPropertyDescriptor<*>

export default function mem() {
    if (arguments.length === 3) {
        return arguments[2].value === undefined
            ? memProp(arguments[0], arguments[1], arguments[2])
            : memMethod(arguments[0], arguments[1], arguments[2])
    }

    return function (
        proto: Object,
        name: string,
        descr: TypedPropertyDescriptor<*>
    ): TypedPropertyDescriptor<*> {
        return descr.value === undefined
            ? memProp(proto, name, descr)
            : memMethod(proto, name, descr)
    }
}

export function props<P: Object>(
    proto: P,
    name: string,
    descr: TypedPropertyDescriptor<*>,
) {
    proto.constructor.__lom_prop = name
    if (!descr.value && !descr.set) {
        descr.writable = true
    }
}

mem.Wait = AtomWait
mem.key = memkey
mem.detached = detached
