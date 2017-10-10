// @flow

import {
    catchedId,
    ATOM_STATUS_DESTROYED, ATOM_STATUS_OBSOLETE, ATOM_STATUS_CHECKING, ATOM_STATUS_PULLING, ATOM_STATUS_ACTUAL
} from './interfaces'

import type {
    IAtom,
    INormalize,
    IAtomInt,
    IAtomStatus,
    IContext,
    IAtomHandler,
    IAtomHost
} from './interfaces'

import {defaultNormalize, createMock, AtomWait} from './utils'

function checkSlave(slave: IAtomInt) {
    slave.check()
}

function obsoleteSlave(slave: IAtomInt) {
    slave.obsolete()
}

function disleadThis(master: IAtomInt) {
    master.dislead(this)
}

function actualizeMaster(master: IAtomInt) {
    if (this.status === ATOM_STATUS_CHECKING) {
        master.actualize()
    }
}

export default class Atom<V> implements IAtom<V>, IAtomInt {
    status: IAtomStatus
    field: string
    host: IAtomHost
    value: V | void
    key: mixed | void
    isComponent: boolean

    _masters: ?Set<IAtomInt> = null
    _slaves: ?Set<IAtomInt> = null
    _context: IContext
    _normalize: INormalize<V>

    constructor(
        field: string,
        host: IAtomHost,
        context: IContext,
        normalize?: INormalize<V>,
        key?: mixed,
        isComponent?: boolean
    ) {
        this.key = key
        this.field = field
        this.host = host
        this.isComponent = isComponent || false
        this._normalize = normalize || defaultNormalize
        this._context = context
        this.value = context.create(host, field, key)
        this.status = this.value === undefined ? ATOM_STATUS_OBSOLETE : ATOM_STATUS_ACTUAL
    }

    get displayName(): string {
        return this.toString()
    }

    toString() {
        const hc = this.host.constructor
        const k = this.key

        return (this.host.displayName || (hc ? String(hc.displayName || hc.name) : ''))
            + '.'
            + this.field
            + (k
                ? ('(' + (typeof k === 'function' ? (k.displayName || k.name) : String(k)) + ')')
                : ''
            )
    }

    toJSON() {
        return this.value
    }

    destroyed(isDestroyed?: boolean): boolean {
        if (isDestroyed === undefined) {
            return this.status === ATOM_STATUS_DESTROYED
        }

        if (isDestroyed) {
            if (this.status !== ATOM_STATUS_DESTROYED) {
                if (this._masters) {
                    this._masters.forEach(disleadThis, this)
                    this._masters = null
                }
                this._checkSlaves()
                if (this.host.destroy !== undefined) {
                    this.host.destroy(this.value, this.field, this.key)
                }
                this._context.destroyHost(this)
                this.value = undefined
                this.status = ATOM_STATUS_DESTROYED
            }

            return true
        }

        return false
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
            this._pullPush(undefined, true)
        } else {
            this.actualize()
        }

        return (this.value: any)
    }

    set(v: V | Error, force?: boolean): V {
        let oldValue = this.value
        const normalized: V = this._normalize((v: any), oldValue)
        if (oldValue === normalized) {
            return normalized
        }
        if (normalized === undefined) {
            return (oldValue: any)
        }
        if (force || normalized instanceof Error) {
            this.status = ATOM_STATUS_ACTUAL

            this.value = normalized instanceof Error
                ? createMock(normalized)
                : normalized

            this._context.newValue(this, oldValue, normalized)
            if (this._slaves) {
                this._slaves.forEach(obsoleteSlave)
            }
        } else {
            this.obsolete()
            this.actualize(normalized)
        }

        return (this.value: any)
    }

    actualize(proposedValue?: V): void {
        if (this.status === ATOM_STATUS_PULLING) {
            throw new Error(`Cyclic atom dependency of ${String(this)}`)
        }
        if (this.status === ATOM_STATUS_ACTUAL) {
            return
        }

        if (this.status === ATOM_STATUS_CHECKING) {
            if (this._masters) {
                this._masters.forEach(actualizeMaster, this)
            }

            if (this.status === ATOM_STATUS_CHECKING) {
                this.status = ATOM_STATUS_ACTUAL
            }
        }

        if (this.status !== ATOM_STATUS_ACTUAL) {
            this._pullPush(proposedValue)
        }
    }

    _pullPush(proposedValue?: V, force?: boolean): void {
        if (this._masters) {
            this._masters.forEach(disleadThis, this)
        }
        let newValue: V

        this.status = ATOM_STATUS_PULLING

        const context = this._context
        const slave = context.last
        context.last = this
        const value = this.value
        try {
            newValue = this._normalize(
                this.key === undefined
                    ? (this.host: any)[this.field + '$'](proposedValue, force, value)
                    : (this.host: any)[this.field + '$'](this.key, proposedValue, force, value),
                value
            )
        } catch (error) {
            if (error[catchedId] === undefined) {
                error[catchedId] = true
                console.error(error.stack || error)
            }
            newValue = createMock(error)
        }

        context.last = slave

        this.status = ATOM_STATUS_ACTUAL

        if (newValue !== undefined && value !== newValue) {
            this.value = newValue
            this._context.newValue(this, value, newValue, true)
            if (this._slaves) {
                this._slaves.forEach(obsoleteSlave)
            }
        }
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
