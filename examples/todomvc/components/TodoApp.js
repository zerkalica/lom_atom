// @flow
import type {NamesOf} from 'lom_atom'
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
            border: '1px solid #ededed',
            boxShadow: '0 2px 4px 0 rgba(0, 0, 0, 0.2), 0 25px 50px 0 rgba(0, 0, 0, 0.1)'
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
        theme: NamesOf<typeof TodoAppTheme>
    }
) {
    return <div>
        {/* Loading fix: access data in TodoApp first to throw exception, if no todos loaded */}
        {todoStore.activeTodoCount > 0 ? null : null}
        <div style={{padding: '0.3em 0.5em'}}>{todoStore.isOperationRunning ? 'Saving...' : 'Idle'}</div>
        <div className={theme.todoapp}>
            <header>
                <TodoEntry todoStore={todoStore} />
            </header>
            <TodoOverview todoStore={todoStore} viewStore={viewStore} />
            <TodoFooter todoStore={todoStore} viewStore={viewStore} />
        </div>
    </div>
}

TodoApp.deps = [{todoStore: TodoStore, viewStore: ViewStore, theme: TodoAppTheme}]
