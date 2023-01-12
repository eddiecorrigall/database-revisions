import assert from 'assert'

import { groupBy, mapBy } from '../../lib/map'

describe('map', () => {
  describe('groupBy', () => {
    const stringArray: string[] = ['one', 'two', 'three']
    const numberArray: number[] = [1, 2, 3, 4, 5]
    describe('when given function for grouping items', () => {
      it('returns a map', () => {
        assert.deepEqual(
          groupBy(numberArray, (x: number): number => x % 2),
          {
            0: [2, 4], // even
            1: [1, 3, 5] // odd
          }
        )
      })
    })
    describe('when given property for grouping items', () => {
      it('returns a map', () => {
        assert.deepEqual(
          groupBy(stringArray, 'length'),
          { 3: ['one', 'two'], 5: ['three'] }
        )
      })
    })
    describe('when given empty array', () => {
      it('returns an empty map', () => {
        assert.deepEqual(
          groupBy([], 'length'),
          {}
        )
      })
    })
  })
  describe('mapBy', () => {
    const apple = { name: 'apple', color: 'red, green or yellow' }
    const banana = { name: 'banana', color: 'yellow' }
    const cherry = { name: 'cherry', color: 'red' }
    const orange = { name: 'orange', color: 'orange' }
    const raspberry = { name: 'raspberry', color: 'red' }
    const fruitArray = [apple, banana, cherry, orange, raspberry]
    describe(
      'when given a key property that outputs unique values',
      () => {
        it('should return a map', () => {
          assert.deepEqual(
            mapBy(fruitArray, 'name'),
            {
              apple,
              banana,
              cherry,
              orange,
              raspberry
            }
          )
        })
      }
    )
    describe(
      'when given a key property that outputs duplicate values',
      () => {
        it('should return a map', () => {
          assert.throws(() => {
            mapBy(fruitArray, 'color')
          })
        })
      }
    )
  })
})
