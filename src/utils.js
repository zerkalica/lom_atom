// @flow

import {ATOM_FORCE_CACHE} from './interfaces'
import type {IAtom} from './interfaces'

export const catchedId = Symbol('lom_cached')
export class AtomWait extends Error {
    constructor(message?: string = 'Wait...') {
        super(message)
        // $FlowFixMe new.target
        ;(this: Object)['__proto__'] = new.target.prototype
        ;(this: Object)[catchedId] = true
    }
}

export function getId(t: Object, hk: string): string {
    return `${t.constructor.displayName || t.constructor.name}.${hk}`
}

export function setFunctionName(fn: Function, name: string) {
    Object.defineProperty(fn, 'name', {value: name, writable: false})
    fn.displayName = name
}

export const scheduleNative: (handler: () => void) => number = typeof requestAnimationFrame === 'function'
    ? (handler: () => void) => requestAnimationFrame(handler)
    : (handler: () => void) => setTimeout(handler, 16)


export const origId = Symbol('lom_error_orig')
const throwOnAccess = {
    get<V: Object>(target: Error, key: string): V {
        if (key === origId) return (target: Object).valueOf()
        throw target.valueOf()
    },
    ownKeys(target: Error): string[] {
        throw target.valueOf()
    }
}


export function proxify<V>(v: V): V {
    return (new Proxy(v, (throwOnAccess: any)): any)
}
