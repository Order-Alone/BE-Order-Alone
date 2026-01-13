import React, { useMemo, useState } from "react";

const pages = [
  { id: "onboarding", label: "Get Started" },
  { id: "menu", label: "Menu" },
  { id: "detail", label: "Product Detail" },
  { id: "cart", label: "Cart" },
  { id: "checkout", label: "Checkout" },
  { id: "success", label: "Success" },
  { id: "tracking", label: "Tracking" },
  { id: "profile", label: "Profile" },
];

const categories = [
  { name: "Burger", icon: "🍔" },
  { name: "Pizza", icon: "🍕" },
  { name: "Momo", icon: "🥟" },
  { name: "Pastry", icon: "🧁" },
];

const deals = [
  { name: "Buff Burger", price: "Rs. 350", image: "🍔" },
  { name: "Chicken Burger", price: "Rs. 320", image: "🍔" },
  { name: "Cheese Momo", price: "Rs. 280", image: "🥟" },
  { name: "Veggie Pizza", price: "Rs. 480", image: "🍕" },
];

const addons = [
  { name: "Mini Donut", image: "🍩" },
  { name: "French Fries", image: "🍟" },
  { name: "Choco Pie", image: "🥧" },
];

const cartItems = [
  { name: "Buff Burger", option: "Extra cheese", price: "Rs. 350", qty: 1, image: "🍔" },
  { name: "Chicken Burger", option: "No onion", price: "Rs. 320", qty: 2, image: "🍔" },
  { name: "Cheese Momo", option: "Spicy", price: "Rs. 280", qty: 1, image: "🥟" },
];

function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button className={`btn btn-primary ${className}`} {...props}>
      {children}
    </button>
  );
}

function SecondaryButton({ children, className = "", ...props }) {
  return (
    <button className={`btn btn-secondary ${className}`} {...props}>
      {children}
    </button>
  );
}

function SearchBar() {
  return (
    <div className="search-bar">
      <span className="search-icon">🔍</span>
      <input placeholder="Search for anything" />
    </div>
  );
}

function CategoryCard({ name, icon, active, onClick }) {
  return (
    <button
      className={`category-card ${active ? "active" : ""}`}
      type="button"
      onClick={onClick}
    >
      <span className="category-icon">{icon}</span>
      <span>{name}</span>
    </button>
  );
}

function PromoBannerCard() {
  return (
    <div className="promo-card">
      <div>
        <p className="promo-title">Friday Offer</p>
        <h3>
          Get <span>FREE COKE</span>
          <br /> on every burger
        </h3>
      </div>
      <div className="promo-visual">
        <span className="promo-bottle">🥤</span>
        <span className="promo-burger">🍔</span>
      </div>
    </div>
  );
}

function ProductCard({ name, price, image }) {
  return (
    <div className="product-card">
      <div className="product-image">{image}</div>
      <div className="product-info">
        <h4>{name}</h4>
        <span className="price">{price}</span>
      </div>
      <button className="add-button" type="button">
        +
      </button>
    </div>
  );
}

function RatingPill({ rating }) {
  return (
    <div className="rating-pill">
      ⭐ {rating}
    </div>
  );
}

function QuantityStepper() {
  return (
    <div className="stepper">
      <button type="button">-</button>
      <span>1</span>
      <button type="button">+</button>
    </div>
  );
}

function AddOnCard({ name, image }) {
  return (
    <div className="addon-card">
      <div className="addon-image">{image}</div>
      <span>{name}</span>
      <button className="addon-plus" type="button">
        +
      </button>
    </div>
  );
}

