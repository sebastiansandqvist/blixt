# Blixt

Blixt is a state management library for browser applications. Blixt goes hand-in-hand with a recommended architecture and [cli tools](https://github.com/sebastiansandqvist/blixt-cli) that make it easy to set up and test your applications.

While there is not much code behind it, the Blixt architecture makes it possible to build robust, testable, fast browser applications, and does not lock you into a specific ecosystem of plugins or libraries.

## Abstract Overview

#### Robust Applications

Robust applications do not fall apart when a new developer jumps into old code and adds a feature. Blixt helps make your applications robust in two ways:

1. All application state adheres to a given schema. Having this schema available during development makes it easy to imagine all possible states of your application, which makes adding and changing features easier and less error-prone. Blixt also verifies that your application remains in a valid state any time it's modified (and gives you tools to visualize the changes as they happen).

2. Blixt makes explicit which state is shared in your application, and keeps all the code that is allowed to modify parts of that shared state in one place. When debugging, you need only look at the small subset of your code that can modify a specific branch of your application's state.

#### Testable Applications

A core concept in Blixt is the separation of application state (think of a JSON tree) from the actions that can modify it. You typically want to test an action by asserting that it makes the desired changes to your state tree. With Blixt, within your tests you can create just the subtree you want to test, run your action with that state subtree, and run assertions against the result.

#### Fast Applications

An underrated benefit to using small libraries is the reduced parsing time when they're loaded. The core of Blixt is only ~60 lines of code, and the few  (optional) supporting modules are also small. See for yourself:

* [Blixt Core](https://github.com/sebastiansandqvist/blixt/blob/master/index.js)
* [Blixt Router](https://github.com/sebastiansandqvist/blixt/blob/master/router/index.js)
* [Blixt Types](https://github.com/sebastiansandqvist/s-types/blob/master/index.js)

Execution time in Blixt is also low, partly because there is not much code to execute, and partly because the algorithmic complexity is low.

#### No Lock-In

You can use Blixt with any view library. The examples use [Mithril](https://mithril.js.org), but you can substitute the library of your choice and Blixt will play nicely with it.

The provided router keeps the current route state with your other shared application state, but it is optional. Some applications don't need a clientside router. Some developers will prefer a hash-based router or perhaps the router that their view library makes use of. All of these router options will work with Blixt.

Blixt also allows for automatic type checking that verifies the validity of a state subtree whenever an action is run. However, this type checking is just a function that is called with the contents of the state subtree after each action. You could instead have this function be a logger that displays your state subtree's contents, or a function that runs a diff between the current and previous states and logs that instead.

## Core Concepts

There are only three main things to understand when it comes to Blixt: **state factories**, **actions**, and **modules**. (Modules just combine state factories and actions.)

This brief example will result in the following code:

```js
// state factory
function todoStateFactory() {
  return {
    newTodoText: '',
    todoList: []
  };
}

// optional type checking
const todoSchema = T({
  newTodoText: T.string,
  todoList: T.arrayOf(T.schema({
    done: T.bool,
    text: T.string
  }))
});

// actions
const todoActions = blixt.actions({
  updateText(context, input) {
    // `context` is an object of { state, actions }
    context.state.newTodoText = input;
  },
  addTodo(context) {
    context.state.todoList.push({
      done: false,
      text: context.state.newTodoText
    });
    context.actions.updateText('');
  }
}, todoSchema);

// --------------
// Option 1:
// --------------

// bind actions to an instance of state
const state = todoStateFactory();
const actions = todoActions.bindTo(state);

// call actions that update the
// local `state`
actions.updateText('hello world');
actions.addTodo();

// --------------
// Option 2:
// --------------

// create a module if the state is shared:
const todoModule = (function() {
  const moduleState = todoStateFactory();
  const moduleActions = todoActions.bindTo(moduleState);
  return { state: moduleState, actions: moduleActions };
})();

// initialize Blixt
// (`blixt()` returns an object of bound actions from your modules)
const app = blixt({
  modules: {
    todo: todoModule
  },
  onUpdate(appState, actionName, actionState) {
    // handle updates here (could log results or re-render your views)
  }
});

// call actions that update the shared state
// in app.todo
app.todo.updateText('foo');
app.todo.addTodo();

// get the shared state of the `todo` module
blixt.getState('todo');
/*
  returns:
  {
    newTodoText: '',
    todos: [
      { done: false, text: 'hello world'},
      { done: false, text: 'foo'}
    ]
  }
 */
```

Here you'll find an explanation for each part of that example:

#### State factories

Factories are a well-known javascript pattern, and they are used to generate state subtrees in Blixt. Suppose you have a todo list. Its state might look something like this:

```js
{
  newTodoText: '',
  todoList: [
    { done: false, text: 'Check the mail' },
    { done: true, text: 'Buy groceries' }
  ]
}
```

A state factory is just a function that returns a new state object with that shape. For example:

```js
function todoStateFactory() {
  return {
    newTodoText: '',
    todoList: []
  };
}
```

Since the factory is just a function, you could pass in arguments to have different instances of your todo list initialize with different states.

#### Actions

Actions are functions that can work with a specific type of state. For our todo list example, we could have the following actions:

```js
const todoActions = blixt.actions({
  updateText(context, input) {
    context.state.newTodoText = input;
  },
  addTodo(context) {
    context.state.todoList.push({
      done: false,
      text: context.state.newTodoText
    });
    context.actions.updateText('');
  }
});
```

Actions must then be bound to an instance of some state that they're qualified to operate on. These actions would only work well on a state tree with a `newTodoText` field and a `todoList` array, for example. Binding actions is similar to `Function.prototype.bind`, except that instead of setting `this`, we pass the context in as the first argument of the action instead (since it's more explicit than `this`).

```js
const state = todoStateFactory();
const actions = todoActions.bindTo(state);
```

Now that the actions are bound, you don't have to manually pass in the state object each time you run an action. To set the `newTodoText`, you can run:

```js
actions.updateText('hello world');
```

To add that as a todo, you can run:

```js
actions.addTodo();
```

Notice that in `todoActions`, the first argument is not just the `state` to which the actions are bound. It is a `context` object. This object contains two things:

1. `state`: The state object that the actions are bound to
2. `actions`: The other actions that are bound to that state

Because each action has access to the other bound actions, it is possible for actions to call one another. In this case, we are able to have the `addTodo` action call the `updateText` action directly.

If it isn't clear already: the first argument to each action is its context (an object of `state` and bound `actions`), and all other arguments are whatever arguments the action was called with.

Optionally, when creating actions, you can supply a callback function to be run whenever an action is complete. This was made with type checking in mind, but could be used for other things.

```js
// `T()` comes from the s-types type checking module
// `todoSchema` is a function that is called with the current state object
// after each action -- it ensures that the state adheres to this schema:
const todoSchema = T({
  newTodoText: T.string,
  todoList: T.arrayOf(T.schema({
    done: T.bool,
    text: T.string
  }))
});

// Now we are passing in the typechecker as the second argument
// to blixt.actions()
const todoActions = blixt.actions({
  updateText(context, input) {
    context.state.newTodoText = input;
  },
  addTodo(context) {
    context.state.todoList.push({
      done: false,
      text: context.state.newTodoText
    });
    context.actions.updateText('');
  }
}, todoSchema);
```

You'll see an error in the console if that schema is ever violated. In production, you can disable the type checking by setting `T.disabled` to true.

#### Modules

Modules are used when the actions and state you're working with need to be accessible from multiple parts of your application.

If other parts of your application depend on the todo state in the example above, you would create a module for that state like this:

```js
const todoModule = (function() {
  const state = todoStateFactory();
  const actions = todoActions.bindTo(state);
  return { state, actions };
})();
```

A module is just an object of `{ state, actions }`, where the actions are already bound to that state.

Modules are connected to the application as a whole by passing them to the `blixt` function.

```js
const app = blixt({
  modules: {
    todo: todoModule
  }
})
```

Now it is possible to run:

```js
app.todo.updateText('foo');
app.todo.addTodo();
```

The object passed to the `blixt` function can also contain a method called `onUpdate` that will be called any time an action is run. (Not just the actions in the modules, but *any* action, meaning you could use it to re-render your application's views.) For example:

```js
const app = blixt({
  modules: {
    todo: todoModule
  },
  onUpdate: function(appState, actionName, actionState) {
    console.log(appState); // the state of all shared modules
    console.log(actionName); // the name of the action that ran and caused an update
    console.log(actionState); // the state which the action that ran was bound to (can be null)
    m.redraw(); // if using mithril, re-render the page
    // app state could look something like:
    // { todo: { newTodoText: '', todoList: [] } }
  }
});
```

`onUpdate` runs synchronously after every action, but using the `batch` helper in [`helpers/batch.js`](https://github.com/sebastiansandqvist/blixt/blob/master/helpers/batch.js), you can run `onUpdate` after all actions in the current tick have run. You could also use your own throttle or debounce function instead.

```js
onUpdate: batch(function(appState, actionName, actionState) {
  //...  
})
```

#### `getState()`

Whenever you want to access shared state that was provided to Blixt through your connected modules, you can use `blixt.getState()`.

With no arguments, this returns an object of all the shared state. You can pass arguments to `getState()` to traverse down a path to get just a specific subtree or property. For example, to get the first item in the todo list:

```js
blixt.getState('todo', 'todoList', 0);
// equivalent to blixt.getState()['todo']['todoList'][0];
```