// @flow
import {ATOM_FORCE_CACHE, ATOM_FORCE_NONE, ATOM_FORCE_UPDATE} from './interfaces'
import type {TypedPropertyDescriptor, IAtom, IAtomPropHandler, IAtomHandler, IAtomForce, IContext} from './interfaces'
import {defaultContext} from './Context'
import {AtomWait} from './utils'
import Atom from './Atom'

function getId(t: Object, hk: string): string {
    return `${t.constructor.displayName || t.constructor.name}.${hk}`
}

function memMethod<V, P: Object>(
    proto: P,
    name: string,
    descr: TypedPropertyDescriptor<*>,
    isComponent?: boolean
): TypedPropertyDescriptor<*> {
    const longName = getId(proto, name)
    if (descr.value === undefined) {
        throw new TypeError(`${longName} is not an function (next?: V)`)
    }
    proto[`${name}$`] = descr.value
    const hostAtoms: WeakMap<Object, IAtom<V>> = new WeakMap()
    Object.defineProperty(proto, `${name}()`, {
        get() {
            return hostAtoms.get(this)
        }
    })
    const forcedFn = function (next?: V | Error, force?: IAtomForce) {
        return this[name](next, force === undefined ? ATOM_FORCE_CACHE : force)
    }
    setFunctionName(forcedFn, `${longName}*`)
    proto[`${name}*`] = forcedFn

    return {
        enumerable: descr.enumerable,
        configurable: descr.configurable,
        value(next?: V | Error, force?: IAtomForce): V {
            let atom: IAtom<V> | void = hostAtoms.get(this)
            if (atom === undefined) {
                atom = new Atom(name, this, defaultContext, hostAtoms, undefined, undefined, isComponent)
                hostAtoms.set(this, atom)
            }

            return (atom: IAtom<V>).value(next, force)
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

function setFunctionName(fn: Function, name: string) {
    Object.defineProperty(fn, 'name', {value: name, writable: false})
    fn.displayName = name
}

let propForced: IAtomForce = ATOM_FORCE_NONE

function memProp<V, P: Object>(
    proto: P,
    name: string,
    descr: TypedPropertyDescriptor<V>
): TypedPropertyDescriptor<V> {
    const handlerKey = `${name}$`
    if (proto[handlerKey] !== undefined) {
        return (undefined: any)
    }

    const longName = getId(proto, name)
    if (descr.initializer) setFunctionName(descr.initializer, longName)
    if (descr.get) setFunctionName(descr.get, `get#${longName}`)
    if (descr.set) setFunctionName(descr.set, `set#${longName}`)
    const handler = proto[handlerKey] = descr.get === undefined && descr.set === undefined
        ? createValueHandler(descr.initializer)
        : createGetSetHandler(descr.get, descr.set)

    setFunctionName(handler, `${longName}()`)

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
            const forced = propForced
            propForced = ATOM_FORCE_NONE
            return atom.value(undefined, forced)
        },
        set(val: V | Error) {
            let atom: IAtom<V> | void = hostAtoms.get(this)
            if (atom === undefined) {
                atom = new Atom(name, this, defaultContext, hostAtoms)
                hostAtoms.set(this, atom)
            }
            const forced = propForced
            propForced = ATOM_FORCE_NONE
            ;(atom: IAtom<V>).value(val, forced)
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
    name: string,
    descr: TypedPropertyDescriptor<IAtomHandler<V, K>>
): TypedPropertyDescriptor<IAtomHandler<V, K>> {
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
    const forcedFn = function (rawKey: K, next?: V | Error, force?: IAtomForce) {
        return this[name](rawKey, next, force === undefined ? ATOM_FORCE_CACHE : force)
    }
    setFunctionName(forcedFn, `${longName}*`)
    proto[`${name}*`] = forcedFn

    return {
        enumerable: descr.enumerable,
        configurable: descr.configurable,
        value(rawKey: K, next?: V | Error, force?: IAtomForce) {
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

            return (atom: IAtom<V>).value(next, force)
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
    const args = arguments
    if (args.length === 3) {
        return memKeyMethod(args[0], args[1], args[2])
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
        if (forceFn === undefined) {
            // get/set handler
            propForced = ATOM_FORCE_CACHE
            return t[name]
        }

        return forceFn.bind(t)
    },
    set(t: Object, name: string, val: mixed) {
        if (t[`${name}*`] === undefined) {
            // get/set handler
            propForced = ATOM_FORCE_CACHE
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

export function detached<P: Object, V>(
    proto: P,
    name: string,
    descr: TypedPropertyDescriptor<IAtomPropHandler<V>>
): TypedPropertyDescriptor<IAtomPropHandler<V>> {
    return memMethod(proto, name, descr, true)
}

type IMemProp<V, P: Object> = (
    proto: P,
    name: string,
    descr: TypedPropertyDescriptor<IAtomHandler<V>>
) => TypedPropertyDescriptor<IAtomHandler<V>>

function createActionMethod(t: Object, name: string, context: IContext): (...args: any[]) => any {
    const longName = getId(t, name)
    function action() {
        let result: mixed | void
        const oldNamespace = context.beginTransaction(longName)
        const args = arguments
        try {
            switch (args.length) {
                case 0: result = t[name](); break
                case 1: result = t[name](args[0]); break
                case 2: result = t[name](args[0], args[1]); break
                case 3: result = t[name](args[0], args[1], args[2]); break
                case 4: result = t[name](args[0], args[1], args[2], args[3]); break
                case 5: result = t[name](args[0], args[1], args[2], args[3], args[4]); break
                default: result = t[name].apply(t, args)
            }
        } finally {
            context.endTransaction(oldNamespace)
        }

        return result
    }
    setFunctionName(action, longName)

    return action
}

function createActionFn<F: Function>(fn: F, rawName?: string, context: IContext): F {
    const name = rawName || fn.displayName || fn.name
    function action(): any {
        let result: mixed | void
        const oldNamespace = context.beginTransaction(name)
        const args = arguments
        try {
            switch (args.length) {
                case 0: result = fn(); break
                case 1: result = fn(args[0]); break
                case 2: result = fn(args[0], args[1]); break
                case 3: result = fn(args[0], args[1], args[2]); break
                case 4: result = fn(args[0], args[1], args[2], args[3]); break
                case 5: result = fn(args[0], args[1], args[2], args[3], args[4]); break
                default: result = fn.apply(null, args)
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
    name: string,
    descr: TypedPropertyDescriptor<*>,
    context: IContext
): TypedPropertyDescriptor<*> {
    const hk = `${name}$`
    if (descr.value === undefined) {
        throw new TypeError(`${getId(proto, name)} is not an function (next?: V)`)
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
            Object.defineProperty(this, name, {
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
    const args = arguments
    if (args.length === 3) {
        return actionMethod(args[0], args[1], args[2], defaultContext)
    }

    return createActionFn(args[0], args[1], defaultContext)
}

declare function mem<V, P: Object>(): () => IMemProp<V, P>
declare function mem<V, P: Object>(
    proto: P,
    name: string,
    descr: TypedPropertyDescriptor<V>
): TypedPropertyDescriptor<*>

export default function mem() {
    const args = arguments
    if (args.length === 3) {
        return args[2].value === undefined
            ? memProp(args[0], args[1], args[2])
            : memMethod(args[0], args[1], args[2])
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

mem.Wait = AtomWait
mem.key = memkey
mem.detached = detached
