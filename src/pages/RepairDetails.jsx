
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  Check,
  Clock3,
  Plus,
  Save,
  ShieldCheck,
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

const BUCKET = "repair-photos";
const MAX_PHOTO_SIZE = 10 * 1024 * 1024;

const SUPPORTED_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function getErrorMessage(error, action) {
  const detail = error?.message || "Unknown error";
  const code = error?.code || error?.statusCode || error?.status;
  const prefix = code ? `[${code}] ` : "";

  if (
    code === "42501" ||
    /row.level security|permission denied|not authorized|unauthorized/i.test(
      detail
    )
  ) {
    return `${action}: ${prefix}${detail}. Check the Supabase RLS or Storage policies for this shop.`;
  }

  if (/bucket not found/i.test(detail)) {
    return `${action}: The private "${BUCKET}" Storage bucket does not exist.`;
  }

  return `${action}: ${prefix}${detail}`;
}

function formatDate(value) {
  if (!value) return "Unknown date";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Unknown date"
    : date.toLocaleString();
}

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
  const [status, setStatus] = useState(
    job.status ?? "checked_in"
  );
  const [completion, setCompletion] = useState(
    job.estimated_completion
      ? String(job.estimated_completion).slice(0, 10)
      : ""
  );

  const [updates, setUpdates] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [photoUrls, setPhotoUrls] = useState({});
  const [loading, setLoading] = useState(true);

  const [note, setNote] = useState("");
  const [notePublic, setNotePublic] = useState(false);
  const [photoPublic, setPhotoPublic] = useState(false);

  const [savingRepair, setSavingRepair] = useState(false);
  const [savingUpdate, setSavingUpdate] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const mountedRef = useRef(true);
  const loadIdRef = useRef(0);

  const busy = savingRepair || savingUpdate || uploading;

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      loadIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    setDescription(job.description ?? "");
    setStatus(job.status ?? "checked_in");
    setCompletion(
      job.estimated_completion
        ? String(job.estimated_completion).slice(0, 10)
        : ""
    );
  }, [job.id]);

  const load = useCallback(async () => {
    const loadId = ++loadIdRef.current;

    if (mountedRef.current) {
      setLoading(true);
    }

    try {
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

      if (updatesResult.error) {
        throw new Error(
          getErrorMessage(
            updatesResult.error,
            "Loading progress updates"
          )
        );
      }

      if (photosResult.error) {
        throw new Error(
          getErrorMessage(
            photosResult.error,
            "Loading repair photos"
          )
        );
      }

      const nextUpdates = updatesResult.data ?? [];
      const nextPhotos = photosResult.data ?? [];

      const signedResults = await Promise.all(
        nextPhotos.map(async (photo) => {
          const { data, error: signedError } =
            await supabase.storage
              .from(BUCKET)
              .createSignedUrl(photo.storage_path, 3600);

          return {
            id: photo.id,
            url: data?.signedUrl ?? null,
            error: signedError,
          };
        })
      );

      if (!mountedRef.current || loadId !== loadIdRef.current) {
        return;
      }

      const nextUrls = {};

      for (const result of signedResults) {
        if (result.url) {
          nextUrls[result.id] = result.url;
        }
      }

      setUpdates(nextUpdates);
      setPhotos(nextPhotos);
      setPhotoUrls(nextUrls);

      const failedPreviews = signedResults.filter(
        (result) => !result.url
      );

      if (failedPreviews.length) {
        setError(
          `${failedPreviews.length} photo preview(s) could not be loaded. Check Storage SELECT permissions for shop members.`
        );
      }
    } catch (err) {
      if (mountedRef.current && loadId === loadIdRef.current) {
        setError(err.message || "Unable to load repair details.");
      }
    } finally {
      if (mountedRef.current && loadId === loadIdRef.current) {
        setLoading(false);
      }
    }
  }, [job.id, shop.id]);

  useEffect(() => {
    setError("");
    setMessage("");
    setUpdates([]);
    setPhotos([]);
    setPhotoUrls({});

    load();
  }, [load]);

  async function saveRepair(event) {
    event.preventDefault();

    if (busy) return;

    setSavingRepair(true);
    setError("");
    setMessage("");

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

      if (saveError) {
        throw new Error(
          getErrorMessage(saveError, "Saving repair")
        );
      }

      if (!data) {
        throw new Error(
          "Supabase did not return the saved repair. Check UPDATE and SELECT permissions."
        );
      }

      onUpdated?.(data);
      setMessage("Repair saved successfully.");
    } catch (err) {
      setError(err.message || "Could not save repair.");
    } finally {
      setSavingRepair(false);
    }
  }

  async function addUpdate(event) {
    event.preventDefault();

    const body = note.trim();

    if (!body || busy) return;

    setSavingUpdate(true);
    setError("");
    setMessage("");

    try {
      const { data, error: insertError } = await supabase
        .from("repair_updates")
        .insert({
          job_id: job.id,
          shop_id: shop.id,
          author_id: user.id,
          body,
          customer_visible: notePublic,
        })
        .select("*")
        .single();

      if (insertError) {
        throw new Error(
          getErrorMessage(
            insertError,
            "Saving progress update"
          )
        );
      }

      if (!data) {
        throw new Error(
          "The update was not returned by Supabase. Check INSERT and SELECT permissions."
        );
      }

      setUpdates((previous) => [
        data,
        ...previous.filter((item) => item.id !== data.id),
      ]);

      setNote("");
      setNotePublic(false);

      setMessage(
        data.customer_visible
          ? "Progress update saved and marked customer-visible."
          : "Private progress update saved."
      );

      await load();
    } catch (err) {
      setError(
        err.message || "Could not save progress update."
      );
    } finally {
      setSavingUpdate(false);
    }
  }

  async function uploadPhotos(event) {
    const selectedFiles = Array.from(
      event.target.files ?? []
    );

    event.target.value = "";

    if (!selectedFiles.length || busy) return;

    setUploading(true);
    setError("");
    setMessage("");

    let uploadedCount = 0;
    const failures = [];
    const visibility = photoPublic;

    try {
      for (const file of selectedFiles) {
        const extension = SUPPORTED_TYPES[file.type];

        if (!extension) {
          failures.push(
            `${file.name}: Only JPG, PNG, and WebP files are supported.`
          );
          continue;
        }

        if (file.size > MAX_PHOTO_SIZE) {
          failures.push(
            `${file.name}: Photo exceeds the 10 MB limit.`
          );
          continue;
        }

        const storagePath =
          `${shop.id}/${job.id}/${crypto.randomUUID()}.${extension}`;

        try {
          const { error: uploadError } =
            await supabase.storage
              .from(BUCKET)
              .upload(storagePath, file, {
                contentType: file.type,
                upsert: false,
                cacheControl: "3600",
              });

          if (uploadError) {
            throw new Error(
              getErrorMessage(
                uploadError,
                `Uploading ${file.name} to Storage`
              )
            );
          }

          const { data: photoRecord, error: dbError } =
            await supabase
              .from("repair_photos")
              .insert({
                shop_id: shop.id,
                job_id: job.id,
                uploaded_by: user.id,
                storage_path: storagePath,
                customer_visible: visibility,
              })
              .select("*")
              .single();

          if (dbError || !photoRecord) {
            const { error: cleanupError } =
              await supabase.storage
                .from(BUCKET)
                .remove([storagePath]);

            const cleanupMessage = cleanupError
              ? " The uploaded Storage object may need manual cleanup."
              : "";

            throw new Error(
              (dbError
                ? getErrorMessage(
                    dbError,
                    `Saving ${file.name} photo record`
                  )
                : `Saving ${file.name}: Supabase did not return the photo record.`) +
                cleanupMessage
            );
          }

          uploadedCount += 1;

          setPhotos((previous) => [
            photoRecord,
            ...previous.filter(
              (item) => item.id !== photoRecord.id
            ),
          ]);

          const { data: signedData } =
            await supabase.storage
              .from(BUCKET)
              .createSignedUrl(storagePath, 3600);

          if (signedData?.signedUrl) {
            setPhotoUrls((previous) => ({
              ...previous,
              [photoRecord.id]: signedData.signedUrl,
            }));
          }
        } catch (err) {
          failures.push(
            err.message || `${file.name}: Upload failed.`
          );
        }
      }

      if (uploadedCount > 0) {
        setMessage(
          `${uploadedCount} photo${uploadedCount === 1 ? "" : "s"} saved successfully${visibility ? " and marked customer-visible" : " as private"}.`
        );

        setPhotoPublic(false);
      }

      await load();

      if (failures.length > 0) {
        setError(failures.join("\n"));
      }
    } catch (err) {
      setError(
        err.message || "Unexpected error uploading photos."
      );
    } finally {
      setUploading(false);
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
        <div
          className="form-message"
          role="alert"
          style={{
            marginBottom: 20,
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
          }}
        >
          {error}
        </div>
      )}

      {message && (
        <div
          className="form-message"
          role="status"
          style={{ marginBottom: 20 }}
        >
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

          <button
            type="submit"
            className="primary-button"
            disabled={busy}
          >
            <Save size={17} />
            {savingRepair ? "Saving..." : "Save repair"}
          </button>
        </form>
      </section>

      <section className="repair-panel">
        <span className="eyebrow">VISUAL PROGRESS</span>
        <h2>Repair photos ({photos.length})</h2>
        <p>
          Upload damage, repair, and completion photos.
          Private photos stay within the shop.
        </p>

        <label className="repair-visibility">
          <input
            type="checkbox"
            checked={photoPublic}
            disabled={busy}
            onChange={(event) =>
              setPhotoPublic(event.target.checked)
            }
          />
          Make new photos visible to the customer
        </label>

        <label
          className="repair-upload-button"
          style={{
            opacity: busy ? 0.6 : 1,
            cursor: busy ? "wait" : "pointer",
          }}
        >
          <Camera size={18} />
          {uploading ? "Uploading photos..." : "Upload photos"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={busy}
            onChange={uploadPhotos}
            hidden
          />
        </label>

        {loading && (
          <p>Loading repair photos...</p>
        )}

        {!loading && photos.length === 0 && (
          <p>No repair photos uploaded yet.</p>
        )}

        <div className="repair-photo-grid">
          {photos.map((photo) => (
            <div
              className="repair-photo-card"
              key={photo.id}
            >
              {photoUrls[photo.id] ? (
                <img
                  src={photoUrls[photo.id]}
                  alt={photo.caption || "Repair progress"}
                  loading="lazy"
                />
              ) : (
                <div className="repair-photo-placeholder">
                  Photo preview unavailable
                </div>
              )}

              <div className="repair-photo-meta">
                <span>
                  {photo.customer_visible ? (
                    <>
                      <Check size={14} />
                      Customer-visible
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={14} />
                      Private
                    </>
                  )}
                </span>
                <small>
                  {photo.created_at
                    ? new Date(
                        photo.created_at
                      ).toLocaleDateString()
                    : "Just uploaded"}
                </small>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="repair-panel">
        <span className="eyebrow">WORK HISTORY</span>
        <h2>Progress updates.</h2>
        <p>
          Add an internal note or publish an update
          to the customer's tracking page.
        </p>

        <form className="form-stack" onSubmit={addUpdate}>
          <label>
            New update
            <textarea
              rows={4}
              required
              value={note}
              disabled={busy}
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
              disabled={busy}
              onChange={(event) =>
                setNotePublic(event.target.checked)
              }
            />
            Show this update on the customer's tracking page
          </label>

          <button
            type="submit"
            className="primary-button"
            disabled={busy || !note.trim()}
          >
            <Plus size={18} />
            {savingUpdate
              ? "Saving update..."
              : "Add progress update"}
          </button>
        </form>

        <div className="repair-update-list">
          {loading && (
            <p>Loading progress updates...</p>
          )}

          {!loading &&
            updates.map((update) => (
              <div
                className="repair-update"
                key={update.id}
              >
                <div className="repair-update-heading">
                  <span>
                    <Clock3 size={15} />
                    {formatDate(update.created_at)}
                  </span>
                  <span>
                    {update.customer_visible
                      ? "CUSTOMER-VISIBLE"
                      : "PRIVATE"}
                  </span>
                </div>
                <p>{update.body}</p>
              </div>
            ))}

          {!loading && updates.length === 0 && (
            <p>No progress updates yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}
