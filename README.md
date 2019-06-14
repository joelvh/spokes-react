# Spokes + React

The `spokes-react` package provides [Spokes](https://github.com/joelvh/spokes) integration into your React app. This allows your webpage and React app to communicate through a shared instance of Spokes to share global state and for pubsub communication.

## Install

`npm install spokes-react --save`

or

`yarn add spokes-react`

## Setup

### Spokes Context Provider

Adding the `SpokesProvider` context provider at the root of your application allows you to specify the instance of Spokes to be referenced by components. Additionally, specify a topic name that is used for pubsub communication within the React app.

```es6
import { createClient, SpokesProvider } from 'spokes-react'
import App from './App'

// use an instance of Spokes from the webpage or create a new one
const spokes = window._spokes || createClient()

ReactDOM.render(
  <SpokesProvider spokes={spokes} topicName='App'>
    <App />
  </SpokesProvider>,
  document.getElementById('root')
)

// optionally set the instance to the window for access by the webpage
window._spokes = spokes
```

The `createClient` helper function creates an instance of Spokes with default options. The `comparer` option allows you to specify a function for comparing values that determine if state values have changed. By default, `react-fast-compare` is used for equality comparison.

```es6
import { createClient, SpokesProvider } from 'spokes-react'
import isEqual from 'react-fast-compare'
import App from './App'

// options passed to `new Spokes(...)`
const spokes = createClient({
  debug: true,
  keepHistory: true,
  withLastEvent: true,
  comparer: isEqual
})

ReactDOM.render(
  <SpokesProvider spokes={spokes} topicName='App'>
    <App />
  </SpokesProvider>,
  document.getElementById('root')
)
```

### Spokes Context Consumer (`withSpokes` HOC)

The `withSpokes` HOC makes it really easy to add Spokes as a prop to any component. Additionally, you can map global state or topic events to props as well.

```es6
import { withSpokes } from 'spokes-react'

function MyComponent ({ spokes, user, campaign }) {
  // `spokes` references the context value
  const {
    // an instance of Spokes
    client,
    // "App" topic
    topic,
    // helper function to publish to topic
    publish,
    // helper function to set global state
    setState,
    // helper function to get global state
    getState
  } = spokes

  return (
    <>
      <h1>Hi {user.name}</h1>
      <p>Thank you for visiting us from {campaign.name}</p>
    </>
  )
}

export default withSpokes(MyComponent, {
  // specify the prop to receive the context value (default: "spokes")
  prop: 'spokes',
  // "App" topic defined in `SpokesProvider`
  topic: {
    // map an event to props
    campaignDetected: 'campaign'
  },
  state: {
    // map global state to props
    currentUser: 'user'
  }
})
```
