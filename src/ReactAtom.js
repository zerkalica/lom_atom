// @flow

import Atom from './Atom'
import {ATOM_STATUS_OBSOLETE} from './interfaces'

interface IReactHost<Element> {
    __value(propsChanged: boolean): Element;
    forceUpdate(): void;
}

export default class ReactAtom<Element> extends Atom<Element> {
    _propsChanged = true
    _owner: IReactHost<Element>

    constructor(displayName: string, owner: IReactHost<Element>) {
        super(displayName, (next?: Element) => t._update(next))
        let t = this
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
