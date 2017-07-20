// @flow
import {defaultContext} from './Context'
import mem, {force, detached} from './mem'
import {shouldUpdate} from './utils'
import createStateDescriptor, {StateDescriptor} from './createStateDescriptor'
import type {IProcessor} from './theme'
type IReactComponent<IElement, Props> = {
    constructor(props: Props, context?: Object): IReactComponent<IElement, Props>;
    render(): IElement;
    forceUpdate(): void;
}

interface IRenderFn<IElement, Props, State> {
    displayName?: string;
    (props: Props, state?: State): IElement;
}

type IFromError<IElement> = (props: {error: Error}) => IElement

type IAtomize<IElement, Props, State> = (
    render: IRenderFn<IElement, Props, State>,
    fromError?: IFromError<IElement>
) => Class<IReactComponent<IElement, Props>>

function createEventFix(origin: (e: Event) => void): (e: Event) => void {
    return function fixEvent(e: Event) {
        origin(e)
        defaultContext.run()
    }
}

export function createCreateElement<IElement, Props, State>(
    atomize: IAtomize<IElement, Props, State>,
    createElement: Function
) {
    return function lomCreateElement() {
        const el = arguments[0]
        let attrs = arguments[1]

        let newEl
        const isAtomic = typeof el === 'function' && el.prototype.render === undefined
        if (isAtomic) {
            if (el.__lom === undefined) {
                el.__lom = atomize(el)
            }
            newEl = el.__lom
            if (!attrs) {
                attrs = {__lom_ctx: parentContext}
            } else {
                attrs.__lom_ctx = parentContext
            }
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
                attrs.onChange = createEventFix(attrs.onInput)
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
                if (isAtomic === false) {
                    return createElement.apply(null, arguments)
                }
                const args = [newEl, attrs]
                for (let i = 2, l = arguments.length; i < l; i++) {
                    args.push(arguments[i])
                }
                return createElement.apply(null, args)
        }
    }
}

let parentContext: any = undefined

export default function createReactWrapper<IElement>(
    BaseComponent: Class<*>,
    defaultFromError: IFromError<IElement>,
    themeProcessor?: IProcessor
): IAtomize<IElement, *, *> {
    class AtomizedComponent<Props: Object, State> extends BaseComponent {
        _render: IRenderFn<IElement, Props, State>
        _renderedData: IElement | void = undefined
        _force: boolean = true
        _stateDescriptor: StateDescriptor<State> | void

        props: Props

        static fromError: IFromError<IElement>

        constructor(
            props: Props,
            reactContext?: Object,
            render: IRenderFn<IElement, Props, State>
        ) {
            super(props, reactContext)
            this._render = render
            this._stateDescriptor = createStateDescriptor(render, themeProcessor)
        }

        shouldComponentUpdate(props: Props) {
            const isUpdated = shouldUpdate(this.props, props)
            if (isUpdated) {
                this._force = true
            }

            return isUpdated
        }

        componentWillUnmount() {
            this._renderedData = undefined
            this.props = (undefined: any)
            this._render = (undefined: any)
            this._fromError = (undefined: any)
            this._stateDescriptor = undefined
            defaultContext.getAtom(this, this.r, 'r').destroyed(true)
        }

        @detached
        r(next?: IElement, force?: boolean): IElement {
            if (next !== undefined) {
                throw new Error('Can\'t set view' )
            }

            let data: IElement
            const props = this.props
            const prevContext = parentContext

            try {
                const sd = this._stateDescriptor
                if (sd === undefined) {
                    parentContext = props.__lom_ctx
                    data = this._render(props)
                } else {
                    sd.props(props)
                    parentContext = sd.context
                    data = this._render(
                        props,
                        sd.descr.deps === undefined ? undefined : sd.state()
                    )
                }
            } catch (error) {
                data = this.constructor.fromError({error})
            }

            parentContext = prevContext

            if (this._force === false) {
                // prevent recursion
                // can call this.render synchronously
                this._renderedData = data
                this.forceUpdate()
                this._renderedData = undefined
            }
            this._force = false

            return data
        }

        render(): IElement {
            return this._renderedData === undefined
                ? this.r(undefined, this._force)
                : this._renderedData
        }
    }

    return function reactWrapper<Props, State>(
        render: IRenderFn<IElement, Props, State>,
        fromError?: IFromError<IElement>
    ): Class<IReactComponent<IElement, Props>> {
        function WrappedComponent(props: Props, context?: Object) {
            AtomizedComponent.call(this, props, context, render)
        }
        WrappedComponent.fromError = fromError || defaultFromError
        WrappedComponent.displayName = render.displayName || render.name
        WrappedComponent.prototype = Object.create(AtomizedComponent.prototype)
        WrappedComponent.prototype.constructor = WrappedComponent

        return WrappedComponent
    }
}
