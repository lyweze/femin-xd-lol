import { useState } from "react";
import { useAuth } from "../../context/authContext.js";
import { useUsers } from "../hooks/useUsers.js";

function UsersPage() {
	const { user: currentUser } = useAuth();
	const {
		items: users,
		params,
		hasMore,
		isLoading,
		error,
		loadMore,
		updateFilters,
		createUser,
		setUserRole,
	} = useUsers({ limit: 20 });

	const [email, setEmail] = useState("");
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [role, setRole] = useState("admin");
	const [actionError, setActionError] = useState(null);
	const [isCreating, setIsCreating] = useState(false);

	const handleCreate = async (e) => {
		e.preventDefault();
		setIsCreating(true);
		setActionError(null);
		try {
			await createUser({
				email: email.trim(),
				username: username.trim(),
				password,
				role,
			});
			setEmail("");
			setUsername("");
			setPassword("");
		} catch (err) {
			setActionError(err?.message || "Не удалось создать пользователя.");
		} finally {
			setIsCreating(false);
		}
	};

	const handleToggleRole = async (targetUser) => {
		const nextRole = targetUser.role === "admin" ? "user" : "admin";
		setActionError(null);
		try {
			await setUserRole(targetUser.id, nextRole);
		} catch (err) {
			setActionError(err?.message || "Не удалось изменить роль.");
		}
	};

	return (
		<div className="admin-page">
			<header className="admin-page-head">
				<div>
					<h1>Users & Roles</h1>
					<p>Управление учётными записями и назначение администраторов.</p>
				</div>
			</header>

			{(error || actionError) && (
				<div className="admin-banner-error">
					{actionError || error?.message}
				</div>
			)}

			<form className="admin-card admin-page" onSubmit={handleCreate}>
				<h2 className="admin-card-title">Create User / Admin</h2>
				<div className="admin-form-grid">
					<div className="admin-field">
						<label>Email *</label>
						<input
							type="email"
							className="admin-input"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="editor@femin.fm"
							required
						/>
					</div>
					<div className="admin-field">
						<label>Username * (3–32)</label>
						<input
							className="admin-input"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							placeholder="new_admin"
							minLength={3}
							maxLength={32}
							required
						/>
					</div>
					<div className="admin-field">
						<label>Password * (8–128)</label>
						<input
							type="password"
							className="admin-input"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder="••••••••"
							minLength={8}
							maxLength={128}
							required
						/>
					</div>
					<div className="admin-field">
						<label>Role *</label>
						<select
							className="admin-select"
							value={role}
							onChange={(e) => setRole(e.target.value)}
						>
							<option value="admin">Admin</option>
							<option value="user">User</option>
						</select>
					</div>
				</div>

				<div className="admin-toolbar">
					<button
						type="submit"
						className="admin-btn admin-btn-primary"
						disabled={isCreating}
					>
						{isCreating ? "Creating..." : "+ Create User"}
					</button>
				</div>
			</form>

			<div className="admin-toolbar">
				<input
					className="admin-input"
					style={{ maxWidth: 260 }}
					placeholder="Search by email or username..."
					value={params.q || ""}
					onChange={(e) => updateFilters({ q: e.target.value })}
				/>
				<select
					className="admin-select"
					style={{ maxWidth: 180 }}
					value={params.role || ""}
					onChange={(e) => updateFilters({ role: e.target.value })}
				>
					<option value="">All roles</option>
					<option value="admin">Admins only</option>
					<option value="user">Users only</option>
				</select>
			</div>

			<div className="admin-table-wrap">
				<table className="admin-table">
					<thead>
						<tr>
							<th>User</th>
							<th>Email</th>
							<th>Role</th>
							<th>Created</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{users.map((u) => {
							const isSelf = u.id === currentUser?.id;
							return (
								<tr key={u.id}>
									<td>
										<strong>{u.username}</strong>
										{isSelf && (
											<span
												className="admin-file-chip"
												style={{ marginLeft: 8 }}
											>
												YOU
											</span>
										)}
									</td>
									<td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
										{u.email}
									</td>
									<td>
										<span
											className={`admin-status-badge ${u.role === "admin" ? "is-published" : "is-draft"}`}
										>
											{u.role.toUpperCase()}
										</span>
									</td>
									<td style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
										{u.created_at?.slice(0, 10)}
									</td>
									<td>
										<button
											type="button"
											className="admin-btn admin-btn-ghost admin-btn-sm"
											disabled={isSelf && u.role === "admin"}
											title={
												isSelf
													? "Нельзя снять роль admin с самого себя (409)"
													: "Изменить роль"
											}
											onClick={() => handleToggleRole(u)}
										>
											{u.role === "admin" ? "Demote to User" : "Make Admin"}
										</button>
									</td>
								</tr>
							);
						})}

						{!isLoading && users.length === 0 && (
							<tr>
								<td colSpan={5} style={{ color: "var(--text-tertiary)" }}>
									No users found.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			{hasMore && (
				<div className="admin-toolbar">
					<button
						type="button"
						className="admin-btn admin-btn-ghost"
						disabled={isLoading}
						onClick={loadMore}
					>
						Load More
					</button>
				</div>
			)}
		</div>
	);
}

export default UsersPage;
