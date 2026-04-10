import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

const experiences = [
  {
    id: "pubg",
    label: "PUBG Mobile",
    category: "UC Rewards",
    accent: "orange",
    summary: "Fast claim flow for UC bundles, royale upgrades, and event rewards."
  },
  {
    id: "bgmi",
    label: "BGMI",
    category: "Battle Pass",
    accent: "cyan",
    summary: "Premium BGMI perks with event-ready account delivery details."
  },
  {
    id: "freefire",
    label: "Free Fire",
    category: "Diamond Packs",
    accent: "orange",
    summary: "Top diamond offers, elite pass bundles, and rotating game events."
  },
  {
    id: "coc",
    label: "Clash of Clans",
    category: "Gem Boosts",
    accent: "cyan",
    summary: "Builder boosts, gem support, and seasonal village upgrade packs."
  }
];

const rewardPacks = [
  { id: "starter", value: 60, price: "20 Rs", eta: "2 min" },
  { id: "popular", value: 325, price: "40 Rs", eta: "5 min" },
  { id: "elite", value: 660, price: "50 Rs", eta: "8 min" },
  { id: "pro", value: 1800, price: "60 Rs", eta: "12 min" }
];

const trustStats = [
  { label: "Secure Requests", value: "256K+" },
  { label: "Games Covered", value: "4" },
  { label: "Live Support", value: "24/7" }
];

const defaultGame = experiences[0];
const defaultPack = rewardPacks[1];
const upiId = "9354038063@pthdfc";

const initialForm = {
  game: defaultGame.label,
  productId: defaultPack.id,
  productName: "Popular Pack",
  amount: "325 UC",
  price: defaultPack.price,
  contactGameId: "",
  contactInfo: ""
};

function pageFromHash() {
  if (window.location.hash === "#admin") {
    return "Admin";
  }

  if (window.location.hash === "#payment") {
    return "Payment";
  }

  return "Dashboard";
}

