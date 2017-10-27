// @flow
/* eslint-env mocha */

import assert from 'assert'
import mem, {force} from '../src/mem'

describe('mem forced', () => {
    it('regular prop', () => {
        class X {
            @force force: X
            @mem foo = 1
        }

        const x = new X()
        x.foo
        assert(x.force.foo === 1)
        x.force.foo = 2
        assert(x.foo === 2)
    })

    it('get prop', () => {
        let fooCalled = false
        class X {
            @force force: X
            @mem get foo() {
                fooCalled = true
                return 1
            }
        }

        const x = new X()

        fooCalled = false
        x.foo
        assert(fooCalled === true)

        fooCalled = false
        x.foo
        assert(fooCalled === false)

        fooCalled = false
        x.force.foo
        assert(fooCalled === true)
    })

    it('set prop', () => {
        let fooCalled = false
        class X {
            @force force: X
            @mem get foo() {
                return 1
            }
            @mem set foo(v: number) {
                fooCalled = true
            }
        }

        const x = new X()

        fooCalled = false
        x.foo = 2
        assert(fooCalled === true)

        fooCalled = false
        x.force.foo = 1
        assert(fooCalled === false)
    })


    it('update property from itself', () => {
        let fooCalled = ''
        class X {
            @force
            force: X

            @mem
            get foo() {
                fooCalled += 'G'
                return 1
            }

            @mem
            set foo(v: number) {
                fooCalled += 'S'
            }
        }

        const x = new X()
        x.foo === 1 // cache x.foo

        fooCalled = ''
        x.force.foo = x.foo + 1
        assert(fooCalled === '')
    })

    it('increment property', () => {
        let fooCalled = ''
        class X {
            @force
            force: X

            @mem
            get foo() {
                fooCalled += 'G'
                return 1
            }

            @mem
            set foo(v: number) {
                fooCalled += 'S'
            }
        }

        const x = new X()
        x.foo === 1 // cache x.foo

        fooCalled = ''
        x.force.foo++
        assert(fooCalled === 'G')
    })

    it('method call', () => {
        let fooCalled = ''
        class X {
            @force
            force: X

            @mem
            foo(v?: number) {
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
        x.force.foo(v + 1)
        console.log(fooCalled)
        assert(fooCalled === '')
    })
})
