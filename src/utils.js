// @flow

export const catchedId = Symbol('lom_cached')

export function isPromise(target: mixed): boolean {
    return target !== null && typeof target === 'object' && typeof target.then === 'function'
}

/**
 * Can't extend Error
 * @see https://github.com/babel/babel/issues/7447
 */
class AtomWait {
    message: string
    stack: string

    static is(target: mixed): boolean {
        return target instanceof AtomWait || isPromise(target)
    }

    constructor(message?: string = '[Pending]') {
        const t = Error.call(this, message)
        // super(message)
        // $FlowFixMe new.target
        ;(t: Object)['__proto__'] = new.target.prototype
        ;(t: Object)[catchedId] = true
        return t
    }
}
;(AtomWait: any).prototype = Object.create(Error.prototype)
;(AtomWait: any).prototype.constructor = AtomWait

const AtomWaitInt: Class<AtomWait & Error> = (AtomWait: any)

export {AtomWaitInt as AtomWait}

export function getId(t: Object, hk: string): string {
    return `${t.constructor.displayName || t.constructor.name}.${hk}`
}

export function setFunctionName(fn: Function, name: string) {
    Object.defineProperty(fn, 'name', {value: name, writable: false})
    fn.displayName = name
}

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
