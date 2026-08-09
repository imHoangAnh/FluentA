import { Toaster as SonnerToaster } from 'sonner'

function Toaster() {
  return <SonnerToaster position="bottom-right" duration={5000} closeButton richColors visibleToasts={3} />
}

export { Toaster }
