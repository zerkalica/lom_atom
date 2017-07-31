// @flow
/* eslint-env mocha */

import assert from 'assert'
import Atom from '../src/Atom'
import mem, {memkey, force} from '../src/mem'
import {AtomWait} from '../src/utils'
import {defaultContext} from '../src/Context'
import {catchedId} from '../src/interfaces'

describe('mem', () => {
    it('mem by key', () => {
        let userByIdCalled = false
        interface IUser {
            name: string;
            email: string;
        }

        interface IUserService {
            currentUserId: number;
            userById(id: number, next?: IUser): IUser;
            currentUser: IUser;
        }

        function f<T>(t: Class<T>): Class<T & {force: T}> {
            return (t: any)
        }
        class UserService implements IUserService {
            @force get force() { return this }
            @mem currentUserId: number = 1

            @memkey
            userById(id: number, next?: IUser): IUser {
                userByIdCalled = true
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

        userByIdCalled = false
        x.userById(1)
        assert(userByIdCalled === false)

        x.userById(2)
        assert(userByIdCalled === true)

        userByIdCalled = false
        x.userById(2)
        assert(userByIdCalled === false)

        assert(user1 === x.currentUser)
        x.force.currentUser = {
            name: 'test2',
            email: 'test2@t.t'
        }
        assert(x.fullName === 'test2 <test2@t.t>')
    })

    it('auto sync of properties', () => {
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

    it('force getset', () => {
        let fooCalled = false
        class X {
            @force
            force: X

            @mem
            get foo() {
                fooCalled = true
                return 1
            }

            @mem
            set foo(v: number) {
                fooCalled = true
            }

            @mem
            bar(): number {
                return this.foo + 1
            }
        }

        const x = new X()
        assert(x.bar() === 2)
        fooCalled = false
        x.foo
        assert(fooCalled === false)
        x.force.foo;
        assert(fooCalled === true)

        fooCalled = false
        x.force.foo = 5
        assert(fooCalled === false)

        assert(x.bar() === 6)
    })

    it('getset property', () => {
        class X {
            @mem
            get foo() {
                return 1
            }
            @mem
            set foo(v: number) {}

            @mem
            bar(): number {
                return this.foo + 1
            }
        }

        const x = new X()
        assert(x.bar() === 2)

        x.foo = 5

        assert(x.bar() === 6)
    })

    it('regular property', () => {
        class X {
            @mem
            foo: number = 1

            @mem
            bar(): number {
                return this.foo + 1
            }
        }

        const x = new X()
        assert(x.bar() === 2)

        x.foo = 5

        assert(x.bar() === 6)
    })

    it('wait for data', () => {
        let testResolve: ?() => void

        class Test {
            @force force: Test
            @mem
            source(next?: string): string {
                new Promise((resolve: () => void) => {
                    testResolve = () => {
                        this.force.source('Jin')
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
        defaultContext.run()

        assert(destroyed === true)

        b.showing(true)
        defaultContext.run()

        assert(destroyed === false)
    })
})
