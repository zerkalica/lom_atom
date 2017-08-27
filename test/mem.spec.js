// @flow
/* eslint-env mocha */

import assert from 'assert'
import Atom from '../src/Atom'
import mem, {action, memkey, force} from '../src/mem'
import {AtomWait} from '../src/utils'
import {defaultContext} from '../src/Context'
import {catchedId} from '../src/interfaces'

describe('mem', () => {
    function sync() {
        defaultContext.beginTransaction()
        defaultContext.endTransaction()
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
        x.currentUser = {
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
            @mem
            source(next?: string): string {
                new Promise((resolve: () => void) => {
                    testResolve = () => {
                        this.source('Jin')
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

    describe('forced', () => {
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
            assert(fooCalled === false)

            fooCalled = false
            x.force.foo = 1
            assert(fooCalled === true)
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
            assert(fooCalled === 'S')
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
            assert(fooCalled === 'GS')
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
            assert(fooCalled === 'S')
        })
    })

    describe('must be deferred destroyed when no longer referenced', () => {
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

            assert(destroyed === 'foo$')

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
})
