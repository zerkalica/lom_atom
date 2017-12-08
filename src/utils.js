// @flow

import {ATOM_FORCE_CACHE, catchedId} from './interfaces'
import type {IAtom} from './interfaces'

export class AtomWait extends Error {
    constructor(message?: string = 'Wait...') {
        super(message)
        // $FlowFixMe new.target
        ;(this: Object)['__proto__'] = new.target.prototype
        ;(this: Object)[catchedId] = true
    }
}
const atomId = Symbol('lom_atom')
export class RecoverableError<V> extends Error {
    constructor(error: Error, atom: IAtom<V>) {
        super(error.message || error)
        this.stack = error.stack
        // $FlowFixMe new.target
        ;(this: Object)['__proto__'] = new.target.prototype
        ;(this: Object)[catchedId] = true
        ;(this: Object)[atomId] = atom
    }

    retry = () => {
        ;(this: Object)[atomId].value(undefined, ATOM_FORCE_CACHE)
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


export const origId = Symbol('orig_error')
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
