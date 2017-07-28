
import uuid from 'uuid/v4'
import {BrowserLocalStorage} from '../common'
interface ITodo {
    id: string;
    title: string;
    completed: boolean;
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

export default function todoMocks(
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
