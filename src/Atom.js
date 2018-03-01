// @flow

import {
    ATOM_FORCE_NONE, ATOM_FORCE_CACHE, ATOM_FORCE_ASYNC,
    ATOM_STATUS_DESTROYED,
    ATOM_STATUS_DEEP_RESET,
    ATOM_STATUS_OBSOLETE, ATOM_STATUS_CHECKING, ATOM_STATUS_PULLING, ATOM_STATUS_ACTUAL
} from './interfaces'

import type {
    IAtomForce,
    IAtom,
    IAtomInt,
    IAtomStatus,
    IAtomHandler,
    IAtomOwner
} from './interfaces'
import Context, {defaultContext} from './Context'
import {AtomWait, setFunctionName, origId, catchedId, proxify} from './utils'
import conform, {processed} from './conform'

function checkSlave(slave: IAtomInt) {
    slave.check()
}

function obsoleteSlave(slave: IAtomInt) {
    slave.obsolete()
}

function deleteSlave(master: IAtomInt) {
    master.dislead((this: IAtomInt))
}

function actualizeMaster(master: IAtomInt) {
    if ((this: IAtom<*>).status === ATOM_STATUS_CHECKING) {
        master.actualize()
    }
}
const proxyId = Symbol('lom_err_proxy')

export default class Atom<V> implements IAtom<V>, IAtomInt {
    status: IAtomStatus
    displayName: string

    current: V
    _next: V | void
    _suggested: V | Error | void

    _masters: ?Set<IAtomInt> = null
    _slaves: ?Set<IAtomInt> = null
    _hostAtoms: WeakMap<Object, IAtom<*>> | Map<string, IAtom<*>> | void
    _keyHash: mixed

    manualReset: boolean

    _handler: (next?: V) => V

    constructor(
        displayName: string,
        handler: (next?: V) => V,
        keyHash?: mixed,
        hostAtoms?: WeakMap<Object, IAtom<*>> | Map<string, IAtom<*>>,
        manualReset?: boolean,
    ) {
        this.displayName = displayName
        this._handler = handler
        this.manualReset = manualReset || false
        this._hostAtoms = hostAtoms
        this._keyHash = keyHash

        this.current = (undefined: any)
        this._next = undefined
        this._suggested = undefined
        this.status = ATOM_STATUS_OBSOLETE
    }

    toString() {
        return this.displayName
        // const owner = this.owner
        // const parent = owner.displayName || owner.constructor.displayName || owner.constructor.name
        //
        // return `${String(parent)}.${this.field}`
        //     + (k
        //         ? ('(' + (typeof k === 'function' ? (k.displayName || k.name) : String(k)) + ')')
        //         : ''
        //     )
    }

    toJSON() {
        return this.current
    }

    destructor(): void {
        if (this.status === ATOM_STATUS_DESTROYED) return
        if (this._masters) this._masters.forEach(deleteSlave, this)
        this._masters = null
        // this._checkSlaves()
        if (this._slaves) this._slaves.forEach(checkSlave)
        this._slaves = null
        processed.delete(this.current)
        if (this._hostAtoms !== undefined) this._hostAtoms.delete((this._keyHash: any))
        defaultContext.destroyHost(this)
        this.current = (undefined: any)
        this._next = undefined
        this._suggested = undefined
        this.status = ATOM_STATUS_DESTROYED
        this._hostAtoms = undefined
        this._keyHash = undefined
        this._retry = undefined
    }

    value(next?: V | Error, forceCache?: IAtomForce): V {
        const context = defaultContext
        let current: V | Error = this.current
        const slave = context.current
        if (forceCache === ATOM_FORCE_CACHE) {
            if (next === undefined) {
                this._suggested = this._next
                this._next = undefined
                this.status = ATOM_STATUS_DEEP_RESET
                this.obsoleteSlaves()
            } else {
                context.current = this
                this._push(next)
                context.current = slave
            }
        } else {
            if (slave) {
                let slaves = this._slaves
                if (!slaves) {
                    slaves = this._slaves = new Set()
                    context.unreap(this)
                }
                slaves.add(slave)
                slave.addMaster(this)
            }

            let normalized: V | Error

            if (
                next !== undefined
                && (normalized = this._conform(next, this._suggested)) !== this._suggested
                && (
                    current instanceof Error
                    || (normalized = this._conform(next, current)) !== current
                )
            ) {
                this._suggested = this._next = (normalized: any)
                this.status = ATOM_STATUS_OBSOLETE
            }

            this.actualize()
        }

        current = this.current
        if (current instanceof Error) {
            if (forceCache !== ATOM_FORCE_NONE) {
                if ((current: Object)[proxyId] === undefined) (current: Object)[proxyId] = proxify((current: any))
                return (current: Object)[proxyId]
            }
            throw current
        }

        return current
    }

