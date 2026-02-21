import { sendMagicLink } from '@/actions/auth'

interface LoginPageProps {
  searchParams: Promise<{ success?: string; error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
            <span className="text-xl font-bold text-white">L</span>
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            life-os
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Tu sistema operativo personal
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          {params.success ? (
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <svg
                  className="h-6 w-6 text-green-600 dark:text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                ¡Enlace enviado!
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Revisa tu email y haz click en el enlace mágico para iniciar sesión.
              </p>
            </div>
          ) : (
            <form action={sendMagicLink} className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Iniciar sesión
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Te enviamos un enlace mágico a tu email.
                </p>
              </div>

              {params.error && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                  <p className="text-sm text-red-700 dark:text-red-400">
                    Error al enviar el enlace. Intenta de nuevo.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="tu@email.com"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Enviar enlace mágico
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
