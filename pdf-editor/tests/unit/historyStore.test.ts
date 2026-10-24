import { describe, it, expect, beforeEach } from 'vitest'
import { useHistoryStore } from '@/store/historyStore'
import type { AnnotationState } from '@/types/annotation.types'

function makeState(label: string): AnnotationState {
  return {
    byPage: { 0: [{ id: label, pageIndex: 0, type: 'text', x: 0, y: 0, width: 100, height: 30, rotation: 0, opacity: 1, locked: false, text: label, fontFamily: 'Arial', fontSize: 14, fontStyle: 'normal', textDecoration: '', fill: '#000', align: 'left' }] },
    pageOrder: [0],
    pageRotations: { 0: 0 },
  }
}

describe('historyStore', () => {
  beforeEach(() => {
    useHistoryStore.setState({ past: [], future: [] })
  })

  it('starts with empty stacks', () => {
    const { past, future } = useHistoryStore.getState()
    expect(past).toHaveLength(0)
    expect(future).toHaveLength(0)
  })

  it('pushHistory adds to past and clears future', () => {
    const store = useHistoryStore.getState()
    store.pushHistory(makeState('a'))
    store.pushHistory(makeState('b'))
    expect(useHistoryStore.getState().past).toHaveLength(2)
    expect(useHistoryStore.getState().future).toHaveLength(0)
  })

  it('undo moves latest past entry to future', () => {
    const store = useHistoryStore.getState()
    store.pushHistory(makeState('a'))
    store.pushHistory(makeState('b'))
    const result = useHistoryStore.getState().undo()
    expect(result).not.toBeNull()
    expect(result?.byPage[0][0].id).toBe('b')
    expect(useHistoryStore.getState().past).toHaveLength(1)
    expect(useHistoryStore.getState().future).toHaveLength(1)
  })

  it('redo moves future entry back to past', () => {
    const store = useHistoryStore.getState()
    store.pushHistory(makeState('a'))
    store.pushHistory(makeState('b'))
    useHistoryStore.getState().undo()
    const result = useHistoryStore.getState().redo()
    expect(result).not.toBeNull()
    expect(useHistoryStore.getState().past).toHaveLength(2)
    expect(useHistoryStore.getState().future).toHaveLength(0)
  })

  it('pushHistory clears the redo stack', () => {
    const store = useHistoryStore.getState()
    store.pushHistory(makeState('a'))
    store.pushHistory(makeState('b'))
    useHistoryStore.getState().undo()
    expect(useHistoryStore.getState().future).toHaveLength(1)
    useHistoryStore.getState().pushHistory(makeState('c'))
    expect(useHistoryStore.getState().future).toHaveLength(0)
  })

  it('undo on empty stack returns null', () => {
    const result = useHistoryStore.getState().undo()
    expect(result).toBeNull()
  })

  it('redo on empty stack returns null', () => {
    const result = useHistoryStore.getState().redo()
    expect(result).toBeNull()
  })

  it('canUndo and canRedo reflect stack state', () => {
    const store = useHistoryStore.getState()
    expect(store.canUndo()).toBe(false)
    expect(store.canRedo()).toBe(false)
    store.pushHistory(makeState('a'))
    expect(useHistoryStore.getState().canUndo()).toBe(true)
    expect(useHistoryStore.getState().canRedo()).toBe(false)
    useHistoryStore.getState().undo()
    expect(useHistoryStore.getState().canUndo()).toBe(false)
    expect(useHistoryStore.getState().canRedo()).toBe(true)
  })

  it('enforces 50-step maximum — 51st push evicts oldest', () => {
    const store = useHistoryStore.getState()
    for (let i = 0; i < 51; i++) {
      store.pushHistory(makeState(`step-${i}`))
    }
    const { past } = useHistoryStore.getState()
    expect(past).toHaveLength(50)
    // Oldest (step-0) should have been evicted; newest is step-50
    expect(past[0].byPage[0][0].id).toBe('step-1')
    expect(past[49].byPage[0][0].id).toBe('step-50')
  })

  it('clearHistory empties both stacks', () => {
    const store = useHistoryStore.getState()
    store.pushHistory(makeState('a'))
    store.pushHistory(makeState('b'))
    useHistoryStore.getState().undo()
    useHistoryStore.getState().clearHistory()
    expect(useHistoryStore.getState().past).toHaveLength(0)
    expect(useHistoryStore.getState().future).toHaveLength(0)
  })
})
