// @flow

import mem from './mem'

type _ResultOf<V, F: (...x: any[]) => V> = V // eslint-disable-line
export type ResultOf<F> = _ResultOf<*, F>
export type ThemeValues<F> = {+[id: $Keys<ResultOf<F>>]: string}

export interface ISheet<V: Object> {
    attach(): StyleSheet;
    detach(): StyleSheet;
    classes: {+[id: $Keys<V>]: string};
}

export interface IProcessor {
    createStyleSheet<V: Object>(_cssObj: V, options: any): ISheet<V>;
}

export class ThemeProvider<V: Object> {
    _getStyles: (...deps: any[]) => V

    _deps: any[]
    _sheet: ISheet<V> | void
    _processor: IProcessor

    constructor(getStyles: (...deps: any[]) => V, deps: any[], processor: IProcessor) {
        this._getStyles = getStyles
        this._processor = processor
        this._deps = deps
    }

    theme(): {+[id: $Keys<V>]: string} {
        if (this._sheet) {
            this._sheet.detach()
        }
        const sheet = this._sheet = this._processor.createStyleSheet(
            this._getStyles.apply(null, this._deps)
        )
        sheet.attach()

        return sheet.classes
    }

    _destroy() {
        if (this._sheet) {
            this._sheet.detach()
        }
        this._getStyles = (undefined: any)
        this._processor = (undefined: any)
        this._deps = (undefined: any)
        this._sheet = undefined
    }
}
