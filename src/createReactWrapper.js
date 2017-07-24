// @flow
import {defaultContext} from './Context'
import mem, {force, detached} from './mem'
import {shouldUpdate} from './utils'
import Injector from './Injector'
import type {IProvider, IArg, IPropsWithContext} from './Injector'
import ThemeFactory from './ThemeFactory'
import type {IProcessor} from './ThemeFactory'

type IReactComponent<IElement> = {
    constructor(props: IPropsWithContext, context?: Object): IReactComponent<IElement>;
    render(): IElement;
    forceUpdate(): void;
}

interface IRenderFn<IElement, State> {
    (props: IPropsWithContext, state?: State): IElement;

    displayName?: string;
    deps?: IArg[];
    provide?: IProvider<State>;
}

type IFromError<IElement> = (props: {error: Error}) => IElement

type IAtomize<IElement, State> = (
    render: IRenderFn<IElement, State>,
    fromError?: IFromError<IElement>
) => Class<IReactComponent<IElement>>

function createEventFix(origin: (e: Event) => void): (e: Event) => void {
    return function fixEvent(e: Event) {
        origin(e)
        defaultContext.run()
    }
}

export function createCreateElement<IElement, State>(
    atomize: IAtomize<IElement, State>,
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
): IAtomize<IElement, *> {
    const themeFactory = new ThemeFactory(themeProcessor)

    class AtomizedComponent<State> extends BaseComponent {
        _render: IRenderFn<IElement, State>
        _renderedData: IElement | void = undefined
        _isPropsUpdated: boolean = true

        props: IPropsWithContext

        static fromError: IFromError<IElement>

        constructor(
            props: IPropsWithContext,
            reactContext?: Object,
            render: IRenderFn<IElement, State>
        ) {
            super(props, reactContext)
            this._render = render
        }

        shouldComponentUpdate(props: IPropsWithContext) {
            const isUpdated = shouldUpdate(this.props, props)
            if (isUpdated) {
                this._isPropsUpdated = true
            }

            return isUpdated
        }

        componentWillUnmount() {
            this._state = undefined
            this.props = (undefined: any)
            this._renderedData = undefined
            this._render = (undefined: any)
            this._fromError = (undefined: any)
            this._injector = (undefined: any)
            defaultContext.getAtom(this, this.r, 'r').destroyed(true)
        }

        _state: State | void = undefined
        _injector: Injector = (undefined: any)

        @mem
        _getState(): State {
            return this._state = this._injector.resolve(this._render.deps)[0]
        }

        @detached
        r(next?: IElement, force?: boolean): IElement {
            if (next !== undefined) {
                throw new Error('Can\'t set view' )
            }
            let data: IElement

            const prevContext = parentContext
            try {
                const key = this._render
                if (this._isPropsUpdated === true) {
                    if (key.provide !== undefined) {
                        this._injector = new Injector(
                            this.props.__lom_ctx,
                            key.provide(this.props, this._state),
                            themeFactory
                        )
                    } else if (this._injector === undefined) {
                        this._injector = this.props.__lom_ctx || new Injector(undefined, undefined, themeFactory)
                    }
                }
                parentContext = this._injector
                data = key(this.props, key.deps === undefined ? undefined : this._getState())
            } catch (error) {
                data = this.constructor.fromError({error})
            }
            parentContext = prevContext
            if (!this._isPropsUpdated) {
                // prevent recursion
                // can call this.render synchronously
                this._renderedData = data
                this.forceUpdate()
                this._renderedData = undefined
            }
            this._isPropsUpdated = false

            return data
        }

        render(): IElement {
            return this._renderedData === undefined
                ? this.r(undefined, this._isPropsUpdated)
                : this._renderedData
        }
    }

    return function reactWrapper<State>(
        render: IRenderFn<IElement, State>,
        fromError?: IFromError<IElement>
    ): Class<IReactComponent<IElement>> {
        function WrappedComponent(props: IPropsWithContext, context?: Object) {
            AtomizedComponent.call(this, props, context, render)
        }
        WrappedComponent.fromError = fromError || defaultFromError
        WrappedComponent.displayName = render.displayName || render.name
        WrappedComponent.prototype = Object.create(AtomizedComponent.prototype)
        WrappedComponent.prototype.constructor = WrappedComponent

        return WrappedComponent
    }
}
