// @flow

import type {IAtomInt, IContext} from './interfaces'

function reap(atom: IAtomInt, key: IAtomInt, reaping: Set<IAtomInt>) {
    reaping.delete(atom)
    atom.destroyed(true)
}

const animationFrame =  typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame
    : (fn: () => void) => setTimeout(fn, 0)

export default class Context implements IContext {
    last: ?IAtomInt = null

    _updating: IAtomInt[] = []
    _reaping: Set<IAtomInt> = new Set()
    _scheduled = false

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

    _run = () => {
        if (this._scheduled) {
            this.run()
        }
    }

    _schedule() {
        if (this._scheduled) {
            return
        }
        this._scheduled = true
        animationFrame(this._run)
    }

    run() {
        const reaping = this._reaping
        const updating = this._updating
        let start = 0
        do {
            const end = updating.length

            for (let i = start; i < end; i++) {
                const atom: IAtomInt = updating[i]
                if (!reaping.has(atom) && !atom.destroyed()) {
                    atom.actualize()
                }
            }

            start = end
        } while (updating.length > start)
        updating.length = 0

        while (reaping.size > 0) {
            reaping.forEach(reap)
        }

        this._scheduled = false
    }
}
