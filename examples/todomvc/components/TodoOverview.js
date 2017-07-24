// @flow
import type {ThemeValues} from 'lom_atom'
import TodoStore from '../stores/TodoStore'
import ViewStore from '../stores/ViewStore'
import type {ITodo} from '../stores/TodoStore'

import TodoItem from './TodoItem'

function TodoOverviewTheme() {
    return {
        main: {
            position: 'relative',
            zIndex: 2,
            borderTop: '1px solid #e6e6e6'
        },
        toggleAll: {
            textAlign: 'center',
            border: 'none',
            opacity: 0,
            position: 'absolute',
            '& + label:before': {
                content: '\'❯\'',
                fontSize: '22px',
                color: '#e6e6e6',
                padding: '10px 27px 10px 27px'
            },
            '&:checked + label:before': {
                color: '#737373'
            },
            '& + label': {
                width: '60px',
                height: '34px',
                fontSize: 0,
                position: 'absolute',
                top: '-52px',
                left: '-13px',
                '-webkit-transform': 'rotate(90deg)',
                transform: 'rotate(90deg)'
            }
        },
        todoList: {
            margin: 0,
            padding: 0,
            listStyle: 'none'
        }
    }
}
TodoOverviewTheme.theme = true

export default function TodoOverview(
    {todoStore, viewStore}: {
        todoStore: TodoStore;
        viewStore: ViewStore;
    },
    {theme}: {
        theme: ThemeValues<typeof TodoOverviewTheme>;
    }
) {
    if (!todoStore.todos.length) {
        return null
    }

    return <section className={theme.main}>
        <input
            className={theme.toggleAll}
            type="checkbox"
            onChange={({target}: Event) => todoStore.toggleAll((target: any).checked)}
            checked={todoStore.activeTodoCount === 0}
        />
        <ul className={theme.todoList}>
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
TodoOverview.deps = [{theme: TodoOverviewTheme}]
