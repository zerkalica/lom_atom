/* @flow */
import {defaultContext} from './Context'
import {processed} from './conform'

const proxyOptions = {
    get(target: Collection<any, any>, name: string) {
        const items: any = target._items
        if (name === 'length') return items.length
        if (name === 'constructor') return target.constructor
        const index = +name
        if (!isNaN(index)) return items[index]

        let itemProp = (target: Object)[name]
        if (typeof itemProp === 'function') return itemProp.bind(target)
        itemProp = items[name]
        if (typeof itemProp === 'function') return itemProp.bind(items)

        return itemProp
    },
    set(target: Collection<any, any>, name: string, val: any): boolean {
        const index = +name
        if (isNaN(index)) return false
        target._setAt(index, val)
        return true
    }
}

type ICollection<T, Id> = T[] & Collection<T, Id>
interface INotifier<V> {
    notify(v: V): void;
}

export default class Collection<T, Id = T> {
    _items: T[]
    _indices: Map<Id, number>
    _parent: INotifier<Collection<T, Id>>

    constructor(items?: T[], indices?: Map<Id, number>, parent?: INotifier<Collection<T, Id>>) {
        this._items = items || []
        this._parent = parent || (defaultContext.current: any)
        if (indices) {
            this._indices = indices
        } else {
            this._indices = new Map()
            this._recalcIndices(0)
        }
        const proxy = (new Proxy(this, proxyOptions): any)
        // Speed up conform, disables deep compare for collections
        processed.set(proxy, true)

        return proxy
    }

    static create(getId: (item: T) => Id): Class<ICollection<T, Id>> {
        class Coll extends Collection<T, Id> {}
        (Coll.prototype: any).getId = getId
        return (Coll: any)
    }

    getId(t: T): Id {
        return (t: any)
    }

    _notify(): Collection<T, Id> {
        // const copy = Object.assign(Object.create(this.constructor.prototype), (this: Object))
        const copy = new this.constructor(this._items, this._indices, this._parent)
        this._parent.notify(copy)

        return copy
    }

    _recalcIndices(from: number) {
        const {_indices: indices, _items: items} = this
        for (let i = from, l = items.length; i < l; i++) {
           indices.set(this.getId(items[i]), i)
        }
    }

    _setAt(index: number, v: T): Collection<T, Id> {
        const {_indices: indices, _items: items} = this
        const id = this.getId(items[index])
        indices.delete(id)
        indices.set(this.getId(v), index)
        items[index] = v

        return this._notify()
    }

    set(item: T | ((item: T) => T | void)): Collection<T, Id> {
        const {_indices: indices, _items: items} = this
        let isUpdated = false
        if (typeof item === 'function') {
            for (let i = 0, l = items.length; i < l; i++) {
                const oldData = items[i]
                const newData = item(oldData)
                if (oldData !== newData && newData !== undefined) {
                    items[i] = newData
                    isUpdated = true
                }
            }
        } else {
            const id = this.getId(item)
            const index = indices.get(id)
            isUpdated = true
            if (index !== undefined) {
                items[index] = item
            } else {
                indices.set(id, items.length)
                items.push(item)
            }
        }

        return isUpdated ? this._notify() : this
    }

    delete(cb: T | ((item: T) => boolean)): Collection<T, Id> {
        const {_indices: indices, _items: items} = this
        let isUpdated = false
        if (typeof cb === 'function') {
            let j = 0
            let index: number | void = undefined
            for (let i = 0, l = items.length; i < l; i++) {
                const item = items[i]
                const id = this.getId(item)
                if (!cb(item)) {
                    if (isUpdated) {
                        indices.set(id, j)
                        items[j] = item
                    }
                    j++
                } else {
                    if (index === undefined) index = j
                    isUpdated = true
                    indices.delete(id)
                }
            }
            if (isUpdated) {
                items.length = j
                if (index !== undefined) this._recalcIndices(index)
            }
        } else {
            const id = this.getId(cb)
            const index = indices.get(id)
            if (index !== undefined) {
                items.splice(index, 1)
                isUpdated = true
                indices.delete(id)
                this._recalcIndices(index)
            }
        }

        return isUpdated ? this._notify() : this
    }

    toJSON() {
        return this._items
    }
}
