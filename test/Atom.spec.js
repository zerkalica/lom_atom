// @flow
/* eslint-env mocha */

import assert from 'assert'
import Atom from '../src/Atom'
import {AtomWait} from '../src/utils'
import {defaultContext} from '../src/Context'
import {IAtom, ATOM_STATUS_OBSOLETE, ATOM_STATUS_ACTUAL} from '../src/interfaces'
import {catchedId} from '../src/utils'

describe('Atom', () => {
    function atom<V>(key: string, fn: (v?: V) => V): IAtom<V> {
        return new Atom(key, fn)
    }

    function sync() {
        defaultContext.sync()
    }

    it('caching', () => {
        let random = atom('random', () => Math.random())

        assert(random.value() === random.value())
    })

    it('lazyness', () => {
        let value = 0
        const prop = atom('prop', () => value = 1)
        sync()

        assert(value === 0)
    })

    it('instant actualization', () => {
        let source = atom('source', (next?: number) => next || 1)
        let middle = atom('middle', () => source.value() + 1)
        let target = atom('target', () => middle.value() + 1)
        assert(target.value() === 3)
        source.value(2)
        assert(target.value() === 4)
    })

    it('do not actualize when masters not changed', () => {
        let targetUpdates = 0

        let source = atom('source', (next? : number) => next || 1)
        let middle = atom('middle', () => Math.abs(source.value()))
        let target = atom('target', () => {
            ++ targetUpdates
            return middle.value()
        })

        target.value()
        assert(targetUpdates === 1)

        source.value(-1)
        target.value()

        assert(targetUpdates === 1)
    })

    it('obsolete atoms actualized in initial order', () => {

        let actualizations = ''

        let source = atom('source', (next?: number) => next || 1)
        let middle = atom('middle', () => {
            actualizations += 'M'
            return source.value()
        })
        let target = atom('target', () => {
            actualizations += 'T'
            source.value()
            return middle.value()
        })

        target.value()
        assert(actualizations === 'TM')

        source.value(2)
        sync()

        assert(actualizations, 'TMTM')
    })

    it('destroy on switch', () => {
        let c = atom('c', (next?: number = 1) => next)
        let a = atom('a', () => 1)
        let b = atom('b', () => 2)
        let s = atom('s', () => c.value() === 0 ? b.value() : a.value())

        assert(s.value() === 1)
        assert(b.status === ATOM_STATUS_OBSOLETE)
        assert(a.status === ATOM_STATUS_ACTUAL)
        c.value(0)
        sync()
        assert(s.value() === 2)
        assert(b.status === ATOM_STATUS_ACTUAL)
        a.destructor()
        assert(a.current === undefined)
    })

    // it('automatic deferred restart', () => {
    //     let targetValue: number = 0
    //     let source = atom('source', (next?: number) => next || 1)
    //     let middle = atom('middle', () => source.value() + 1)
    //     let target = atom('target', () => targetValue = middle.value() + 1)
    //     target.value()
    //     assert(targetValue === 3)
    //     source.value(2)
    //     assert(targetValue === 3)
    //     sync()
    //     assert(targetValue === 4)
    // })

    it('async loading', () => {
        let targetValue: number = 0
        let resolve
        const promise = new Promise((res, reject) => {
            resolve = res
        })
        let source = atom('source', (next?: number) => {
            if (next !== undefined) {
                return next
            }

            setTimeout(() => {
                source.value(1)
                setTimeout(() => resolve(), 30)
                // resolve()
            }, 0)
            throw new AtomWait()
        })

        let middle = atom('middle', () => {
            targetValue = source.value() + 1
            return targetValue
        })

        assert.throws(() => {
            middle.value().valueOf()
        })

        return promise
            .then(() => {
                assert(targetValue === 2)
            })
    })

    it('error handling', () => {
        const error = new Error('Test error')
        ;(error: Object)[catchedId] = true
        let source = atom('source', (next?: number): number => {
            throw error
        })
        let middle = atom('middle', () => source.value() + 1)
        let target = atom('target', () => middle.value() + 1)

        assert.throws(() => {
            target.value().valueOf()
        })
    })
})
