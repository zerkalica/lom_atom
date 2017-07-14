// @flow

import {detached} from './mem'
import {defaultContext} from './Atom'
import {shouldUpdate, AtomWait, defaultHooksFromComponent} from './utils'
import type {IHooks, IHooksFromComponent} from './interfaces'

type IReactComponent<IElement, Props> = {
    constructor(props: Props, context?: Object): IReactComponent<IElement, Props>;
    render(): IElement;
    forceUpdate(): void;
}

interface IRenderFn<IElement, Props, Context> {
    displayName?: string;
    (props: Props, context: Context): IElement;
}

type IFromError<IElement> = (props: {error: Error}) => IElement

type IAtomize<IElement, Props, Context> = (
    render: IRenderFn<IElement, Props, Context>,
    fromError?: IFromError<IElement>
) => Class<IReactComponent<IElement, Props>>

function createEventFix(origin: (e: Event) => void): (e: Event) => void {
    return function fixEvent(e: Event) {
        origin(e)
        defaultContext.run()
    }
}
export function createCreateElement<IElement, Props, Context>(
    atomize: IAtomize<IElement, Props, Context>,
    createElement: Function
) {
    return function lomCreateElement() {
        const el = arguments[0]
        const attrs = arguments[1]

        let newEl
        if (typeof el === 'function' && el.prototype.render === undefined) {
            if (el.__lom === undefined) {
                el.__lom = atomize(el)
            }
            newEl = el.__lom
        } else {
            newEl = el
        }
        if (attrs) {
            if (attrs.onKeyPress) {
                attrs.onKeyPress = createEventFix(attrs.onKeyPress)
            }
            if (attrs.onKeyDown) {
                attrs.onKeyDown = createEventFix(attrs.onKeyDown)
            }
            if (attrs.onKeyUp) {
                attrs.onKeyUp = createEventFix(attrs.onKeyUp)
            }
            if (attrs.onInput) {
                attrs.onInput = createEventFix(attrs.onInput)
            }
            if (attrs.onChange) {
                attrs.onChange = createEventFix(attrs.onChange)
            }
        }

        switch(arguments.length) {
            case 2:
                return createElement(newEl, attrs)
            case 3:
                return createElement(newEl, attrs, arguments[2])
            case 4:
                return createElement(newEl, attrs, arguments[2], arguments[3])
            case 5:
                return createElement(newEl, attrs, arguments[2], arguments[3], arguments[4])
            case 6:
                return createElement(newEl, attrs, arguments[2], arguments[3], arguments[4], arguments[5])
            case 7:
                return createElement(newEl, attrs, arguments[2], arguments[3],
                    arguments[4], arguments[5], arguments[6])
            case 8:
                return createElement(newEl, attrs, arguments[2], arguments[3],
                    arguments[4], arguments[5], arguments[6], arguments[7])
            case 9:
                return createElement(newEl, attrs, arguments[2], arguments[3],
                    arguments[4], arguments[5], arguments[6], arguments[7], arguments[8])
            default:
                return createElement.apply(null, arguments)
        }
    }
}

export default function createReactWrapper<IElement>(
    BaseComponent: Class<*>,
    defaultFromError: IFromError<IElement>,
    hooksFromComponent?: IHooksFromComponent<any, any> = defaultHooksFromComponent
): IAtomize<IElement, *, *> {
    class AtomizedComponent<Props: Object, Context> extends BaseComponent {
        _render: IRenderFn<IElement, Props, Context>
        _fromError: IFromError<IElement>
        _fromRender = false
        _renderedData: IElement | void = undefined
        _context: Context
        _hooks: ?IHooks<Props, Context>

        props: Props

        constructor(
            props: Props,
            context?: Object,
            render: IRenderFn<IElement, Props, Context>,
            fromError: IFromError<IElement>
        ) {
            super(props, context)
            this._fromError = fromError
            this._render = render
            this._context = (undefined: any)
            const hooks: ?IHooks<Props, Context> = hooksFromComponent(render)
            this._hooks = hooks
            if (hooks && hooks.initContext) {
                this._context = hooks.initContext(this.props)
            }
        }

        shouldComponentUpdate(props: Props) {
            const isUpdated = shouldUpdate(this.props, props)

            if (isUpdated) {
                const hooks = this._hooks
                if (hooks && hooks.updateContext) {
                    this._context = hooks.updateContext(this.props, props, this._context)
                }
            }

            return isUpdated
        }

        componentWillUnmount() {
            const hooks = this._hooks
            if (hooks && hooks._destroy) {
                hooks._destroy()
            }
            this.props = (undefined: any)
            this._hooks = (undefined: any)
            this._context = (undefined: any)
            this._render = (undefined: any)
            this._fromError = (undefined: any)
            ;(this: Object)[this.constructor.displayName + '.view'].destroyed(true)
        }

        @detached
        view(): IElement {
            let data: IElement

            try {
                data = this._render(this.props, this._context)
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
            const data = this.view()
            this._fromRender = false
            return data
        }
    }

    return function reactWrapper<Props, Context>(
        render: IRenderFn<IElement, Props, Context>,
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
