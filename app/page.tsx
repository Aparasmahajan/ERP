export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-white mb-4">Hexaframe ERP</h1>
        <p className="text-xl text-slate-300 mb-8">Multi-tenant Portal • Excel Backend (MVP)</p>
        <div className="space-y-4">
          <a
            href="/setup"
            className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
          >
            Initialize Tenant
          </a>
        </div>
      </div>
    </main>
  );
}
