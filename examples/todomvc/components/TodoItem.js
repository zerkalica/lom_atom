// @flow

import {animationFrame, mem} from 'lom_atom'
import type {ResultOf, NamesOf} from 'lom_atom'
import type {ITodo} from '../stores/TodoStore'

const ESCAPE_KEY = 27
const ENTER_KEY = 13

interface ITodoProps {
    +todo: ITodo;
}

class TodoProps implements ITodoProps {
    +todo: ITodo
}

class TodoItemStore {
    @mem todoBeingEdited: ?ITodo = null
    @mem editText = ''

    _todo: ITodo

    static deps = [TodoProps]

    constructor({todo}: TodoProps) {
        this._todo = todo
    }

    beginEdit = () => {
        this.todoBeingEdited = this._todo
        this.editText = this._todo.title
    }

    setText = ({target}: Event) => {
        this.editText = (target: any).value
    }

    _focused = false
    setEditInputRef = (el: ?HTMLInputElement) => {
        if (el && !this._focused) {
            this._focused = true
            animationFrame(() => {
                if (el) {
                    el.focus()
                }
            })
        }
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
        this.todoBeingEdited = null
    }

    handleDestroy = () => {
        this._todo.destroy()
        this.todoBeingEdited = null
    }
}

function TodoItemTheme() {
    const itemBase = {
        position: 'relative',
        fontSize: '24px',
        borderBottom: '1px solid #ededed',
        '&:last-child': {
            borderBottom: 'none'
        },
        '&:hover $destroy': {
            display: 'block'
        }
    }

    const viewLabelBase = {
        wordBreak: 'break-all',
        padding: '15px 15px 15px 60px',
        display: 'block',
        lineHeight: '1.2',
        transition: 'color 0.4s'
    }

    return {
        regular: {
            ...itemBase
        },
        completed: {
            ...itemBase
        },

        editing: {
            borderBottom: 'none',
            padding: 0,
            '&:last-child': {
                marginBottom: '-1px'
            }
        },

        edit: {
            backgroundColor: '#F2FFAB',
            display: 'block',
            border: 0,
            position: 'relative',
            fontSize: '24px',
            fontFamily: 'inherit',
            fontWeight: 'inherit',
            lineHeight: '1.4em',
            width: '406px',
            padding: '12px 16px',
            margin: '0 0 0 43px'
        },

        toggle: {
            textAlign: 'center',
            width: '40px',
            /* auto, since non-WebKit browsers doesn't support input styling */
            height: 'auto',
            position: 'absolute',
            top: 0,
            bottom: 0,
            margin: 'auto 0',
            border: 'none', /* Mobile Safari */
            '-webkit-appearance': 'none',
            appearance: 'none',
            opacity: 0,
            '& + label': {
                /*
                    Firefox requires `#` to be escaped - https://bugzilla.mozilla.org/show_bug.cgi?id=922433
                    IE and Edge requires *everything* to be escaped to render, so we do that instead of just the `#` - https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/7157459/
                */
                backgroundImage: `url('data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%22-10%20-18%20100%20135%22%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2250%22%20fill%3D%22none%22%20stroke%3D%22%23ededed%22%20stroke-width%3D%223%22/%3E%3C/svg%3E')`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center left'
            },

            '&:checked + label': {
                backgroundImage: `url('data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%22-10%20-18%20100%20135%22%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2250%22%20fill%3D%22none%22%20stroke%3D%22%23bddad5%22%20stroke-width%3D%223%22/%3E%3Cpath%20fill%3D%22%235dc2af%22%20d%3D%22M72%2025L42%2071%2027%2056l-4%204%2020%2020%2034-52z%22/%3E%3C/svg%3E')`
            }
        },

        viewLabelRegular: {
            ...viewLabelBase
        },

        viewLabelCompleted: {
            ...viewLabelBase,
            color: '#d9d9d9',
            textDecoration: 'line-through'
        },

        destroy: {
            padding: 0,
            border: 0,
            background: 'none',
            verticalAlign: 'baseline',
            display: 'none',
            position: 'absolute',
            right: '10px',
            top: 0,
            bottom: 0,
            width: '40px',
            height: '40px',
            fontSize: '30px',
            margin: 'auto 0',
            color: '#cc9a9a',
            marginBottom: '11px',
            transition: 'color 0.2s ease-out',
            '&:hover': {
                color: '#af5b5e'
            },

            '&:after': {
                content: '\'×\''
            }
        }
    }
}
TodoItemTheme.theme = true

export default function TodoItem(
    {todo}: ITodoProps,
    {itemStore, theme}: {
        theme: NamesOf<typeof TodoItemTheme>;
        itemStore: TodoItemStore;
    }
) {
    return itemStore.todoBeingEdited === todo
        ? <li className={theme.editing}>
            <input
                id="edit"
                ref={itemStore.setEditInputRef}
                className={theme.edit}
                value={itemStore.editText}
                onBlur={itemStore.handleSubmit}
                onInput={itemStore.setText}
                onKeyDown={itemStore.handleKeyDown}
            />
        </li>
        : <li className={todo.completed ? theme.completed : theme.regular}>
            <input
                id="toggle"
                className={theme.toggle}
                type="checkbox"
                checked={todo.completed}
                onInput={itemStore.toggle}
            />
            <label
                className={todo.completed ? theme.viewLabelCompleted : theme.viewLabelRegular}
                id="beginEdit"
                onDblClick={itemStore.beginEdit}>
                {todo.title}
            </label>
            <button className={theme.destroy} id="destroy" onClick={itemStore.handleDestroy} />
        </li>
}
TodoItem.deps = [{itemStore: TodoItemStore, theme: TodoItemTheme}]
TodoItem.props = TodoProps
