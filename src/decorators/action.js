// @flow

import type {TypedPropertyDescriptor, IContext} from '../interfaces'
import {scheduleNative, getId, setFunctionName, AtomWait} from '../utils'

type Handler = (...args: any[]) => void

function fastCallMethod<Host: Object>(host: Host, methodName: string, args: any[]): void {
    try {
        switch (args.length) {
            case 0: return host[methodName]()
            case 1: return host[methodName](args[0])
            case 2: return host[methodName](args[0], args[1])
            case 3: return host[methodName](args[0], args[1], args[2])
            case 4: return host[methodName](args[0], args[1], args[2], args[3])
            case 5: return host[methodName](args[0], args[1], args[2], args[3], args[4])
            default: return host[methodName].apply(host, args)
        }
    } catch(e) {
        if (!(e instanceof AtomWait)) throw e
    }
}

function action<Host: Object, H: Handler>(
    host: Host,
    name: string,
    descr: TypedPropertyDescriptor<H>,
    defer?: boolean
): TypedPropertyDescriptor<H> {
    const hk = `${name}$`
    if (descr.value === undefined) {
        throw new TypeError(`${getId(host, name)} is not an function (next?: V)`)
    }
    host[hk] = descr.value
    let definingProperty = false

    const actionId = getId(host, name)

    return {
        enumerable: descr.enumerable,
        configurable: descr.configurable,
        get(): H {
            if (definingProperty) return this[hk].bind(this)

            const actionFn = defer
                ? (...args: any[]) => scheduleNative(() => fastCallMethod(this, hk, args))
                : (...args: any[]) => fastCallMethod(this, hk, args)
            setFunctionName(actionFn, actionId)

            definingProperty = true
            Object.defineProperty(this, name, {
                configurable: true,
                enumerable: false,
                value: actionFn
            })
            definingProperty = false

            return ((actionFn: any): H)
        }
    }
}

function actionDefer<Host: Object, H: Handler>(
    host: Host,
    name: string,
    descr: TypedPropertyDescriptor<H>
): TypedPropertyDescriptor<H> {
    return action(host, name, descr, true)
}

action.defer = actionDefer

interface IAction {
    <Host: Object, H: Handler>(
        host: Host,
        name: string,
        descr: TypedPropertyDescriptor<H>
    ): TypedPropertyDescriptor<H>;
    defer: <Host: Object, H: Handler>(
        host: Host,
        name: string,
        descr: TypedPropertyDescriptor<H>
    ) => TypedPropertyDescriptor<H>;
}

export default (action: IAction)
