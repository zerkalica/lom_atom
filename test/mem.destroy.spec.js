// @flow
/* eslint-env mocha */

import assert from 'assert'
import mem from '../src/decorators/mem'
import {defaultContext} from '../src/Context'

describe('mem.destroy must be deferred destroyed when no longer referenced', () => {
    function sync() {
        defaultContext.sync()
    }

    it('any property in host object', () => {
        let destroyed = false

        class A {
            @mem foo(): number {
                destroyed = false
                return 1
            }

            destructor() {
                destroyed = true
            }
        }

        class B {
            @mem _a = new A()

            @mem showing(next?: boolean): boolean {
                return next === undefined
                    ? true
                    : next
            }

            @mem bar(): ?number {
                return this.showing()
                    ? this._a.foo()
                    : null
            }
        }

        const b = new B()
        assert(b.bar() === 1)

        assert(destroyed === false)
        b.showing(false)
        b.bar()
        sync()

        assert(destroyed === true)
        b.showing(true)
        sync()

        assert(destroyed === false)
    })

    it('all properties in host object', () => {
        let destroyed = false

        class A {
            @mem foo(): number {
                destroyed = false
                return 1
            }

            destructor() {
                destroyed = true
            }
        }

        class B {
            @mem _a = new A()

            @mem showing(next?: boolean): boolean {
                return next === undefined
                    ? true
                    : next
            }

            @mem bar(): ?number {
                return this.showing()
                    ? this._a.foo()
                    : null
            }
        }

        const b = new B()
        assert(b.bar() === 1)

        b.showing(false)
        b.bar()
        sync()

        assert(destroyed === true)

        b.showing(true)
        sync()

        assert(destroyed === false)
    })
})
