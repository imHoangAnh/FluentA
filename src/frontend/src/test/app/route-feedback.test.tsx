import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { RouteError, RouteLoading } from '@/shared/components/feedback/RouteFeedback'

describe('route feedback', () => {
  it('announces route loading', () => {
    render(<RouteLoading />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading...')
  })

  it('renders an accessible fallback when a lazy route fails', async () => {
    const router = createMemoryRouter([{
      path: '/',
      errorElement: <RouteError />,
      lazy: async () => { throw new Error('Chunk unavailable') },
    }], { initialEntries: ['/'] })

    render(<RouterProvider router={router} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Load failed this page.')
  })
})
