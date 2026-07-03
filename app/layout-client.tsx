'use client'

import { Provider } from 'react-redux'
import { store } from '@/lib/store'

export default function RootLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Provider store={store}>
      {children}
    </Provider>
  )
}
