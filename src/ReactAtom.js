// @flow

import Atom from './Atom'
import {ATOM_STATUS_OBSOLETE} from './interfaces'
import type {
    IReactHost,
    IReactAtom
} from 'urc'

export default class ReactAtom<Element> extends Atom<Element> implements IReactAtom<Element> {
    _propsChanged = true
    _owner: IReactHost<Element>

    constructor(displayName: string, owner: IReactHost<Element>) {
        super(displayName, (next?: Element) => (this: any)._update(next))
        this._owner = owner
    }

    _update(next?: Element): Element {
        return this._owner.__value(this._propsChanged)
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
