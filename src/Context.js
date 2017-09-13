// @flow

import type {
    INormalize,
    IAtomHandler,
    IAtomInt,
    IAtom,
    IContext,
    ILogger,
    ILoggerStatus
} from './interfaces'
import {AtomWait} from './utils'
import Atom from './Atom'

const scheduleNative: (handler: () => void) => number = typeof requestAnimationFrame == 'function'
    ? (handler: () => void) => requestAnimationFrame(handler)
    : (handler: () => void) => setTimeout(handler, 16)

function reap(atom: IAtomInt, key: IAtomInt, reaping: Set<IAtomInt>) {
    reaping.delete(atom)
    if (!atom.slaves) {
        atom.destroyed(true)
    }
}

export class BaseLogger implements ILogger {
    create<V>(host: Object, field: string, key?: mixed): V | void {}
    destroy(atom: IAtom<*>): void {}
    status(status: ILoggerStatus, atom: IAtom<*>): void {}
    error<V>(atom: IAtom<V>, err: Error): void {}
    newValue<V>(atom: IAtom<any>, from?: V | Error, to: V, isActualize?: boolean): void {}
}

export class ConsoleLogger extends BaseLogger {
    status(status: ILoggerStatus, atom: IAtom<*>): void {
        console.log(status, atom.displayName)
    }

    error<V>(atom: IAtom<V>, err: Error): void {
        console.log('error', atom.displayName, err)
    }

    newValue<V>(atom: IAtom<V>, from?: V | Error, to: V, isActualize?: boolean): void {
        console.log(isActualize ? 'actualize' : 'cacheSet', atom.displayName, 'from', from, 'to', to)
    }
}

export default class Context implements IContext {
    last: ?IAtomInt = null

    _logger: ILogger | void = undefined
    _updating: IAtomInt[] = []
    _reaping: Set<IAtomInt> = new Set()
    _scheduled = false

    create<V>(host: Object, field: string, key?: mixed): V | void {
        if (this._logger !== undefined) {
            return this._logger.create(host, field, key)
        }
    }

    destroyHost(atom: IAtomInt) {
        if (this._logger !== undefined) {
            this._logger.destroy(atom)
        }
    }

    setLogger(logger: ILogger) {
        this._logger = logger
    }

    newValue<V>(atom: IAtom<V>, from?: V | Error, to: V | Error, isActualize?: boolean) {
        if (this._logger !== undefined) {
            if (to instanceof AtomWait) {
                this._logger.status('waiting', atom)
            } else if (to instanceof Error) {
                this._logger.error(atom, to)
            } else {
                this._logger.newValue(atom, from, to, isActualize)
            }
        }
    }

    proposeToPull(atom: IAtomInt) {
        if (this._logger !== undefined) {
            this._logger.status('proposeToPull', atom)
        }
        this._updating.push(atom)
        this._schedule()
    }

    proposeToReap(atom: IAtomInt) {
        if (this._logger !== undefined) {
            this._logger.status('proposeToReap', atom)
        }
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
                if (!reaping.has(atom) && !atom.destroyed()) {
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
        this._pendCount = 0
    }

    _pendCount = 0

    beginTransaction() {
        this._pendCount++
    }

    endTransaction() {
        if (this._pendCount === 1) {
            this._run()
        } else {
            this._pendCount--
        }
    }
}

export const defaultContext = new Context()
