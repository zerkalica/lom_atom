# lom_atom

State management with error handling and reactive cache done right.

Alternative standalone implementation of eigenmethod [mol_atom](https://github.com/eigenmethod/mol/tree/master/atom).

* Tiny size (about 7kb minified)
* Memory-efficient
* Simpler, less core concept than mobx
* Loading status / error handling features

Install ``` npm install --save lom_atom ```

## Observable state

```js
import {mem} from 'lom_atom'
class Todo {
    id = Math.random()
    @mem title = ''
    @mem finished = false
}
```

## Computed values

One decorator for all cases.

```js
class TodoList {
    @mem todos = []
    @mem get unfinishedTodos() {
        return this.todos.filter((todo) => !todo.finished)
    }
}
```

Like mobx, unfinishedTodos is updated automatically when a todo changed.

## Side effects

Like [mobx reaction](https://mobx.js.org/refguide/reaction.html) produces a side effect for making network requests, etc. But side effects in lom are simpler.

```js
class TodoList {
    @mem set todos(todos: Todo | Error) {}

    @mem get todos() {
        // Side effect, cached in mem
        fetch('/todos')
            .then((todos) => {
                this.todos = todos
            })
            .catch(e => this.todos = e)

        throw new mem.Wait()
    }

    @mem get unfinishedTodos() {
        return this.todos.filter((todo) => !todo.finished)
    }
}

class Listener {
    _list = new TodoList()
    @mem listen() {
        try {
            console.log('total todos:', this._list.todos.length)
            console.log('unfinished todos:', this._list.unfinishedTodos.length)
        } catch (e) {
            if (e instanceof mem.Wait) {
                console.log('loading...')
            } else {
                console.error('error', e.message)
            }
        }
    }
}

const listener = new Listener()
listener.listen()
```

## Cache management

Killer feature, grabbed from [mol_atom](https://github.com/eigenmethod/mol). We can reset cache on get or obviously set cache value, using magic force property.

```js
import {force, mem} from 'lom_atom'

class TodoList {
    @force force: TodoList

    @mem set todos(todos: Todo | Error) {
        console.log('set handler')
    }

    @mem get todos() {
        console.log('get handler')
        return [someTodo]
    }
}
const list = new TodoList()

list.todos = [someTodo] // console: set handler
list.todos = [someTodo] // someTodo already set - no handler call

list.force.todos = [someTodo] // force, console: set handler

list.todos // console: get handler

list.todos // return cached value

list.force.todos // console: get handler
```

## Key-value

Basic dictionary support. See eigenmethod [mol_mem](https://github.com/eigenmethod/mol/tree/master/mem).

```js
class TodoList {
    @mem.key todo(id: string, next?: Todo, force?: boolean): Todo {
        if (next === undefined) {
            return {}
        }

        return next
    }
}
const list = new TodoList()
list.todo('1', {id: 1, title: 'Todo 1'}) // set todo
list.todo('1') // get todo
```

## State load/save

```js
class TodosStore {
    @serializable @mem todos []
}
```

save:

```js
const store = new TodosStore()
store.todos.push({id: '1', title: 'todo one'})

store.__lom_state.todos[0].id === '1'

```

load:

```js
const store = new TodosStore()
// setup initial state
store.__lom_state = {
    todos: [{id: 1, title: 'todo one'}]
}

store.todos[0]
```
