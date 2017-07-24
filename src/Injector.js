// @flow

import mem, {memkey} from './mem'
import ThemeFactory from './ThemeFactory'

export type IArg = Function | {[id: string]: Function}
type IProvideItem = Function | [Function, Function]

export type IPropsWithContext = {
    [id: string]: any;
    __lom_ctx?: Injector;
}

export type IProvider<State> = (props: IPropsWithContext, prevState?: State) => IProvideItem[];

export default class Injector {
    map: Map<Function, *>
    parent: Injector | void
    top: Injector
    _themeFactory: ThemeFactory

    constructor(parent?: Injector, items?: IProvideItem[], themeFactory: ThemeFactory) {
        this.parent = parent
        this.top = parent ? parent.top : this
        this._themeFactory = themeFactory
        if (items !== undefined) {
            for (let i = 0; i < items.length; i++) {
                const item = items[i]
                if (item instanceof Array) {
                    this.value(item[0], item[1], true)
                } else if (typeof item === 'function') {
                    this.value(item, null, true)
                } else {
                    this.value(item.constructor, item, true)
                }
            }
        }
    }

    @memkey
    value<V>(key: Function, next?: V, force?: boolean): V | void {
        return next
    }

    // _destroy() {
    //     this.parent = undefined
    //     this._themeFactory = undefined
    // }

    _fastCall<V>(key: any, args: mixed[]): V {
        switch (args.length) {
            case 1: return new key(args[0])
            case 2: return new key(args[0], args[1])
            case 3: return new key(args[0], args[1], args[2])
            case 4: return new key(args[0], args[1], args[2], args[3])
            case 5: return new key(args[0], args[1], args[2], args[3], args[4])
            default: return new key(...args)
        }
    }

    instance(key: Function): any {
        return this._fastCall(key, this.resolve(key.deps))
    }

    _get<V>(key: Function): V | void {
        let value: V | void = undefined
        if (key.theme === true) {
            value = this.top.value(key)
            if (value === undefined) {
                value = (this._themeFactory.createTheme(key, this): any)
                this.top.value(key, value, true)
            }

            return value
        }

        let ptr: Injector | void = this
        while (ptr !== undefined) {
            value = ptr.value(key)
            if (value !== undefined) {
                if (value === null) {
                    value = this._fastCall(key, ptr.resolve(key.deps))
                    ptr.value(key, value, true)
                }
                return value
            }
            ptr = ptr.parent
        }

        value = this._fastCall(key, this.resolve(key.deps))
        this.value(key, value, true)

        return value
    }
    resolve(argDeps?: IArg[]): any[] {
        const result = []
        if (argDeps !== undefined) {
            for (let i = 0, l = argDeps.length; i < l; i++) {
                let argDep = argDeps[i]
                if (typeof argDep === 'object') {
                    const obj = {}
                    for (let prop in argDep) { // eslint-disable-line
                        obj[prop] = this._get(argDep[prop])
                    }
                    result.push(obj)
                } else {
                    result.push(this._get(argDep))
                }
            }
        }

        return result
    }
}
