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
import Context from './Context'
import {AtomWait, setFunctionName, origId, catchedId, proxify} from './utils'
import conform from './conform'

import Collection from './Collection'

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
    field: string
    owner: IAtomOwner

    current: V
    _next: V | Error | void
    _suggested: V | Error | void

    key: mixed | void
    isComponent: boolean

    _masters: ?Set<IAtomInt> = null
    _slaves: ?Set<IAtomInt> = null
    _context: Context
    _hostAtoms: WeakMap<Object, IAtom<*>> | Map<string, IAtom<*>>
    _keyHash: string | void

    manualReset: boolean

    constructor(
        field: string,
        owner: IAtomOwner,
        context: Context,
        hostAtoms: WeakMap<Object, IAtom<*>> | Map<string, IAtom<*>>,
        manualReset?: boolean,
        key?: mixed,
        keyHash?: string,
        isComponent?: boolean
    ) {
        this._keyHash = keyHash
        this.key = key
        this.field = field
        this.owner = owner
        this.isComponent = isComponent || false
        this.manualReset = manualReset || false
        this._context = context
        this.current = (undefined: any)
        this._next = undefined
        this._suggested = undefined
        this._hostAtoms = hostAtoms
        this.status = ATOM_STATUS_OBSOLETE
    }

    get displayName(): string {
        return this.toString()
    }

    toString() {
        const k = this.key
        const owner = this.owner
        const parent = owner.displayName || owner.constructor.displayName || owner.constructor.name

        return `${String(parent)}.${this.field}`
            + (k
                ? ('(' + (typeof k === 'function' ? (k.displayName || k.name) : String(k)) + ')')
                : ''
            )
    }

    toJSON() {
        return this.current
    }

    destructor(): void {
        if (this.status === ATOM_STATUS_DESTROYED) return
        if (this._masters) {
            this._masters.forEach(deleteSlave, this)
        }
        this._masters = null
        this._checkSlaves()
        this._slaves = null
        this._hostAtoms.delete(((this._keyHash || this.owner): any))
        this._context.destroyHost(this)
        this.current = (undefined: any)
        this._next = undefined
        this._suggested = undefined
        this.status = ATOM_STATUS_DESTROYED
        this._hostAtoms = (undefined: any)
        this.key = undefined
        this._keyHash = undefined
        this._retry = undefined
        this._coll = undefined
    }

    value(next?: V | Error, forceCache?: IAtomForce): V {
        const context = this._context
        let current: V | Error = this.current
        if (forceCache === ATOM_FORCE_CACHE) {
            if (next === undefined) {
                this._suggested = this._next
                this._next = undefined
                this.status = ATOM_STATUS_DEEP_RESET
                if (this._slaves) this._slaves.forEach(obsoleteSlave)
            } else {
                this._push(next)
            }
        } else {
            const slave = context.current
            if (slave && (!slave.isComponent || !this.isComponent)) {
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
                && (normalized = conform(next, this._suggested, this.isComponent)) !== this._suggested
                && (
                    current instanceof Error
                    || (normalized = conform(next, current, this.isComponent)) !== current
                )
            ) {
                this._suggested = this._next = normalized
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
        if (this.status === ATOM_STATUS_DEEP_RESET && !this.isComponent) {
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
            next = (nextRaw: Object)[origId] === undefined ? nextRaw : (nextRaw: Object)[origId]
        } else {
            next = conform(nextRaw, prev, this.isComponent)
            this._suggested = this._next
            this._next = undefined
        }

        if (prev !== next) {
            this.current = (next: any)
            this._context.newValue((this: IAtomInt), prev, next)
            if (this._slaves) this._slaves.forEach(obsoleteSlave)
        }
    }

    notify() {
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

        const context = this._context
        const slave = context.current
        context.current = this
        const f = this.field + '$'
        const next = this._next
        try {
            newValue = this.key === undefined
                ? (this.owner: any)[f](next)
                : (this.owner: any)[f](this.key, next)
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
                this._context.proposeToReap(this)
            }
        }
    }

    _checkSlaves() {
        if (this._slaves) {
            this._slaves.forEach(checkSlave)
        } else {
            this._context.proposeToPull(this)
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
            setFunctionName(fn, `atom(${this.displayName}).retry()`)
            this._retry = fn
        }

        return this._retry
    }

    _coll: Collection<*> | void = undefined

    getCollection<T>(): Collection<T> {
        if (this._coll === undefined) {
            this._coll = new Collection((this: IAtom<any>))
        }

        return this._coll
    }
}
