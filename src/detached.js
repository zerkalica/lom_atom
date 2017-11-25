// @flow

import type {IAtom, TypedPropertyDescriptor} from './interfaces'
import {ATOM_FORCE_NONE, ATOM_FORCE_CACHE, ATOM_FORCE_UPDATE} from './interfaces'
import Atom from './Atom'
import {defaultContext} from './Context'

export default function detached<P: Object, V>(
    proto: P,
    name: string,
    descr: TypedPropertyDescriptor<(force: boolean) => V>
): TypedPropertyDescriptor<(force: boolean) => V> {
    proto[`${name}$`] = descr.value
    const hostAtoms: WeakMap<Object, IAtom<V>> = new WeakMap()
    Object.defineProperty(proto, `${name}()`, {
        get() {
            return hostAtoms.get(this)
        }
    })

    return {
        enumerable: descr.enumerable,
        configurable: descr.configurable,
        value(force: boolean): V {
            let atom: IAtom<V> | void = hostAtoms.get(this)
            if (atom === undefined) {
                atom = new Atom(name, this, defaultContext, hostAtoms, undefined, undefined, true)
                hostAtoms.set(this, atom)
            }
            if (force) {
                defaultContext.prevForce = defaultContext.force
                defaultContext.force = ATOM_FORCE_UPDATE
            }

            return atom.value()
        }
    }
}
