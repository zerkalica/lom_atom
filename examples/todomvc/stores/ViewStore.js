// @flow

import {mem} from 'lom_atom'

import type {ITodo} from './TodoStore'
import TodoStore from './TodoStore'

export const TODO_FILTER = {
    ALL: 'all',
    COMPLETE: 'complete',
    ACTIVE: 'active'
}

export type IFilter = $Values<typeof TODO_FILTER>

export default class ViewStore {
    _todoStore: TodoStore

    static deps = [TodoStore]

    constructor(todoStore: TodoStore) {
        this._todoStore = todoStore
    }

    @mem get filter(): IFilter {
        const params = new URLSearchParams(location.search)
        const filter: IFilter = params.get('todo_filter') || TODO_FILTER.ALL

        return filter
    }

    @mem set filter(filter: IFilter) {
        history.pushState(null, filter, `?todo_filter=${filter}`)
    }

    @mem get filteredTodos(): ITodo[] {
        const todos = this._todoStore.todos
        switch (this.filter) {
            case TODO_FILTER.ALL:
                return todos
            case TODO_FILTER.COMPLETE:
                return todos.filter((todo: ITodo) => !!todo.completed)
            case TODO_FILTER.ACTIVE:
                return todos.filter((todo: ITodo) => !todo.completed)
            default:
                throw new Error(`Unknown filter value: ${this.filter}`)
        }
    }
}
