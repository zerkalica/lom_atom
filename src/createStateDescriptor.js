// @flow

import mem, {memkey} from './mem'
import {ThemeProvider} from './theme'
import type {IProcessor} from './theme'

type IArg = Function | {[id: string]: Function}
type IProvideItem = Function | [Function, Function]

class Injector {
    map: Map<Function, *>
    parent: Injector | void
    top: Injector
    _processor: IProcessor | void
    constructor(parent?: Injector, items?: IProvideItem[], processor?: IProcessor) {
        this.parent = parent
        this.top = parent ? parent.top : this
        this._processor = processor
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

    _destroy() {
        this.parent = undefined
        this._processor = undefined
    }

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

    _get<V>(key: Function): V | void {
        let value: V | void = undefined
        if (key.theme === true) {
            value = this.top.value(key)
            if (value === undefined) {
                const processor = this._processor
                value = processor
                    ? ((new ThemeProvider(key, this.top.resolve(key.deps), processor)).theme(): any)
                    : ({}: any)
                this.top.value(key, value)
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

    resolve(argDeps?: IArg[]): mixed[] {
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

type IPropsWithContext = {
    [id: string]: any;
    __lom_ctx: Injector;
}

type IProvider<Props, State> = (props: Props, prevState?: State) => (Function | [Function, Function])[];

interface IComponentDescriptor<State> {
    deps?: IArg[];
    provide?: IProvider<IPropsWithContext, State>;
}

export class StateDescriptor<State> {
    descr: IComponentDescriptor<State>

    _state: State | void = undefined
    context: Injector = (undefined: any)
    _processor: IProcessor | void

    constructor(
        descr: IComponentDescriptor<State>,
        processor?: IProcessor
    ) {
        this.descr = descr
        this._processor = processor
    }

    _destroy() {
        if (this.context) {
            this.context._destroy()
        }
        this._state = undefined
        this.descr = (undefined: any)
        this.context = (undefined: any)
    }

    @mem
    props(props?: IPropsWithContext, force?: boolean): IPropsWithContext {
        if (props !== undefined) {
            const provide = this.descr.provide
            if (provide !== undefined) {
                this.context = new Injector(
                    props.__lom_ctx,
                    provide(props, this._state),
                    this._processor
                )
            } else {
                this.context = props.__lom_ctx || new Injector(undefined, undefined, this._processor)
            }

            return props
        }

        throw new Error('Can\'t get props from StateDescriptor.props')
    }

    @mem
    state(): State | void {
        const deps = this.descr.deps
        if (deps === undefined) {
            throw new Error('No state defined')
        }
        this.props()
        this._state = (this.context.resolve(deps)[0]: any)

        return this._state
    }
}

export default function createStateDescriptor<State>(
    render: Function,
    processor?: IProcessor
): StateDescriptor<State> | void {
    if (render.deps !== undefined || render.provide !== undefined) {
        return new StateDescriptor(render, processor)
    }
}
