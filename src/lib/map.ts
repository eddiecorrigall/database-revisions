type Key = string | number | symbol

export const groupBy = <T>(
  items: T[],
  propertyOrFunction: string | ((item: T) => Key)
): Record<Key, T[]> => {
  return items.reduce(
    (groupMap: Record<Key, T[]>, item: any) => {
      const groupKey: string = typeof propertyOrFunction === 'string'
        ? item[propertyOrFunction]
        : propertyOrFunction(item)
      const groupArray = groupMap[groupKey] ?? []
      groupArray.push(item)
      groupMap[groupKey] = groupArray
      return groupMap
    },
    {}
  )
}

export const mapBy = <T>(
  items: T[],
  propertyOrFunction: string | ((item: T) => Key),
  reduceFunction?: (groupMap: Record<Key, T>, groupKey: Key) => Record<Key, T>
): Record<Key, T> => {
  const groupedAsArray = groupBy(items, propertyOrFunction)
  const defaultReduceFunction = (
    groupMap: Record<Key, T>,
    groupKey: Key
  ): Record<Key, T> => {
    const groupArray = groupedAsArray[groupKey]
    if (groupArray.length !== 1) {
      throw new Error(`map collision for given key "${String(groupKey)}"`)
    }
    groupMap[groupKey] = groupArray[0]
    return groupMap
  }
  return Object.keys(groupedAsArray).reduce(
    reduceFunction ?? defaultReduceFunction,
    {}
  )
}
