// @flow

import {AtomWait, mem, force} from 'lom-atom'

export class Counter {
    @force $: Counter

    @mem get value(): number {
        return 1
        // setTimeout(() => {
        //     this.$.value = 1
        // }, 500)
        //
        // throw new AtomWait()
    }

    @mem set value(v: number | Error) {}
}

export function CounterView({counter}: {
    counter: Counter
}) {
    return <div>
        <div>
            Count: {counter.value}
        </div>
        <button onClick={() => { counter.value++ }}>Add</button>
    </div>
}
