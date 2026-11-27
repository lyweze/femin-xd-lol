// ============================================================================
// Модальное окно локальной смены имени аккаунта (`AccountEditModal`)
// Порталится в `document.body`, поддерживает десктопный диалог и мобильную шторку.
// ============================================================================
import { useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../context/authContext.js";
import { useEscapeKey } from "../../hooks/useEscapeKey.js";
import { getAccountSummary } from "../../utils/format.js";
import { CloseIcon } from "../shared/icons/Icons.jsx";
import "./AccountEditModal.css";

function AccountEditDialogContent({ user, isAdmin, onSave, onClose }) {
	const [draftName, setDraftName] = useState(user?.username ?? "User");

	useEscapeKey(true, onClose);

	const cleanDraft = draftName.trim();
	const previewSummary = getAccountSummary(
		{ ...user, username: cleanDraft || "User" },
		isAdmin,
	);

	const handleSubmit = (event) => {
		event.preventDefault();
		if (!cleanDraft) return;
		onSave(cleanDraft);
		onClose();
	};

	return (
		<div
			className="acc-modal-backdrop"
			onClick={onClose}
			role="dialog"
			aria-modal="true"
			aria-label="Edit account name"
		>
			<form
				className="acc-modal"
				onClick={(e) => e.stopPropagation()}
				onSubmit={handleSubmit}
			>
				<header className="acc-modal-head">
					<h2 className="acc-modal-title">Account Profile</h2>
					<button
						type="button"
						className="acc-modal-close"
						onClick={onClose}
						aria-label="Close modal"
					>
						<CloseIcon size={16} />
					</button>
				</header>

				<div className="acc-modal-body">
					<div className="acc-modal-preview">
						<div className="acc-modal-avatar" aria-hidden="true">
							<span>{previewSummary.initialLetter}</span>
						</div>
						<div className="acc-modal-meta">
							<span className="acc-modal-name-preview">
								{cleanDraft || "User"}
							</span>
							<span className="acc-modal-role">{previewSummary.subtitle}</span>
						</div>
					</div>

					<label className="acc-modal-field">
						<span>Account name *</span>
						<input
							type="text"
							className="acc-modal-input"
							placeholder="User"
							maxLength={40}
							value={draftName}
							onChange={(e) => setDraftName(e.target.value)}
							required
						/>
					</label>

					{cleanDraft !== "User" && (
						<div className="acc-modal-reset-row">
							<button
								type="button"
								className="acc-modal-text-btn"
								onClick={() => setDraftName("User")}
							>
								Reset to &laquo;User&raquo;
							</button>
						</div>
					)}
				</div>

				<footer className="acc-modal-foot">
					<button
						type="button"
						className="acc-modal-btn is-ghost"
						onClick={onClose}
					>
						Cancel
					</button>
					<button
						type="submit"
						className="acc-modal-btn is-primary"
						disabled={!cleanDraft}
					>
						Save
					</button>
				</footer>
			</form>
		</div>
	);
}

function AccountEditModal() {
	const {
		user,
		isAdmin,
		isAccountModalOpen,
		updateUsername,
		closeAccountModal,
	} = useAuth();

	if (!isAccountModalOpen || typeof document === "undefined") {
		return null;
	}

	return createPortal(
		<AccountEditDialogContent
			key={user?.username || "User"}
			user={user}
			isAdmin={isAdmin}
			onSave={updateUsername}
			onClose={closeAccountModal}
		/>,
		document.body,
	);
}

export default AccountEditModal;
