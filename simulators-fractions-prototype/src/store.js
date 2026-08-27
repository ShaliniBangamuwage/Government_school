import create from 'zustand'

export const useStore = create((set) => ({
  numerator: 1,
  denominator: 4,
  setNumerator: (n) => set({ numerator: n }),
  setDenominator: (d) => set((s) => ({ denominator: d, numerator: Math.min(s.numerator, d) })),
}))

export default useStore
