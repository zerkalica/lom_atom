// @flow

import Atom from './Atom'
import {ATOM_STATUS_OBSOLETE} from './interfaces'
import type {IReactHost} from './interfaces'

export default class ReactAtom<V> extends Atom<V> {
    _propsChanged = true
    _owner: IReactHost<V>

    constructor(displayName: string, owner: IReactHost<V>) {
        super(displayName, (next?: V) => (this: any)._update(next))
        this._owner = owner
    }

    _update(next?: V): V {
        return this._owner.value(this._propsChanged)
    }

    reset() {
        this.status = ATOM_STATUS_OBSOLETE
        this._propsChanged = true
    }

    _conform<Target, Source>(target: Target, source: Source): Target {
        return target
    }

    obsoleteSlaves() {
        if (!this._propsChanged) this._owner.forceUpdate()
        this._propsChanged = false
    }
}
