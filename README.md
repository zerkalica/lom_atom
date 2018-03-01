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

Lom atom memoized property can interact with upstream (server, etc). Each observable or computed property can be used in 4 cases: get, set, cache set, cache reset. Modifiers helps to produce and control side effects for making network requests.


```js
import {mem} from 'lom_atom'

class TodoList {
    @mem set todos(todos: Todo | Error) {
        fetch({
            url: '/todos',
            method: 'POST',
            body: JSON.stringify(todos)
        })
            .then((data) => mem.cache(this.todos = data))
            .catch(error => mem.cache(this.todos = error))

        console.log('set handler')

        throw new mem.Wait()
    }

    @mem get todos(): Todos {
        console.log('get handler')

        fetch('/todos')
            .then((data) => mem.cache(this.todos = data))
            .catch(error => mem.cache(this.todos = error))

        throw new mem.Wait()
    }

    @mem.manual get user(): IUser {
        fetch('/user')
            .then((data) => mem.cache(this.user = data))
            .catch(error => mem.cache(this.user = error))
    }

    set user(next: IUser | Error) {}

    @mem todosWithUser() {
        return {todos: this.todos, user: this.user}
    }

    @mem todosWithUserParallel() {
        return {todos: mem.async(this.todos), user: mem.async(this.user)}
    }
}
const list = new TodoList()
```

* ``` this.todos ``` - get value, if cache is empty - invokes ``` get todos ``` and actualize cache.
* ``` this.todos =  data ``` - set value, if cache empty - pass value to ``` set todos() {} ``` and actualize cache.
* ``` mem.cache(this.todos = data) ``` - set new value or error directly into cache (push).
* ``` mem.cache(list.todosWithUser) ``` - deep reset cache for todosWithUser all its dependencies (todos) and notify all dependants about changes.
* ``` @mem.manual get user() {...} ``` - exclude user from deep reset. ``` mem.reset(list.todosWithUser) ``` resets todos but not user. If you want to reset user, use helper directly on user: ``` mem.cache(list.user) ```
* ``` mem.async(this.todos) ``` - initiate parallel loading todos and user (wrap error in proxy, do not throw error if data are fetching).

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

Wrapping method in action decorator enables error handling in component event callbacks. Without it, unhandlered exception throws only into console.

State updates are asynchronous, but sometime we need to do transactional synced updates via action helper: ``` @action.sync  ``` (Usable for react input, without it cursor position jumps due to asyncronous state updates)

``` @action.defer ``` runs decorated action on the next tick (Usable for passing valid mounted DOM-node from refs into action in the react).


```js
import {action, mem} from 'lom_atom'
class Some {
    @mem name = ''
    @mem id = ''

    @action set(id: string, name: string) {
        this.id = id
        this.name = name
    }
    @action.sync setSynced(id: string, name: string) {
        this.id = id
        this.name = name
    }
}
const some = new Some()

// View updates on next tick:
some.set('123', 'test')

// View updates in current tick:
some.setSynced('123', 'test2')
```
