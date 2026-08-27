export type PointerPosition = { x: number; y: number }

export type GestureName =
  | 'none'
  | 'index'
  | 'pinch'
  | 'open_palm'
  | 'fist'
  | 'swipe_left'
  | 'swipe_right'

export interface GestureState {
  isEnabled: boolean
  isCameraActive: boolean
  isLocked: boolean
  detectedGesture: GestureName
  pointerPosition: PointerPosition | null
}

export type GestureCallbacks = {
  onSelect?: (pos: PointerPosition) => void
  onDrag?: (delta: { dx: number; dy: number }, pos?: PointerPosition) => void
  onReset?: () => void
  onPreviousStep?: () => void
  onNextStep?: () => void
}
