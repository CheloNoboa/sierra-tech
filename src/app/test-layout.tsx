"use client";
import Image from "next/image";

export default function TestLayout() {
	return (
		<div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
			{/* ✅ HEADER */}
			<header className="flex items-center justify-between p-3 bg-gray-800 shadow-md fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-opacity-90">
				<div className="flex items-center space-x-3">
					<button className="md:hidden mr-2 p-2 rounded hover:bg-gray-700 focus:outline-none">
						<span className="block w-5 h-0.5 bg-white mb-1" />
						<span className="block w-5 h-0.5 bg-white mb-1" />
						<span className="block w-5 h-0.5 bg-white" />
					</button>

					<Image
						src="/images/LogoFastFood.png"
						alt="Logo FastFood"
						width={42}
						height={42}
					/>
					<span className="text-lg font-bold text-gray-100">
						Buen Provecho Ñaño
					</span>
				</div>

				<div className="flex items-center space-x-3 ml-auto justify-end">
					<button className="text-gray-200 hover:text-yellow-400 transition text-sm">
						Iniciar Sesión
					</button>
					<button className="text-gray-200 hover:text-yellow-400 transition text-sm">
						Registrarse
					</button>
				</div>
			</header>

			{/* ✅ MAIN */}
			<main className="flex flex-col items-center justify-center flex-1 pt-24 px-6">
				<div className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700 w-full max-w-md mb-12">
					<iframe
						src="https://www.google.com/maps?q=26.6253,-81.6248&z=14&output=embed"
						width="100%"
						height="200"
						style={{ border: 0 }}
						allowFullScreen
						loading="lazy"
						className="rounded-md"
					></iframe>

					<p className="text-sm text-gray-300 mt-3 text-center">
						Lehigh Acres, Florida, Estados Unidos de América
					</p>

					<button className="block w-full mt-3 bg-yellow-600 hover:bg-yellow-700 text-white text-sm py-2 rounded-md font-semibold transition-all">
						Abrir en Google Maps
					</button>
				</div>
			</main>

			{/* ✅ FOOTER */}
			<footer className="w-full bg-gray-800 border-t border-gray-700 py-6 text-gray-400 text-sm text-center">
				© 2025 FastFood App — Buen Provecho Ñaño.
			</footer>
		</div>
	);
}
