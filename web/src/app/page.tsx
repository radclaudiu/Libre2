import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
      <div className="text-center text-white p-8">
        <h1 className="text-5xl font-bold mb-4">QR Restaurant</h1>
        <p className="text-xl mb-8 opacity-90">Sistema de pedidos por QR para restaurantes</p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/admin/login"
            className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            Acceder al Panel
          </Link>
        </div>
      </div>
    </div>
  );
}
