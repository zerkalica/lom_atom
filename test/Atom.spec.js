// @flow
/* eslint-env mocha */

import assert from 'power-assert'
import sinon from 'sinon'
import Atom from '../src/Atom'
import {AtomWait} from '../src/utils'
import {defaultContext} from '../src/Context'
import {IAtom, catchedId, ATOM_STATUS} from '../src/interfaces'

describe('Atom', () => {
    function atom<V>(key: string, fn: Function): IAtom<V> {
        const host: {[id: string]: any} = {}
        return defaultContext.getAtom(host, fn, key)
    }

    it('caching', () => {
        let random = atom('random', () => Math.random())

        assert(random.get() === random.get())
    })

    it('lazyness', () => {
        let value = 0
        const prop = atom('prop', () => value = 1)
        defaultContext.run()

        assert(value === 0)
    })

    it('instant actualization', () => {
        let source = atom('source', (next?: number) => next || 1)
        let middle = atom('middle', () => source.get() + 1)
        let target = atom('target', () => middle.get() + 1)

        assert(target.get() === 3)

        source.set(2)

        assert(target.get() === 4)
    })

    it('do not actualize when masters not changed', () => {
        let targetUpdates = 0

        let source = atom('source', (next? : number) => next || 1)
        let middle = atom('middle', () => Math.abs(source.get()))
        let target = atom('target', () => {
            ++ targetUpdates
            return middle.get()
        })

        target.get()
        assert(targetUpdates === 1)

        source.set(-1)
        target.get()

        assert(targetUpdates === 1)
    })

    it('obsolete atoms actualized in initial order', () => {

        let actualizations = ''

        let source = atom('source', (next?: number) => next || 1)
        let middle = atom('middle', () => {
            actualizations += 'M'
            return source.get()
        })
        let target = atom('target', () => {
            actualizations += 'T'
            source.get()
            return middle.get()
        })

        target.get()
        assert(actualizations === 'TM')

        source.set(2)
        defaultContext.run()

        assert(actualizations, 'TMTM')
    })

    it('destroy on switch', () => {
        let c = atom('c', (next?: number = 1) => next)
        let a = atom('a', () => 1)
        let b = atom('b', () => 2)
        let s = atom('s', () => c.get() === 0 ? b.get() : a.get())

        assert(s.get() === 1)
        assert(b.status === ATOM_STATUS.OBSOLETE)
        assert(a.status === ATOM_STATUS.ACTUAL)
        c.set(0)
        defaultContext.run()
        assert(s.get() === 2)
        assert(b.status === ATOM_STATUS.ACTUAL)
        assert(a.destroyed() === true)
    })

    it('automatic deferred restart', () => {
        let targetValue: number = 0
        let source = atom('source', (next?: number) => next || 1)
        let middle = atom('middle', () => source.get() + 1)
        let target = atom('target', () => targetValue = middle.get() + 1)
        target.get()
        assert(targetValue === 3)
        source.set(2)
        assert(targetValue === 3)
        defaultContext.run()
        assert(targetValue === 4)
    })

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
                source.set(1)
                setTimeout(() => resolve(), 0)
                // resolve()
            }, 0)
            throw new AtomWait()
        })

        let middle = atom('middle', () => {
            targetValue = source.get() + 1
            return targetValue
        })

        assert.throws(() => {
            middle.get().valueOf()
        })

        return promise
            .then(() => {
                assert(targetValue === 2)
            })
    })

    it('error handling', () => {
        const error = new Error('Test error')
        ;(error: Object)[catchedId] = true
        let source = atom('source', (next?: number) => {
            throw error
        })
        let middle = atom('middle', () => source.get() + 1)
        let target = atom('target', () => middle.get() + 1)

        assert.throws(() => {
            target.get().valueOf()
        }, error.message)
    })
})
