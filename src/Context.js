// @flow

import type {IAtomHost, IAtomHandlers, IAtomHandler, IAtomKeyHandler, IAtomInt, IAtom, IContext, ILogger} from './interfaces'
import {AtomWait} from './utils'
import Atom from './Atom'

function reap(atom: IAtomInt, key: IAtomInt, reaping: Set<IAtomInt>) {
    reaping.delete(atom)
    atom.destroyed(true)
}

export const animationFrame =  typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame
    : (fn: () => void) => setTimeout(fn, 0)

function createKeyedHandler<V>(host: IAtomHost, handler: IAtomKeyHandler<V, *>, key: string | Function): IAtomHandler<V> {
    return function keyedHandler(next?: V, force?: boolean): V {
        return handler.call(host, key, next, force)
    }
}

export default class Context implements IContext {
    last: ?IAtomInt = null
    force: boolean = false

    _logger: ?ILogger = null
    _updating: IAtomInt[] = []
    _reaping: Set<IAtomInt> = new Set()
    _scheduled = false
    _atomMap: WeakMap<IAtomHost, Map<string | Function, IAtom<*>>> = new WeakMap()

    getKeyAtom(host: IAtomHost, keyHandler: IAtomKeyHandler<*, *>, key: string | Function): IAtom<*> {
        let map = this._atomMap.get(host)
        if (map === undefined) {
            map = new Map()
            this._atomMap.set(host, map)
        }
        let atom = map.get(key)
        if (atom === undefined) {
            atom = new Atom(key, createKeyedHandler(host, keyHandler, key), host, undefined, this)
            map.set(key, atom)
            // host[key + '@'] = atom
        }

        return atom
    }

    getAtom(host: IAtomHost, handler: IAtomHandler<*>, key: string | Function, isComponent?: boolean): IAtom<*> {
        let map = this._atomMap.get(host)
        if (map === undefined) {
            map = new Map()
            this._atomMap.set(host, map)
        }
        let atom = map.get(key)
        if (atom === undefined) {
            atom = new Atom(key, handler, host, isComponent, this)
            map.set(key, atom)
            // host[key + '@'] = atom
        }

        return atom
    }

    destroyHost(host: IAtomHost, key: string | Function) {
        const map = this._atomMap.get(host)
        if (map !== undefined) {
            map.delete(key)
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

export const defaultContext = new Context()
