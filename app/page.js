import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-orange-600">
                Thakali Express
              </h1>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <Link
                href="/"
                className="text-gray-700 hover:text-orange-600 transition-colors"
              >
                Home
              </Link>

              <Link
                href="/home"
                className="text-gray-700 hover:text-orange-600 transition-colors"
              >
                Menu
              </Link>

              <Link
                href="/contact"
                className="text-gray-700 hover:text-orange-600 transition-colors"
              >
                Contact
              </Link>

              <Link
                href="/userlogin"
                className="px-4 py-2 text-orange-600 border border-orange-600 rounded-lg hover:bg-orange-600 hover:text-white transition-colors"
              >
                Login
              </Link>

              <Link
                href="/signup"
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="text-center md:text-left">
              <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Authentic Thakali
                <span className="text-orange-600 block">
                  Flavors Delivered
                </span>
              </h2>

              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Experience the rich, traditional taste of Thakali cuisine from
                the comfort of your home. Fresh ingredients, authentic recipes,
                delivered hot to your doorstep.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <Link
                  href="/home"
                  className="px-8 py-4 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-all transform hover:scale-105 shadow-lg"
                >
                  Order Now
                </Link>

                <Link
                  href="/home"
                  className="px-8 py-4 bg-white text-orange-600 border-2 border-orange-600 rounded-lg font-semibold hover:bg-orange-50 transition-all"
                >
                  View Menu
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="relative h-96 md:h-[500px] rounded-2xl overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                  <div className="text-center text-white p-8">
                    <div className="text-6xl mb-4">🍛</div>
                    <p className="text-2xl font-bold">
                      Delicious Thakali Meals
                    </p>
                    <p className="text-lg mt-2 opacity-90">
                      Ready to serve you!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Why Choose Thakali Express?
          </h3>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-xl bg-orange-50 hover:shadow-lg transition-shadow">
              <div className="text-5xl mb-4">🚀</div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                Fast Delivery
              </h4>
              <p className="text-gray-600">
                Get your favorite Thakali dishes delivered within 30–45 minutes
              </p>
            </div>

            <div className="text-center p-6 rounded-xl bg-orange-50 hover:shadow-lg transition-shadow">
              <div className="text-5xl mb-4">🍽️</div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                Authentic Taste
              </h4>
              <p className="text-gray-600">
                Traditional recipes passed down through generations
              </p>
            </div>

            <div className="text-center p-6 rounded-xl bg-orange-50 hover:shadow-lg transition-shadow">
              <div className="text-5xl mb-4">🌿</div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                Fresh Ingredients
              </h4>
              <p className="text-gray-600">
                Daily sourced, organic ingredients for the best quality
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Dishes */}
      <section className="py-20 bg-gradient-to-br from-orange-50 to-red-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Popular Dishes
          </h3>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { name: "Thakali Set", price: "Rs. 350", emoji: "🍛" },
              { name: "Dal Bhat", price: "Rs. 280", emoji: "🥘" },
              { name: "Thakali Khana", price: "Rs. 320", emoji: "🍲" },
              { name: "Momo Platter", price: "Rs. 250", emoji: "🥟" },
            ].map((dish, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all transform hover:scale-105 cursor-pointer"
              >
                <div className="text-5xl mb-4 text-center">
                  {dish.emoji}
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2 text-center">
                  {dish.name}
                </h4>
                <p className="text-orange-600 font-bold text-center">
                  {dish.price}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h4 className="text-2xl font-bold text-orange-400 mb-4">
                Thakali Express
              </h4>
              <p className="text-gray-400">
                Bringing authentic Thakali flavors to your doorstep.
              </p>
            </div>

            <div>
              <h5 className="text-lg font-semibold mb-4">Quick Links</h5>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="/" className="hover:text-orange-400">
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/home" className="hover:text-orange-400">
                    Menu
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-orange-400">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h5 className="text-lg font-semibold mb-4">Contact Us</h5>
              <ul className="space-y-2 text-gray-400">
                <li>📞 +977 9800000000</li>
                <li>📧 info@thakaliexpress.com</li>
                <li>📍 Kathmandu, Nepal</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            &copy; 2024 Thakali Express. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
