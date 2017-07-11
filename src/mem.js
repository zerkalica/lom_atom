// @flow

import type {IAtom} from './interfaces'
import Atom from './Atom'

interface TypedPropertyDescriptor<T> {
    enumerable?: boolean;
    configurable?: boolean;
    writable?: boolean;
    value?: T;
    get?: () => T;
    set?: (value: T) => void;
}

type IHandler<V> = (next?: V, force?: boolean) => V;

export default function mem<Prototype: Object, V>(
    proto: Prototype,
    name: string,
    descr: TypedPropertyDescriptor<IHandler<V>>
) {
    let handler: IHandler<V> | void = descr.value
    let definingProperty = false

    return {
        get() {
            if (
                definingProperty
                || this === proto.prototype
                || this.hasOwnProperty(name)
                || typeof handler !== 'function'
            ) {
                return handler
            }

            const t = this
            const atom: IAtom<V> = new Atom(
                name,
                handler.bind(t),
                undefined,
                t._destroy ? t._destroy.bind(t) : undefined
            )

            function facade(next?: V, force?: boolean): V {
                return next === undefined
                    ? atom.get(force)
                    : atom.set(next, force)
            }

            definingProperty = true
            Object.defineProperty(t, name, {
                value: facade
            })
            definingProperty = false
            return facade
        }
    }
}
