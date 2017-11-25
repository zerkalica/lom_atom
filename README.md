# lom_atom

State management with error handling and reactive cache done right.

Alternative standalone implementation of eigenmethod [mol_atom](https://github.com/eigenmethod/mol/tree/master/atom).

* About 11kb minified
* Memory-efficient
* Simpler, less core concept than mobx
* Loading status / error handling features

Usage examples with [reactive-di](https://github.com/zerkalica/reactive-di): [example source](https://github.com/zerkalica/rdi-examples), [demo](http://zerkalica.github.io/rdi-examples/), [todomvc benchmark](http://mol.js.org/app/bench/#bench=https%3A%2F%2Fzerkalica.github.io%2Ftodomvc%2Fbenchmark%2F/sample=preact-lom-rdi~preact-raw~preact-mobx)

Install ``` npm install --save lom_atom ```

<!-- TOC depthFrom:2 depthTo:6 withLinks:1 updateOnSave:1 orderedList:0 -->

- [Observable property](#observable-property)
- [Observable get/set](#observable-getset)
- [Controlling cache](#controlling-cache)
- [Method-style properties](#method-style-properties)
- [Computed values](#computed-values)
- [Side effects](#side-effects)
- [Key-value](#key-value)
- [Actions](#actions)

<!-- /TOC -->

## Observable property

```js
import {mem} from 'lom_atom'
class Todo {
    @mem title = ''
}
const todo = new Todo()
todo.title = '123'
```

## Observable get/set

```js
import {mem} from 'lom_atom'
class Todo {
    @mem set title(next: string) {
        // test next
    }
    @mem get title(): string {
        return 'default'
    }
}
const todo = new Todo()
todo.title = '123'
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

Lom atom memoized property can interact with upstream (server, etc). Each observable or computed property can be used in 6 cases: get, force get, set, force set, reset, push. Modifiers helps to produce and control side effects for making network requests.


```js
import {mem} from 'lom_atom'

class TodoList {
    @mem set todos(todos: Todo) {
        fetch({
            url: '/todos',
            method: 'POST',
            body: JSON.stringify(todos)
        })
            .catch(error => this.todos = mem.cache(error))

        console.log('set handler')

        throw new mem.Wait()
    }

    @mem get todos() {
        console.log('get handler')

        fetch('/todos')
            .then((data) => this.todos = mem.cache(data))
            .catch(error => this.todos = mem.cache(error))

        throw new mem.Wait()
    }
}
const list = new TodoList()
```

| Modifier usage                      | Description                                            | When call handler                     | Handler                              |
|-------------------------------------|--------------------------------------------------------|---------------------------------------|--------------------------------------|
| ``` store.todos ```                 | Try to get value from cache, if empty - fetch upstream | If cache is empty or upstream changed | ``` get todos (): Todo[] {} ```      |
| ``` store.todos = mem.force() ```   | Reset cache and force load from upstream               | Always                                | ``` get todos (): Todo[] {} ```      |
| ``` store.todos = [] ```            | Set value to upstream                                  | If value is differs from cache        | ``` set todos (todos: Todo[]) {} ``` |
| ``` store.todos = mem.force([]) ``` | Force set value to upstream                            | If value is differs from cache        | ``` set todos (todos: Todo[]) {} ``` |
| ``` store.todos = mem.cache() ```   | Reset cache, but not fetch from upstream               | Never                                 | No                                   |
| ``` store.todos = mem.cache([]) ``` | Save async answer from upstream to cache               | Never                                 | No                                   |
## Key-value

Basic dictionary support. First argument is an key of any type. See eigenmethod [mol_mem](https://github.com/eigenmethod/mol/tree/master/mem).

```js
class TodoList {
    @mem.key todo(id: string, next?: Todo): Todo {
        if (next === undefined) {
            // get mode
            return {}
        }

        return next
    }
}
const list = new TodoList()
list.todo('1', {id: 1, title: 'Todo 1'}) // set todo
list.todo('1') // get todo
```

## Actions

State updates are asynchronous, but sometime we need to do transactional synced updates via action helper:

```js
import {action, mem} from 'lom_atom'
class Some {
    @mem name = ''
    @mem id = ''

    @action set(id: string, name: string) {
        this.id = id
        this.name = name
    }
}
const some = new Some()

// Transactionally changed in current tick:
action(() => {
    some.name = 'test'
    some.id = '123'
})

// or

some.set('123', 'test')
```
