// @flow
import {proxify} from '../utils'

export class FiberWait {}

export const fiberWait = new FiberWait()

export type FiberResult<Value> = {
    +value?: Value;
    +error?: Error | FiberWait;
    +throwable?: boolean;
}

interface IStartable {
    start(): FiberResult<any>;
}

class FiberScheduler {
    quant = 8
    scheduled: ?mixed = null
    deadline = 0
    queue: IStartable[] = []
    index = 0

    tick = () => {
        this.scheduled = null
        this.deadline = Date.now() + this.quant
        const queue = this.queue
        for (let i = this.index; i < queue.length; i++) {
            if(queue[i].start().throwable) {
                this.index = i + 1
                return
            }
        }
        this.index = 0
        this.queue = []
    }

    schedule(fiber: IStartable) {
        this.queue.push(fiber)
        if(!this.scheduled) this.scheduled = requestIdleCallback(this.tick)
    }

    warp() {
        while (this.queue.length) {
            this.tick()
        }
    }
}

export default class Fiber<Value> {
    static current: Fiber<*>
    static scheduler = new FiberScheduler()

    masters: Fiber<*>[] = []

    cursor = -1

    abort: void | () => void

    value: Value | void = undefined
    error: Error | FiberWait | void = undefined
    throwable: boolean = false

    slave: Fiber<any>

    constructor() {
        const {current} = this.constructor
        if (current) current.master = this
        this.slave = current
    }

    destructor() {
        if (!this.masters) return
        for (let master of this.masters) master.destructor()
        this.masters = (undefined: any)

        if (this.abort) this.abort()
    }

    schedule() {
        if (this.masters) return this.constructor.scheduler.schedule(this)
        console.error('Debug error: shedule for destroyed atom')
    }

    complete() {
        this.abort = undefined
        this.destructor()
        if (this.slave && this.constructor.current) {
            this.slave.schedule()
        }
    }

    limit(): boolean {
        const {scheduler, current} = this.constructor
        if (Date.now() <= scheduler.deadline) return false

        if (!current && scheduler.queue.length === 0) {
            scheduler.deadline = Date.now() + scheduler.quant
            return false
        }

        this.schedule()

        return true
    }

    handler(): FiberResult<Value> {
        throw new Error('Implement')
    }

    start(): FiberResult<Value> {
        const context = this.constructor
        const slave = context.current
        if (slave) slave.step()

        if (!this.masters) return this

        this.cursor = 0
        if (this.limit()) {
            this.error = fiberWait
            this.value = undefined
            this.throwable = !!slave

            return this
        }

        context.current = this
        const result = this.handler()
        context.current = slave

        if (result.value !== undefined) {
            this.done(result.value)
        } else if (result.error === fiberWait) {
            this.error = result.error
            this.value = undefined
            this.throwable = !!slave
        } else {
            this.fail((result.error: any))
        }

        return this
    }

    done(value: Value) {
        this.error = undefined
        this.value = value
        this.throwable = false
        this.complete()
    }

    fail(error?: Error) {
        this.error = error
        this.value = undefined
        this.throwable = true
        this.complete()
    }

    step() {
        this.cursor++
    }

    get master(): Fiber<*> {
        return this.masters[this.cursor]
    }

    set master(next: Fiber<*>) {
        this.masters[this.cursor] = next
    }

    toString() {
        const slave = this.slave
        if (!slave) return ''
        return slave.toString() + '/' + slave.masters.indexOf(this)
    }
}

export type CancellablePromise<T> = Promise<T> & { +cancel?: () => void }

class AsyncFiber<Next> extends Fiber<Next> {
    calculate: () => CancellablePromise<Next>

    constructor(calculate: () => CancellablePromise<Next>) {
        super()
        this.calculate = calculate
    }

    handler(): FiberResult<Next> {
        try {
            const promise = this.calculate()

            promise
                .then((value) => this.done(value))
                .catch((error) => this.fail(error))

            if (typeof promise.cancel === 'function') this.abort = () => (promise: any).cancel()
        } catch (error) {
            return {error}
        }

        return {error: fiberWait}
    }


    run(): Next {
        const result = this.start()
        if (result.error === fiberWait) return proxify(((result: any): Next))
        if (result.error) throw result.error
        return ((result.value: any): Next)
    }

    static make(calculate: () => CancellablePromise<Next>): Next {
        const {current} = this.constructor
        return ((current && current.master) || new AsyncFiber(calculate)).run()
    }
}
