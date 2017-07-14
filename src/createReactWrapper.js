// @flow

import {detached} from './mem'
import {defaultContext} from './Atom'
import {AtomWait} from './utils'

type IReactComponent<IElement, Props> = {
    constructor(props: Props, context?: Object): IReactComponent<IElement, Props>;
    render(): IElement;
    forceUpdate(): void;
}

interface IHooks<Props, Context> {
    constructor(): IHooks<Props, Context>;
    +_destroy?: () => void;
    +initContext?: (props: Props) => Context;
    +updateContext?: (oldProps: Props, newProps: Props, oldContext: Context) => Context;
}

interface IRenderFn<IElement, Props, Context> {
    displayName?: string;
    (props: Props, context: Context): IElement;
    hooks?: Class<IHooks<Props, Context>>;
}

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
    defaultFromError: IFromError<IElement>
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
            if (render.hooks) {
                const hooks = this._hooks = new render.hooks()
                if (hooks.initContext) {
                    this._context = hooks.initContext(this.props)
                }
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
