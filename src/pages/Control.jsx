
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Ban,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  CreditCard,
  DollarSign,
  ExternalLink,
  FileWarning,
  LayoutDashboard,
  LockKeyhole,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import "./Control.css";

const ADMIN_EMAIL = "ryanmngm@gmail.com";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "shops", label: "Shops", icon: Building2 },
  { id: "users", label: "Users", icon: Users },
  { id: "revenue", label: "Revenue", icon: CreditCard },
  { id: "reports", label: "Reports", icon: FileWarning },
];

const EMPTY_SEARCH = {
  overview: "",
  shops: "",
  users: "",
  revenue: "",
  reports: "",
};

function formatDate(value, includeTime = false) {
  if (!value) return "Never";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(includeTime
      ? { hour: "numeric", minute: "2-digit" }
      : {}),
  });
}

function money(amount, currency = "usd") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function initials(name) {
  return String(name || "?")
    .split(/[\s@]+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function matches(query, ...values) {
  if (!query.trim()) return true;

  const needle = query.trim().toLowerCase();

  return values
    .flat()
    .some((value) =>
      String(value ?? "")
        .toLowerCase()
        .includes(needle)
    );
}

async function callControl(action, additional = {}) {
  const { data, error } = await supabase.functions.invoke(
    "smooth-function",
    {
      body: { action, ...additional },
    }
  );

  if (error) {
    let message = error.message || "Request failed.";

    try {
      const details = await error.context?.json();
      message = details?.error || message;
    } catch {
      // Keep the original error message.
    }

    throw new Error(message);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}

function ControlLogo() {
  return (
    <div className="control-logo">
      <span className="control-logo-symbol">m.</span>
      <div>
        <strong>moovio</strong>
        <span>CONTROL CENTER</span>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  featured = false,
}) {
  return (
    <div className={`control-metric ${featured ? "featured" : ""}`}>
      <div className="control-metric-top">
        <span>{label}</span>
        <Icon size={19} />
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function EmptyState({ icon: Icon = Search, title, detail }) {
  return (
    <div className="control-empty">
      <Icon size={29} strokeWidth={1.5} />
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  );
}

function Status({ children, type = "neutral" }) {
  return (
    <span className={`control-status ${type}`}>
      <span className="control-status-dot" />
      {children}
    </span>
  );
}

function ControlTable({ headings, children }) {
  return (
    <div className="control-table-scroll">
      <table className="control-table">
        <thead>
          <tr>
            {headings.map((heading) => (
              <th key={heading}>{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function AccessScreen({ error, onRetry, denied = false }) {
  return (
    <div className="control-access">
      <div className="control-access-card">
        <div className="control-access-icon">
          <LockKeyhole size={26} />
        </div>

        <div className="control-access-eyebrow">
          MOOVIO / RESTRICTED ACCESS
        </div>

        <h1>{denied ? "Access denied." : "Sign in required."}</h1>

        <p>
          This area is reserved exclusively for the
          Moovio platform administrator.
        </p>

        {error && <div className="control-error">{error}</div>}

        <div className="control-access-actions">
          {onRetry && (
            <button
              type="button"
              className="control-primary"
              onClick={onRetry}
            >
              Try again <RefreshCw size={16} />
            </button>
          )}

          <a href="/" className="control-secondary">
            <ArrowLeft size={16} />
            Return to Moovio
          </a>
        </div>
      </div>
    </div>
  );
}

export default function Control() {
  const [access, setAccess] = useState("checking");
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("overview");
  const [searches, setSearches] = useState(EMPTY_SEARCH);
  const [refreshing, setRefreshing] = useState(false);
  const [workingId, setWorkingId] = useState(null);
  const [selectedShop, setSelectedShop] = useState(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async (initial = false) => {
    if (!initial) setRefreshing(true);
    setError("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData?.user) {
        setAccess("signed-out");
        return;
      }

      const user = authData.user;

      if (
        user.email !== ADMIN_EMAIL ||
        !user.email_confirmed_at
      ) {
        setAccess("denied");
        return;
      }

      const result = await callControl("snapshot");

      setData(result);
      setAccess("ready");
    } catch (err) {
      setError(err.message || "Unable to load control center.");
      setAccess("error");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(true);
  }, [load]);

  const users = data?.users || [];
  const shops = data?.shops || [];
  const reports = data?.reports || [];
  const invoices = data?.revenue?.invoices || [];
  const revenue = data?.revenue || {};

  const activities = useMemo(() => {
    const entries = [
      ...users.map((user) => ({
        id: `user-${user.id}`,
        icon: Users,
        title: "User registered",
        detail: user.email,
        time: user.created_at,
      })),
      ...reports.map((report) => ({
        id: `report-${report.id}`,
        icon: FileWarning,
        title: "Feedback submitted",
        detail: report.category.replaceAll("_", " "),
        time: report.created_at,
      })),
    ];

    return entries
      .filter((item) => item.time)
      .sort(
        (a, b) =>
          new Date(b.time).getTime() -
          new Date(a.time).getTime()
      )
      .slice(0, 50);
  }, [users, reports]);

  const query = searches[tab] || "";

  const filteredUsers = users.filter((user) =>
    matches(
      query,
      user.name,
      user.email,
      user.id,
      user.memberships?.map((member) => member.shop_name),
      user.memberships?.map((member) => member.role),
      user.banned ? "suspended" : "active",
      user.verified ? "verified" : "unverified"
    )
  );

  const filteredShops = shops.filter((shop) =>
    matches(
      query,
      shop.name,
      shop.id,
      shop.owner_name,
      shop.owner_email,
      shop.beta_accepted ? "accepted" : "pending"
    )
  );

  const filteredReports = reports.filter((report) =>
    matches(
      query,
      report.category,
      report.description,
      report.contact_email,
      report.status
    )
  );

  const filteredInvoices = invoices.filter((invoice) =>
    matches(
      query,
      invoice.number,
      invoice.id,
      invoice.email,
      invoice.currency,
      invoice.status
    )
  );

  const filteredActivities = activities.filter((activity) =>
    matches(
      query,
      activity.title,
      activity.detail,
      activity.time
    )
  );

  const currencies = Object.keys(revenue.totals || {});
  const singleCurrency =
    currencies.length === 1 ? currencies[0] : null;

  const totalCollected = !revenue.connected
    ? "—"
    : singleCurrency
    ? money(revenue.totals[singleCurrency].total, singleCurrency)
    : currencies.length === 0
    ? "$0.00"
    : "Multiple currencies";

  const monthlyCollected = !revenue.connected
    ? "—"
    : singleCurrency
    ? money(revenue.totals[singleCurrency].month, singleCurrency)
    : currencies.length === 0
    ? "$0.00"
    : "Multiple currencies";

  function updateSearch(value) {
    setSearches((previous) => ({
      ...previous,
      [tab]: value,
    }));
  }

  async function changeUser(user, action) {
    if (workingId) return;

    if (user.email === ADMIN_EMAIL) {
      setError("Your platform administrator account is protected.");
      return;
    }

    if (action === "delete") {
      const response = window.prompt(
        `Permanently delete ${user.email}?\n\n` +
        `This is irreversible and may fail if the user has related shop records.\n\n` +
        `Type DELETE ${user.email} to continue.`
      );

    if (response !== "DELETE") return;    } else {
      const message =
        action === "ban"
          ? `Suspend ${user.email}?`
          : `Restore access for ${user.email}?`;

      if (!window.confirm(message)) return;
    }

    setWorkingId(user.id);
    setError("");
    setNotice("");

    try {
      await callControl("manage-user", {
        userId: user.id,
        operation: action,
      });

      setNotice(
        action === "delete"
          ? `${user.email} was deleted.`
          : action === "ban"
          ? `${user.email} was suspended.`
          : `${user.email} was restored.`
      );

      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setWorkingId(null);
    }
  }

  async function updateReport(report, nextStatus) {
    setWorkingId(report.id);
    setError("");
    setNotice("");

    try {
      await callControl("update-report", {
        reportId: report.id,
        status: nextStatus,
      });

      setNotice("Feedback status updated.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setWorkingId(null);
    }
  }

  if (access === "checking") {
    return (
      <div className="control-loading">
        <ControlLogo />
        <div className="control-spinner" />
        <span>AUTHENTICATING ADMINISTRATOR</span>
      </div>
    );
  }

  if (access !== "ready") {
    return (
      <AccessScreen
        denied={access === "denied"}
        error={
          access === "error"
            ? error
            : access === "denied"
            ? "This account is not authorized to access Moovio Control."
            : ""
        }
        onRetry={access === "error" ? () => load(true) : null}
      />
    );
  }

  return (
    <div className="control-page">
      <aside className="control-sidebar">
        <ControlLogo />

        <div className="control-sidebar-heading">PLATFORM</div>

        <nav className="control-nav" aria-label="Control navigation">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`control-nav-button ${
                tab === id ? "active" : ""
              }`}
              onClick={() => {
                setTab(id);
                setSelectedShop(null);
                setError("");
              }}
            >
              <Icon size={19} />
              <span>{label}</span>
              {tab === id && <span className="control-nav-indicator" />}
            </button>
          ))}
        </nav>

        <div className="control-sidebar-footer">
          <div className="control-admin-account">
            <div className="control-admin-avatar">RM</div>
            <div>
              <strong>Platform owner</strong>
              <small>{ADMIN_EMAIL}</small>
            </div>
            <CheckCircle2 size={16} />
          </div>

          <a className="control-back-link" href="/">
            <ArrowLeft size={16} />
            Back to Moovio
          </a>
        </div>
      </aside>

      <main className="control-main">
        <header className="control-topbar">
          <div className="control-topbar-title">
            <span>MOOVIO / ADMINISTRATION</span>
            <h1>
              {TABS.find((item) => item.id === tab)?.label}
              <span className="control-blue-dot">.</span>
            </h1>
          </div>

          <div className="control-topbar-actions">
            <div className="control-security-label">
              <ShieldCheck size={17} />
              PRIVATE ACCESS
            </div>

            <button
              type="button"
              className="control-icon-button"
              title="Refresh data"
              aria-label="Refresh data"
              onClick={() => load()}
              disabled={refreshing}
            >
              <RefreshCw
                size={19}
                className={refreshing ? "control-spinning" : ""}
              />
            </button>
          </div>
        </header>

        <div className="control-content">
          <div className="control-page-intro">
            <div>
              <span className="control-eyebrow">
                {tab === "overview"
                  ? "THE BIG PICTURE"
                  : tab === "shops"
                  ? "BUSINESS ACCOUNTS"
                  : tab === "users"
                  ? "ACCOUNT DIRECTORY"
                  : tab === "revenue"
                  ? "FINANCIAL PERFORMANCE"
                  : "BETA FEEDBACK"}
              </span>

              <p>
                {tab === "overview"
                  ? "Everything happening across your platform."
                  : tab === "shops"
                  ? "Every shop registered with Moovio."
                  : tab === "users"
                  ? "Every account, all in one place."
                  : tab === "revenue"
                  ? "Actual revenue from your connected payment provider."
                  : "Bug reports, suggestions, and support feedback."}
              </p>
            </div>

            <span className="control-data-label">
              <Activity size={15} />
              Live database
            </span>
          </div>

          <div className="control-search-row">
            <div className="control-search">
              <Search size={19} />
              <input
                type="search"
                placeholder={
                  tab === "overview"
                    ? "Search recent activity..."
                    : tab === "shops"
                    ? "Search shops, owners, IDs..."
                    : tab === "users"
                    ? "Search names, emails, roles..."
                    : tab === "revenue"
                    ? "Search invoices, customers..."
                    : "Search reports, categories, emails..."
                }
                value={query}
                onChange={(event) =>
                  updateSearch(event.target.value)
                }
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => updateSearch("")}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <span className="control-last-updated">
              Refreshed {formatDate(data.generated_at, true)}
            </span>
          </div>

          {error && (
            <div className="control-error" role="alert">
              <CircleAlert size={17} />
              {error}
              <button
                type="button"
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                <X size={17} />
              </button>
            </div>
          )}

          {notice && (
            <div className="control-notice" role="status">
              <Check size={17} />
              {notice}
              <button
                type="button"
                onClick={() => setNotice("")}
              >
                <X size={17} />
              </button>
            </div>
          )}

          {data.partial && (
            <div className="control-error">
              Some records exceed the current loading limit.
              Counts and search results may be incomplete.
            </div>
          )}

          {tab === "overview" && (
            <>
              <div className="control-metrics">
                <MetricCard
                  icon={DollarSign}
                  label="Collected revenue"
                  value={totalCollected}
                  detail={
                    revenue.connected
                      ? "Paid Stripe invoices before refunds"
                      : "Stripe not connected"
                  }
                  featured
                />

                <MetricCard
                  icon={Building2}
                  label="Registered shops"
                  value={shops.length.toLocaleString()}
                  detail="Total shop workspaces"
                />

                <MetricCard
                  icon={Users}
                  label="Registered users"
                  value={users.length.toLocaleString()}
                  detail="All signup accounts"
                />

                <MetricCard
                  icon={Activity}
                  label="Active repairs"
                  value={data.stats?.active_repairs ?? 0}
                  detail="Not marked delivered"
                />
              </div>

              <div className="control-overview-grid">
                <section className="control-panel">
                  <div className="control-panel-heading">
                    <div>
                      <span className="control-eyebrow">ACTIVITY</span>
                      <h2>Recent activity</h2>
                    </div>
                    <Clock3 size={19} />
                  </div>

                  {filteredActivities.length === 0 ? (
                    <EmptyState
                      icon={Activity}
                      title="No activity found"
                      detail="New registrations and reports will appear here."
                    />
                  ) : (
                    <div className="control-activity-list">
                      {filteredActivities.slice(0, 12).map((item) => {
                        const Icon = item.icon;

                        return (
                          <div
                            className="control-activity-item"
                            key={item.id}
                          >
                            <div className="control-activity-icon">
                              <Icon size={17} />
                            </div>
                            <div>
                              <strong>{item.title}</strong>
                              <span>{item.detail}</span>
                            </div>
                            <time>{formatDate(item.time)}</time>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className="control-panel">
                  <div className="control-panel-heading">
                    <div>
                      <span className="control-eyebrow">PLATFORM</span>
                      <h2>At a glance</h2>
                    </div>
                    <TrendingUp size={19} />
                  </div>

                  <div className="control-stat-lines">
                    <div>
                      <span>Verified accounts</span>
                      <strong>
                        {users.filter((user) => user.verified).length}
                      </strong>
                    </div>
                    <div>
                      <span>Suspended accounts</span>
                      <strong>
                        {users.filter((user) => user.banned).length}
                      </strong>
                    </div>
                    <div>
                      <span>Beta agreements accepted</span>
                      <strong>
                        {shops.filter((shop) => shop.beta_accepted).length}
                      </strong>
                    </div>
                    <div>
                      <span>Total repair jobs</span>
                      <strong>{data.stats?.total_repairs ?? 0}</strong>
                    </div>
                    <div>
                      <span>Unresolved feedback</span>
                      <strong>
                        {
                          reports.filter(
                            (report) =>
                              report.status !== "resolved" &&
                              report.status !== "closed"
                          ).length
                        }
                      </strong>
                    </div>
                  </div>
                </section>
              </div>
            </>
          )}

          {tab === "shops" && (
            <section className="control-panel">
              <div className="control-panel-heading">
                <div>
                  <span className="control-eyebrow">
                    {filteredShops.length} RESULTS
                  </span>
                  <h2>Registered shops</h2>
                </div>
                <Building2 size={20} />
              </div>

              {filteredShops.length === 0 ? (
                <EmptyState
                  icon={Building2}
                  title="No shops found"
                  detail="Try a different search."
                />
              ) : (
                <ControlTable
                  headings={[
                    "SHOP",
                    "OWNER",
                    "MEMBERS",
                    "REPAIRS",
                    "BETA STATUS",
                    "",
                  ]}
                >
                  {filteredShops.map((shop) => (
                    <tr key={shop.id}>
                      <td>
                        <div className="control-name-cell">
                          <span className="control-avatar shop">
                            <Building2 size={19} />
                          </span>
                          <div>
                            <strong>{shop.name}</strong>
                            <small>{shop.id.slice(0, 8)}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong>{shop.owner_name || "—"}</strong>
                        <small>{shop.owner_email || "No owner listed"}</small>
                      </td>
                      <td>{shop.member_count}</td>
                      <td>{shop.repair_count}</td>
                      <td>
                        <Status
                          type={
                            shop.beta_accepted
                              ? "success"
                              : "warning"
                          }
                        >
                          {shop.beta_accepted
                            ? "Accepted"
                            : "Pending"}
                        </Status>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="control-row-action"
                          onClick={() => setSelectedShop(shop)}
                        >
                          View <ArrowRight size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </ControlTable>
              )}
            </section>
          )}

          {tab === "users" && (
            <section className="control-panel">
              <div className="control-panel-heading">
                <div>
                  <span className="control-eyebrow">
                    {filteredUsers.length} RESULTS
                  </span>
                  <h2>User accounts</h2>
                </div>
                <Users size={20} />
              </div>

              {filteredUsers.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No accounts found"
                  detail="Try searching by name, email, or role."
                />
              ) : (
                <ControlTable
                  headings={[
                    "USER",
                    "SHOP / ROLE",
                    "JOINED",
                    "VERIFICATION",
                    "STATUS",
                    "ACTIONS",
                  ]}
                >
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="control-name-cell">
                          <span className="control-avatar">
                            {initials(user.name || user.email)}
                          </span>
                          <div>
                            <strong>{user.name || "Name not provided"}</strong>
                            <small>{user.email || "No email"}</small>
                          </div>
                        </div>
                      </td>

                      <td>
                        {user.memberships?.length ? (
                          <div className="control-memberships">
                            {user.memberships.map((membership, index) => (
                              <span key={`${membership.shop_id}-${index}`}>
                                {membership.shop_name} · {membership.role}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="control-muted">
                            No shop
                          </span>
                        )}
                      </td>

                      <td>{formatDate(user.created_at)}</td>

                      <td>
                        <Status type={user.verified ? "success" : "warning"}>
                          {user.verified ? "Verified" : "Unverified"}
                        </Status>
                      </td>

                      <td>
                        <Status type={user.banned ? "danger" : "success"}>
                          {user.banned ? "Suspended" : "Active"}
                        </Status>
                      </td>

                      <td>
                        {user.email === ADMIN_EMAIL ? (
                          <span className="control-protected">
                            <ShieldCheck size={15} />
                            Protected
                          </span>
                        ) : (
                          <div className="control-user-actions">
                            <button
                              type="button"
                              disabled={Boolean(workingId)}
                              title={user.banned ? "Restore access" : "Suspend account"}
                              className="control-small-button"
                              onClick={() =>
                                changeUser(
                                  user,
                                  user.banned ? "unban" : "ban"
                                )
                              }
                            >
                              {user.banned ? (
                                <Check size={16} />
                              ) : (
                                <Ban size={16} />
                              )}
                            </button>

                            <button
                              type="button"
                              disabled={Boolean(workingId)}
                              title="Delete account"
                              className="control-small-button danger"
                              onClick={() => changeUser(user, "delete")}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </ControlTable>
              )}
            </section>
          )}

          {tab === "revenue" && (
            <>
              <div className="control-metrics">
                <MetricCard
                  icon={DollarSign}
                  label="Total collected"
                  value={totalCollected}
                  detail="Paid Stripe invoices, before refunds"
                  featured
                />
                <MetricCard
                  icon={TrendingUp}
                  label="This month"
                  value={monthlyCollected}
                  detail="Paid invoices this calendar month (UTC)"
                />
                <MetricCard
                  icon={CreditCard}
                  label="Paid invoices"
                  value={revenue.connected ? invoices.length : "—"}
                  detail="From Stripe"
                />
                <MetricCard
                  icon={CheckCircle2}
                  label="Payment connection"
                  value={revenue.connected ? "Connected" : "Not connected"}
                  detail="Stripe integration status"
                />
              </div>

              {!revenue.connected ? (
                <section className="control-panel">
                  <EmptyState
                    icon={CreditCard}
                    title="Stripe isn't connected yet"
                    detail="When you connect Stripe on the backend, actual invoice revenue will appear here. No sample transactions will be shown."
                  />
                </section>
              ) : (
                <>
                  {revenue.error && (
                    <div className="control-error">
                      {revenue.error}
                    </div>
                  )}

                  {revenue.partial && (
                    <div className="control-error">
                      Invoice history exceeds the current retrieval limit.
                      Displayed totals are incomplete.
                    </div>
                  )}

                  {currencies.length > 1 && (
                    <div className="control-currency-summary">
                      {currencies.map((currency) => (
                        <div key={currency}>
                          <span>{currency.toUpperCase()}</span>
                          <strong>
                            {money(revenue.totals[currency].total, currency)}
                          </strong>
                        </div>
                      ))}
                    </div>
                  )}

                  <section className="control-panel">
                    <div className="control-panel-heading">
                      <div>
                        <span className="control-eyebrow">
                          {filteredInvoices.length} RESULTS
                        </span>
                        <h2>Paid invoices</h2>
                      </div>
                      <CreditCard size={20} />
                    </div>

                    {filteredInvoices.length === 0 ? (
                      <EmptyState
                        icon={CreditCard}
                        title="No invoices found"
                        detail="Invoices will appear here once collected."
                      />
                    ) : (
                      <ControlTable
                        headings={[
                          "INVOICE",
                          "CUSTOMER",
                          "PAID",
                          "AMOUNT",
                          "STATUS",
                        ]}
                      >
                        {filteredInvoices.map((invoice) => (
                          <tr key={invoice.id}>
                            <td>
                              <strong>
                                {invoice.number || invoice.id.slice(0, 14)}
                              </strong>
                            </td>
                            <td>
                              {invoice.email || "Not provided"}
                            </td>
                            <td>{formatDate(invoice.paid_at)}</td>
                            <td>
                              <strong>
                                {money(
                                  invoice.amount_paid,
                                  invoice.currency
                                )}
                              </strong>
                            </td>
                            <td>
                              <Status type="success">Paid</Status>
                            </td>
                          </tr>
                        ))}
                      </ControlTable>
                    )}
                  </section>

                  <p className="control-disclaimer">
                    Revenue shown here comes from paid Stripe invoices,
                    not every possible payment source. Refunds and
                    non-invoice payments aren't deducted or included.
                  </p>
                </>
              )}
            </>
          )}

          {tab === "reports" && (
            <section className="control-panel">
              <div className="control-panel-heading">
                <div>
                  <span className="control-eyebrow">
                    {filteredReports.length} RESULTS
                  </span>
                  <h2>Feedback and reports</h2>
                </div>
                <FileWarning size={20} />
              </div>

              {filteredReports.length === 0 ? (
                <EmptyState
                  icon={FileWarning}
                  title="No feedback found"
                  detail="Reports submitted through Moovio will appear here."
                />
              ) : (
                <ControlTable
                  headings={[
                    "CATEGORY",
                    "DESCRIPTION",
                    "CONTACT",
                    "DATE",
                    "STATUS",
                  ]}
                >
                  {filteredReports.map((report) => (
                    <tr key={report.id}>
                      <td>
                        <strong>
                          {report.category.replaceAll("_", " ")}
                        </strong>
                      </td>
                      <td>
                        <div className="control-report-description">
                          {report.description}
                        </div>
                      </td>
                      <td>{report.contact_email || "—"}</td>
                      <td>{formatDate(report.created_at)}</td>
                      <td>
                        <select
                          className="control-status-select"
                          value={report.status}
                          disabled={Boolean(workingId)}
                          onChange={(event) =>
                            updateReport(report, event.target.value)
                          }
                        >
                          <option value="new">New</option>
                          <option value="reviewing">Reviewing</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </ControlTable>
              )}
            </section>
          )}
        </div>
      </main>

      {selectedShop && (
        <div
          className="control-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedShop(null);
            }
          }}
        >
          <div
            className="control-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="control-shop-heading"
          >
            <div className="control-modal-header">
              <div>
                <span className="control-eyebrow">SHOP DETAILS</span>
                <h2 id="control-shop-heading">
                  {selectedShop.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedShop(null)}
                aria-label="Close shop details"
              >
                <X size={21} />
              </button>
            </div>

            <div className="control-detail-grid">
              <div>
                <span>Employees</span>
                <strong>{selectedShop.member_count}</strong>
              </div>
              <div>
                <span>Repair jobs</span>
                <strong>{selectedShop.repair_count}</strong>
              </div>
            </div>

            <div className="control-detail-section">
              <span className="control-eyebrow">OWNER</span>
              <strong>{selectedShop.owner_name || "Not listed"}</strong>
              <small>{selectedShop.owner_email || "No email found"}</small>
            </div>

            <div className="control-detail-section">
              <span className="control-eyebrow">TEAM MEMBERS</span>
              {selectedShop.members?.length ? (
                selectedShop.members.map((member) => (
                  <div
                    className="control-detail-member"
                    key={member.user_id}
                  >
                    <div>
                      <strong>{member.name || "Name not provided"}</strong>
                      <small>{member.email || "No email"}</small>
                    </div>
                    <Status>{member.role}</Status>
                  </div>
                ))
              ) : (
                <p>No members found.</p>
              )}
            </div>

            <div className="control-detail-section">
              <span className="control-eyebrow">LEGAL STATUS</span>
              <Status
                type={
                  selectedShop.beta_accepted ? "success" : "warning"
                }
              >
                {selectedShop.beta_accepted
                  ? "Beta agreement accepted"
                  : "Beta agreement pending"}
              </Status>
            </div>

            <div className="control-detail-section">
              <span className="control-eyebrow">SHOP ID</span>
              <code>{selectedShop.id}</code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
