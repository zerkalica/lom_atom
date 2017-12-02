// @flow
import type {TypedPropertyDescriptor} from '../interfaces'
import {scheduleNative} from '../utils'

export default function defer(
    proto: Object,
    name: string,
    descr: TypedPropertyDescriptor<(...args: any[]) => void>
): TypedPropertyDescriptor<(...args: any[]) => void> {
    const origFn = descr.value
    if (!origFn) throw new Error('Not a method')
    let definingProperty = false
    function value(): (...args: any[]) => void {
        if (definingProperty) {
            return origFn.bind(this)
        }
        const fn = (...args: any[]) => {
            scheduleNative(() => origFn.apply(this, args))
        }
        fn.displayName = `${name}#defer`
        definingProperty = true
        Object.defineProperty(this, name, {
            configurable: true,
            value: fn
        })
        definingProperty = false

        return fn
    }

    return {
        enumerable: descr.enumerable,
        configurable: descr.configurable,
        get: value
    }
}
