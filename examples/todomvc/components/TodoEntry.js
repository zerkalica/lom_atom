// @flow

import {mem} from 'lom_atom'

interface IStore {
    addTodo(title: string): void;
}

interface TodoEntryProps {
    todoStore: IStore
}


class TodoToAdd {
    @mem title: string = ''
    _store: IStore

    constructor(todoStore: IStore) {
        this._store = todoStore
    }

    onChange = ({target}: Event) => {
        this.title = (target: any).value
    }

    onKeyDown = (e: Event) => {
        if (e.keyCode === 13 && this.title) {
            this._store.addTodo(this.title)
            this.title = ''
        }
    }
}

export default function TodoEntry(
    _: TodoEntryProps,
    {todoToAdd}: {
        todoToAdd: TodoToAdd;
    }
) {
    return <div>
        <input
            className="new-todo"
            placeholder="What needs to be done?"
            onChange={todoToAdd.onChange}
            value={todoToAdd.title}
            onKeyDown={todoToAdd.onKeyDown}
            autoFocus={true}
        />
    </div>
}
TodoEntry.deps = [{todoToAdd: TodoToAdd}]
TodoEntry.provide = ({todoStore}: TodoEntryProps) => ([
    new TodoToAdd(todoStore)
])
