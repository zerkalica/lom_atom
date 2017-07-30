// @flow

import {AtomWait, mem, force} from 'lom_atom'

class Counter {
    @mem get value(): number {
        setTimeout(() => {
            this.value = 1
            // this.value = new Error('loading error')
        }, 500)

        throw new AtomWait()
    }

    @mem set value(v: number | Error) {
        if (typeof v === 'string') {
            throw new TypeError('Test error')
        }
    }
}

export function CounterView(
    _: {},
    {counter}: {
        counter: Counter
    }
) {
    return <div>
        <div>
            Count: {counter.value}
        </div>
        <button onClick={() => { counter.value++ }}>Add</button>
        <button onClick={() => { counter.value = ('error': any) }}>Gen error</button>
    </div>
}
CounterView.deps = [{counter: Counter}]
