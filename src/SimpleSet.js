// @flow

export default class SimpleSet<V: {id: number}> {
    items: (V | void)[] = []
    size: number = 0
    from: number = 0

    add(v: V) {
        if (this.items[v.id] === undefined) {
            this.size++
        }
        if (v.id < this.from) {
            this.from = v.id
        }
        this.items[v.id] = v
    }

    delete(v: V) {
        const items = this.items
        if (items[v.id] === undefined) {
            return
        }
        const len = items.length - 1
        this.size--
        items[v.id] = undefined
        if (v.id === this.from) {
            let start = v.id
            start++
            for (let i = start; i <= len; i++) {
                if (items[i] !== undefined) break
                start++
            }
            this.from = start
        }

        if (len === v.id) {
            for (let i = len, from = this.from; i >= from; i--) {
                if (items[i] !== undefined) break
                items.length--
            }
        }
    }
}
