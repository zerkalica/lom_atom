// @flow
/* eslint-env mocha */

import assert from 'power-assert'
import sinon from 'sinon'
import Atom from '../src/Atom'
import {AtomWait} from '../src/utils'
import Context from '../src/Context'
import {catchedId, ATOM_STATUS} from '../src/interfaces'

describe('Atom', () => {
    it('caching', () => {
        let random = new Atom('random', () => Math.random())

        assert(random.get() === random.get())
    })

    it('lazyness', () => {
        let value = 0
        const context = new Context()
        const prop = new Atom('prop', () => value = 1, context)
        context.run()

        assert(value === 0)
    })

    it('instant actualization', () => {
        let source = new Atom('source', (next?: number) => next || 1)
        let middle = new Atom('middle', () => source.get() + 1)
        let target = new Atom('target', () => middle.get() + 1)

        assert(target.get() === 3)

        source.set(2)

        assert(target.get() === 4)
    })

    it('do not actualize when masters not changed', () => {
        let targetUpdates = 0

        let source = new Atom('source', (next? : number) => next || 1)
        let middle = new Atom('middle', () => Math.abs(source.get()))
        let target = new Atom('target', () => {
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
        const context = new Context()

        let actualizations = ''

        let source = new Atom('source', (next?: number) => next || 1, context)
        let middle = new Atom('middle', () => {
            actualizations += 'M'
            return source.get()
        }, context)
        let target = new Atom('target', () => {
            actualizations += 'T'
            source.get()
            return middle.get()
        }, context)

        target.get()
        assert(actualizations === 'TM')

        source.set(2)
        context.run()

        assert(actualizations, 'TMTM')
    })

    it('destroy on switch', () => {
        const context = new Context()
        let c = new Atom('c', (next?: number = 1) => next, context)
        let a = new Atom('a', () => 1, context)
        let b = new Atom('b', () => 2, context)
        let s = new Atom('s', () => c.get() === 0 ? b.get() : a.get(), context)

        assert(s.get() === 1)
        assert(b.status === ATOM_STATUS.OBSOLETE)
        assert(a.status === ATOM_STATUS.ACTUAL)
        c.set(0)
        context.run()
        assert(s.get() === 2)
        assert(b.status === ATOM_STATUS.ACTUAL)
        assert(a.destroyed() === true)
    })

    it('automatic deferred restart', () => {
        const context = new Context()
        let targetValue: number = 0
        let source = new Atom('source', (next?: number) => next || 1, context)
        let middle = new Atom('middle', () => source.get() + 1, context)
        let target = new Atom('target', () => targetValue = middle.get() + 1, context)
        target.get()
        assert(targetValue === 3)
        source.set(2)
        assert(targetValue === 3)
        context.run()
        assert(targetValue === 4)
    })

    it('async loading', () => {
        const context = new Context()
        let targetValue: number = 0
        let resolve
        const promise = new Promise((res, reject) => {
            resolve = res
        })
        let source = new Atom('source', (next?: number) => {
            if (next !== undefined) {
                return next
            }

            setTimeout(() => {
                source.set(1)
                resolve()
            }, 10)
            throw new AtomWait()
        }, context)
        let middle = new Atom('middle', () => source.get() + 1, context)

        assert.throws(() => {
            middle.get().valueOf()
        })

        return promise
            .then(() => {
                assert(middle.get() === 2)
            })
    })

    it('error handling', () => {
        const error = new Error('Test error')
        ;(error: Object)[catchedId] = true
        let source = new Atom('source', (next?: number) => {
            throw error
        })
        let middle = new Atom('middle', () => source.get() + 1)
        let target = new Atom('target', () => middle.get() + 1)

        assert.throws(() => {
            target.get().valueOf()
        }, error.message)
    })
})
