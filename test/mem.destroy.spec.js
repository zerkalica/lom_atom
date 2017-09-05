// @flow
/* eslint-env mocha */

import assert from 'assert'
import mem from '../src/mem'
import {defaultContext} from '../src/Context'

describe('mem must be deferred destroyed when no longer referenced', () => {
    function sync() {
        defaultContext.beginTransaction()
        defaultContext.endTransaction()
    }

    it('any property in host object', () => {
        let destroyed: string = ''

        class A {
            @mem
            foo(): number {
                destroyed = ''
                return 1
            }

            _destroyProp(key: string, value?: number) {
                destroyed = key
            }
        }

        class B {
            _a = new A()

            @mem
            showing(next?: boolean): boolean {
                return next === undefined
                    ? true
                    : next
            }

            @mem
            bar(): ?number {
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

        assert(destroyed === 'foo')

        b.showing(true)
        sync()

        assert(destroyed === '')
    })

    it('all properties in host object', () => {
        let destroyed = false

        class A {
            @mem
            foo(): number {
                destroyed = false
                return 1
            }

            _destroy() {
                destroyed = true
            }
        }

        class B {
            _a = new A()

            @mem
            showing(next?: boolean): boolean {
                return next === undefined
                    ? true
                    : next
            }

            @mem
            bar(): ?number {
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
