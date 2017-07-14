// @flow

import type {IAtomInt, IAtom, IContext, ILogger} from './interfaces'
import {AtomWait} from './utils'

function reap(atom: IAtomInt, key: IAtomInt, reaping: Set<IAtomInt>) {
    reaping.delete(atom)
    atom.destroyed(true)
}

const animationFrame =  typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame
    : (fn: () => void) => setTimeout(fn, 0)

export default class Context implements IContext {
    last: ?IAtomInt = null

    force: boolean = false

    _logger: ?ILogger = null
    _updating: IAtomInt[] = []
    _reaping: Set<IAtomInt> = new Set()
    _scheduled = false

    setLogger(logger: ILogger) {
        this._logger = logger
    }

    newValue<V>(atom: IAtom<V>, from?: V | Error, to: V | Error) {
        if (this._logger) {
            if (to instanceof AtomWait) {
                this._logger.pulling(atom)
            } else if (to instanceof Error) {
                this._logger.error(atom, to)
            } else {
                this._logger.newValue(atom, from, to)
            }
        }
    }

    proposeToPull(atom: IAtomInt) {
        // this.logger.pull(atom)
        this._updating.push(atom)
        this._schedule()
    }

    proposeToReap(atom: IAtomInt) {
        // this.logger.reap(atom)
        this._reaping.add(atom)
        this._schedule()
    }

    unreap(atom: IAtomInt) {
        // this.logger.unreap(atom)
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
        // console.log('---------------------------- state changed\n')
        this._scheduled = false
    }
}
