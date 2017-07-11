// @flow
/* eslint-env mocha */

import assert from 'power-assert'
import sinon from 'sinon'
import Atom, {defaultContext} from '../src/Atom'
import mem from '../src/mem'
import {AtomWait} from '../src/utils'
import Context from '../src/Context'
import {catchedId, ATOM_STATUS} from '../src/interfaces'

describe('mem', () => {
    it.skip('get/set magic', () => {

        interface IUser {
            name: string;
            email: string;
        }

        interface IUserService {
            currentUserId: number;
            userById(id: number, next?: IUser): IUser;
            currentUser: IUser;
        }

        class UserService implements IUserService {
            force: UserService

            @mem
            currentUserId: number = 1

            @mem
            userById(id: number, next?: IUser): IUser {
                if (next !== undefined) return next

                setTimeout(() => {
                    this.userById(id, {
                        name: 'test' + id,
                        email: 'test' + id + '@t.t'
                    })
                }, 50)

                throw new AtomWait()
            }

            @mem
            get currentUser(): IUser {
                return this.userById(this.currentUserId)
            }

            set currentUser(next: IUser) {}

            get fullName(): string {
                const {name, email} = this.currentUser
                return `${name} <${email}>`
            }
        }

        const x = new UserService()
        const user1 = x.userById(1)
        assert(user1 === x.currentUser)
        x.force.currentUser = {
            name: 'test2',
            email: 'test2@t.t'
        }
        assert(x.fullName === 'test2 <test2@t.t>')
    })

    it('auto sync of properties', () => {
        @mem
        class X {
            @mem
            foo(next?: number): number {
                return next || 1
            }

            @mem
            bar(): number {
                return this.foo() + 1
            }

            @mem
            xxx(): number {
                return this.bar() + 1
            }
        }

        const x = new X()
        assert(x.bar() === 2)
        assert(x.xxx() === 3)

        x.foo(5)

        assert(x.xxx() === 7)
    })

    it('wait for data', () => {
        let testResolve: ?() => void

        @mem
        class Test {
            @mem
            source(next?: string, force?: boolean): string {
                new Promise((resolve: () => void) => {
                    testResolve = () => {
                        this.source('Jin', true)
                        resolve()
                    }
                })

                throw new AtomWait()
            }

            @mem
            middle() {
                return this.source()
            }

            @mem
            target() {
                return this.middle()
            }
        }

        const t = new Test()

        assert.throws(() => {
            t.target().valueOf()
        })
        if (!testResolve) {
            throw new Error()
        }
        testResolve()

        assert(t.target() === 'Jin')
    })

    it('this in decorated method equal to constructed object', () => {
        let t: A

        @mem
        class A {
            @mem
            foo(): number {
                t = this
                return 1
            }
        }
        const a = new A()

        a.foo()

        assert(a === t)
    })

    it('must be deferred destroyed when no longer referenced', () => {
        let destroyed = false

        @mem
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

        @mem
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
        defaultContext.run()

        assert(destroyed === true)

        b.showing(true)
        defaultContext.run()

        assert(destroyed === false)
    })
})
