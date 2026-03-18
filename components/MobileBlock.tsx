export default function MobileBlock() {
  return (
    <div className="lg:hidden fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white dark:bg-[#0d0d0d] px-8 text-center">
      <div className="h-10 w-10 rounded-xl bg-[#C7F56F] flex items-center justify-center mb-8">
        <span className="text-sm font-black text-[#1a1a1a]">SF</span>
      </div>
      <div className="text-5xl mb-6">💻</div>
      <h1 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">
        Desktop only.
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
        Dit dashboard werkt alleen op een laptop of desktop. Pak uw computer en kom terug.
      </p>
    </div>
  );
}
