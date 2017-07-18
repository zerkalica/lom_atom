// @flow

import TodoStore from '../stores/TodoStore'
import ViewStore, {TODO_FILTER} from '../stores/ViewStore'

const links = [
    {
        id: TODO_FILTER.ALL,
        title: 'All'
    },
    {
        id: TODO_FILTER.ACTIVE,
        title: 'Active'
    },
    {
        id: TODO_FILTER.COMPLETE,
        title: 'Completed'
    }
]

function createHandler<V: string>(viewStore: ViewStore, id: V): (e: Event) => void {
    return function handler(e: Event) {
        e.preventDefault()
        viewStore.filter = id
    }
}

export default function TodoFooter(
    {todoStore, viewStore}: {
        todoStore: TodoStore;
        viewStore: ViewStore;
    }
) {
    if (!todoStore.activeTodoCount && !todoStore.completedCount) {
        return null
    }
    const filter = viewStore.filter

    return <footer className="footer">
        <span className="todo-count">
            <strong>{todoStore.activeTodoCount}</strong> item(s) left
        </span>
        <ul className="filters">
            {links.map((link) =>
                <li key={link.id}><a
                    id={`todo-filter-${link.id}`}
                    className={filter === link.id ? 'selected' : ''}
                    href={`?todo_filter=${link.id}`}
                    onClick={createHandler(viewStore, link.id)}
                >{link.title}</a></li>
            )}
        </ul>
        {todoStore.completedCount === 0
            ? null
            : <button
                className="clear-completed"
                onClick={() => todoStore.clearCompleted()}>
                Clear completed
            </button>
        }
    </footer>
}
