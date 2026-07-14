import { RouterProvider } from 'react-router-dom'
import { router as productionRouter, type createAppRouter } from './router'

type AppProps = {
  router?: ReturnType<typeof createAppRouter>
}

export function App({ router = productionRouter }: AppProps) {
  return <RouterProvider router={router} />
}

export default App
