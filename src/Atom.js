// @flow

import {
    catchedId,
    ATOM_STATUS_DESTROYED,
    ATOM_STATUS_OBSOLETE, ATOM_STATUS_CHECKING, ATOM_STATUS_PULLING, ATOM_STATUS_ACTUAL
} from './interfaces'

import type {
    IAtom,
    IAtomInt,
    IAtomStatus,
    IContext,
    IAtomHandler,
    IAtomOwner
} from './interfaces'

import {createMock, AtomWait} from './utils'
import conform from './conform'

function checkSlave(slave: IAtomInt) {
    slave.check()
}

function obsoleteSlave(slave: IAtomInt) {
    slave.obsolete()
}

function disleadThis(master: IAtomInt) {
    (this: Atom<*>);
    master.dislead(this)
}

function actualizeMaster(master: IAtomInt) {
    (this: Atom<*>);
    if (this.status === ATOM_STATUS_CHECKING) {
        master.actualize()
    }
}
export default class Atom<V> implements IAtom<V>, IAtomInt {
    status: IAtomStatus
    field: string
    owner: IAtomOwner

    value: V | Error | void
    _next: V | Error | void
    _ignore: V | Error | void

    key: mixed | void
    isComponent: boolean

    _masters: ?Set<IAtomInt> = null
    _slaves: ?Set<IAtomInt> = null
    _context: IContext
    _hostAtoms: WeakMap<Object, IAtom<*>> | Map<string, IAtom<*>>
    _keyHash: string | void

    constructor(
        field: string,
        owner: IAtomOwner,
        context: IContext,
        hostAtoms: WeakMap<Object, IAtom<*>> | Map<string, IAtom<*>>,
        key?: mixed,
        keyHash?: string,
        isComponent?: boolean,
    ) {
        this._keyHash = keyHash
        this.key = key
        this.field = field
        this.owner = owner
        this.isComponent = isComponent || false
        this._context = context
        this.value = context.create(this)
        this._next = undefined
        this._ignore = undefined
        this._hostAtoms = hostAtoms
        this.status = this.value === undefined ? ATOM_STATUS_OBSOLETE : ATOM_STATUS_ACTUAL
    }

    get displayName(): string {
        return this.toString()
    }

    toString() {
        const hc = this.owner.constructor
        const k = this.key

        return this.field
            + (k
                ? ('(' + (typeof k === 'function' ? (k.displayName || k.name) : String(k)) + ')')
                : ''
            )
    }

    toJSON() {
        return this.value
    }

    destructor(): void {
        if (this.status === ATOM_STATUS_DESTROYED) return
        if (this._masters) {
            this._masters.forEach(disleadThis, this)
            this._masters = null
        }
        this._checkSlaves()
        this._hostAtoms.delete(((this._keyHash || this.owner): any))
        this._context.destroyHost(this)
        this.value = undefined
        this._next = undefined
        this._ignore = undefined
        this.status = ATOM_STATUS_DESTROYED
        this._hostAtoms = (undefined: any)
        this.key = undefined
        this._keyHash = undefined
    }

    get(force?: boolean): V {
        const slave = this._context.last
        if (slave && (!slave.isComponent || !this.isComponent)) {
            let slaves = this._slaves
            if (!slaves) {
                this._context.unreap(this)
                slaves = this._slaves = new Set()
            }
            slaves.add(slave)
            slave.addMaster(this)
        }

        if (force) {
            this._push(this._pull(true))
        } else {
            this.actualize()
        }

        return (this.value: any)
    }

    set(next: V | Error, force?: boolean): V {
        if (force) return this._push(next)

        let normalized: V | Error = conform(next, this._ignore)
        if (normalized === this._ignore) {
            return (this.value: any)
        }

        normalized = conform(next, this.value)
        if (normalized === this.value) return (this.value: any)

        this._ignore = this._next = normalized
        this.obsolete()
        this.actualize()

        return (this.value: any)
    }

    actualize(): void {
        if (this.status === ATOM_STATUS_PULLING) {
            throw new Error(`Cyclic atom dependency of ${String(this)}`)
        }
        if (this.status === ATOM_STATUS_ACTUAL) return

        if (this.status === ATOM_STATUS_CHECKING) {
            if (this._masters) {
                this._masters.forEach(actualizeMaster, this)
            }

            if (this.status === ATOM_STATUS_CHECKING) {
                this.status = ATOM_STATUS_ACTUAL
            }
        }

        if (this.status !== ATOM_STATUS_ACTUAL) {
            this._push(this._pull())
        }
    }

    _push(nextRaw: V | Error): V {
        this.status = ATOM_STATUS_ACTUAL
        if (!(nextRaw instanceof AtomWait)) {
            this._ignore = this._next
            this._next = undefined
        }
        const prev = this.value
        if (nextRaw === undefined) return (prev: any)
        const next: V | Error = nextRaw instanceof Error
            ? createMock(nextRaw)
            : (prev instanceof Error ? nextRaw : conform(nextRaw, prev))

        if (prev !== next) {
            this.value = next
            this._context.newValue(this, prev, next, true)
            if (this._slaves) {
                this._slaves.forEach(obsoleteSlave)
            }
        }

        return (next: any)
    }

    _pull(force?: boolean): V | Error {
        if (this._masters) {
            this._masters.forEach(disleadThis, this)
        }
        let newValue: V | Error

        this.status = ATOM_STATUS_PULLING

        const context = this._context
        const slave = context.last
        context.last = this
        try {
            newValue = this.key === undefined
                ? (this.owner: any)[this.field + '$'](this._next, force, this.value)
                : (this.owner: any)[this.field + '$'](this.key, this._next, force, this.value)
        } catch (error) {
            if (error[catchedId] === undefined) {
                error[catchedId] = true
                console.error(error.stack || error)
            }
            newValue = error instanceof Error ? error : new Error(error.stack || error)
        }
        context.last = slave

        return newValue
    }

    dislead(slave: IAtomInt) {
        const slaves = this._slaves
        if (slaves) {
            if (slaves.size === 1) {
                this._slaves = null
                this._context.proposeToReap(this)
            } else {
                slaves.delete(slave)
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
}
