import { useAuth } from '../hooks/useAuth'
import Button from '../components/ui/Button'

export default function Auth() {
  const { signInWithGoogle } = useAuth()

  return (
    <div className="h-dvh w-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="text-[13px] font-semibold tracking-wide">HQ</div>
        <Button variant="primary" onClick={signInWithGoogle}>
          Sign in with Google
        </Button>
      </div>
    </div>
  )
}
