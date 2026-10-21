
import { useEffect, useMemo, useState } from "react";
import {
  CarFront,
  Check,
  ChevronDown,
  Clock3,
  Link2,
  Plus,
  Search,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { supabase } from "../lib/supabase";

const STAGES = [
  ["checked_in", "Checked in"],
  ["estimating", "Estimating"],
  ["waiting_parts", "Waiting on parts"],
  ["in_repair", "In repair"],
  ["paint", "Paint"],
  ["quality_check", "Quality check"],
  ["ready", "Ready for pickup"],
  ["delivered", "Delivered"],
];

export default function Dashboard({
  shop,
  jobs,
  setJobs,
  loading,
  onNewJob,
  onOpenRepair,
  onTracking,
}) {
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);

  const stats = useMemo(
    () => ({
      total: jobs.length,
      active: jobs.filter(
        (job) => !["ready", "delivered"].includes(job.status)
      ).length,
      ready: jobs.filter((job) => job.status === "ready").length,
      delivered: jobs.filter(
        (job) => job.status === "delivered"
      ).length,
    }),
    [jobs]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return jobs;

    return jobs.filter((job) =>
      [
        job.customer_name,
        job.vehicle_year,
        job.vehicle_make,
        job.vehicle_model,
        job.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [jobs, search]);

  async function changeStatus(job, status) {
    setSavingId(job.id);
    setError("");

    const { data, error } = await supabase
      .from("repair_jobs")
      .update({ status })
      .eq("id", job.id)
      .eq("shop_id", shop.id)
      .select()
      .single();

    if (error) setError(error.message);
    else {
      setJobs((previous) =>
        previous.map((item) =>
          item.id === job.id ? data : item
        )
      );
    }

    setSavingId(null);
  }

  return (
    <main className="dashboard-main">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">YOUR SHOP AT A GLANCE</span>
          <h1>
            Keep things <span>mooving.</span>
          </h1>
          <p>
            Everything happening in your shop,
            all in one place.
          </p>
        </div>

        <button
          className="primary-button new-job-button"
          onClick={onNewJob}
        >
          <Plus size={18} />
          New repair
        </button>
      </div>

      <div className="stats-grid">
        {[
          ["Total repairs", stats.total, CarFront, "ALL TIME / 001"],
          ["In progress", stats.active, Wrench, "ACTIVE / 002"],
          ["Ready for pickup", stats.ready, Check, "READY / 003"],
          ["Delivered", stats.delivered, ShieldCheck, "COMPLETE / 004"],
        ].map(([label, value, Icon, caption]) => (
          <div className="stat-card" key={label}>
            <div className="stat-top">
              <span>{label}</span>
              <Icon size={20} />
            </div>
            <strong>{value}</strong>
            <span className="stat-index">{caption}</span>
          </div>
        ))}
      </div>

      <div className="repairs-heading">
        <div>
          <span className="eyebrow">CURRENT WORKLOAD</span>
          <h2>
            Repair board <span>({jobs.length})</span>
          </h2>
        </div>

        <div className="search-field">
          <Search size={17} />
          <input
            value={search}
            placeholder="Search repairs..."
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="form-message" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="empty-state">
          <h3>Loading repairs...</h3>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <CarFront size={29} />
          </div>
          <h3>{search ? "No matching repairs." : "No repairs yet."}</h3>
          <p>
            {search
              ? "Try a different search."
              : "Add your first vehicle to get started."}
          </p>
        </div>
      ) : (
        <div className="jobs-list">
          <div className="jobs-list-header">
            <span>VEHICLE / CUSTOMER</span>
            <span>CREATED</span>
            <span>REPAIR STATUS</span>
            <span>CUSTOMER ACCESS</span>
          </div>

          {filtered.map((job) => (
            <div className="job-row" key={job.id}>
              <button
                type="button"
                className="job-vehicle repair-open-button"
                onClick={() => onOpenRepair(job)}
              >
                <div className="vehicle-icon">
                  <CarFront size={22} />
                </div>

                <div>
                  <strong>
                    {[
                      job.vehicle_year,
                      job.vehicle_make,
                      job.vehicle_model,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  </strong>
                  <small>{job.customer_name}</small>
                </div>
              </button>

              <div className="job-date">
                {new Date(job.created_at).toLocaleDateString()}
              </div>

              <div className="status-wrap">
                <select
                  className="status-select"
                  value={job.status}
                  disabled={savingId === job.id}
                  onChange={(event) =>
                    changeStatus(job, event.target.value)
                  }
                >
                  {STAGES.map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} />
              </div>

              <button
                className="customer-link-button"
                onClick={() => onTracking(job)}
              >
                <Link2 size={16} />
                Tracking link
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="dashboard-foot">
        <Clock3 size={15} />
        Repair progress is updated by your shop.
      </div>
    </main>
  );
}
