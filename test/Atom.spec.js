// @flow
/* eslint-env mocha */

import assert from 'power-assert'
import sinon from 'sinon'
import Atom from '../src/Atom'
import Context from '../src/Context'
import {catchedId, ATOM_STATUS} from '../src/interfaces'

describe('Atom', () => {
    it('caching', () => {
        let random = new Atom(() => Math.random())

        assert(random.get() === random.get())
    })

    it('lazyness', () => {
        let value = 0
        const context = new Context()
        const prop = new Atom(() => value = 1, context)
        context.run()

        assert(value === 0)
    })

    it('instant actualization', () => {
        let source = new Atom((next?: number) => next || 1)
        let middle = new Atom(() => source.get() + 1)
        let target = new Atom(() => middle.get() + 1)

        assert(target.get() === 3)

        source.set(2)

        assert(target.get() === 4)
    })

    it('do not actualize when masters not changed', () => {
        let targetUpdates = 0

        let source = new Atom((next? : number) => next || 1)
        let middle = new Atom(() => Math.abs(source.get()))
        let target = new Atom(() => {
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

        let source = new Atom((next?: number) => next || 1, context)
        let middle = new Atom(() => {
            actualizations += 'M'
            return source.get()
        }, context)
        let target = new Atom(() => {
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
        let c = new Atom((next?: number = 1) => next, context)
        let a = new Atom(() => 1, context)
        let b = new Atom(() => 2, context)
        let s = new Atom(() => c.get() === 0 ? b.get() : a.get(), context)

        assert(s.get() === 1)
        assert(b.status === ATOM_STATUS.OBSOLETE)
        assert(a.status === ATOM_STATUS.ACTUAL)
        c.set(0)
        context.run()
        assert(s.get() === 2)
        assert(b.status === ATOM_STATUS.ACTUAL)
        assert(a.status === ATOM_STATUS.DESTROYED)
    })

    it('automatic deferred restart', () => {
        const context = new Context()
        let targetValue: number = 0
        let source = new Atom((next?: number) => next || 1, context)
        let middle = new Atom(() => source.get() + 1, context)
        let target = new Atom(() => targetValue = middle.get() + 1, context)
        target.get()
        assert(targetValue === 3)
        source.set(2)
        assert(targetValue === 3)

        context.run()
        assert(targetValue === 4)
    })

    it('error handling', () => {
        const error = new Error('Test error')
        ;(error: Object)[catchedId] = true
        let source = new Atom((next?: number) => {
            throw error
        })
        let middle = new Atom(() => source.get() + 1)
        let target = new Atom(() => middle.get() + 1)

        assert.throws(() => {
            target.get().valueOf()
        }, error.message)
    })
})
