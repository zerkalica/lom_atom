// @flow
import uuid from 'uuid/v4'
import {mem, force, AtomWait} from 'lom_atom'

interface ITodoBase {
    completed: boolean;
    title: string;
    id: string;
}

export interface ITodo extends ITodoBase {
    destroy(): void;
    toggle(): void;
}

function toJson<V>(r: Response): Promise<V> {
    return r.json()
}

class TodoModel implements ITodo {
    completed: boolean
    _title: string
    id: string

    _store: TodoStore

    constructor(todo?: $Shape<ITodoBase> = {}, store: TodoStore) {
        this._title = todo.title || ''
        this.id = todo.id || uuid()
        this.completed = todo.completed || false
        this._store = store
    }

    get title(): string {
        return this._title
    }

    set title(t: string) {
        this._title = t
        this._store.saveTodo(this.toJSON())
    }

    destroy() {
        this._store.remove(this.id)
    }

    toggle() {
        this.completed = !this.completed
        this._store.saveTodo(this.toJSON())
    }

    toJSON(): ITodoBase {
        return ({
            completed: this.completed,
            title: this._title,
            id: this.id
        })
    }
}

export default class TodoStore {
    @mem opCount = 0

    get isOperationRunning(): boolean {
        return this.opCount !== 0
    }

    @mem get todos(): ITodo[] {
        fetch('/api/todos', {
            method: 'GET'
        })
            .then(toJson)
            .then((todos: ITodoBase[]) => {
                this.todos = todos.map((todo: ITodoBase) => new TodoModel(todo, this))
            })
            .catch((e: Error) => {
                this.todos = e
            })
        throw new AtomWait()
    }

    @mem set todos(todos: ITodo[] | Error) {}

    @mem get activeTodoCount(): number {
        return this.todos.reduce(
            (sum: number, todo: ITodo) => sum + (todo.completed ? 0 : 1),
            0
        )
    }

    get completedCount(): number {
        return this.todos.length - this.activeTodoCount
    }

    _handlePromise<V>(p: Promise<V>): Promise<void> {
        this.opCount++
        return p
            .then(() => {
                this.opCount--
            })
            .catch((e: Error) => {
                this.opCount--
                this.todos = e
            })
    }

    addTodo(title: string) {
        const todo = new TodoModel({title}, this)
        this.todos = this.todos.concat([todo])
        this._handlePromise(
            fetch('/api/todo', {
                method: 'PUT',
                body: JSON.stringify(todo)
            })
                .then(toJson)
                .then((updatedTodo: ITodoBase) => {
                    this.todos = this.todos.map(
                        (t: ITodo) => t.id === todo.id
                            ? new TodoModel(updatedTodo, this)
                            : t
                    )
                })
        )
    }

    saveTodo(todo: ITodoBase) {
        this.todos = this.todos.map(
            (t: ITodo) => t.id === todo.id
                ? new TodoModel(todo, this)
                : t
        )
        this._handlePromise(
            fetch(`/api/todo/${todo.id}`, {
                method: 'POST',
                body: JSON.stringify(todo)
            })
                .then(toJson)
                .then((updatedTodo: ITodoBase) => {
                    this.todos = this.todos.map(
                        (t: ITodo) => t.id === todo.id
                            ? new TodoModel(updatedTodo, this)
                            : t
                    )
                })
        )
    }

    remove(id: string) {
        this.todos = this.todos.filter((todo: ITodo) => todo.id !== id)

        this._handlePromise(
            fetch(`/api/todo/${id}`, {
                method: 'DELETE'
            })
        )
    }

    toggleAll(completed: boolean) {
        this.todos = this.todos.map(
            (todo: ITodo) => new TodoModel({
                title: todo.title,
                id: todo.id,
                completed
            }, this)
        )

        this._handlePromise(
            fetch(`/api/todos`, {
                method: 'PUT',
                body: JSON.stringify(
                    this.todos.map(
                        (todo: ITodo) => ([todo.id, {completed}])
                    )
                )
            })
        )
    }

    clearCompleted() {
        const newTodos: ITodo[] = []
        const delIds: string[] = []
        for (let i = 0; i < this.todos.length; i++) {
            const todo = this.todos[i]
            if (todo.completed) {
                delIds.push(todo.id)
            } else {
                newTodos.push(todo)
            }
        }
        this.todos = newTodos

        this._handlePromise(
            fetch(`/api/todos`, {
                method: 'DELETE',
                body: JSON.stringify(delIds)
            })
        )
    }
}