    _conform<Target, Source>(target: Target, source: Source): Target {
        return conform(target, source)
    }

    static deepReset: Set<IAtom<*>> | void = undefined

    actualize(): void {
        if (this.status === ATOM_STATUS_PULLING) {
            throw new Error(`Cyclic atom dependency of ${String(this)}`)
        }

        if (this.status === ATOM_STATUS_CHECKING) {
            if (this._masters) {
                this._masters.forEach(actualizeMaster, this)
            }

            if (this.status === ATOM_STATUS_CHECKING) {
                this.status = ATOM_STATUS_ACTUAL
            }
        }

        const deepReset = Atom.deepReset
        if (this.status === ATOM_STATUS_DEEP_RESET) {
            Atom.deepReset = deepReset || new Set()
            this.refresh()
            Atom.deepReset = deepReset
        } else if (deepReset !== undefined && !this.manualReset && !deepReset.has(this)) {
            deepReset.add(this)
            this.refresh()
        } else if (this.status !== ATOM_STATUS_ACTUAL) {
            this.refresh()
        }
    }

    _push(nextRaw: V | Error): void {
        this.status = ATOM_STATUS_ACTUAL
        const prev: V | Error = this.current
        let next: V | Error
        if (nextRaw instanceof Error) {
            next = (nextRaw: Object)[origId] === undefined
                ? nextRaw
                : (nextRaw: Object)[origId]
        } else {
            next = this._conform(nextRaw, prev)
            this._suggested = this._next
            this._next = undefined
        }

        if (prev !== next) {
            this.current = (next: any)
            defaultContext.newValue((this: IAtomInt), prev, next)
            this.obsoleteSlaves()
        }
    }

    obsoleteSlaves() {
        if (this._slaves) this._slaves.forEach(obsoleteSlave)
    }

    refresh(): void {
        const masters = this._masters
        if (masters) {
            masters.forEach(deleteSlave, this)
            this._masters = null
        }

        let newValue: V | Error
        this.status = ATOM_STATUS_PULLING

        const context = defaultContext
        const slave = context.current
        context.current = this
        try {
            newValue = this._handler(this._next)
        } catch (error) {
            if (error[catchedId] === undefined) {
                error[catchedId] = true
                console.error(error.stack || error)
            }
            newValue = error
        }
        context.current = slave

        if (this.status !== ATOM_STATUS_DEEP_RESET) this._push(newValue)
    }

    dislead(slave: IAtomInt) {
        const slaves = this._slaves
        if (slaves) {
            slaves.delete(slave)
            if (slaves.size === 0) {
                this._slaves = null
                defaultContext.proposeToReap(this)
            }
        }
    }

    _checkSlaves() {
        if (this._slaves) {
            this._slaves.forEach(checkSlave)
        } else {
            defaultContext.proposeToPull(this)
        }
    }

    check() {
        if (this.status === ATOM_STATUS_ACTUAL) {
            this.status = ATOM_STATUS_CHECKING
            this._checkSlaves()
        }
    }

    obsolete() {
        if (this.status !== ATOM_STATUS_OBSOLETE) {
            this.status = ATOM_STATUS_OBSOLETE
            this._checkSlaves()
        }
    }

    addMaster(master: IAtomInt) {
        if (!this._masters) {
            this._masters = new Set()
        }
        this._masters.add(master)
    }

    _retry: (() => void) | void = undefined

    getRetry(): () => void {
        if (this._retry === undefined) {
            const fn = () => this.refresh()
            setFunctionName(fn, `atom(${this.toString()}).retry()`)
            this._retry = fn
        }

        return this._retry
    }
}
