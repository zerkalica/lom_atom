// @flow

import TodoStore from '../stores/TodoStore'
import ViewStore from '../stores/ViewStore'
import type {ITodo} from '../stores/TodoStore'

import TodoItem from './TodoItem'

export default function TodoOverview(
    {todoStore, viewStore}: {
        todoStore: TodoStore;
        viewStore: ViewStore;
    }
) {
    if (!todoStore.todos.length) {
        return null
    }

    return <section className="main">
        <input
            className="toggle-all"
            type="checkbox"
            onChange={({target}: Event) => todoStore.toggleAll((target: any).checked)}
            checked={todoStore.activeTodoCount === 0}
        />
        <ul className="todo-list">
            {viewStore.filteredTodos.map((todo: ITodo) =>
                <TodoItem
                    key={todo.id}
                    todo={todo}
                    viewStore={viewStore}
                />
            )}
        </ul>
    </section>
}
