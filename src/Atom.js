// @flow

import {catchedId, ATOM_STATUS} from './interfaces'

import type {
    IAtom,
    IAtomInt,
    IAtomForce,
    IAtomStatus,
    IContext,
    IAtomHandler
} from './interfaces'

import SimpleSet from './SimpleSet'
import Context from './Context'
import {defaultNormalize, createMock, AtomWait} from './utils'

const defaultContext = new Context()

export default class Atom<V> implements IAtom<V>, IAtomInt {
    status: IAtomStatus = ATOM_STATUS.OBSOLETE
    id: number

    _masters: ?SimpleSet<IAtomInt> = null
    _slaves: ?SimpleSet<IAtomInt> = null

    _autoFresh: boolean = true
    _handler: IAtomHandler<V>
    _context: IContext

    _cached: V | void = undefined
    _isDestroyed: boolean = false
    _normalize: (nv: V, old?: V) => V

    constructor(
        handler: IAtomHandler<V>,
        context?: IContext = defaultContext,
        normalize?: (nv: V, old?: V) => V = defaultNormalize
    ) {
        this._normalize = normalize
        this.id = ++context.lastId
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
                this._disleadAll()
                this._notifySlaves()
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
                slaves = this._slaves = new SimpleSet()
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
            this._obsoleteSlaves()
        } else {
            this.obsolete()
            this.actualize(normalized)
        }

        return this._cached
    }

    _disleadAll() {
        if (this._masters) {
            const {items, from} = this._masters
            this._masters = null
            for (let i = from; i < items.length; i++) {
                const master = items[i]
                if (master !== undefined) {
                    master.dislead(this)
                }
            }
        }
    }

    actualize(proposedValue?: V): void {
        if (this.status === ATOM_STATUS.ACTUAL) {
            return
        }

        if (this.status === ATOM_STATUS.CHECKING) {
            if (this._masters) {
                const {items, from} = this._masters
                for (let i = from; i < items.length; i++) {
                    if (this.status !== ATOM_STATUS.CHECKING) {
                        break
                    }
                    const master = items[i]
                    if (master !== undefined) {
                        master.actualize()
                    }
                }
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
        this._disleadAll()
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
            this._obsoleteSlaves()
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

    check() {
        if (this.status === ATOM_STATUS.ACTUAL) {
            this.status = ATOM_STATUS.CHECKING
            this._notifySlaves()
        }
    }

    obsolete() {
        if (this.status !== ATOM_STATUS.OBSOLETE) {
            this.status = ATOM_STATUS.OBSOLETE
            this._notifySlaves()
        }
    }

    _obsoleteSlaves() {
        if (this._slaves) {
            const {items, from} = this._slaves
            for (let i = from; i < items.length; i++) {
                const slave = items[i]
                if (slave !== undefined) {
                    slave.obsolete()
                }
            }
        }
    }

    _notifySlaves() {
        if (this._slaves) {
            const {items, from} = this._slaves

            for (let i = from; i < items.length; i++) {
                const slave = items[i]
                if (slave !== undefined) {
                    slave.check()
                }
            }
        } else if (this._autoFresh) {
            // top level atom
            this._context.proposeToPull(this)
        }
    }

    addMaster(master: IAtomInt) {
        if (!this._masters) {
            this._masters = new SimpleSet()
            const context = this._context
        }
        this._masters.add(master)
    }
}
