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
- [Force mode cache management](#force-mode-cache-management)
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

## Force mode cache management

Killer feature, grabbed from [mol_atom](https://github.com/eigenmethod/mol). We can reset cache on get or obviously set cache value, using magic force property.

On set value: force mode talk lom to pass value through set handler. On get value: invoke handler with ``` undefined, true ``` and reset cache.

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

## Method-style properties

In this form we can change value on set. Less magic, than regular properties.

```js
import {action, mem} from 'lom_atom'
class Some {
    @force $: Some
    @mem name(next?: string, force?: boolean): string {
        // if next !== undefined - set mode
        if (next !== undefined) return next
        return 'default value'
    }
}
const some = new Some()
some.name() === 'default value'

some.name('new value') // Set value directly into atom cache, some.name() handler not called
some.name() === 'new value'

some.name('val', true) // Pass value through some.name() handler and set result into cache

some.name(undefined, true) === 'default value' // Invoke some.name() handler and reset to default value
```

``` some.force.name(val) ``` alias of ``` some.name(val, true) ```

And ``` some.force.name() ``` alias of ``` some.name(undefined, true) ```

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

Listener.listen throws errors on todo list store property access, if todo list loading finished with erorr or loading in progress.

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

## Key-value

Basic dictionary support. First argument is an key of any type. See eigenmethod [mol_mem](https://github.com/eigenmethod/mol/tree/master/mem).

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
