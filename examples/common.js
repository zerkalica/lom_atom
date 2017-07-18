// @flow

import {force, mem} from 'lom_atom'

export class Locale {
    _defaultLang: string
    @force $: Locale

    @mem get lang(): string {
        setTimeout(() => {
            this.$.lang = 'gb'
        }, 400)

        return this._defaultLang
    }

    @mem set lang(lang: string) {}

    constructor(lang: string) {
        this._defaultLang = lang
    }
}
