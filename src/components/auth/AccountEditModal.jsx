// ============================================================================
// Модальное окно локальной смены имени аккаунта (`AccountEditModal`)
// Использует общую оболочку `ModalDialog` с порталом в `document.body`.
// ============================================================================
import { useState } from "react";
import { useAuth } from "../../context/authContext.js";
import { getAccountSummary } from "../../utils/format.js";
import ModalDialog from "../shared/modal-dialog/ModalDialog.jsx";
import "./AccountEditModal.css";

function AccountEditForm({ user, isAdmin, onSave, onClose }) {
	const [draftName, setDraftName] = useState(user?.username ?? "User");
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
		<ModalDialog
			isOpen
			title="Account Profile"
			ariaLabel="Edit account name"
			maxWidth={420}
			onClose={onClose}
			onSubmit={handleSubmit}
			submitLabel="Save"
			submitDisabled={!cleanDraft}
		>
			<div className="acc-modal-preview">
				<div className="acc-modal-avatar" aria-hidden="true">
					<span>{previewSummary.initialLetter}</span>
				</div>
				<div className="acc-modal-meta">
					<span className="acc-modal-name-preview">{cleanDraft || "User"}</span>
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
		</ModalDialog>
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

	if (!isAccountModalOpen) return null;

	return (
		<AccountEditForm
			key={user?.username || "User"}
			user={user}
			isAdmin={isAdmin}
			onSave={updateUsername}
			onClose={closeAccountModal}
		/>
	);
}

export default AccountEditModal;
