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

export default class Context implements IContext {
    last: ?IAtomInt = null
    force: boolean = false

    _logger: ?ILogger = null
    _updating: IAtomInt[] = []
    _reaping: Set<IAtomInt> = new Set()
    _atomMap: WeakMap<IAtomHost, Map<string | number, IAtom<any>>> = new WeakMap()

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
            // host[k + '@'] = atom
        }

        return atom
    }

    destroyHost(atom: IAtomInt) {
        const host = atom.host

        // host[(atom.key === undefined ? atom.field : getKey(atom.key)) + '@'] = undefined
        //
        // if (host._destroy !== undefined) {
        //     host._destroy()
        // }

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
    }

    proposeToReap(atom: IAtomInt) {
        // this.logger.reap(atom)
        this._reaping.add(atom)
    }

    unreap(atom: IAtomInt) {
        // this.logger.unreap(atom)
        this._reaping.delete(atom)
    }

    _pendCount = 0

    beginTransaction() {
        this._pendCount++
    }

    run() {
        this.beginTransaction()
        this.endTransaction()
    }

    endTransaction(noUpdate?: boolean) {
        if (this._pendCount === 1 && noUpdate !== true) {
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
        }
        this._pendCount--
    }
}

export const defaultContext = new Context()
