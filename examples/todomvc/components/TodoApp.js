// @flow
import type {ThemeValues} from 'lom_atom'
import TodoStore from '../stores/TodoStore'
import ViewStore from '../stores/ViewStore'

import TodoEntry from './TodoEntry'
import TodoOverview from './TodoOverview'
import TodoFooter from './TodoFooter'

interface TodoAppProps {
}

function TodoAppTheme() {
    return {
        todoapp: {
            background: '#fff',
            position: 'relative',
            boxShadow: '0 2px 4px 0 rgba(0, 0, 0, 0.2), 0 25px 50px 0 rgba(0, 0, 0, 0.1)',
            border: `1px solid red`
        },

        '@global': {
            ':focus': {
                outline: 0
            },
            html: {
                margin: 0,
                padding: 0
            },
            body: {
                font: '14px "Helvetica Neue", Helvetica, Arial, sans-serif',
                lineHeight: '1.4em',
                background: '#f5f5f5',
                color: '#4d4d4d',
                minWidth: '230px',
                maxWidth: '550px',
                margin: '0 auto',
                padding: 0,
                '-webkit-font-smoothing': 'antialiased',
                '-moz-osx-font-smoothing': 'grayscale',
                fontWeight: '300'
            }
        }
    }
}
TodoAppTheme.theme = true

export default function TodoApp(
    {}: TodoAppProps,
    {todoStore, viewStore, theme}: {
        todoStore: TodoStore;
        viewStore: ViewStore;
        theme: ThemeValues<typeof TodoAppTheme>
    }
) {
    return <div className={theme.todoapp}>
        <header>
            {todoStore.isOperationRunning ? 'Saving...' : 'Idle'}
            <TodoEntry todoStore={todoStore} />
        </header>
        <TodoOverview todoStore={todoStore} viewStore={viewStore} />
        <TodoFooter todoStore={todoStore} viewStore={viewStore} />
    </div>
}

TodoApp.deps = [{todoStore: TodoStore, viewStore: ViewStore, theme: TodoAppTheme}]
// TodoApp.provide = (_: TodoAppProps) => {
//     const todoStore = new TodoStore()
//     return [
//         todoStore,
//         new ViewStore(todoStore)
//     ]
// }
