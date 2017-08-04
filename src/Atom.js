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
    status: IAtomStatus = ATOM_STATUS_OBSOLETE
    field: string
    key: mixed | void
    host: IAtomHost
    cached: V | void = undefined
    isComponent: boolean

    _masters: ?Set<IAtomInt> = null
    _slaves: ?Set<IAtomInt> = null
    _context: IContext
    _normalize: INormalize<V>


    constructor(
        field: string,
        host: IAtomHost,
        context: IContext,
        key?: mixed,
        normalize?: INormalize<V>,
        isComponent?: boolean
    ) {
        this.field = field
        this.key = key
        this.host = host
        this.isComponent = isComponent || false
        this._normalize = normalize || defaultNormalize
        this._context = context
    }

    destroyed(isDestroyed?: boolean): boolean {
        if (isDestroyed === undefined) {
            return this.status === ATOM_STATUS_DESTROYED
        }

        if (isDestroyed) {
            if (this.status !== ATOM_STATUS_DESTROYED) {
                // console.log('destroy', this.field)
                if (this._masters) {
                    this._masters.forEach(disleadThis, this)
                    this._masters = null
                }
                this._checkSlaves()
                const host = this.host
                if (host !== undefined) {
                    this._context.destroyHost(this)
                }
                this.cached = undefined
                this.status = ATOM_STATUS_DESTROYED
                this.key = undefined
            }

            return true
        }

        return false
    }

    get(force?: boolean): V {
        if (force || this._context.force) {
            this._context.force = false
            this._pullPush(undefined, true)
        } else {
            this.actualize()
        }

        const slave = this._context.last
        if (slave && (!slave.isComponent || !this.isComponent)) {
            let slaves = this._slaves
            if (!slaves) {
                // console.log('unreap', this.field)
                this._context.unreap(this)
                slaves = this._slaves = new Set()
            }
            // console.log('add slave', slave.field, 'to master', this.field)
            slaves.add(slave)
            slave.addMaster(this)
        }

        return (this.cached: any)
    }

    set(v: V | Error, force?: boolean): V {
        const normalized: V = this._normalize((v: any), this.cached)

        if (this.cached === normalized) {
            return normalized
        }
        if (normalized === undefined) {
            return this.cached
        }

        // console.log('set', this.field, 'value', normalized)

        if (force || this._context.force || normalized instanceof Error) {
            this._context.force = false
            this.status = ATOM_STATUS_ACTUAL
            this._context.newValue(this, this.cached, normalized)
            this.cached = normalized instanceof Error
                ? createMock(normalized)
                : normalized
            if (this._slaves) {
                this._slaves.forEach(obsoleteSlave)
            }
        } else {
            this.obsolete()
            this.actualize(normalized)
        }

        return (this.cached: any)
    }

    actualize(proposedValue?: V): void {
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
        try {
            newValue = this._normalize(
                this.key === undefined
                    ? (this.host: any)[this.field](proposedValue, force, this.cached)
                    : (this.host: any)[this.field](this.key, proposedValue, force, this.cached),
                this.cached
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

        if (newValue !== undefined && this.cached !== newValue) {
            this._context.newValue(this, this.cached, newValue)
            this.cached = newValue
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
                // console.log('reap (slaves === null)', this.field)
                this._context.proposeToReap(this)
            } else {
                // console.log('delete slave', slave.field, 'from', this.field)
                slaves.delete(slave)
            }
        }
    }

    _checkSlaves() {
        if (this._slaves) {
            this._slaves.forEach(checkSlave)
        } else {
            // console.log('pull', this.field)
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

    value(next?: V | Error, force?: boolean): V {
        return next === undefined
            ? this.get(force)
            : this.set(next, force)
    }
}
