// @flow
/* eslint-env mocha */
import assert from 'assert'
import mem, {serializable, memkey} from '../src/mem'
import {AtomWait} from '../src/utils'
import {defaultContext} from '../src/Context'

describe('mem serialize', () => {
    interface IUser {
        name: string;
    }

    function sync() {
        defaultContext.beginTransaction()
        defaultContext.endTransaction()
    }

    it('read serializable property from __lom_state', () => {
        class UserService {
            @serializable @mem user: IUser
            __lom_state: $Shape<UserService>
        }

        const x = new UserService()
        x.__lom_state = {
            user: { name: 'test' }
        }
        assert(x.user.name === 'test')
    })

    it('do not run activator if default data provided', () => {
        let isUserCalled = false
        class UserService {
            @serializable @mem user(user?: IUser): IUser {
                isUserCalled = true
                return { name: 'test111' }
            }
            __lom_state: Object
        }

        const x = new UserService()
        x.__lom_state = {
            user: { name: 'test' }
        }
        x.user()
        assert(isUserCalled === false)
    })

    it('run activator after handler call in set data', () => {
        let isUserCalled = false
        class UserService {
            @serializable @mem user(user?: IUser, force?: boolean): IUser {
                isUserCalled = true
                if (user !== undefined) return user
                throw new Error()
            }
            __lom_state: Object
        }

        const x = new UserService()
        x.user({name: 'test2'}, true)
        assert(isUserCalled === true)
    })

    it('get state after set data', () => {
        class UserService {
            @serializable @mem user(user?: IUser): IUser {
                if (user !== undefined) return user
                throw new Error()
            }
            __lom_state: Object
        }

        const x = new UserService()
        x.user({name: 'test2'})
        assert(x.__lom_state.user.name === 'test2')
    })

    it('state always is pointer to default state', () => {
        class UserService {
            @serializable @mem user(user?: IUser): IUser {
                if (user !== undefined) return user
                throw new Error()
            }
            __lom_state: Object
        }

        const x = new UserService()
        const state = {
            userService: { user: { name: 'test' } }
        }
        x.__lom_state = state.userService
        x.user()
        x.user({name: 'test2'})
        assert(x.__lom_state === state.userService)
    })


    it('save only marked props', () => {
        class UserService {
            @mem some = 213
            @serializable @mem user(user?: IUser): IUser {
                if (user !== undefined) return user
                throw new Error()
            }
            __lom_state: Object
        }

        const x = new UserService()
        x.some = 111
        assert(x.__lom_state.some === undefined)
    })

    it('load only marked props', () => {
        class UserService {
            @mem some = 213
            @serializable @mem user(user?: IUser): IUser {
                if (user !== undefined) return user
                throw new Error()
            }
            __lom_state: Object
        }

        const x = new UserService()
        x.__lom_state = {
            some: 111,
            user: { name: 'test' }
        }
        x.user()
        assert(x.__lom_state.some === 111)
    })

    it('set new state to host after reading', () => {
        class UserService {
            @serializable @mem some;
        }
        const x = new UserService()
        defaultContext.setState(x, {
            some: 111
        }, true)

        defaultContext.setState(x, {
            some: 123
        })
        assert(x.some === 123)
    })
})
