// @flow

import {mem} from 'lom-atom'

export class Locale {
    @mem lang = 'en'

    constructor(lang: string) {
        this.lang = lang
    }
}
