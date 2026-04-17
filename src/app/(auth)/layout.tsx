export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-blue-800 to-blue-950 p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
