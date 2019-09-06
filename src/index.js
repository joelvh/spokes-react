import { Component, createElement, createContext, useContext, useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import isEqual from 'react-fast-compare'
import Spokes from 'spokes'

const SpokesContext = createContext()

export const SpokesConsumer = SpokesContext.Consumer

export function SpokesProvider ({ children, spokes: client, topicName }) {
  const topic = client.broker.topic(topicName)
  const value = {
    client,
    topic,
    publish (key, value) {
      client.debug('SpokesProvider#publish', key, 'value', value)
      return topic.publish(key, value)
    },
    setState (key, value) {
      client.debug('SpokesProvider#setState', key, 'value', value)
      return client.setState(key, value)
    },
    getState (key) {
      const value = client.getState(key)
      client.debug('SpokesProvider#getState', key, 'value', value)
      return value
    }
  }

  return createElement(SpokesContext.Provider, { value }, children)
}

SpokesProvider.propTypes = {
  spokes: PropTypes.object.isRequired,
  topicName: PropTypes.string.isRequired
}

export function createClient (options = {}) {
  return new Spokes({
    debug: true,
    keepHistory: true,
    withLastEvent: true,
    comparer: isEqual,
    ...options
  })
}

const buildKeyHandler = (filterKeys, handler) => ({ key, value }) => {
  if (filterKeys.includes(key)) {
    handler(value, key)
  }
}

// `globalKey` - the key to subscribe to in Spokes global state "topic"
// returns [value, setState(value)]
export function useSpokesState (globalKey) {
  const { client: { stateTopic }, getState, setState } = useContext(SpokesContext)
  const globalValue = getState(globalKey)
  const [localValue, setLocalValue] = useState(globalValue)

  useEffect(() => {
    const subscription = stateTopic.subscribe(
      buildKeyHandler([globalKey], setLocalValue),
      { withLastEvent: false }
    )

    return () => subscription.unsubscribe()
  }, [globalKey])

  return [localValue, value => setState(globalKey, value)]
}

class SpokesComponent extends Component {
  constructor (props) {
    super(props)

    this.subscriptions = []
    this.state = {}

    const { context: { getState } } = props

    this.configure(([topic, map, keys]) => {
      keys.forEach(key => {
        this.state[map[key]] = getState(key)
      })
    })
  }

  configure (configurator) {
    const { context: { topic, client: { stateTopic } }, topicMap, stateMap } = this.props
    const maps = [
      [topic, topicMap, Object.keys(topicMap)],
      [stateTopic, stateMap, Object.keys(stateMap)]
    ]

    maps.forEach(configurator)
  }

  componentDidMount () {
    this.configure(([topic, map, keys]) => {
      if (keys.length) {
        this.subscriptions.push(
          topic.subscribe(buildKeyHandler(keys, (value, key) => {
            this.setState({ [map[key]]: value })
          }), { withLastEvent: true })
        )
      }
    })
  }

  componentWillUnmount () {
    this.subscriptions.forEach(subscription => subscription.unsubscribe())
  }

  render () {
    const { children, component, context, topicMap, stateMap, ...props } = this.props
    return createElement(component, props, children)
  }
}

SpokesComponent.propTypes = {
  component: PropTypes.any.isRequired,
  context: PropTypes.object.isRequired,
  topicMap: PropTypes.object,
  stateMap: PropTypes.object
}

SpokesComponent.defaultProps = {
  topicMap: {},
  stateMap: {}
}

// `publisher` - indicates if additional props for publishing and Spokes state management should be added
// `topic` - map of published events mapped to prop names
// `state` - map of published state changes mapped to prop names
export function withSpokes (component, { prop = 'spokes', topic: topicMap = {}, state: stateMap = {} } = {}) {
  return ({ children, ...props }) => {
    return createElement(SpokesConsumer, null, context => {
      return createElement(SpokesComponent, {
        component,
        context,
        prop,
        topicMap,
        stateMap,
        [prop]: context,
        ...props
      }, children)
    })
  }
}
