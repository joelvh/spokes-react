import { createElement, createContext, useContext, useState } from 'react'
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
      client.debug('SpokesProvider publish event', key, 'value', value)
      return topic.publish(key, value)
    },
    setGlobalState (name, value) {
      client.debug('SpokesProvider set state name', name, 'value', value)
      return client.setState(name, value)
    },
    getGlobalState (name) {
      client.debug('SpokesProvider get state name', name)
      return client.getState(name)
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
    keepHistory: true,
    withLastEvent: true,
    comparer: isEqual,
    ...options
  })
}

// `publisher` - indicates if additional props for publishing and Spokes state management should be added
// `topic` - map of published events mapped to prop names
// `state` - map of published state changes mapped to prop names
export function withSpokes ({ prop = 'spokes', topic: topicMap = {}, state: stateMap = {} } = {}) {
  const topicKeys = Object.keys(topicMap)
  const stateKeys = Object.keys(stateMap)

  return component => function Component ({ children, ...props }) {
    const [state, setState] = useState({})
    const context = useContext(SpokesContext)
    const { topic, client } = context

    const maps = [
      [topic, topicMap, topicKeys],
      [client.stateTopic, stateMap, stateKeys]
    ]

    maps.forEach(([topic, map, keys]) => {
      if (!keys.length) {
        return
      }

      const handler = ({ key, value }) => {
        client.debug('withSpokes handling key', key, 'value', value)

        if (keys.includes(key)) {
          const prop = map[key]

          // assumes the value changed
          setState({ ...state, [prop]: value })
        }
      }

      topic.subscribe(handler, { withLastEvent: true })
    })

    const componentProps = {
      [prop]: context,
      ...props,
      ...state
    }

    return createElement(component, componentProps, children)
  }
}
