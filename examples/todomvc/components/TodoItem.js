// @flow

import {mem} from 'lom_atom'
import type {ThemeValues} from 'lom_atom'
import type {ITodo} from '../stores/TodoStore'

const ESCAPE_KEY = 27
const ENTER_KEY = 13

class TodoItemStore {
    @mem todoBeingEdited: ?ITodo = null
    @mem editText = ''

    _todo: ITodo

    constructor(todo: ITodo) {
        this._todo = todo
    }

    beginEdit = () => {
        this.todoBeingEdited = this._todo
        this.editText = this._todo.title
    }

    setText = ({target}: Event) => {
        this.editText = (target: any).value
    }

    handleSubmit = (event: Event) => {
        const val = this.editText.trim()
        if (val) {
            this._todo.title = val
            this.editText = ''
        } else {
            this.handleDestroy()
        }
        this.todoBeingEdited = null
    }

    handleKeyDown = (event: Event) => {
        if (event.which === ESCAPE_KEY) {
            this.editText = this._todo.title
            this.todoBeingEdited = null
        } else if (event.which === ENTER_KEY) {
            this.handleSubmit(event)
        }
    }

    toggle = () => {
        this._todo.toggle()
    }

    handleDestroy = () => {
        this._todo.destroy()
        this.todoBeingEdited = null
    }
}

function TodoItemTheme() {
    return {
        container: {
            border: '1px solid green'
        }
    }
}
TodoItemTheme.theme = true

export default function TodoItem(
    {todo}: {
        todo: ITodo;
    },
    {itemStore, theme}: {
        theme: ThemeValues<typeof TodoItemTheme>;
        itemStore: TodoItemStore;
    }
) {
    return <li
        className={`${theme.container} ${todo.completed ? 'completed ': ''}${todo === itemStore.todoBeingEdited ? 'editing' : ''}`}
    >
        <div className="view">
            <input
                id="toggle"
                className="toggle"
                type="checkbox"
                checked={todo.completed}
                onChange={itemStore.toggle}
            />
            <label id="beginEdit" onDoubleClick={itemStore.beginEdit}>
                {todo.title}
            </label>
            <button className="destroy" id="destroy" onClick={itemStore.handleDestroy} />
        </div>
        {todo === itemStore.todoBeingEdited
            ? <input
                id="edit"
                className="edit"
                value={itemStore.editText}
                onBlur={itemStore.handleSubmit}
                onChange={itemStore.setText}
                onKeyDown={itemStore.handleKeyDown}
            />
            : null
        }
    </li>
}
TodoItem.deps = [{itemStore: TodoItemStore, theme: TodoItemTheme}]
TodoItem.provide = ({todo}: {todo: ITodo}) => ([
    new TodoItemStore(todo)
])
