// @flow

import {catchedId} from './interfaces'

const throwOnAccess = {
    get<V: Object>(target: Error): V {
        throw target.valueOf()
    },
    ownKeys(target: Error) {
        throw target.valueOf()
    }
}

export function createMock(error: Error): any {
    return new Proxy(error, throwOnAccess)
}

export class AtomWait extends Error {
    constructor(message?: string = 'Wait...') {
        super(message)
        // $FlowFixMe new.target
        ;(this: Object)['__proto__'] = new.target.prototype
        ;(this: Object)[catchedId] = true
    }
}
