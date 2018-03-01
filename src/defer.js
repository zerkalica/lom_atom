// @flow

const scheduleNative: (handler: () => void) => mixed = typeof requestAnimationFrame === 'function'
    ? (handler: () => void) => requestAnimationFrame(handler)
    : (handler: () => void) => setTimeout(handler, 16)

class Defer {
    static schedule = scheduleNative
    _queue: (() => void)[] = []
    add = (handler: () => void) => {
        if (this._queue.length === 0) this.constructor.schedule(this.rewind)
        this._queue.push(handler)
    }

    rewind = () => {
        const queue = this._queue
        for (let i = 0; i < queue.length; i++) {
            queue[i]()
        }
        this._queue = []
    }
}

const defer = new Defer()

export default defer