export default function App() {
  const [currentPage, setCurrentPage] = useState(pageFromHash);
  const [selectedExperienceId, setSelectedExperienceId] = useState(defaultGame.id);
  const [claimForm, setClaimForm] = useState(initialForm);
  const [claimState, setClaimState] = useState({ type: "", message: "" });
  const [paymentTicket, setPaymentTicket] = useState("");
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [adminForm, setAdminForm] = useState({ username: "", password: "" });
  const [adminState, setAdminState] = useState({ type: "", message: "" });
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [entries, setEntries] = useState([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);

  const selectedExperience = useMemo(
    () => experiences.find((item) => item.id === selectedExperienceId) ?? defaultGame,
    [selectedExperienceId]
  );

  const currentUnit = useMemo(() => {
    if (selectedExperience.id === "freefire") {
      return "Diamonds";
    }

    if (selectedExperience.id === "coc") {
      return "Gems";
    }

    return "UC";
  }, [selectedExperience]);

  const selectedPack = useMemo(
    () => rewardPacks.find((pack) => pack.id === claimForm.productId) ?? defaultPack,
    [claimForm.productId]
  );

  useEffect(() => {
    function handleHashChange() {
      setCurrentPage(pageFromHash());
    }

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    document.title = `Reward Hub Full Stack - ${currentPage}`;
  }, [currentPage]);

  useEffect(() => {
    if (currentPage !== "Payment") {
      setShowPaymentDetails(false);
    }
  }, [currentPage]);

  useEffect(() => {
    setClaimForm((current) => ({
      ...current,
      game: selectedExperience.label
    }));
  }, [selectedExperience]);

  useEffect(() => {
    setClaimForm((current) => ({
      ...current,
      productId: selectedPack.id,
      productName: `${selectedPack.value} ${currentUnit}`,
      amount: `${selectedPack.value} ${currentUnit}`,
      price: selectedPack.price
    }));
  }, [selectedPack, currentUnit]);

  async function handleClaimSubmit(event) {
    event.preventDefault();
    setClaimState({ type: "pending", message: "Submitting your request..." });

    try {
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(claimForm)
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Unable to submit request.");
      }

      setClaimState({
        type: "success",
        message: `Request received successfully. Ticket: ${payload.orderId}`
      });
      setPaymentTicket(payload.orderId);
      setShowPaymentDetails(false);
      setPaymentDetails({
        game: claimForm.game,
        amount: claimForm.amount,
        price: claimForm.price,
        contactGameId: claimForm.contactGameId,
        contactInfo: claimForm.contactInfo
      });
      window.location.hash = "#payment";
      setClaimForm({
        ...initialForm,
        game: selectedExperience.label,
        productId: selectedPack.id,
        productName: `${selectedPack.value} ${currentUnit}`,
        amount: `${selectedPack.value} ${currentUnit}`,
        price: selectedPack.price
      });
    } catch (error) {
      setPaymentTicket("");
      setClaimState({
        type: "error",
        message: error.message || "Something went wrong while saving your request."
      });
    }
  }

  async function handleAdminLogin(event) {
    event.preventDefault();
    setAdminState({ type: "pending", message: "Authenticating admin access..." });
    setIsAdminAuthenticated(false);

    try {
      const response = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adminForm)
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Invalid admin credentials.");
      }

      setIsAdminAuthenticated(true);
      setAdminState({ type: "success", message: "Access granted. Loading entries..." });
      await loadEntries();
    } catch (error) {
      setAdminState({
        type: "error",
        message: error.message || "Unable to log in right now."
      });
    }
  }

  async function loadEntries() {
    setIsLoadingEntries(true);
    try {
      const response = await fetch("/api/entries");
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Failed to fetch entries.");
      }

      setEntries(payload.entries ?? []);
    } catch (error) {
      setAdminState({
        type: "error",
        message: error.message || "Could not load entries."
      });
    } finally {
      setIsLoadingEntries(false);
    }
  }

  async function updatePaymentStatus(entryId, paymentStatus) {
    try {
      const response = await fetch(`/api/entries/${entryId}/payment-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Failed to update payment status.");
      }

      setEntries((current) =>
        current.map((entry) =>
          (entry._id ?? entry.id) === entryId
            ? { ...entry, paymentStatus: payload.entry.paymentStatus }
            : entry
        )
      );
    } catch (error) {
      setAdminState({
        type: "error",
        message: error.message || "Could not update payment status."
      });
    }
  }

  const paymentAmount = paymentDetails?.price || claimForm.price;
  const paymentUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    "Reward Hub"
  )}&am=${encodeURIComponent(paymentAmount.replace(" Rs", ""))}&cu=INR&tn=${encodeURIComponent(
    paymentTicket || "Reward Hub Order"
  )}`;

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="ambient ambient-three" />

      <div className="browser-frame">
        <div className="browser-body">
          <div className="top-sign">
            <p className="sign-kicker">{currentPage === "Admin" ? "Admin Panel" : "Game Hub"}</p>
            <h1 className="sign-title">
              {currentPage === "Admin" ? "Reward Hub Admin" : selectedExperience.label}
            </h1>
          </div>

          <header className="site-header glass-panel">
            <div className="nav-wrap">
              <div>
                <p className="nav-kicker">Secure Gaming Services</p>
                <a className="brand" href="#dashboard">
                  Reward Hub
                </a>
              </div>
              <nav className="site-nav">
                <a href="#dashboard">Dashboard</a>
                <a href="#catalog">Catalog</a>
                <a href="#request">Request</a>
                <a href="#payment">Payment</a>
                <a href="#admin">Admin</a>
              </nav>
            </div>
          </header>

          {currentPage === "Admin" ? (
            <main className="page-content admin-page">
              <section className="hero-strip glass-panel">
                <div>
                  <p className="eyebrow">Admin Console</p>
                  <h1>Protected Request Review Workspace</h1>
                  <p className="hero-text">
                    Review customer request entries, monitor category demand, and refresh live
                    intake data from the platform database.
                  </p>
                </div>
                <a className="btn btn-secondary" href="#dashboard">
                  Back To Site
                </a>
              </section>

              <section className="admin-grid">
                <div className="glass-panel panel">
                  <p className="eyebrow">Admin Login</p>
                  <h2 className="section-title">Access request history</h2>
                  <form className="form-panel" onSubmit={handleAdminLogin}>
                    <label>
                      <span>Username</span>
                      <input
                        value={adminForm.username}
                        onChange={(event) =>
                          setAdminForm((current) => ({
                            ...current,
                            username: event.target.value
                          }))
                        }
                        required
                      />
                    </label>
                    <label>
                      <span>Password</span>
                      <input
                        type="password"
                        value={adminForm.password}
                        onChange={(event) =>
                          setAdminForm((current) => ({
                            ...current,
                            password: event.target.value
                          }))
                        }
                        required
                      />
                    </label>
                    <button className="btn btn-primary" type="submit">
                      Enter Admin
                    </button>
                    {adminState.message ? (
                      <p className={`status-message ${adminState.type}`}>{adminState.message}</p>
                    ) : null}
                  </form>
                </div>

                <div className="glass-panel panel wide-panel">
                  <div className="table-header">
                    <div>
                      <p className="eyebrow">Live Requests</p>
                      <h2 className="section-title">Recent customer entries</h2>
                    </div>
                    {isAdminAuthenticated ? (
                      <button className="ghost-button" type="button" onClick={loadEntries}>
                        Refresh
                      </button>
                    ) : null}
                  </div>

                  {isLoadingEntries ? <p className="empty-state">Loading entries...</p> : null}
                  {!isLoadingEntries && entries.length === 0 ? (
                    <p className="empty-state">No request entries loaded yet.</p>
                  ) : null}

                  {entries.length > 0 ? (
                    <div className="entry-grid">
                      {entries.map((entry) => (
                        <article key={entry._id ?? entry.id} className="entry-card">
                          <div className="entry-meta">
                            <span className="entry-game">{entry.game}</span>
                            <span className="entry-time">
                              {new Date(entry.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <h3>{entry.productName}</h3>
                          <p>{entry.amount}</p>
                          <div className="payment-status-row">
                            <span
                              className={`status-chip ${
                                (entry.paymentStatus || "Pending").toLowerCase()
                              }`}
                            >
                              {entry.paymentStatus || "Pending"}
                            </span>
                            <select
                              value={entry.paymentStatus || "Pending"}
                              onChange={(event) =>
                                updatePaymentStatus(entry._id ?? entry.id, event.target.value)
                              }
                            >
                              <option value="Pending">Pending</option>
                              <option value="Confirmed">Confirmed</option>
                              <option value="Failed">Failed</option>
                            </select>
                          </div>
                          <small>Player ID: {entry.contactGameId}</small>
                          <small>Contact: {entry.contactInfo}</small>
                        </article>
                      ))}
                    </div>
                  ) : null}
                </div>
              </section>
            </main>
          ) : currentPage === "Payment" ? (
            <main className="page-content payment-page">
              <section className="hero-strip glass-panel">
                <div>
                  <p className="eyebrow">Payment Gateway</p>
                  <h1>Choose a payment app to finish your order</h1>
                  <p className="hero-text">
                    Complete your selected request through a checkout-style payment page with
                    supported wallet and UPI app options.
                  </p>
                </div>
                <a className="btn btn-secondary" href="#dashboard">
                  Back To Dashboard
                </a>
              </section>

              <section className="payment-layout">
                <div className="glass-panel panel">
                  <p className="eyebrow">Available Apps</p>
                  <h2 className="section-title">Select payment method</h2>
                  <div className="checkout-apps">
                    <button type="button" className="checkout-app">
                      <span className="app-badge phonepe-badge">P</span>
                      <div>
                        <strong>PhonePe</strong>
                        <small>UPI and wallet checkout</small>
                      </div>
                    </button>
                    <button type="button" className="checkout-app">
                      <span className="app-badge gpay-badge">G</span>
                      <div>
                        <strong>GPay</strong>
                        <small>Google Pay secure transfer</small>
                      </div>
                    </button>
                    <button type="button" className="checkout-app">
                      <span className="app-badge paytm-badge">P</span>
                      <div>
                        <strong>Paytm</strong>
                        <small>Wallet and UPI payment option</small>
                      </div>
                    </button>
                    <button type="button" className="checkout-app">
                      <span className="app-badge fpay-badge">F</span>
                      <div>
                        <strong>FPay</strong>
                        <small>Fast checkout gateway</small>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="glass-panel panel order-summary">
                  <p className="eyebrow">Order Summary</p>
                  <h2 className="section-title">{paymentDetails?.game || claimForm.game}</h2>
                  <div className="summary-list">
                    <div className="summary-row">
                      <span>Package</span>
                      <strong>{paymentDetails?.amount || claimForm.amount}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Price</span>
                      <strong>{paymentDetails?.price || claimForm.price}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Player ID</span>
                      <strong>{paymentDetails?.contactGameId || "Not provided yet"}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Contact</span>
                      <strong>{paymentDetails?.contactInfo || "Not provided yet"}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Ticket</span>
                      <strong>{paymentTicket || "Pending"}</strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary payment-cta"
                    onClick={() => setShowPaymentDetails(true)}
                  >
                    Continue To Pay
                  </button>
                  {showPaymentDetails ? (
                    <div className="qr-payment-panel">
                      <div className="upi-banner">
                        <span>UPI ID</span>
                        <strong>{upiId}</strong>
                      </div>
                      <div className="qr-wrap">
                        <QRCodeSVG
                          value={paymentUrl}
                          size={210}
                          bgColor="#ffffff"
                          fgColor="#111827"
                          includeMargin
                        />
                      </div>
                      <p className="section-copy qr-copy">
                        Scan this QR code with PhonePe, GPay, Paytm, or any UPI app to continue.
                      </p>
                    </div>
                  ) : null}
                </div>
              </section>
            </main>
          ) : (
            <main className="page-content">
              <section className="hero-panel glass-panel">
                <div className="hero-copy">
                  <p className="eyebrow">Premium Reward Platform</p>
                  <h1>High-trust gaming credits, events, and recharge requests in one hub.</h1>
                  <p className="hero-text">
                    A professional control center for BGMI, PUBG Mobile, Free Fire, Clash of
                    Clans, and mobile recharge requests with a secure dark interface and fast
                    request routing.
                  </p>
                  <div className="hero-actions">
                    <a className="btn btn-primary" href="#request">
                      Start Request
                    </a>
                    <a className="btn btn-secondary" href="#catalog">
                      Explore Catalog
                    </a>
                  </div>
                </div>

                <aside className="hero-sidebar">
                  <div className="signal-card glass-inset">
                    <p className="card-label">Live Reliability</p>
                    <div className="stat-grid">
                      {trustStats.map((item) => (
                        <div key={item.label} className="stat-card">
                          <strong>{item.value}</strong>
                          <span>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="signal-card glass-inset">
                    <p className="card-label">Service Focus</p>
                    <div className="tag-cloud">
                      {experiences.map((item) => (
                        <span key={item.id} className={`tag ${item.accent}`}>
                          {item.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </aside>
              </section>

              <section id="catalog" className="content-grid">
                <div className="section-copy-block">
                  <p className="eyebrow">Service Catalog</p>
                  <h2 className="section-title">Choose a category before submitting details</h2>
                  <p className="section-copy">
                    Each service lane is optimized for a different type of request, from gaming
                    currencies to village upgrades across popular mobile titles.
                  </p>
                </div>

                <div className="experience-grid">
                  {experiences.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`experience-card glass-panel ${
                        item.id === selectedExperienceId ? "active" : ""
                      }`}
                      onClick={() => setSelectedExperienceId(item.id)}
                    >
                      <div className="experience-top">
                        <span className={`dot ${item.accent}`} />
                        <span className="experience-category">{item.category}</span>
                      </div>
                      <h3>{item.label}</h3>
                      <p>{item.summary}</p>
                    </button>
                  ))}
                </div>
              </section>

              <section className="dual-grid">
                <div className="glass-panel panel selected-panel">
                  <p className="eyebrow">Selected Service</p>
                  <h2 className="section-title">{selectedExperience.label}</h2>
                  <p className="section-copy">{selectedExperience.summary}</p>

                  <div className="pack-grid">
                    {rewardPacks.map((pack) => (
                      <button
                        key={pack.id}
                        type="button"
                        className={`pack-card ${pack.id === claimForm.productId ? "active" : ""}`}
                      onClick={() =>
                          setClaimForm((current) => ({
                            ...current,
                            productId: pack.id,
                            productName: `${pack.value} ${currentUnit}`,
                            amount: `${pack.value} ${currentUnit}`,
                            price: pack.price
                          }))
                        }
                      >
                        <span>{pack.value} {currentUnit}</span>
                        <strong>{pack.id === "starter" ? "Starter Drop" : pack.id === "popular" ? "Popular Pack" : pack.id === "elite" ? "Elite Bundle" : "Pro Vault"}</strong>
                        <small>{pack.price}</small>
                        <small>ETA {pack.eta}</small>
                      </button>
                    ))}
                  </div>
                </div>

                <div id="request" className="glass-panel panel">
                  <p className="eyebrow">Request Access</p>
                  <h2 className="section-title">Submit your service request</h2>
                  <form className="form-panel" onSubmit={handleClaimSubmit}>
                    <label>
                      <span>Selected Category</span>
                      <input value={claimForm.game} readOnly />
                    </label>
                    <label>
                      <span>Request Package</span>
                      <select
                        value={claimForm.productId}
                        onChange={(event) =>
                          setClaimForm((current) => ({
                            ...current,
                            productId: event.target.value
                          }))
                        }
                      >
                        {rewardPacks.map((pack) => (
                          <option key={pack.id} value={pack.id}>
                            {pack.value} {currentUnit} • {pack.price}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Price</span>
                      <input value={claimForm.price} readOnly />
                    </label>
                    <label>
                      <span>Game ID / Mobile Number</span>
                      <input
                        value={claimForm.contactGameId}
                        onChange={(event) =>
                          setClaimForm((current) => ({
                            ...current,
                            contactGameId: event.target.value
                          }))
                        }
                        placeholder="Enter player ID or recharge number"
                        required
                      />
                    </label>
                    <label>
                      <span>Email / WhatsApp</span>
                      <input
                        value={claimForm.contactInfo}
                        onChange={(event) =>
                          setClaimForm((current) => ({
                            ...current,
                            contactInfo: event.target.value
                          }))
                        }
                        placeholder="Enter a contact method"
                        required
                      />
                    </label>
                    <button className="btn btn-primary" type="submit">
                      Submit Request
                    </button>
                    {claimState.message ? (
                      <p className={`status-message ${claimState.type}`}>{claimState.message}</p>
                    ) : null}
                  </form>

                </div>
              </section>
            </main>
          )}
        </div>
      </div>
    </div>
  );
}
