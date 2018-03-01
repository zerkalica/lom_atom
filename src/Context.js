// @flow

import type {
    IAtomInt,
    IAtom,
    ILogger,
} from './interfaces'
import {ATOM_STATUS_DESTROYED} from './interfaces'
import defer from './defer'

function reap(atom: IAtomInt, key: IAtomInt, reaping: Set<IAtomInt>) {
    reaping.delete(atom)
    if (!atom.slaves) {
        atom.destructor()
    }
}

export default class Context {
    current: ?IAtomInt = null

    _logger: ILogger | void = undefined
    _updating: IAtomInt[] = []
    _reaping: Set<IAtomInt> = new Set()
    _scheduled = false
    _owners: WeakMap<?Object, Object> = new WeakMap()

    _destroyValue<V>(atom: IAtom<V>, from: any) {
        if (this._owners.get(from) === atom) {
            try {
                from.destructor()
            } catch(e) {
                console.error(e)
                if (this._logger) this._logger.error(atom, e)
            }
            this._owners.delete(from)
        }
    }

    destroyHost(atom: IAtomInt) {
        this._destroyValue(atom, atom.current)
        if (this._logger !== undefined) {
            this._logger.onDestruct(atom)
        }
    }

    setLogger(logger: ILogger) {
        this._logger = logger
    }

    newValue<V>(atom: IAtom<V>, from?: V | Error, to: V | Error) {
        this._destroyValue(atom, from)
        if (
            to
            && typeof to === 'object'
            && !(to instanceof Error)
            && typeof to.destructor === 'function'
        ) {
            this._owners.set(to, atom)
        }
        const logger = this._logger
        if (logger !== undefined) {
            try {
                logger.newValue(atom, from, to)
            } catch (error) {
                console.error(error)
                logger.error(atom, error)
            }
        }
    }

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
        if (!this._scheduled) {
            defer.add(this._run)
            this._scheduled = true
        }
    }

    _run = () => {
        if (this._scheduled) {
            this._scheduled = false
            this.sync()
        }
    }

    _start = 0

    sync() {
        this._schedule()
        const reaping = this._reaping
        const updating = this._updating
        let start = this._start
        do {
            const end = updating.length

            for (let i = start; i < end; i++) {
                this._start = i // save progress, atom.actualize or destroyed can throw exception
                const atom: IAtomInt = updating[i]
                if (!reaping.has(atom) && atom.status !== ATOM_STATUS_DESTROYED) {
                    atom.actualize()
                }
            }

            start = end
        } while (updating.length > start)
        updating.length = 0
        this._start = 0

        while (reaping.size > 0) {
            reaping.forEach(reap)
        }
        this._scheduled = false
    }
}

export const defaultContext = new Context()
