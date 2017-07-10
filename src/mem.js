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
    const handler: IHandler<V> | void = descr.value
    if (handler === undefined) {
        throw new Error('Only function allowed')
    }

    descr.value = function(next?: V, force?: boolean) {
        const field = `${name}@`
        const host = this
        let atom: ?IAtom<V> = host[field]
        if (!atom) {
            host[field] = atom = new Atom(
                name,
                handler.bind(host),
                undefined,
                host._destroy ? host._destroy.bind(host) : undefined
            )
        }

        return next === undefined
            ? atom.get(force)
            : atom.set(next, force)
    }
}
