// @flow
/* eslint-env mocha */

import assert from 'assert'
import mem, {action, force, memkey} from '../src/mem'
import {AtomWait} from '../src/utils'
import {defaultContext} from '../src/Context'

describe('mem base', () => {
    function sync() {
        defaultContext.beginTransaction('$')
        defaultContext.endTransaction('$')
    }

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

        function f<T>(t: Class<T>): Class<T> {
            return (t: any)
        }
        class UserService implements IUserService {
            @mem currentUserId: number = 1
            @force $: UserService

            @memkey
            userById(id: number, next?: IUser): IUser {
                userByIdCalled = true
                if (next !== undefined) return next

                setTimeout(() => {
                    this.$.userById(id, {
                        name: 'test' + id,
                        email: 'test' + id + '@t.t'
                    })
                }, 50)

                throw new AtomWait()
            }

            @mem get currentUser(): IUser {
                return this.userById(this.currentUserId)
            }
            @mem set currentUser(next: IUser) {}

            get fullName(): string {
                const {name, email} = this.currentUser
                return `${name} <${email}>`
            }
        }

        const x = new UserService()
        const user1 = x.userById(1)
        assert(userByIdCalled === true)

        userByIdCalled = false
        x.userById(1)

        assert(userByIdCalled === false)

        x.userById(2)
        assert(userByIdCalled === true)

        userByIdCalled = false
        x.userById(2)
        assert(userByIdCalled === false)
        assert(user1 === x.currentUser)
        x.currentUser = {
            name: 'test2',
            email: 'test2@t.t'
        }
        sync()
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

    it('transactional set', () => {
        let callCount = 0
        class X {
            @mem foo = 1
            @mem bar = 1

            @action
            some() {
                this.foo++
                this.bar++
            }

            @mem
            computed() {
                callCount++
                return this.foo + this.bar
            }
        }

        const x = new X()
        x.computed()
        x.some()
        assert(callCount === 2)
    })

    it('direct set', () => {
        let callCount = 0
        class X {
            @mem foo = 1
            @mem bar = 1

            some() {
                this.foo++
                this.bar++
            }

            @mem
            computed() {
                callCount++
                return this.foo + this.bar
            }
        }

        const x = new X()
        x.computed()
        x.some()
        sync()
        assert(callCount === 2)
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
            @force $: Test
            @mem
            source(next?: string): string {
                new Promise((resolve: () => void) => {
                    testResolve = () => {
                        this.$.source('Jin')
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
})
