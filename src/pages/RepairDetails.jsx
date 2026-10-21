
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Camera,
  Check,
  Clock3,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  X,
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

export default function RepairDetails({
  job,
  shop,
  user,
  onBack,
  onUpdated,
}) {
  const [description, setDescription] = useState(
    job.description ?? ""
  );
  const [status, setStatus] = useState(job.status);
  const [completion, setCompletion] = useState(
    job.estimated_completion ?? ""
  );

  const [updates, setUpdates] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [photoUrls, setPhotoUrls] = useState({});

  const [note, setNote] = useState("");
  const [notePublic, setNotePublic] = useState(false);
  const [photoPublic, setPhotoPublic] = useState(false);

  const [role, setRole] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingBody, setEditingBody] = useState("");
  const [editingPublic, setEditingPublic] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const isManager = role === "owner" || role === "admin";

  const load = useCallback(async () => {
    const [updatesResult, photosResult] = await Promise.all([
      supabase
        .from("repair_updates")
        .select("*")
        .eq("job_id", job.id)
        .eq("shop_id", shop.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("repair_photos")
        .select("*")
        .eq("job_id", job.id)
        .eq("shop_id", shop.id)
        .order("created_at", { ascending: false }),
    ]);

    if (updatesResult.error || photosResult.error) {
      throw new Error(
        updatesResult.error?.message ??
          photosResult.error?.message
      );
    }

    setUpdates(updatesResult.data ?? []);
    setPhotos(photosResult.data ?? []);

    const nextUrls = {};

    await Promise.all(
      (photosResult.data ?? []).map(async (photo) => {
        const { data, error: urlError } =
          await supabase.storage
            .from("repair-photos")
            .createSignedUrl(photo.storage_path, 3600);

        if (!urlError && data?.signedUrl) {
          nextUrls[photo.id] = data.signedUrl;
        }
      })
    );

    setPhotoUrls(nextUrls);
  }, [job.id, shop.id]);

  useEffect(() => {
    let active = true;

    async function initialize() {
      const { data, error: roleError } = await supabase
        .from("shop_members")
        .select("role")
        .eq("shop_id", shop.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (active) {
        if (roleError) setError(roleError.message);
        else setRole(data?.role ?? "");
      }

      try {
        await load();
      } catch (err) {
        if (active) setError(err.message);
      }
    }

    initialize();

    return () => {
      active = false;
    };
  }, [load, shop.id, user.id]);

  function clearFeedback() {
    setError("");
    setMessage("");
  }

  async function saveRepair(event) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    clearFeedback();

    try {
      const { data, error: saveError } = await supabase
        .from("repair_jobs")
        .update({
          description: description.trim() || null,
          status,
          estimated_completion: completion || null,
        })
        .eq("id", job.id)
        .eq("shop_id", shop.id)
        .select("*")
        .single();

      if (saveError) throw saveError;

      setMessage("Repair saved.");
      onUpdated?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function addUpdate(event) {
    event.preventDefault();
    if (busy || !note.trim()) return;

    setBusy(true);
    clearFeedback();

    try {
      const { error: insertError } = await supabase
        .from("repair_updates")
        .insert({
          job_id: job.id,
          shop_id: shop.id,
          author_id: user.id,
          body: note.trim(),
          customer_visible: notePublic,
        });

      if (insertError) throw insertError;

      setNote("");
      setNotePublic(false);

      await load();
      setMessage("Progress update added.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function startEditing(update) {
    clearFeedback();
    setEditingId(update.id);
    setEditingBody(update.body);
    setEditingPublic(update.customer_visible);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingBody("");
    setEditingPublic(false);
  }

  async function saveUpdate(event) {
    event.preventDefault();

    if (busy || !editingId || !editingBody.trim()) return;

    setBusy(true);
    clearFeedback();

    try {
      const { data, error: updateError } = await supabase
        .from("repair_updates")
        .update({
          body: editingBody.trim(),
          customer_visible: editingPublic,
        })
        .eq("id", editingId)
        .eq("job_id", job.id)
        .eq("shop_id", shop.id)
        .select("id")
        .single();

      if (updateError) throw updateError;
      if (!data) throw new Error("Update was not saved.");

      cancelEditing();
      await load();
      setMessage("Progress update saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadPhotos(event) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (!files.length || busy) return;

    setBusy(true);
    clearFeedback();

    try {
      for (const file of files) {
        if (
          !["image/jpeg", "image/png", "image/webp"].includes(
            file.type
          )
        ) {
          throw new Error(
            "Only JPG, PNG, and WebP images are supported."
          );
        }

        if (file.size > 10 * 1024 * 1024) {
          throw new Error("Each photo must be under 10 MB.");
        }

        const extension = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
        }[file.type];

        const path =
          `${shop.id}/${job.id}/` +
          `${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("repair-photos")
          .upload(path, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase
          .from("repair_photos")
          .insert({
            shop_id: shop.id,
            job_id: job.id,
            uploaded_by: user.id,
            storage_path: path,
            customer_visible: photoPublic,
          });

        if (dbError) {
          await supabase.storage
            .from("repair-photos")
            .remove([path]);

          throw dbError;
        }
      }

      setPhotoPublic(false);
      await load();
      setMessage("Photos uploaded.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function deletePhoto(photo) {
    if (!isManager || busy) return;

    const confirmed = window.confirm(
      "Permanently delete this repair photo? " +
        "It will also disappear from customer tracking."
    );

    if (!confirmed) return;

    setBusy(true);
    clearFeedback();

    try {
      // Remove the database record first so the customer
      // tracking RPC immediately stops returning this photo.
      const { data, error: deleteError } = await supabase
        .from("repair_photos")
        .delete()
        .eq("id", photo.id)
        .eq("job_id", job.id)
        .eq("shop_id", shop.id)
        .select("id")
        .single();

      if (deleteError) throw deleteError;
      if (!data) throw new Error("Photo was not deleted.");

      // Delete the underlying private Storage object.
      const { error: storageError } = await supabase.storage
        .from("repair-photos")
        .remove([photo.storage_path]);

      await load();

      if (storageError) {
        setError(
          "Photo removed from the repair, but its Storage " +
            "file could not be deleted: " +
            storageError.message
        );
      } else {
        setMessage("Photo deleted.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="dashboard-main repair-details-main">
      <button
        className="text-button repair-back"
        type="button"
        onClick={onBack}
      >
        <ArrowLeft size={17} />
        Back to repairs
      </button>

      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">REPAIR / DETAILS</span>
          <h1>
            {job.vehicle_year} {job.vehicle_make}{" "}
            <span>{job.vehicle_model}.</span>
          </h1>
          <p>{job.customer_name}</p>
        </div>
      </div>

      {error && (
        <div className="form-message" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="form-message" role="status">
          {message}
        </div>
      )}

      <section className="repair-panel">
        <span className="eyebrow">REPAIR INFORMATION</span>
        <h2>Vehicle details.</h2>

        <form className="form-stack" onSubmit={saveRepair}>
          <label>
            Repair description
            <textarea
              rows={5}
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              placeholder="Describe the damage and work required..."
            />
          </label>

          <div className="form-grid">
            <label>
              Current status
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value)
                }
              >
                {STAGES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Estimated completion
              <input
                type="date"
                value={completion}
                onChange={(event) =>
                  setCompletion(event.target.value)
                }
              />
            </label>
          </div>

          <button className="primary-button" disabled={busy}>
            <Save size={17} />
            Save repair
          </button>
        </form>
      </section>

      <section className="repair-panel">
        <span className="eyebrow">VISUAL PROGRESS</span>
        <h2>Repair photos ({photos.length})</h2>
        <p>Upload damage, repair, and completion photos.</p>

        <label className="repair-visibility">
          <input
            type="checkbox"
            checked={photoPublic}
            onChange={(event) =>
              setPhotoPublic(event.target.checked)
            }
          />
          Make new photos visible to the customer
        </label>

        <label className="repair-upload-button">
          <Camera size={18} />
          {busy ? "Please wait..." : "Upload photos"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={busy}
            onChange={uploadPhotos}
            hidden
          />
        </label>

        <div className="repair-photo-grid">
          {photos.map((photo) => (
            <div
              className="repair-photo-card"
              key={photo.id}
              style={{ position: "relative" }}
            >
              {isManager && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => deletePhoto(photo)}
                  title="Delete photo"
                  aria-label="Delete photo"
                  style={{
                    position: "absolute",
                    top: 9,
                    right: 9,
                    zIndex: 2,
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    border: "1px solid rgba(255,255,255,.25)",
                    background: "rgba(0,0,0,.75)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: busy ? "wait" : "pointer",
                  }}
                >
                  <X size={17} />
                </button>
              )}

              {photoUrls[photo.id] ? (
                <img
                  src={photoUrls[photo.id]}
                  alt={photo.caption || "Repair progress"}
                  loading="lazy"
                />
              ) : (
                <div className="repair-photo-placeholder">
                  Photo unavailable
                </div>
              )}

              <div className="repair-photo-meta">
                <span>
                  {photo.customer_visible ? (
                    <>
                      <Check size={14} /> Customer-visible
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={14} /> Private
                    </>
                  )}
                </span>

                <small>
                  {new Date(
                    photo.created_at
                  ).toLocaleDateString()}
                </small>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="repair-panel">
        <span className="eyebrow">WORK HISTORY</span>
        <h2>Progress updates.</h2>

        <form className="form-stack" onSubmit={addUpdate}>
          <label>
            New update
            <textarea
              rows={4}
              required
              maxLength={5000}
              value={note}
              onChange={(event) =>
                setNote(event.target.value)
              }
              placeholder="What happened with this repair today?"
            />
          </label>

          <label className="repair-visibility">
            <input
              type="checkbox"
              checked={notePublic}
              onChange={(event) =>
                setNotePublic(event.target.checked)
              }
            />
            Show this update on the customer's tracking page
          </label>

          <button className="primary-button" disabled={busy}>
            <Plus size={18} />
            Add progress update
          </button>
        </form>

        <div className="repair-update-list">
          {updates.map((update) => {
            const canEdit =
              isManager || update.author_id === user.id;

            return (
              <div className="repair-update" key={update.id}>
                <div className="repair-update-heading">
                  <span>
                    <Clock3 size={15} />
                    {new Date(
                      update.created_at
                    ).toLocaleString()}
                  </span>

                  <span>
                    {update.customer_visible
                      ? "CUSTOMER-VISIBLE"
                      : "PRIVATE"}
                  </span>
                </div>

                {editingId === update.id ? (
                  <form
                    className="form-stack"
                    onSubmit={saveUpdate}
                    style={{ marginTop: 14 }}
                  >
                    <label>
                      Edit update
                      <textarea
                        rows={4}
                        required
                        maxLength={5000}
                        value={editingBody}
                        onChange={(event) =>
                          setEditingBody(event.target.value)
                        }
                      />
                    </label>

                    <label className="repair-visibility">
                      <input
                        type="checkbox"
                        checked={editingPublic}
                        onChange={(event) =>
                          setEditingPublic(
                            event.target.checked
                          )
                        }
                      />
                      Show this update to the customer
                    </label>

                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        className="primary-button"
                        disabled={
                          busy || !editingBody.trim()
                        }
                      >
                        <Save size={16} />
                        Save changes
                      </button>

                      <button
                        type="button"
                        className="text-button"
                        disabled={busy}
                        onClick={cancelEditing}
                      >
                        <X size={16} />
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <p>{update.body}</p>

                    {canEdit && (
                      <button
                        type="button"
                        className="text-button"
                        disabled={busy}
                        onClick={() =>
                          startEditing(update)
                        }
                      >
                        <Pencil size={15} />
                        Edit update
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}

          {updates.length === 0 && (
            <p>No progress updates yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}
