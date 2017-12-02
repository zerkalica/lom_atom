// @flow
/* eslint-env mocha */

import assert from 'assert'
import mem from '../src/decorators/mem'

describe('mem forced', () => {
    it('regular prop', () => {
        class X {
            @mem foo = 1
        }

        const x = new X()
        x.foo++
        assert(x.foo === 2)
        mem.cache(x.foo)
        assert(x.foo === 1)
        mem.cache(x.foo = 2)
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
        mem.cache(x.foo)
        x.foo
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
        mem.cache(x.foo = 1)
        assert(fooCalled === false)
    })

    it('deep cache', () => {
        let fooCalled = ''
        class X {
            @mem.manual get bar() {
                fooCalled += 'G'
                return 1
            }
            @mem get bar2() {
                fooCalled += 'F'
                return this.bar + this.baz
            }
            @mem get baz() {
                fooCalled += 'E'
                return 1
            }
            @mem get foo() {
                return this.bar2 + this.baz
            }
        }

        const x = new X()
        x.foo
        fooCalled = ''
        mem.cache(x.foo)
        assert(fooCalled === '')

        x.foo
        assert(fooCalled === 'FE')

        fooCalled = ''
        mem.cache(x.bar)
        x.foo
        assert(fooCalled === 'FG')
    })

    it('method call', () => {
        let fooCalled = ''
        class X {
            @mem foo(v?: number): number {
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
        mem.cache(x.foo(v + 1))
        assert(fooCalled === '')
    })
})
