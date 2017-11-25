// @flow
/* eslint-env mocha */

import assert from 'assert'
import mem from '../src/mem'

describe('mem forced', () => {
    it('regular prop', () => {
        class X {
            @mem foo = 1
        }

        const x = new X()
        x.foo
        x.foo = mem.cache()
        assert(x.foo === 1)
        x.foo = mem.cache(2)
        assert(x.foo === 2)
    })

    it('get prop', () => {
        let fooCalled = false
        class X {
            @mem get foo() {
                fooCalled = true
                return 1
            }
            @mem set foo(next?: number) {}
        }

        const x = new X()

        fooCalled = false
        x.foo
        assert(fooCalled === true)

        fooCalled = false
        x.foo
        assert(fooCalled === false)

        fooCalled = false
        x.foo
        assert(fooCalled === false)

        x.foo = mem.force()
        assert(fooCalled === true)
    })

    it('set prop', () => {
        let fooCalled = false
        class X {
            @mem get foo() {
                return 1
            }
            @mem set foo(v: number) {
                fooCalled = true
            }
        }

        const x = new X()
        x.foo
        fooCalled = false
        x.foo = 2
        assert(fooCalled === true)

        fooCalled = false
        x.foo = mem.cache(1)
        assert(fooCalled === false)
    })


    it('update property from itself', () => {
        let fooCalled = ''
        class X {
            @mem get foo() {
                fooCalled += 'G'
                return 1
            }

            @mem set foo(v: number) {
                fooCalled += 'S'
            }
        }

        const x = new X()
        x.foo === 1 // cache x.foo
        assert(fooCalled === 'G')

        fooCalled = ''
        x.foo = mem.force(x.foo + 1)
        assert(fooCalled === 'S')
    })

    it('method call', () => {
        let fooCalled = ''
        class X {
            @mem foo(v?: number) {
                if (v !== undefined) {
                    fooCalled += 'S'
                    return v
                }
                fooCalled += 'G'
                return 1
            }
        }

        const x = new X()
        // x.foo() === 1 // cache x.foo
        const v = x.foo()
        fooCalled = ''
        x.foo(mem.cache(v + 1))
        assert(fooCalled === '')
    })
})
