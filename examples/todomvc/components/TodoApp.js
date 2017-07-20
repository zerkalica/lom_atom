// @flow
import type {ThemeValues} from 'lom_atom'
import TodoStore from '../stores/TodoStore'
import ViewStore from '../stores/ViewStore'

import TodoEntry from './TodoEntry'
import TodoOverview from './TodoOverview'
import TodoFooter from './TodoFooter'

interface TodoAppProps {
}

const TodoAppTheme = () => ({
    container: {
        border: `1px solid red`
    }
})
TodoAppTheme.theme = true

export default function TodoApp(
    {}: TodoAppProps,
    {todoStore, viewStore, theme}: {
        todoStore: TodoStore;
        viewStore: ViewStore;
        theme: ThemeValues<typeof TodoAppTheme>
    }
) {
    return <div className={theme.container}>
        <header className="header">
            {todoStore.isOperationRunning ? 'Saving...' : 'Idle'}
            <TodoEntry todoStore={todoStore} />
        </header>
        <TodoOverview todoStore={todoStore} viewStore={viewStore} />
        <TodoFooter todoStore={todoStore} viewStore={viewStore} />
    </div>
}

TodoApp.deps = [{todoStore: TodoStore, viewStore: ViewStore, theme: TodoAppTheme}]
TodoApp.provide = (_: TodoAppProps) => {
    const todoStore = new TodoStore()
    return [
        todoStore,
        new ViewStore(todoStore)
    ]
}
