// @flow

import type {TypedPropertyDescriptor} from '../interfaces'
import {scheduleNative, getId, setFunctionName, AtomWait} from '../utils'
import {defaultContext} from '../Context'

type Handler = (...args: any[]) => void

function createAction<Host: Object>(host: Host, methodName: string, sync?: boolean): (...args: any[]) => void {
    function actionFn(): void {
        const args = arguments
        try {
            switch (args.length) {
                case 0: host[methodName](); break
                case 1: host[methodName](args[0]); break
                case 2: host[methodName](args[0], args[1]); break
                case 3: host[methodName](args[0], args[1], args[2]); break
                case 4: host[methodName](args[0], args[1], args[2], args[3]); break
                case 5: host[methodName](args[0], args[1], args[2], args[3], args[4]); break
                default: host[methodName].apply(host, args); break
            }
        } catch(e) {
            if (!(e instanceof AtomWait)) throw e
        }
        if (sync) defaultContext.sync()
    }

    setFunctionName(actionFn, getId(host, methodName))
    return actionFn
}

function createDeferedAction(action: (args: any[]) => void) {
    function deferedAction(...args: any[]) {
        scheduleNative(() => action(...args))
    }
    deferedAction.displayName = `${action.displayName}_defered`

    return deferedAction
}

function action<Host: Object, H: Handler>(
    host: Host,
    name: string,
    descr: TypedPropertyDescriptor<H>,
    defer?: boolean,
    sync?: boolean
): TypedPropertyDescriptor<H> {
    const hk = `${name}$`
    if (descr.value === undefined) {
        throw new TypeError(`${getId(host, name)} is not an function (next?: V)`)
    }
    host[hk] = descr.value
    let definingProperty = false

    return {
        enumerable: descr.enumerable,
        configurable: true,
        get(): H {
            if (definingProperty) return this[hk].bind(this)

            const action = createAction(this, hk, sync)
            const actionFn = defer
                ? createDeferedAction(action)
                : action

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

function actionSync<Host: Object, H: Handler>(
    host: Host,
    name: string,
    descr: TypedPropertyDescriptor<H>
): TypedPropertyDescriptor<H> {
    return action(host, name, descr, false, true)
}

action.sync = actionSync

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
    sync: <Host: Object, H: Handler>(
        host: Host,
        name: string,
        descr: TypedPropertyDescriptor<H>
    ) => TypedPropertyDescriptor<H>;
}

export default (action: IAction)
