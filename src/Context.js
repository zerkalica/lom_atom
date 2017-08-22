// @flow

import type {
    INormalize,
    IAtomHost,
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

let lastId = 0
function getKey(params: any): string | number {
    if (typeof params === 'string' || typeof params === 'number') {
        return params
    }
    if (!params) {
        return 0
    }
    if (typeof params === 'function') {
        params.__id = params.__id || ++lastId
        return params.__id
    }

    return typeof params === 'object'
        ? Object.keys(params)
            .sort()
            .map((key: string) => `${key}:${JSON.stringify(params[key])}`)
            .join('.')
        : JSON.stringify(params)
}

export class BaseLogger implements ILogger {
    status(status: ILoggerStatus, atom: IAtom<*>): void {}
    error<V>(atom: IAtom<V>, err: Error): void {}
    newValue<V>(atom: IAtom<V>, from?: V | Error, to: V, isActualize?: boolean): void {}
}

export class ConsoleLogger extends BaseLogger implements ILogger {
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
    force: boolean = false

    _logger: ?ILogger = null
    _updating: IAtomInt[] = []
    _reaping: Set<IAtomInt> = new Set()
    _atomMap: WeakMap<IAtomHost, Map<string | number, IAtom<any>>> = new WeakMap()
    _scheduled = false

    hasAtom(host: IAtomHost, key: mixed): boolean {
        // return host[getKey(key) + '@'] !== undefined
        const map = this._atomMap.get(host)
        return map !== undefined && map.has(getKey(key))
    }

    getAtom<V>(
        field: string,
        host: IAtomHost,
        key?: mixed,
        normalize?: INormalize<V>,
        isComponent?: boolean
    ): IAtom<V> {
        const k = key === undefined ? field : getKey(key)

        let map = this._atomMap.get(host)
        if (map === undefined) {
            map = new Map()
            this._atomMap.set(host, map)
        }
        let atom: IAtom<V> | void = map.get(k)

        // let atom: IAtom<V> | void = host[k + '@']

        if (atom === undefined) {
            atom = new Atom(field, host, this, key, normalize, isComponent)
            map.set(k, atom)
            // host[k + '@'] = (atom: any)
        }

        return atom
    }

    destroyHost(atom: IAtomInt) {
        const host = atom.host

        // const k = atom.key === undefined ? atom.field : getKey(atom.key)
        // host[k + '@'] = (undefined: any)
        // if (host._destroyProp !== undefined) {
        //     host._destroyProp(atom.key === undefined ? atom.field : atom.key, atom.cached)
        // }
        // if (host._destroy !== undefined && atom.key === undefined) {
        //     host._destroy()
        // }

        if (this._logger) {
            this._logger.status('destroy', atom)
        }

        const map = this._atomMap.get(host)
        if (map !== undefined) {
            if (host._destroyProp !== undefined) {
                host._destroyProp(atom.key === undefined ? atom.field : atom.key, atom.cached)
            }

            map.delete(atom.key === undefined ? atom.field : getKey(atom.key))
            if (map.size === 0) {
                if (host._destroy !== undefined) {
                    host._destroy()
                }
                this._atomMap.delete(host)
            }
        }
    }

    setLogger(logger: ILogger) {
        this._logger = logger
    }

    newValue<V>(atom: IAtom<V>, from?: V | Error, to: V | Error, isActualize?: boolean) {
        if (!this._logger) {
            return
        }
        if (to instanceof AtomWait) {
            this._logger.status('waiting', atom)
        } else if (to instanceof Error) {
            this._logger.error(atom, to)
        } else {
            this._logger.newValue(atom, from, to, isActualize)
        }
    }

    proposeToPull(atom: IAtomInt) {
        if (this._logger) {
            this._logger.status('proposeToPull', atom)
        }
        this._updating.push(atom)
        this._schedule()
    }

    proposeToReap(atom: IAtomInt) {
        if (this._logger) {
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
                this._start = i
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
