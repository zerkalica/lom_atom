// @flow

import {catchedId} from './interfaces'

const throwOnAccess = {
    get(target: Error) {
        throw target.valueOf()
    },
    ownKeys(target: Error) {
        throw target.valueOf()
    }
}

export function createMock(error: Error): any {
    return new Proxy(error, throwOnAccess)
}

export function defaultNormalize<V>(next: V, prev?: V): V {
    if(next === prev) return next

    if(
        (next instanceof Array)
        && (prev instanceof Array)
        && (next.length === prev.length)
    ) {
        for(let i = 0; i < next.length; i++) {
            if(next[i] !== prev[i]) {
                return next
            }
        }

        return prev
    }

    return next
}

export class AtomWait extends Error {
    constructor(message?: string = 'Wait...') {
        super(message)
        // $FlowFixMe new.target
        ;(this: Object)['__proto__'] = new.target.prototype
        ;(this: Object)[catchedId] = true
    }
}
