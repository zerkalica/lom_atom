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

function getKeyFromObj(params: Object): string {
    const keys = Object.keys(params)
        .sort()

    let result = ''
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i]
        const value = params[key]
        result += `.${key}:${typeof value === 'object' ? JSON.stringify(value) : value}`
    }

    return result
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
        ? getKeyFromObj(params)
        : JSON.stringify(params)
}

export class BaseLogger implements ILogger {
    create<V>(host: IAtomHost, field: string, key?: mixed): V | void {}
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

export class NoSerializableException extends Error {
    constructor(host: IAtomHost, field?: string) {
        super(`${host.displayName || host.constructor.name}${field ? `.${field}` : ''} not a serializable`)
        // $FlowFixMe new.target
        ;(this: Object)['__proto__'] = new.target.prototype
    }
}

export default class Context implements IContext {
    last: ?IAtomInt = null

    _logger: ILogger | void = undefined
    _updating: IAtomInt[] = []
    _reaping: Set<IAtomInt> = new Set()
    // _atomMap: WeakMap<IAtomHost, Map<string | number, IAtomInt>> = new WeakMap()
    _scheduled = false

    hasAtom(host: IAtomHost, key: mixed): boolean {
        return host[getKey(key) + '@'] !== undefined

        // const map = this._atomMap.get(host)
        // return map !== undefined && map.has(getKey(key))
    }

    getAtom<V>(
        field: string,
        host: IAtomHost,
        key?: mixed,
        normalize?: INormalize<V>,
        isComponent?: boolean,
    ): IAtom<V> {
        // let map = this._atomMap.get(host)
        // if (map === undefined) {
        //     map = new Map()
        //     this._atomMap.set(host, map)
        // }
        // let atom: IAtom<V> | void
        // let dict = map
        // let k
        // if (key === undefined) {
        //     k = field
        //     atom = map.get(field)
        // } else {
        //     k = getKey(key)
        //     dict = map.get(field)
        //     if (dict === undefined) {
        //         dict = new Map()
        //         map.set(field, dict)
        //     }
        //     atom = dict.get(k)
        // }

        const k = key === undefined
            ? (field + '@')
            : (field + '.' + getKey(key) + '@')

        let atom: IAtom<V> | void = host[k]

        if (atom === undefined) {
            let ptr: Object | void = host.__lom_state
            if (ptr !== undefined) {
                if (ptr[field] === undefined) {
                    ptr = undefined
                } else if (key !== undefined) {
                    if (ptr[field] === null) {
                        ptr[field] = {}
                    }
                    ptr = ptr[field]
                    if (typeof ptr !== 'object') {
                        throw new NoSerializableException(host, field)
                    }
                } else if (ptr[field] === null) {
                    ptr[field] = undefined
                }
            }
            if (this._logger !== undefined) {
                this._logger.create(host, field, key)
            }
            atom = new Atom(field, host, this, key, normalize, isComponent, ptr)
            // dict.set(k, atom)
            ;(host: Object)[k] = (atom: any)
        }

        return atom
    }

    getState(host: Object): Object {
        if (!host.__lom_state) {
            throw new NoSerializableException(host)
        }
        return host.__lom_state
    }

    setState(host: Object, state: Object, init?: boolean) {
        if (init) {
            host.__lom_state = state
            return
        }
        const oldState = host.__lom_state
        if (oldState === undefined) {
            throw new NoSerializableException(host)
        }
        const fields = Object.keys(state)
        for (let i = 0; i < fields.length; i++) {
            const field = fields[i]
            const value = state[field]
            if (host[field + '?'] !== undefined) {
                if (typeof value !== 'object' || value === null) {
                    throw new NoSerializableException(host, field)
                }
                const keys = Object.keys(value)
                for (let j = 0; j < keys.length; j++) {
                    const key = keys[j]
                    const atom: IAtom<*> | void = host[field + '.' + key + '@']
                    if (atom !== undefined) {
                        atom.set(value[key])
                    } else {
                        if (!oldState[field]) {
                            oldState[field] = {}
                        }
                        oldState[field][key] = value[key]
                    }
                }
            } else {
                const atom: IAtom<*> | void = host[field + '@']
                if (atom !== undefined) {
                    atom.set(value)
                } else {
                    oldState[field] = value
                }
            }
        }
    }

    destroyHost(atom: IAtomInt) {
        if (this._logger !== undefined) {
            this._logger.destroy(atom)
        }

        const host = atom.host

        const k = atom.key === undefined
            ? (atom.field + '@')
            : (atom.field + '.' + getKey(atom.key) + '@')

        host[k] = (undefined: any)
        if (host._destroyProp !== undefined) {
            host._destroyProp(atom.key || atom.field, atom.cached)
        }
        if (host._destroy !== undefined && atom.key === undefined) {
            host._destroy()
        }

        // const map = this._atomMap.get(host)
        // if (map !== undefined) {
        //     if (host._destroyProp !== undefined) {
        //         host._destroyProp(atom.key === undefined ? atom.field : atom.key, atom.cached)
        //     }
        //
        //     map.delete(atom.key === undefined ? atom.field : getKey(atom.key))
        //     if (map.size === 0) {
        //         if (host._destroy !== undefined) {
        //             host._destroy()
        //         }
        //         this._atomMap.delete(host)
        //     }
        // }
    }

    setLogger(logger: ILogger) {
        this._logger = logger
    }

    newValue<V>(atom: IAtom<V>, from?: V | Error, to: V | Error, isActualize?: boolean) {
        if (this._logger === undefined) {
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
