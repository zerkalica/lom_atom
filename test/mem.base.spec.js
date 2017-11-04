// @flow
/* eslint-env mocha */

import assert from 'assert'
import mem, {detached, action, force, memkey} from '../src/mem'
import {AtomWait} from '../src/utils'
import {defaultContext, ConsoleLogger} from '../src/Context'
import type {IAtomForce} from '../src/interfaces'
import {ATOM_FORCE_CACHE, ATOM_FORCE_UPDATE} from '../src/interfaces'

describe('mem base', () => {
    function sync() {
        defaultContext.beginTransaction('$')
        defaultContext.endTransaction('$')
    }

    it('mem by key', () => {
        let called = 0
        interface IUser {
            name: string;
            email: string;
        }

        let run: ?() => void
        class UserService {
            @mem currentUserId: number = 1
            @force $: UserService

            @memkey
            userById(id: number, next?: IUser): IUser {
                called++
                if (next !== undefined) return next

                run = () => {
                    this.$.userById(id, {
                        name: 'test' + id,
                        email: 'test' + id + '@t.t'
                    })
                }

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
        x.userById(1)
        if (run) run()
        const user1 = x.userById(1)
        assert(called === 1)

        x.userById(1)
        assert(called === 1)

        x.userById(2)
        if (run) run()
        assert(called === 2)

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

    it('detached can access atom via prop', () => {
        class A {
            getAtom() {
                return (this: Object)['foo()']
            }
            @detached foo() {
                return 123
            }
        }
        const a = new A()
        assert(a.getAtom() === undefined)
        a.foo()
        assert(a.getAtom().field === 'A.foo')
    })

    it('setting equal state are ignored', () => {
        let val = { foo : [777] }
        class A {
            @force $: A
            @mem foo(next?: Object, force?: IAtomForce): Object {
                return next || val
            }
        }
        const a = new A()
        const v1 = a.foo()
        const v2 = {foo: [777]}
        const v3 = a.foo(v2)

        assert(v1 === v3)
        assert(v2 !== v3)
    })


    it('async setting equal to last setted are ignored until changed', () => {
        let val = { foo : [777] }
        let called = 0
        let run: Function = () => {}
        class A {
            @force $: A
            @mem foo(next?: Object): Object {
                called++
                run = () => {
                    this.$.foo()
                }
                return val
            }
        }

        const a = new A()
        a.foo()
        assert(called === 1)

        a.foo({foo: [666]})
        assert(called === 2)

        a.foo({foo: [666]})
        assert(called === 2)
    })

    it('setting equal to last setted are ignored until changed', () => {
        let val = { foo : [777] }
        let called = 0
        class A {
            @force $: A
            @mem foo(next?: Object, force?: IAtomForce): Object {
                called++
                return val
            }
        }

        const a = new A()
        a.foo()
        assert(called === 1)

        a.foo({foo: [666]})
        assert(called === 2)

        a.foo({foo: [666]})
        assert(called === 2)
        a.foo({foo: [666]}, ATOM_FORCE_UPDATE)

        assert(called === 3)

        a.$.foo({foo: [777]})

        a.foo({ foo : [666] })
        assert(called === 4)

        a.foo({foo: [555]})
        assert(called === 5)
    })

    it('next remains after restart', () => {
        let run
        class A {
            @force $: A
            @mem foo(next?: Object, force?: IAtomForce): Object {
                run = () => {
                    this.foo({}, ATOM_FORCE_CACHE)
                }
                throw new mem.Wait()
            }

            @mem task(next: any) {
                this.foo().valueOf()
                return next
            }
        }
        const value = {}
        const a = new A()
        assert.throws(() => {
            a.task(value).valueOf()
        }, mem.Wait)
        if (run) run()
        sync()
        assert(a.task() === value)
    })
})
