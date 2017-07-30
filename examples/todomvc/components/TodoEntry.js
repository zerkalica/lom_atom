// @flow

import {mem} from 'lom_atom'
import type {NamesOf} from 'lom_atom'

interface IStore {
    addTodo(title: string): void;
}

interface ITodoEntryProps {
    todoStore: IStore
}

class TodoEntryProps implements ITodoEntryProps {
    todoStore: IStore
}


class TodoToAdd {
    @mem title: string = ''
    _store: IStore

    static deps = [TodoEntryProps]

    constructor({todoStore}: ITodoEntryProps) {
        this._store = todoStore
    }

    onInput = ({target}: Event) => {
        this.title = (target: any).value
    }

    onKeyDown = (e: Event) => {
        if (e.keyCode === 13 && this.title) {
            this._store.addTodo(this.title)
            this.title = ''
        }
    }
}

function TodoEntryTheme() {
    return {
        newTodo: {
            position: 'relative',
            margin: '0',
            width: '100%',
            fontSize: '24px',
            fontFamily: 'inherit',
            fontWeight: 'inherit',
            lineHeight: '1.4em',
            border: '0',
            color: 'inherit',
            padding: '16px 16px 16px 60px',
            border: 'none',
            background: 'rgba(0, 0, 0, 0.003)',
            boxShadow: 'inset 0 -2px 1px rgba(0,0,0,0.03)',
            boxSizing: 'border-box',
            '-webkit-font-smoothing': 'antialiased',
            '-moz-osx-font-smoothing': 'grayscale'
        }
    }
}
TodoEntryTheme.theme = true

export default function TodoEntry(
    _: ITodoEntryProps,
    {todoToAdd, theme}: {
        theme: NamesOf<typeof TodoEntryTheme>;
        todoToAdd: TodoToAdd;
    }
) {
    return <input
        className={theme.newTodo}
        placeholder="What needs to be done?"
        onInput={todoToAdd.onInput}
        value={todoToAdd.title}
        onKeyDown={todoToAdd.onKeyDown}
        autoFocus={true}
    />
}
TodoEntry.deps = [{todoToAdd: TodoToAdd, theme: TodoEntryTheme}]
TodoEntry.props = TodoEntryProps
