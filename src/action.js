// @flow

import type {TypedPropertyDescriptor, IContext} from './interfaces'
import {getId, setFunctionName} from './utils'
import {defaultContext} from './Context'

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

function actionMethod<V: Function>(
    proto: Object,
    name: string,
    descr: TypedPropertyDescriptor<V>,
    context: IContext
): TypedPropertyDescriptor<V> {
    const hk = `${name}$`
    if (descr.value === undefined) {
        throw new TypeError(`${getId(proto, name)} is not an function (next?: V)`)
    }
    proto[hk] = descr.value
    let definingProperty = false

    return {
        enumerable: descr.enumerable,
        configurable: descr.configurable,
        get(): V {
            if (definingProperty) {
                return this[hk]
            }
            definingProperty = true
            const actionFn: Function = createActionMethod(this, hk, context)
            Object.defineProperty(this, name, {
                configurable: true,
                value: actionFn
            })
            definingProperty = false

            return (actionFn: any)
        }
    }
}

declare function action<F: Function>(fn: F, name?: string): F
declare function action<V>(
    proto: Object,
    name: string,
    descr: TypedPropertyDescriptor<V>
): TypedPropertyDescriptor<V>

export default function action() {
    const args = arguments
    if (args.length === 3) {
        return actionMethod(args[0], args[1], args[2], defaultContext)
    }

    return createActionFn(args[0], args[1], defaultContext)
}
