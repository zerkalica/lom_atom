// @flow

import {catchedId} from './interfaces'
import type {IHooks} from './interfaces'

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
    name = 'AtomWait'

    constructor(message?: string = 'Wait...') {
        super(message)
        // $FlowFixMe new.target
        ;(this: Object)['__proto__'] = new.target.prototype
        ;(this: Object)[catchedId] = true
    }
}


export function shouldUpdate<Props: Object>(oldProps: Props, props: Props): boolean {
    if (oldProps === props) {
        return false
    }
    if ((!oldProps && props) || (!props && oldProps)) {
        return true
    }

    let lpKeys = 0
    for (let k in oldProps) { // eslint-disable-line
        if (oldProps[k] !== props[k]) {
            return true
        }
        lpKeys++
    }
    for (let k in props) { // eslint-disable-line
        lpKeys--
    }

    return lpKeys !== 0
}

export function defaultHooksFromComponent<Props: Object, Context>(
    component: Function
): ?IHooks<Props, Context> {
    if (component.hooks) {
        return new (component: any).hooks()
    }

    return null
}
