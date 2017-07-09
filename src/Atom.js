// @flow

import {catchedId, ATOM_STATUS} from './interfaces'

import type {
    IAtom,
    IAtomInt,
    IAtomStatus,
    IContext,
    IAtomHandler
} from './interfaces'

import Context from './Context'
import {defaultNormalize, createMock, AtomWait} from './utils'

const defaultContext = new Context()

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
    field: string

    _masters: ?Set<IAtomInt> = null
    _slaves: ?Set<IAtomInt> = null
    _handler: IAtomHandler<V>
    _context: IContext
    _cached: V | void = undefined
    _normalize: (nv: V, old?: V) => V

    constructor(
        field: string,
        handler: IAtomHandler<V>,
        context?: IContext = defaultContext,
        normalize?: (nv: V, old?: V) => V = defaultNormalize
    ) {
        this.field = field
        this._normalize = normalize
        this._handler = handler
        this._context = context
    }

    destroyed(isDestroyed?: boolean): boolean {
        if (isDestroyed === undefined) {
            return this.status === ATOM_STATUS.DESTROYED
        }

        if (isDestroyed) {
            if (this.status !== ATOM_STATUS.DESTROYED) {
                if (this._slaves) {
                    return false
                }
                if (this._masters) {
                    this._masters.forEach(disleadThis, this)
                }
                this._checkSlaves()
                this._cached = undefined
                this.status = ATOM_STATUS.DESTROYED
            }

            return true
        }

        this.status = ATOM_STATUS.OBSOLETE

        return false
    }

    get(force?: boolean): V {
        const slave = this._context.last
        if (slave) {
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

        return (this._cached: any)
    }

    set(v: V, force?: boolean): V {
        const normalized: V = this._normalize(v, this._cached)
        if (this._cached === normalized) {
            return normalized
        }
        if (normalized === undefined) {
            return this._cached
        }

        if (force) {
            this.status = ATOM_STATUS.ACTUAL
            this._cached = normalized
            if (this._slaves) {
                this._slaves.forEach(obsoleteSlave)
            }
        } else {
            this.obsolete()
            this.actualize(normalized)
        }

        return this._cached
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
                this._handler(proposedValue, force),
                this._cached
            )
        } catch (error) {
            if (error[catchedId] === undefined) {
                if (!(error instanceof AtomWait)) {
                    console.error(error.stack || error)
                }
                error[catchedId] = true
            }
            newValue = createMock(error)
        }
        context.last = slave

        this.status = ATOM_STATUS.ACTUAL

        if (newValue !== undefined && this._cached !== newValue) {
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
            // top level atom
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
}
