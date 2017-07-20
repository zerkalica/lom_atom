// @flow

import {catchedId, ATOM_STATUS} from './interfaces'

import type {
    IAtom,
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
    if (this.status === ATOM_STATUS.CHECKING) {
        master.actualize()
    }
}

export default class Atom<V> implements IAtom<V>, IAtomInt {
    status: IAtomStatus = ATOM_STATUS.OBSOLETE
    field: string | Function
    isComponent: boolean
    _masters: ?Set<IAtomInt> = null
    _slaves: ?Set<IAtomInt> = null
    _context: IContext
    _cached: V | void = undefined
    _normalize: (nv: V, old?: V) => V

    _handler: IAtomHandler<V>
    _host: IAtomHost | void

    constructor(
        field: string | Function,
        handler: IAtomHandler<V>,
        host?: IAtomHost,
        isComponent?: boolean,
        context: IContext,
        normalize?: (nv: V, old?: V) => V
    ) {
        this.field = field
        this._handler = handler
        this._host = host
        this.isComponent = isComponent || false
        this._normalize = normalize || defaultNormalize
        this._context = context
    }

    destroyed(isDestroyed?: boolean): boolean {
        if (isDestroyed === undefined) {
            return this.status === ATOM_STATUS.DESTROYED
        }

        if (isDestroyed) {
            if (this.status !== ATOM_STATUS.DESTROYED) {
                // console.log('destroy', this.field)
                if (this._masters) {
                    this._masters.forEach(disleadThis, this)
                    this._masters = null
                }
                this._checkSlaves()
                this._cached = undefined
                this.status = ATOM_STATUS.DESTROYED
                const host = this._host
                if (host !== undefined) {
                    this._context.destroyHost(host, this.field)
                }
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

        return (this._cached: any)
    }

    set(v: V | Error, force?: boolean): V {
        const normalized: V = this._normalize((v: any), this._cached)

        if (this._cached === normalized) {
            return normalized
        }
        if (normalized === undefined) {
            return this._cached
        }

        // console.log('set', this.field, 'value', normalized)

        if (force || this._context.force || normalized instanceof Error) {
            this._context.force = false
            this.status = ATOM_STATUS.ACTUAL
            this._context.newValue(this, this._cached, normalized)
            this._cached = normalized instanceof Error
                ? createMock(normalized)
                : normalized
            if (this._slaves) {
                this._slaves.forEach(obsoleteSlave)
            }
        } else {
            this.obsolete()
            this.actualize(normalized)
        }

        return (this._cached: any)
    }

    actualize(proposedValue?: V): void {
        if (this.status === ATOM_STATUS.ACTUAL) {
            return
        }

        if (this.status === ATOM_STATUS.CHECKING) {
            if (this._masters) {
                this._masters.forEach(actualizeMaster, this)
            }

            if (this.status === ATOM_STATUS.CHECKING) {
                this.status = ATOM_STATUS.ACTUAL
            }
        }

        if (this.status !== ATOM_STATUS.ACTUAL) {
            this._pullPush(proposedValue)
        }
    }

    _pullPush(proposedValue?: V, force?: boolean): void {
        if (this._masters) {
            this._masters.forEach(disleadThis, this)
        }
        let newValue: V

        this.status = ATOM_STATUS.PULLING

        const context = this._context
        const slave = context.last
        context.last = this
        try {
            newValue = this._normalize(
                this._host === undefined
                    ? this._handler(proposedValue, force)
                    : this._handler.call(this._host, proposedValue, force),
                this._cached
            )
        } catch (error) {
            if (error[catchedId] === undefined) {
                error[catchedId] = true
                console.error(error.stack || error)
            }
            newValue = createMock(error)
        }

        context.last = slave

        this.status = ATOM_STATUS.ACTUAL

        if (newValue !== undefined && this._cached !== newValue) {
            this._context.newValue(this, this._cached, newValue)
            this._cached = newValue
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
        if (this.status === ATOM_STATUS.ACTUAL) {
            this.status = ATOM_STATUS.CHECKING
            this._checkSlaves()
        }
    }

    obsolete() {
        if (this.status !== ATOM_STATUS.OBSOLETE) {
            this.status = ATOM_STATUS.OBSOLETE
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
