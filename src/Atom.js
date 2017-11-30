// @flow

import {
    catchedId,
    origId,
    ATOM_STATUS_DESTROYED,
    ATOM_STATUS_DEEP_RESET,
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

import {AtomWait} from './utils'
import conform from './conform'

const throwOnAccess = {
    get<V: Object>(target: Error, key: string): V {
        if (key === origId) return (target: Object).valueOf()
        throw target.valueOf()
    },
    ownKeys(target: Error): string[] {
        throw target.valueOf()
    }
}


function checkSlave(slave: IAtomInt) {
    slave.check()
}

function obsoleteSlave(slave: IAtomInt) {
    slave.obsolete()
}

function disleadThis(master: IAtomInt) {
    master.dislead((this: IAtomInt))
}

function actualizeMaster(master: IAtomInt) {
    if ((this: IAtom<*>).status === ATOM_STATUS_CHECKING) {
        master.actualize()
    }
}
export default class Atom<V> implements IAtom<V>, IAtomInt {
    status: IAtomStatus
    field: string
    owner: IAtomOwner

    current: V | Error | void
    _next: V | Error | void
    _suggested: V | Error | void

    key: mixed | void
    isComponent: boolean

    _masters: ?Set<IAtomInt> = null
    _slaves: ?Set<IAtomInt> = null
    _context: IContext
    _hostAtoms: WeakMap<Object, IAtom<*>> | Map<string, IAtom<*>>
    _keyHash: string | void

    manualReset: boolean

    constructor(
        field: string,
        owner: IAtomOwner,
        context: IContext,
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
        this.current = undefined
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
            this._masters.forEach(disleadThis, this)
            this._masters = null
        }
        this._checkSlaves()
        this._hostAtoms.delete(((this._keyHash || this.owner): any))
        this._context.destroyHost(this)
        this.current = undefined
        this._next = undefined
        this._suggested = undefined
        this.status = ATOM_STATUS_DESTROYED
        this._hostAtoms = (undefined: any)
        this.key = undefined
        this._keyHash = undefined
    }

    reset() {
        this._suggested = this._next
        this._next = undefined
        this.status = ATOM_STATUS_DEEP_RESET
    }

    value(next?: V | Error, forceCache?: boolean): V {
        const context = this._context
        if (forceCache === true) {
            if (next === undefined) {
                this.reset()
                if (this._slaves) {
                    this._slaves.forEach(obsoleteSlave)
                }
            } else {
                this._push(next)
            }
        } else {
            const slave = context.current
            if (slave && (!slave.isComponent || !this.isComponent)) {
                let slaves = this._slaves
                if (!slaves) {
                    context.unreap(this)
                    slaves = this._slaves = new Set()
                }
                slaves.add(slave)
                slave.addMaster(this)
            }

            let normalized: V | Error
            if (
                next !== undefined
                && (normalized = conform(next, this._suggested, this.isComponent)) !== this._suggested
                && (
                    this.current instanceof Error
                    || (normalized = conform(next, this.current, this.isComponent)) !== this.current
                )
            ) {
                this._suggested = this._next = normalized
                this.status = ATOM_STATUS_DEEP_RESET
            }
            this.actualize()
        }

        return (this.current: any)
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
            this._push(this._pull())
            Atom.deepReset = deepReset
        } else if (deepReset !== undefined && !this.manualReset && !deepReset.has(this)) {
            deepReset.add(this)
            this._push(this._pull())
        } else if (this.status !== ATOM_STATUS_ACTUAL) {
            this._push(this._pull())
        }
    }

    _push(nextRaw: V | Error): void {
        if (!(nextRaw instanceof AtomWait)) {
            this._suggested = this._next
            this._next = undefined
        }
        this.status = ATOM_STATUS_ACTUAL
        const prev = this.current
        const next: V | Error = nextRaw instanceof Error
            ? new Proxy(nextRaw, throwOnAccess)
            : conform(nextRaw, prev, this.isComponent)

        if (prev !== next) {
            this.current = next
            this._context.newValue(this, prev, next)
            if (this._slaves) {
                this._slaves.forEach(obsoleteSlave)
            }
        }
    }

    _pull(): V | Error {
        if (this._masters) {
            this._masters.forEach(disleadThis, this)
        }
        let newValue: V | Error

        this.status = ATOM_STATUS_PULLING

        const context = this._context
        const slave = context.current
        context.current = this
        try {
            newValue = this.key === undefined
                ? (this.owner: any)[this.field + '$'](this._next)
                : (this.owner: any)[this.field + '$'](this.key, this._next)
        } catch (error) {
            if (error[catchedId] === undefined) {
                error[catchedId] = true
                console.error(error.stack || error)
            }
            newValue = error instanceof Error
                ? error
                : new Error(error.stack || error)
        }
        context.current = slave

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
        // if (master.manualReset) this.manualReset = true
        this._masters.add(master)
    }
}