function BottomTabBar({ active, onChange }) {
  const tabs = [
    { id: "home", label: "홈", icon: "🏠" },
    { id: "search", label: "검색", icon: "🔎" },
    { id: "cart", label: "카트", icon: "🛒", badge: 2 },
    { id: "profile", label: "프로필", icon: "👤" },
  ];
  return (
    <div className="tab-bar">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab-item ${active === tab.id ? "active" : ""}`}
          type="button"
          onClick={() => onChange(tab.id)}
        >
          <span className="tab-icon">
            {tab.icon}
            {tab.badge && <span className="tab-badge">{tab.badge}</span>}
          </span>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("onboarding");
  const [activeCategory, setActiveCategory] = useState("Burger");
  const [activeTab, setActiveTab] = useState("home");

  const pageLabel = useMemo(() => pages.find((item) => item.id === page)?.label, [page]);

  return (
    <div className="app">
      <div className="page-switcher">
        <span>Preview:</span>
        <div className="page-tabs">
          {pages.map((item) => (
            <button
              key={item.id}
              type="button"
              className={page === item.id ? "active" : ""}
              onClick={() => setPage(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`screen ${page}`}>
        {page === "onboarding" && (
          <section className="onboarding">
            <div className="onboarding-card">
              <div className="pizza-ring">
                <span>🍕</span>
              </div>
              <div className="onboarding-text">
                <h1>Delish Delivery</h1>
                <p>따뜻한 음식이 빠르게 도착해요.</p>
              </div>
              <PrimaryButton onClick={() => setPage("menu")}>Get Started</PrimaryButton>
            </div>
          </section>
        )}

        {page === "menu" && (
          <section className="menu">
            <header className="menu-header">
              <div>
                <h1>Menu</h1>
                <p>오늘 뭐 먹지?</p>
              </div>
              <div className="avatar">👩🏻‍🦰</div>
            </header>

            <SearchBar />

            <div className="category-row">
              {categories.map((cat) => (
                <CategoryCard
                  key={cat.name}
                  name={cat.name}
                  icon={cat.icon}
                  active={activeCategory === cat.name}
                  onClick={() => setActiveCategory(cat.name)}
                />
              ))}
            </div>

            <PromoBannerCard />

            <div className="section-title">
              <h2>Today’s Deal</h2>
              <span>See all</span>
            </div>
            <div className="product-grid">
              {deals.map((item) => (
                <ProductCard key={item.name} {...item} />
              ))}
            </div>

            <BottomTabBar active={activeTab} onChange={setActiveTab} />
          </section>
        )}

        {page === "detail" && (
          <section className="detail">
            <div className="detail-hero">
              <button className="back-btn" type="button" onClick={() => setPage("menu")}>
                ←
              </button>
              <div className="hero-image">🍔</div>
            </div>

            <div className="detail-sheet">
              <div className="detail-top">
                <RatingPill rating="4.5" />
                <span className="price">Rs. 350</span>
              </div>
              <div className="detail-title">
                <h2>Buff Burger</h2>
                <QuantityStepper />
              </div>
              <p className="detail-desc">
                Big juicy patty with melted cheese, fresh lettuce and house sauce.
              </p>

              <div className="section-title">
                <h3>Add Ons</h3>
              </div>
              <div className="addon-row">
                {addons.map((item) => (
                  <AddOnCard key={item.name} {...item} />
                ))}
              </div>

              <PrimaryButton className="full">Add to Cart</PrimaryButton>
            </div>
          </section>
        )}

        {page === "cart" && (
          <section className="cart">
            <header className="cart-header">
              <h1>Cart</h1>
              <button className="dots" type="button">⋯</button>
            </header>

            <div className="cart-list">
              {cartItems.map((item) => (
                <div key={item.name} className="cart-card">
                  <div className="cart-thumb">{item.image}</div>
                  <div className="cart-info">
                    <h4>{item.name}</h4>
                    <span>{item.option}</span>
                  </div>
                  <div className="cart-meta">
                    <span className="price">{item.price}</span>
                    <QuantityStepper />
                  </div>
                </div>
              ))}
            </div>

            <div className="summary-card">
              <div>
                <span>Subtotal</span>
                <span>Rs. 950</span>
              </div>
              <div>
                <span>Delivery</span>
                <span>Rs. 60</span>
              </div>
              <div>
                <span>Discount</span>
                <span>- Rs. 50</span>
              </div>
              <div className="total">
                <span>Total</span>
                <span>Rs. 960</span>
              </div>
            </div>

            <PrimaryButton className="full">Checkout</PrimaryButton>
            <button className="link" type="button">Add more items</button>
          </section>
        )}

        {page === "checkout" && (
          <section className="checkout">
            <header>
              <h1>Checkout</h1>
            </header>

            <div className="stack">
              <div className="stack-card">
                <div className="stack-title">
                  <h3>Delivery Address</h3>
                  <button type="button" className="link">Change</button>
                </div>
                <p>123 Rose Street, Kathmandu</p>
              </div>

              <div className="stack-card">
                <h3>Delivery Time</h3>
                <div className="pill-row">
                  <button type="button" className="pill active">ASAP</button>
                  <button type="button" className="pill">Schedule</button>
                </div>
              </div>

              <div className="stack-card">
                <h3>Payment Method</h3>
                <div className="radio-row">
                  <label>
                    <input type="radio" name="payment" defaultChecked /> Card
                  </label>
                  <label>
                    <input type="radio" name="payment" /> Cash
                  </label>
                  <label>
                    <input type="radio" name="payment" /> Wallet
                  </label>
                </div>
              </div>

              <div className="stack-card">
                <h3>Promo Code</h3>
                <div className="promo-row">
                  <input placeholder="Enter code" />
                  <PrimaryButton className="compact">Apply</PrimaryButton>
                </div>
              </div>

              <div className="stack-card">
                <h3>Order Summary</h3>
                <div className="summary-lines">
                  <span>Items (3)</span>
                  <span>Rs. 950</span>
                  <span>Delivery</span>
                  <span>Rs. 60</span>
                  <span>Discount</span>
                  <span>- Rs. 50</span>
                  <span className="total">Total</span>
                  <span className="total">Rs. 960</span>
                </div>
              </div>
            </div>

            <PrimaryButton className="full">Place Order</PrimaryButton>
          </section>
        )}

        {page === "success" && (
          <section className="success">
            <div className="success-badge">✓</div>
            <h1>Order Placed!</h1>
            <p>Your food is on the way</p>
            <div className="success-card">
              <div>
                <span>Order No</span>
                <strong>#ODR-2931</strong>
              </div>
              <div>
                <span>ETA</span>
                <strong>25-30 min</strong>
              </div>
            </div>
            <div className="button-row">
              <PrimaryButton>Track Order</PrimaryButton>
              <SecondaryButton>Back to Home</SecondaryButton>
            </div>
          </section>
        )}

        {page === "tracking" && (
          <section className="tracking">
            <div className="tracking-header">
              <h1>Order Tracking</h1>
              <div className="mini-map">🗺️</div>
            </div>
            <div className="progress">
              {[
                "Preparing",
                "Picked Up",
                "On the Way",
                "Delivered",
              ].map((label, index) => (
                <div key={label} className={`step ${index === 2 ? "active" : ""}`}>
                  <span>✓</span>
                  <p>{label}</p>
                </div>
              ))}
            </div>
            <div className="info-card">
              <h3>Burger House</h3>
              <p>Rider: Suman Rai</p>
              <div className="icon-row">
                <button type="button">📞 Call</button>
                <button type="button">💬 Chat</button>
              </div>
            </div>
          </section>
        )}

        {page === "profile" && (
          <section className="profile">
            <div className="profile-header">
              <div className="profile-avatar">👤</div>
              <h2>Riya Sharma</h2>
              <div className="badge-row">
                <span>⭐ 120 pts</span>
                <span>🎟️ 3 coupons</span>
              </div>
            </div>
            <div className="profile-list">
              {["Orders", "Addresses", "Payments", "Help", "Settings"].map((item) => (
                <div key={item} className="profile-item">
                  <span>{item}</span>
                  <span>›</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <footer className="footer-note">{pageLabel} 화면 미리보기</footer>
    </div>
  );
}
