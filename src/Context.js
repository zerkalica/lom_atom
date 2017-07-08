// @flow

import type {IAtomInt, IContext} from './interfaces'

import SimpleSet from './SimpleSet'

export default class Context implements IContext {
    last: ?IAtomInt = null
    lastId: number = 0

    _updating: IAtomInt[] = []
    _reaping: SimpleSet<IAtomInt> = new SimpleSet()
    _running = false

    proposeToPull(atom: IAtomInt) {
        this._updating.push(atom)
        this._schedule()
    }

    proposeToReap(atom: IAtomInt) {
        this._reaping.add(atom)
        this._schedule()
    }

    unreap(atom: IAtomInt) {
        this._reaping.delete(atom)
    }

    _schedule() {
        if (this._running) {
            return
        }
        this._running = true
        setTimeout(() => this.run(), 0)
    }

    run() {
        const reaping = this._reaping
        const reapingItems = reaping.items
        const updating = this._updating
        let start = 0
        do {
            const end = updating.length

            for (let i = start; i < end; i++) {
                const atom: IAtomInt = updating[i]
                if (reapingItems[atom.id] === undefined && !atom.destroyed()) {
                    atom.get()
                }
            }

            start = end
        } while (updating.length > start)
        updating.length = 0

        while (reaping.size > 0) {
            for (let i = reaping.from, l = reapingItems.length; i < l; i++) {
                const atom: IAtomInt | void = reapingItems[i]
                if (atom !== undefined) {
                    reaping.delete(atom)
                    atom.destroyed(true)
                }
            }
        }

        this._running = false
    }
}
