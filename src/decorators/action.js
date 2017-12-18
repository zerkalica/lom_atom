// @flow

import type {TypedPropertyDescriptor} from '../interfaces'
import {scheduleNative, getId, setFunctionName, AtomWait} from '../utils'
import {defaultContext} from '../Context'

type Handler = (...args: any[]) => void

function createAction<Host: Object>(host: Host, methodName: string): (...args: any[]) => void {
    function actionFn(): void {
        const args = arguments
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

    setFunctionName(actionFn, getId(host, methodName))
    return actionFn
}

function createSyncedAction(action: (args: any[]) => void) {
    function syncedAction(...args: any[]) {
        action(args)
        defaultContext.sync()
    }
    syncedAction.displayName = `${action.displayName}_synced`

    return syncedAction
}

function createDeferedAction(action: (args: any[]) => void) {
    function deferedAction(...args: any[]) {
        scheduleNative(() => action(args))
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

            const action = createAction(this, hk)
            const actionFn = defer
                ? createDeferedAction(action)
                : (sync ? createSyncedAction(action) : action)

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
