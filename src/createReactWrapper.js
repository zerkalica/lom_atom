// @flow

import mem from './mem'
import {AtomWait} from './utils'

type IReactComponent<IElement, Props> = {
    constructor(props: Props, context?: Object): IReactComponent<IElement, Props>;
    render(): IElement;
    forceUpdate(): void;
}

type IRenderFn<IElement, Props> = (props: Props) => IElement
type IFromError<IElement> = (props: {error: Error}) => IElement

function shouldUpdate<Props: Object>(oldProps: Props, props: Props): boolean {
    if (oldProps === props) {
        return false
    }
    if ((!oldProps && props) || (!props && oldProps)) {
        return true
    }

    let lpKeys = 0
    for (let k in oldProps) { // eslint-disable-line
        if (oldProps[k] !== props[k]) {
            return true
        }
        lpKeys++
    }
    for (let k in props) { // eslint-disable-line
        lpKeys--
    }

    return lpKeys !== 0
}

type IAtomize<IElement, Props> = (
    render: IRenderFn<IElement, Props>,
    fromError?: IFromError<IElement>
) => Class<IReactComponent<IElement, Props>>

export function createCreateElement<IElement, Props>(
    atomize: IAtomize<IElement, Props>,
    createElement: any
) {
    return function lomCreateElement() {
        const el = arguments[0]

        let newEl
        if (typeof el === 'function' && el.prototype.render === undefined) {
            if (el.__lom === undefined) {
                el.__lom = atomize(el)
            }
            newEl = el.__lom
        } else {
            newEl = el
        }

        switch(arguments.length) {
            case 2:
                return createElement(newEl, arguments[1])
            case 3:
                return createElement(newEl, arguments[1], arguments[2])
            case 4:
                return createElement(newEl, arguments[1], arguments[2], arguments[3])
            case 5:
                return createElement(newEl, arguments[1], arguments[2], arguments[3], arguments[4])
            case 6:
                return createElement(newEl, arguments[1], arguments[2], arguments[3], arguments[4], arguments[5])
            case 7:
                return createElement(newEl, arguments[1], arguments[2], arguments[3], arguments[4], arguments[5], arguments[6])
            default:
                return createElement.apply(null, arguments)
        }
    }
}


export default function createReactWrapper<IElement>(
    BaseComponent: Class<*>,
    defaultFromError: IFromError<IElement>
) {
    class AtomizedComponent<Props: Object> extends BaseComponent {
        _render: IRenderFn<IElement, Props>
        _fromError: IFromError<IElement>

        props: Props

        constructor(
            props: Props,
            context?: Object,
            render: IRenderFn<IElement, Props>,
            fromError: IFromError<IElement>
        ) {
            super(props, context)
            this._fromError = fromError
            this._render = render
        }

        shouldComponentUpdate(props: Props) {
            return shouldUpdate(this.props, props)
        }

        _fromRender = false
        _renderedData: IElement | void = undefined

        componentWillUnmount() {
            (this: Object)['__render@'].destroyed(true)
        }

        @mem
        __render(): IElement {
            let data: IElement

            try {
                data = this._render(this.props)
            } catch (error) {
                data = this._fromError({error})
            }

            if (!this._fromRender) {
                // prevent recursion
                // can call this.render synchronously
                this._renderedData = data
                this.forceUpdate()
                this._renderedData = undefined
            }

            return data
        }

        render(): IElement {
            if (this._renderedData !== undefined) {
                return this._renderedData
            }
            this._fromRender = true
            const data = this.__render()
            this._fromRender = false
            return data
        }
    }

    return function reactWrapper<Props>(
        render: IRenderFn<IElement, Props>,
        fromError?: IFromError<IElement>
    ): Class<IReactComponent<IElement, Props>> {
        function WrappedComponent(props: Props, context?: Object) {
            AtomizedComponent.call(this, props, context, render, fromError || defaultFromError)
        }
        WrappedComponent.displayName = render.displayName || render.name
        WrappedComponent.prototype = Object.create(AtomizedComponent.prototype)
        WrappedComponent.prototype.constructor = WrappedComponent

        return WrappedComponent
    }
}
