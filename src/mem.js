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

function patchObject(t: Object) {
    const decorated: string[] = t.__lom || []
    for (let i = 0; i < decorated.length; i++) {
        const name = decorated[i]
        const key = `${name}@`
        const handler = t[name]
        const atom: IAtom<*> = new Atom(
            name,
            handler.bind(t),
            undefined,
            t._destroy ? t._destroy.bind(t) : undefined
        )
        t[key] = handler
        t[name] = atom.value.bind(atom)
    }
}

function mem_cls<T: Class<*>>(constr: T) {
    function MemConst(...args: any[]) {
        constr.apply(this, args)
        patchObject(this)
    }
    MemConst.prototype = Object.create(constr.prototype)
    MemConst.prototype.constructor = MemConst
    MemConst.displayName = constr.displayName || constr.name

    return MemConst
}

function mem_method<Prototype: Object, V>(
    proto: Prototype,
    name: string,
    descr: TypedPropertyDescriptor<IHandler<V>>
) {
    proto.__lom = !proto.hasOwnProperty('__lom')
        ? []
        : proto.__lom

    proto.__lom.push(name)
}

export default function mem(...args: any[]) {
    return args.length === 1
        ? mem_cls(args[0])
        : mem_method(args[0], args[1], args[2])
}
