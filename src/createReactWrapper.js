// @flow
import {defaultContext} from './Context'
import mem, {force, detached} from './mem'
import {shouldUpdate} from './utils'
import Injector from './Injector'
import type {IProvideItem, IArg, IPropsWithContext} from './Injector'
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
    localState?: boolean;
    props?: Function;
}

type IFromError<IElement> = (props: {error: Error}) => IElement

type IAtomize<IElement, State> = (
    render: IRenderFn<IElement, State>,
    fromError?: IFromError<IElement>
) => Class<IReactComponent<IElement>>

function createEventFix(origin: (e: Event) => void): (e: Event) => void {
    function fixEvent(e: Event) {
        origin(e)
        defaultContext.run()
    }
    fixEvent.displayName = origin.displayName || origin.name

    return fixEvent
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
    themeProcessor?: IProcessor,
    rootDeps?: IProvideItem[]
): IAtomize<IElement, *> {
    const rootInjector = new Injector(undefined, rootDeps, new ThemeFactory(themeProcessor))

    class AtomizedComponent<State> extends BaseComponent {
        _render: IRenderFn<IElement, State>

        props: IPropsWithContext

        static fromError: IFromError<IElement>
        static instances: number
        _propsChanged: boolean = true
        _injector: Injector | void = undefined

        constructor(
            props: IPropsWithContext,
            reactContext?: Object,
            render: IRenderFn<IElement, State>
        ) {
            super(props, reactContext)
            this._render = render
            if (render.deps !== undefined || render.props !== undefined) {
                this.constructor.instances++
            }
        }

        shouldComponentUpdate(props: IPropsWithContext) {
            this._propsChanged = shouldUpdate(this.props, props)
            return this._propsChanged
        }

        componentWillUnmount() {
            this._el = undefined
            this.props = (undefined: any)
            this._injector = undefined
            const render = this._render
            if (render.deps !== undefined || render.props !== undefined) {
                this.constructor.instances--
            }
            this._render = (undefined: any)
            defaultContext.getAtom(this, this.r, 'r').destroyed(true)
        }

        _getInjector(): Injector {
            const parentInjector: Injector = this.props.__lom_ctx || rootInjector
            // Autodetect separate state per component instance
            this._injector = this.constructor.instances > 0 || this._render.localState !== undefined
                ? parentInjector.copy()
                : parentInjector

            return this._injector
        }

        @mem
        _state(next?: State, force?: boolean): State {
            const injector = this._injector || this._getInjector()
            if (this._render.props && force) {
                injector.value(this._render.props, this.props, true)
            }

            return injector.resolve(this._render.deps)[0]
        }

        _el: IElement | void = undefined

        @detached
        r(element?: IElement, force?: boolean): IElement {
            let data: IElement

            const render = this._render

            const state = render.deps !== undefined
                ? this._state(undefined, force)
                : undefined

            const prevContext = parentContext
            parentContext = this._injector || this._getInjector()

            try {
                data = render(
                    this.props,
                    state
                )
            } catch (error) {
                data = this.constructor.fromError({error})
            }
            parentContext = prevContext

            if (!force) {
                this._el = data
                this.forceUpdate()
                this._el = undefined
            }
            this._propsChanged = false

            return data
        }

        render() {
            return this._el === undefined
                ? this.r(undefined, this._propsChanged)
                : this._el
        }
    }

    return function reactWrapper<State>(
        render: IRenderFn<IElement, State>,
        fromError?: IFromError<IElement>
    ): Class<IReactComponent<IElement>> {
        function WrappedComponent(props: IPropsWithContext, context?: Object) {
            AtomizedComponent.call(this, props, context, render)
        }
        WrappedComponent.instances = 0
        WrappedComponent.fromError = fromError || defaultFromError
        WrappedComponent.displayName = render.displayName || render.name
        WrappedComponent.prototype = Object.create(AtomizedComponent.prototype)
        WrappedComponent.prototype.constructor = WrappedComponent

        return WrappedComponent
    }
}
