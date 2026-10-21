
import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Mail,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";

export default function Team({ shop, user }) {
  const [role, setRole] = useState("");
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("technician");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const canInvite = role === "owner" || role === "admin";
  const isOwner = role === "owner";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data: mine, error: mineError } = await supabase
      .from("shop_members")
      .select("role")
      .eq("shop_id", shop.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (mineError) {
      setError(mineError.message);
      setLoading(false);
      return;
    }

    const currentRole = mine?.role ?? "";
    setRole(currentRole);

    const { data: people, error: peopleError } = await supabase
      .from("shop_members")
      .select("user_id, role, created_at, display_name")
      .eq("shop_id", shop.id)
      .order("created_at");

    if (peopleError) setError(peopleError.message);
    else setMembers(people ?? []);

    if (["owner", "admin"].includes(currentRole)) {
      const { data, error: inviteError } = await supabase
        .from("shop_invitations")
        .select("id, email, role, created_at")
        .eq("shop_id", shop.id)
        .is("accepted_at", null)
        .is("revoked_at", null)
        .order("created_at", { ascending: false });

      if (inviteError) setError(inviteError.message);
      else setInvitations(data ?? []);
    } else {
      setInvitations([]);
    }

    setLoading(false);
  }, [shop.id, user.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function invite(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    const { error: inviteError } = await supabase.rpc(
      "add_team_invitation",
      {
        target_shop: shop.id,
        member_email: email.trim().toLowerCase(),
        member_role: inviteRole,
      }
    );

    if (inviteError) {
      setError(inviteError.message);
    } else {
      setEmail("");
      setMessage(
        "Invitation saved. Your teammate can register using that email."
      );
      await load();
    }

    setBusy(false);
  }

  async function saveName(event) {
    event.preventDefault();
    if (!editingId || busy) return;

    setBusy(true);
    setError("");
    setMessage("");

    const { error: saveError } = await supabase.rpc(
      "set_team_member_name",
      {
        target_shop: shop.id,
        target_user: editingId,
        new_name: editingName.trim(),
      }
    );

    if (saveError) {
      setError(saveError.message);
    } else {
      setEditingId(null);
      setEditingName("");
      setMessage("Team member name updated.");
      await load();
    }

    setBusy(false);
  }

  function startEditing(member) {
    setEditingId(member.user_id);
    setEditingName(member.display_name ?? "");
    setError("");
    setMessage("");
  }

  async function cancel(invitationId) {
    if (!window.confirm("Cancel this invitation?")) return;

    setBusy(true);
    setError("");
    setMessage("");

    const { error: cancelError } = await supabase.rpc(
      "cancel_team_invitation",
      { target_invitation: invitationId }
    );

    if (cancelError) {
      setError(cancelError.message);
    } else {
      setMessage("Invitation canceled.");
      await load();
    }

    setBusy(false);
  }

  async function remove(member) {
    if (!window.confirm("Remove this member from the shop?")) return;

    setBusy(true);
    setError("");
    setMessage("");

    const { error: removeError } = await supabase.rpc(
      "remove_team_member",
      {
        target_shop: shop.id,
        target_user: member.user_id,
      }
    );

    if (removeError) {
      setError(removeError.message);
    } else {
      setMessage("Team member removed.");
      await load();
    }

    setBusy(false);
  }

  return (
    <main className="dashboard-main team-main">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">YOUR WORKSPACE</span>
          <h1>
            Your team<span>.</span>
          </h1>
          <p>Manage access to {shop.name}.</p>
        </div>
        <Users size={28} />
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

      {canInvite && (
        <section className="team-panel">
          <span className="eyebrow">INVITE YOUR CREW</span>
          <h2>Add a team member.</h2>
          <p>
            Add their email here. Once they create and verify
            their Moovio account, they'll automatically join
            your shop.
          </p>

          <form className="team-invite-form" onSubmit={invite}>
            <label>
              Email address
              <input
                type="email"
                required
                value={email}
                placeholder="employee@yourshop.com"
                onChange={(event) =>
                  setEmail(event.target.value)
                }
              />
            </label>

            <label>
              Role
              <select
                value={inviteRole}
                onChange={(event) =>
                  setInviteRole(event.target.value)
                }
              >
                <option value="technician">Technician</option>
                {isOwner && (
                  <option value="admin">Admin</option>
                )}
              </select>
            </label>

            <button className="primary-button" disabled={busy}>
              <Plus size={18} />
              Add member
            </button>
          </form>
        </section>
      )}

      <section className="team-panel">
        <span className="eyebrow">ACTIVE ACCESS</span>
        <h2>Team members ({members.length})</h2>

        {loading && <p>Loading team...</p>}

        {!loading && members.length === 0 && (
          <p>No members found.</p>
        )}

        {members.map((member) => {
          const isMe = member.user_id === user.id;
          const removable =
            !isMe &&
            member.role !== "owner" &&
            (isOwner || member.role === "technician");

          const displayName =
            member.display_name?.trim() ||
            (isMe
              ? user.email
              : `Member ${member.user_id.slice(0, 8)}`);

          return (
            <div className="team-member" key={member.user_id}>
              <div className="team-avatar">
                <Users size={19} />
              </div>

              <div
                className="team-member-copy"
                style={{ minWidth: 0 }}
              >
                {editingId === member.user_id ? (
                  <form
                    onSubmit={saveName}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <input
                      type="text"
                      maxLength={80}
                      autoFocus
                      value={editingName}
                      placeholder="Employee name"
                      onChange={(event) =>
                        setEditingName(event.target.value)
                      }
                      aria-label="Team member display name"
                    />

                    <button
                      type="submit"
                      className="primary-button"
                      disabled={busy}
                      aria-label="Save name"
                    >
                      <Check size={16} />
                    </button>

                    <button
                      type="button"
                      className="team-danger"
                      disabled={busy}
                      onClick={() => {
                        setEditingId(null);
                        setEditingName("");
                      }}
                      aria-label="Cancel editing"
                    >
                      <X size={16} />
                    </button>
                  </form>
                ) : (
                  <>
                    <strong>
                      {displayName}
                      {isMe ? " (you)" : ""}
                    </strong>
                    <small>
                      {member.role.toUpperCase()}
                    </small>
                  </>
                )}
              </div>

              {isOwner && editingId !== member.user_id && (
                <button
                  type="button"
                  className="team-danger"
                  disabled={busy}
                  onClick={() => startEditing(member)}
                  aria-label={`Edit name for ${displayName}`}
                  title="Edit display name"
                >
                  <Pencil size={17} />
                </button>
              )}

              {removable && editingId !== member.user_id && (
                <button
                  className="team-danger"
                  type="button"
                  disabled={busy}
                  onClick={() => remove(member)}
                  aria-label={`Remove ${displayName}`}
                >
                  <Trash2 size={17} />
                </button>
              )}
            </div>
          );
        })}
      </section>

      {canInvite && (
        <section className="team-panel">
          <span className="eyebrow">PENDING ACCESS</span>
          <h2>Invitations ({invitations.length})</h2>

          {invitations.length === 0 && (
            <p>No pending invitations.</p>
          )}

          {invitations.map((invitation) => (
            <div className="team-member" key={invitation.id}>
              <div className="team-avatar">
                <Mail size={19} />
              </div>

              <div className="team-member-copy">
                <strong>{invitation.email}</strong>
                <small>
                  {invitation.role.toUpperCase()} · PENDING
                </small>
              </div>

              <button
                className="team-danger"
                type="button"
                disabled={busy}
                onClick={() => cancel(invitation.id)}
                aria-label="Cancel invitation"
              >
                <X size={17} />
              </button>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
