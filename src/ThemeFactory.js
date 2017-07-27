// @flow

import mem from './mem'
import type {ResultOf} from './interfaces'
export type ThemeValues<F> = {+[id: $Keys<ResultOf<F>>]: string}

export interface ISheet<V: Object> {
    attach(): ISheet<V>;
    detach(): ISheet<V>;
    classes: {+[id: $Keys<V>]: string};
}

export interface IProcessor {
    createStyleSheet<V: Object>(_cssObj: V, options: any): ISheet<V>;
}

export type IThemeFn = Function

interface IResolver {
    instance(key: Function): any;
}

class ThemeProvider<V: Object> {
    _themeFn: (...deps: any[]) => V

    _sheet: ISheet<V> | void
    _processor: IProcessor
    _resolver: IResolver

    constructor(
        themeFn: IThemeFn,
        resolver: IResolver,
        processor: IProcessor
    ) {
        this._themeFn = themeFn
        this._processor = processor
        this._resolver = resolver
    }

    @mem
    theme(): {+[id: $Keys<V>]: string} {
        if (this._sheet) {
            this._sheet.detach()
        }
        const sheet = this._sheet = this._processor.createStyleSheet(
            this._resolver.instance(this._themeFn)
        )
        sheet.attach()

        return sheet.classes
    }

    _destroy() {
        if (this._sheet) {
            this._sheet.detach()
        }
        this._themeFn = (undefined: any)
        this._processor = (undefined: any)
        this._resolver = (undefined: any)
        this._sheet = undefined
    }
}

export default class ThemeFactory {
    _processor: IProcessor | void

    constructor(processor?: IProcessor) {
        this._processor = processor
    }

    createTheme<V: Object>(
        themeFn: IThemeFn,
        resolver: IResolver
    ): {+[id: $Keys<V>]: string} {
        if (this._processor === undefined) {
            return {}
        }
        const theme = new ThemeProvider(themeFn, resolver, this._processor)

        return new Proxy(theme, {
            get(t: ThemeProvider<V>, prop: $Keys<V>) {
                return t.theme()[prop]
            }
        })
    }
}
