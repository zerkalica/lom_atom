// @flow

import TodoStore from '../stores/TodoStore'
import ViewStore from '../stores/ViewStore'

import TodoEntry from './TodoEntry'
import TodoOverview from './TodoOverview'
import TodoFooter from './TodoFooter'

interface TodoAppProps {
}

export default function TodoApp(
    {}: TodoAppProps,
    {todoStore, viewStore}: {
        todoStore: TodoStore;
        viewStore: ViewStore
    }
) {
    return <div>
        <header className="header">
            {todoStore.isOperationRunning ? 'Saving...' : 'Idle'}
            <TodoEntry todoStore={todoStore} />
        </header>
        <TodoOverview todoStore={todoStore} viewStore={viewStore} />
        <TodoFooter todoStore={todoStore} viewStore={viewStore} />
    </div>
}

TodoApp.deps = [{todoStore: TodoStore, viewStore: ViewStore}]
TodoApp.provide = (_: TodoAppProps) => {
    const todoStore = new TodoStore()
    return [
        todoStore,
        new ViewStore(todoStore)
    ]
}
