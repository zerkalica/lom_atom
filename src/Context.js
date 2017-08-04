// @flow

import type {
    INormalize,
    IAtomHost,
    IAtomHandler,
    IAtomInt,
    IAtom,
    IContext,
    ILogger
} from './interfaces'
import {AtomWait} from './utils'
import Atom from './Atom'

function reap(atom: IAtomInt, key: IAtomInt, reaping: Set<IAtomInt>) {
    reaping.delete(atom)
    atom.destroyed(true)
}

export const animationFrame =  typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame
    : (fn: () => void) => setTimeout(fn, 0)

function getKey(params: any): string | number | Function {
    if (typeof params === 'string' || typeof params === 'number' || typeof params === 'function' || !params) {
        return params || ''
    }

    return typeof params === 'object'
        ? Object.keys(params)
            .sort()
            .map((key: string) => `${key}:${JSON.stringify(params[key])}`)
            .join('.')
        : JSON.stringify(params)
}

export default class Context implements IContext {
    last: ?IAtomInt = null
    force: boolean = false

    _logger: ?ILogger = null
    _updating: IAtomInt[] = []
    _reaping: Set<IAtomInt> = new Set()
    _scheduled: boolean = false
    _atomMap: WeakMap<IAtomHost, Map<mixed, IAtom<any>>> = new WeakMap()

    _run: () => void = () => {
        if (this._scheduled) {
            this.run()
        }
    }

    getAtom<V>(
        field: string,
        host: IAtomHost,
        key?: mixed,
        normalize?: INormalize<V>,
        isComponent?: boolean
    ): IAtom<V> {
        let map = this._atomMap.get(host)
        if (map === undefined) {
            map = new Map()
            this._atomMap.set(host, map)
        }
        const k = key === undefined ? field : getKey(key)
        let atom: IAtom<V> | void = map.get(k)
        if (atom === undefined) {
            atom = new Atom(field, host, this, key, normalize, isComponent)
            map.set(k, atom)
            // host[field + '@'] = atom
        }

        return atom
    }

    destroyHost(atom: IAtomInt) {
        const host = atom.host
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

export const defaultContext = new Context()
