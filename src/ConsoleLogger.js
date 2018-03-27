// @flow

import type {IAtom, ILogger} from './interfaces'
import {getInfo, isPromise} from './utils'
import ReactAtom from './ReactAtom'

function stringToColor(str: string): string {
    let hash = 0
    for(let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 3) - hash)
    }
    const color = Math.abs(hash).toString(16).substring(0, 6)

    return 'font-weight: bold; color: #' + '000000'.substring(0, 6 - color.length) + color + ';'
}

export default class ConsoleLogger implements ILogger {
    _useColors: boolean
    _filter: RegExp | void

    constructor(opts?: {
        filter?: RegExp;
        useColors?: boolean;
    }) {
        this._useColors = opts && opts.useColors !== undefined ? opts.useColors : true
        this._filter = opts ? opts.filter : undefined
    }

    beginGroup(name: string) {
        console.group(name, 'sync')
    }

    endGroup() {
        console.groupEnd()
    }

    onDestruct<V>(atom: IAtom<V>): void {
        console.debug(atom.toString(), 'destruct')
    }

    error<V>(atom: IAtom<V>, err: Error): void {}

    newValue<V>(atom: IAtom<V>, from?: V | Error, to: V | Error): void {
        const name = atom.toString()
        const filter = this._filter
        if (filter && !filter.test(name)) return
        if (atom instanceof ReactAtom) {
            console.debug(name, 'rendered')
        } else {
            const useColors = this._useColors
            console[
                from instanceof Error && !isPromise(from)
                    ? 'warn'
                    : (to instanceof Error && !isPromise(to) ? 'error' : 'log')
            ](
                useColors ? '%c' + name : name,
                useColors ? stringToColor(name) : '',
                getInfo(from) || from,
                '➔',
                getInfo(to) || to
            )
        }
    }
}
