// @flow

import {AtomWait, mem, force} from 'lom-atom'

export class Counter {
    @mem get value(): number {
        setTimeout(() => {
            this.value = force(42)
        }, 500)

        throw new AtomWait()
    }

    @mem set value(v: number) {
        if (typeof v === 'string') {
            throw new TypeError('Test error')
        }
    }
}

export function CounterView({counter}: {
    counter: Counter
}) {
    return <div>
        <div>
            Count: {counter.value}
        </div>
        <button onClick={() => { counter.value++ }}>Add</button>
        <button onClick={() => { counter.value = ('error': any) }}>Gen error</button>
    </div>
}
