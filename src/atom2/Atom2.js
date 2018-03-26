// @flow
import Fiber, {fiberWait, FiberWait} from './Fiber'
import type {FiberResult} from './Fiber'
import conform from '../conform'
import defer from '../defer'
import owning from './owning'
declare function requestIdleCallback(handler: () => any ): number

export type IAtomStatus = 'obsolete' | 'check' | 'compute' | 'actual'

class SyncerFiber extends Fiber<void> {
    _syncer: {+handler: () => FiberResult<void>}

    constructor(syncer: {+handler: () => FiberResult<void>}) {
        super()
        this._syncer = syncer
    }

    handler(): FiberResult<void> {
        return this._syncer.handler()
    }
}

class Syncer {
    _roots: Set<Atom2<*, *>> = new Set()
    _free: Set<Atom2<*, *>> = new Set()
    _scheduled = false

    static _defaultResult: FiberResult<void> = {value: undefined, throwable: false}

    sync = () => {
        const fiber = Fiber.current
        this._scheduled = false
        return ((fiber && fiber.master) || new SyncerFiber(this)).start()
    }

    free(atom: Atom2<*, *>) {
        this._free.add(atom)
        if (this._scheduled) return
        this._scheduled = true
        defer.add(this.sync)
    }

    root(atom: Atom2<*, *>) {
        this._roots.add(atom)
        if (this._scheduled) return
        this._scheduled = true
        defer.add(this.sync)
    }

    handler() {
        const {_roots: roots, _free: free} = this
        for (let atom of roots) {
            const value = atom.evaluate()
            if (value.throwable) return (value: any)
            roots.delete(atom)
        }

        for (let atom of free) atom.reap()
        this._free = new Set()

        return Syncer._defaultResult
    }
}

class AtomFiber<Value, Next> extends Fiber<Value> {
    owner: Atom2<Value, Next>
    _next: Next | void

    constructor(owner: Atom2<Value, Next>, next?: Next) {
        super()
        this.owner = owner
        this._next = next
    }

    handle(): FiberResult<Value> {
        return this.owner.handle(this._next)
    }
}

export class Atom2<Value = any, Next = Value> {
    id: string
    calculate: (next?: Next) => Value
    dispose: ?(() => void)

    status: IAtomStatus = 'obsolete'
    pulling: ?Fiber<Value>

    value: Value | void = undefined
    error: Error | void = undefined

    masters: Set<Atom2<*, *>> = new Set()
    slaves: Set<Atom2<*, *>> = new Set()

    static Fiber: Class<AtomFiber<*, *>> = AtomFiber
    static syncer = new Syncer()

    constructor(
        id: string,
        calculate: (next?: Next) => Value,
        dispose?: () => void,
    ) {
        this.id = id
        this.calculate = calculate
        this.dispose = dispose
    }

    destructor() {
        this.status = 'obsolete'
        const prev = this.value
        if (owning.check(this, prev)) (prev: any).destructor()
        this.value = undefined
        this.error = undefined

        if (this.pulling) {
            this.pulling.destructor()
            this.pulling = null
        }

        for (let master of this.masters) master.dislead(this)
        this.masters = (null: any)

        if (this.dispose) this.dispose()
    }

    evaluate(next?: Next): FiberResult<Value> {
        const {Fiber} = this.constructor
        const fiber = Fiber.current
        return ((fiber && fiber.master) || new Fiber(this, next)).start()
    }

    handle(next?: Next): FiberResult<Value> {
        return next === undefined ? this.pull() : this.put(next)
    }

    _conform<Target, Source>(target: Target, source: Source): Target {
        return conform(target, source)
    }

    push(next: Value): FiberResult<Value> {
        const status = this.status
        this.error = undefined
        this.status = 'actual'
        const prev = this.value

        const value = this._conform(next, prev)
        if (value === prev) return this

        // $mol_log(this , prev , '➔' , value )

        this.value = value
        for (let slave of this.slaves) {
            if (slave.status !== 'compute' || status === 'actual') slave.obsolete()
        }

        if (owning.check(this, prev)) (prev: any).destructor()
        this.notify()

        return this
    }

    track() {
        let fiber = this.constructor.Fiber.current
        let slave
        while (fiber = fiber.slave) {
            if (fiber instanceof AtomFiber && (slave = fiber.owner)) {
                this.lead(slave)
                slave.obey(this)
                break
            }
        }
    }

    pull(): FiberResult<Value> {
        if (!this.pulling) {
            this.track()
            if (this.status === 'actual') return this
            this.pulling = Fiber.current
        }

        check:
            if (this.status === 'check') {
                for (let master of this.masters) {
                    const value = master.evaluate()
                    if (value.error === fiberWait) return ((value: any): FiberResult<Value>)
                    if (value.error !== undefined || this.status !== 'check') break check
                }
                this.status = 'actual'
                return this
            }

        if (this.status !== 'compute') {
            for (let master of this.masters) master.dislead(this)
            this.masters = new Set()
            this.status = 'compute'
        }

        try {
            const res = this.calculate()
            owning.catch(this, res)
            this.push(res)
        } catch(error) {
            this.notify()
            if (error === fiberWait) return {error}

            this.error = error
            const status = this.status
            this.status = 'actual'
            this.pulling = null
            for (let slave of this.slaves) {
                if (slave.status !== 'compute' || status === 'actual') slave.obsolete()
            }
        }

        return this
    }

    notify(): void {}

    put(next: Next): FiberResult<Value> {
        const conformed = this._conform(next, this.value)
        if (conformed === this.value) return this

        try {
            const res = this.calculate(next)
            this.push(res)
            return this
        } catch(error) {
            this.notify()
            return {error}
        }
    }

    obsolete() {
        const status = this.status
        if (status === 'obsolete' || status === 'compute') return
        this.status = 'obsolete'
        if (status === 'check') return

        if (this.pulling) {
            this.pulling.destructor()
            this.pulling = null
        }

        this.restart()
    }

    check() {
        if(this.status !== 'actual' ) return
        this.status = 'check'

        this.restart()
    }

    restart() {
        const slaves = this.slaves
        if(slaves.size) {
            for (let slave of slaves) slave.check()
        } else {
            this.constructor.syncer.root((this: any))
        }
    }

    reap() {
        if(this.slaves.size === 0 && this.masters !== null) {
            // $mol_log(this , 'reap' )
            this.destructor()
        }
    }

    lead(slave: Atom2<*, *>) {
        this.slaves.add(slave )
    }

    obey(master: Atom2<*, *>) {
        this.masters.add(master)
    }

    dislead(slave: Atom2<*, *>) {
        this.slaves.delete(slave)
        if (!this.slaves.size) this.constructor.syncer.free((this: any))
    }


    disobey(master: Atom2<*, *>) {
        this.masters.delete(master)
    }

    disobey_all() {
        for (let master of this.masters) master.dislead(this)
    }
}
