/* @flow */
import type {IAtom} from './interfaces'

type IParent<T> = {
    current: T[];
    notify(): void;
}

export default class Collection<T> {
    _indexes: Map<T, number>
    _atom: IParent<T>

    constructor(atom: IParent<T>, indexes?: Map<T, number>) {
        this._atom = atom
        this._indexes = indexes || new Map()
        if (indexes === undefined) this._recalcIndexes(0, 0)
    }

    _recalcIndexes(from: number, delta: number) {
        const {_indexes: indexes, _atom: {current: items}} = this
        for (let i = from, l = items.length; i < l; i++) {
            indexes.set(items[i], i - delta)
        }
    }

    replace(oldItem: T, newItem: T): Collection<T> {
        if (oldItem === newItem) return this
        const {_indexes: indexes, _atom: {current: items}} = this
        const index = indexes.get(oldItem)
        if (index === undefined) throw new Error('oldItem not found')
        items[index] = newItem
        indexes.delete(oldItem)
        indexes.set(newItem, index)
        this._atom.notify()

        return this
    }

    // $FlowFixMe
    add(item: T): Collection<T> {
        const {_indexes: indexes, _atom: {current: items}} = this
        indexes.set(item, items.length)
        items.push(item)
        this._atom.notify()
        return this
    }

    update(cb: (item: T) => T): Collection<T> {
        const {_indexes: indexes, _atom: {current: items}} = this
        for (let i = 0, l = items.length; i < l; i++) {
            const oldItem = items[i]
            const newItem = cb(oldItem)
            items[i] = newItem
            if (newItem !== oldItem) {
                indexes.delete(oldItem)
                indexes.set(newItem, i)
            }
        }
        this._atom.notify()

        return this
    }

    delete(item: T): Collection<T> {
        const {_indexes: indexes, _atom: {current: items}} = this
        const index = indexes.get(item)
        if (index === undefined) return this
        this._recalcIndexes(index, 1)
        items.splice(index, 1)
        indexes.delete(item)
        this._atom.notify()

        return this
    }
}
