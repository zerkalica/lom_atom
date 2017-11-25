// @flow

import type {
    IAtomForce,
    IAtomInt,
    IAtom,
    IContext,
    ILogger,
} from './interfaces'
import {origId, ATOM_FORCE_NONE, ATOM_STATUS_DESTROYED} from './interfaces'

const scheduleNative: (handler: () => void) => number = typeof requestAnimationFrame === 'function'
    ? (handler: () => void) => requestAnimationFrame(handler)
    : (handler: () => void) => setTimeout(handler, 16)

function reap(atom: IAtomInt, key: IAtomInt, reaping: Set<IAtomInt>) {
    reaping.delete(atom)
    if (!atom.slaves) {
        atom.destructor()
    }
}

export default class Context implements IContext {
    current: ?IAtomInt = null
    force: IAtomForce = ATOM_FORCE_NONE
    prevForce: IAtomForce = ATOM_FORCE_NONE

    _logger: ILogger | void = undefined
    _updating: IAtomInt[] = []
    _reaping: Set<IAtomInt> = new Set()
    _scheduled = false
    _namespace: string = '$'
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
                // if (!this._scheduled && this._logger !== undefined) {
                //     this._logger.beginGroup(this._namespace)
                // }
                logger.newValue(
                    atom,
                    from instanceof Error && (from: Object)[origId] ? (from: Object)[origId] : from,
                    to instanceof Error && (to: Object)[origId] ? (to: Object)[origId] : to
                )
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
            scheduleNative(this.__run)
            this._scheduled = true
        }
    }

    __run = () => {
        if (this._scheduled) {
            this._scheduled = false
            this._run()
        }
    }

    _start = 0

    _run() {
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
        // if (this._logger !== undefined) {
        //     this._logger.endGroup()
        // }
        this._scheduled = false
        this._pendCount = 0
    }

    _pendCount = 0

    beginTransaction(namespace: string): string {
        const result = this._namespace
        this._namespace = namespace
        this._pendCount++
        return result
    }

    endTransaction(prev: string) {
        this._namespace = prev
        if (this._pendCount === 1) {
            this._run()
        } else {
            this._pendCount--
        }
    }
}

export const defaultContext = new Context()
