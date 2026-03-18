import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-8">
      <p className="text-8xl font-black text-[#C7F56F] mb-4">404</p>
      <h1 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">
        Deze pagina bestaat niet.
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-xs">
        Misschien is de URL verkeerd of is de pagina verwijderd.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-[#C7F56F] px-5 py-2.5 text-sm font-semibold text-[#1a1a1a] hover:bg-[#b8e85e] transition-colors"
      >
        Terug naar dashboard
      </Link>
    </div>
  );
}
