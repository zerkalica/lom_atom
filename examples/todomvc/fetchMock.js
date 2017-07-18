
import fetchMock from 'fetch-mock/es5/client'
import uuid from 'uuid/v4'

interface ITodo {
    id: string;
    title: string;
    completed: boolean;
}

class BrowserLocalStorage {
    _storage: Storage
    _key: string

    constructor(storage: Storage, key: string) {
        this._storage = storage
        this._key = key
    }

    get<V>(): ?V {
        const value: ?string = this._storage.getItem(this._key)
        return !value ? null : JSON.parse(value || '')
    }

    set<V>(value: V, _opts?: SetStorageOpts): void {
        this._storage.setItem(this._key, JSON.stringify(value))
    }

    clear(): void {
        this._storage.removeItem(this._key)
    }

    clearAll(): void {
        this._storage.clear()
    }
}


function getBody(body?: ?(string | Object)): Object {
    return typeof body === 'string'
        ? JSON.parse(body)
        : ((body || {}): any)
}

function sortByDate(el1: ITodo, el2: ITodo): number {
    if (!el2.created || el1.created) {
        return 0
    }

    if (String(el1.created) > String(el2.created)) {
        return 1
    }
    if (String(el1.created) < String(el2.created)) {
        return -1
    }
    return 0
}

export default function createTodoEmulatedApi(
    rawStorage: Storage
) {
    const storage = new BrowserLocalStorage(rawStorage, 'lom_todomvc')
    const defaultTodos = [
        {
            id: 't1',
            title: 'test todo #1',
            completed: false
        },
        {
            id: 't2',
            title: 'test todo #2',
            completed: true
        }
    ]

    return [
        {
            method: 'GET',
            matcher: new RegExp('/api/todos'),
            response(url: string, params: RequestOptions) { // eslint-disable-line
                let newTodos = storage.get()
                if (!newTodos) {
                    newTodos = defaultTodos
                    storage.set(newTodos)
                }
                return newTodos.sort(sortByDate)
            }
        },
        {
            method: 'PUT',
            matcher: new RegExp('/api/todos'),
            response(url: string, params: RequestOptions) { // eslint-disable-line
                const data: ?ITodo[] = storage.get()
                const todos = data || defaultTodos
                const updates: Map<string, ITodo> = new Map(getBody(params.body))

                const newTodos = todos
                    .map((todo: Todo) => {
                        return updates.has(todo.id)
                            ? todo
                            : {...todo, ...updates.get(todo.id)}
                    })
                    .sort(sortByDate)
                storage.set(newTodos)

                return newTodos
            }
        },
        {
            method: 'DELETE',
            matcher: new RegExp('/api/todos'),
            response(url: string, params: RequestOptions) { // eslint-disable-line
                const data: ?Todo[] = storage.get()
                const todos = data || defaultTodos
                const ids: string[] = getBody(params.body)
                const newTodos = todos.filter((todo: Todo) =>
                    ids.indexOf(todo.id) === -1
                )
                storage.set(newTodos)

                return newTodos.map(({id}) => id)
            }
        },
        {
            method: 'DELETE',
            matcher: new RegExp('/api/todo/(.*)'),
            response(url: string, params: RequestOptions) { // eslint-disable-line
                const data: ?Todo[] = storage.get()
                const todos = data || []
                const id = url.match(new RegExp('/api/todo/(.+)'))[1]
                const newTodos = todos.filter((todo: Todo) => todo.id !== id)
                storage.set(newTodos.sort(sortByDate))

                return {id}
            }
        },
        {
            method: 'POST',
            matcher: new RegExp('/api/todo/(.*)'),
            response(url: string, params: RequestOptions) { // eslint-disable-line
                const data: ?Todo[] = storage.get()
                const id = url.match(new RegExp('/api/todo/(.+)'))[1]
                const newTodo = getBody(params.body)
                const newTodos = (data || []).map(
                    (todo: Todo) => (todo.id === id ? newTodo : todo)
                )
                storage.set(newTodos)

                return newTodo
            }
        },
        {
            method: 'PUT',
            matcher: new RegExp('/api/todo'),
            response(url: string, params: RequestOptions) { // eslint-disable-line
                const todos = storage.get()
                const body = getBody(params.body)
                const newTodo = {
                    ...body,
                    id: uuid()
                }
                todos.push(newTodo)
                storage.set(todos)

                return newTodo
            }
        }
    ]
}

function delayed<V>(v: V, delay: number): (url: string, params: RequestOptions) => Promise<V> {
    return function resp(url: string, params: RequestOptions) {
        return new Promise((resolve: Function) => {
            setTimeout(() => { resolve(v) }, delay)
        })
    }
}

const delay = 500
createTodoEmulatedApi(localStorage).forEach((data) => {
    fetchMock.mock({...data, response: delayed(data.response, delay)})
})
