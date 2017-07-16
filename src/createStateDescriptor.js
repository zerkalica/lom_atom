// @flow

import mem from './mem'

type IArg = Function | {[id: string]: Function}
type IProvideItem = Function | [Function, Function]

class Context {
    map: Map<Function, *>
    parent: Context | void

    constructor(parent?: Context, items?: IProvideItem[]) {
        this.parent = parent
        const map = this.map = new Map()
        if (items !== undefined) {
            for (let i = 0; i < items.length; i++) {
                const item = items[i]
                if (item instanceof Array) {
                    map.set(item[0], item[1])
                } else {
                    map.set(item.constructor, item)
                }
            }
        }
    }

    _destroy() {
        this.parent = undefined
        this.map = (undefined: any)
    }

    _get<V>(key: Function): V | void {
        let ptr: Context | void = this
        let value: V | void = undefined
        while (ptr !== undefined) {
            value = ptr.map.get(key)
            if (value !== undefined) {
                return value
            }
            ptr = ptr.parent
        }

        throw new Error('Context: not registered for key ' + String(key))
    }

    resolve(argDeps: IArg[]): mixed[] {
        const result = []
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

        return result
    }
}

type IPropsWithContext = {
    [id: string]: any;
    __lom_ctx: Context;
}

type IProvider<Props, State> = (props: Props, prevState?: State) => (Function | [Function, Function])[];

interface IComponentDescriptor<State> {
    deps?: IArg[];
    provide?: IProvider<IPropsWithContext, State>;
}

export class StateDescriptor<State> {
    descr: IComponentDescriptor<State>

    _state: State | void = undefined
    context: Context | void = undefined

    constructor(
        descr: IComponentDescriptor<State>
    ) {
        this.descr = descr
    }

    _destroy() {
        if (this.context) {
            this.context._destroy()
        }
        this._state = undefined
        this.descr = (undefined: any)
        this.context = undefined
    }

    @mem
    props(props?: IPropsWithContext, force?: boolean): IPropsWithContext {
        if (props !== undefined) {
            const provide = this.descr.provide
            if (provide !== undefined) {
                this.context = new Context(
                    props.__lom_ctx,
                    provide(props, this._state)
                )
            } else {
                this.context = props.__lom_ctx || new Context()
            }

            return props
        }

        throw new Error('Can\'t get props from StateDescriptor.props')
    }

    @mem
    state(): State | void {
        this.props()
        const deps = this.descr.deps
        if (deps === undefined || this.context === undefined) {
            throw new Error('No state defined')
        }
        this._state = (this.context.resolve(deps)[0]: any)

        return this._state
    }
}

export default function createStateDescriptor<State>(render: Function): StateDescriptor<State> | void {
    if (render.deps !== undefined || render.provide !== undefined) {
        return new StateDescriptor(render)
    }
}
