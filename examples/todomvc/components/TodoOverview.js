// @flow
import type {NamesOf} from 'lom_atom'
import TodoStore from '../stores/TodoStore'
import ViewStore from '../stores/ViewStore'
import type {ITodo} from '../stores/TodoStore'

import TodoItem from './TodoItem'

function TodoOverviewTheme() {
    const toggleAll = {
        outline: 'none',
        position: 'absolute',
        top: '-55px',
        left: '-12px',
        width: '60px',
        height: '34px',
        textAlign: 'center',
        border: 'none', /* Mobile Safari */

        '&:before': {
            content: '\'❯\'',
            fontSize: '22px',
            color: '#e6e6e6',
            padding: '10px 27px 10px 27px'
        },
        '&:checked:before': {
            color: '#737373'
        }
    }

    return {
        main: {
            position: 'relative',
            zIndex: 2,
            borderTop: '1px solid #e6e6e6'
        },
        toggleAll: {
            ...toggleAll
        },
        todoList: {
            margin: 0,
            padding: 0,
            listStyle: 'none'
        },

        /*
        Hack to remove background from Mobile Safari.
        Can't use it globally since it destroys checkboxes in Firefox
        */
        '@media screen and (-webkit-min-device-pixel-ratio:0)': {
            toggleAll: {
                ...toggleAll,
                transform: 'rotate(90deg)',
                appearance: 'none',
                '-webkit-appearance': 'none',
            }
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
        theme: NamesOf<typeof TodoOverviewTheme>;
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
