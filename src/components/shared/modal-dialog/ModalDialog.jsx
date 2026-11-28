// ============================================================================
// Переиспользуемая оболочка модального окна (`ModalDialog`)
// Десктоп: центрированный диалог; мобильные (<= 640px): выдвижная шторка снизу.
// Порталится в `document.body`, обрабатывает Escape, клик по фону и подтверждение удаления.
// ============================================================================
import { useState } from "react";
import { createPortal } from "react-dom";
import { useEscapeKey } from "../../../hooks/useEscapeKey.js";
import { CloseIcon } from "../icons/Icons.jsx";
import "./ModalDialog.css";

function ModalDialogInner({
	title,
	ariaLabel,
	maxWidth = 560,
	onClose,
	onSubmit,
	submitLabel = "Save",
	submitDisabled = false,
	onDelete,
	deleteLabel = "Delete",
	children,
}) {
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	useEscapeKey(true, onClose);

	const ContainerTag = onSubmit ? "form" : "div";

	return (
		<div
			className="ob-modal-backdrop"
			role="dialog"
			aria-modal="true"
			aria-label={ariaLabel || title}
			onClick={onClose}
		>
			<ContainerTag
				className="ob-modal"
				style={{ "--ob-modal-max-width": `${maxWidth}px` }}
				onClick={(e) => e.stopPropagation()}
				onSubmit={onSubmit}
			>
				<header className="ob-modal-head">
					<h2 className="ob-modal-title">{title}</h2>
					<button
						type="button"
						className="ob-modal-close"
						onClick={onClose}
						aria-label="Close modal"
					>
						<CloseIcon size={16} />
					</button>
				</header>

				<div className="ob-modal-body">{children}</div>

				<footer className="ob-modal-foot">
					<div className="ob-modal-foot-left">
						{onDelete &&
							(confirmDelete ? (
								<div className="ob-modal-confirm-delete">
									<button
										type="button"
										className="ob-modal-btn is-danger"
										disabled={isDeleting}
										onClick={async () => {
											if (isDeleting) return;
											setIsDeleting(true);
											try {
												await onDelete();
												onClose();
											} finally {
												setIsDeleting(false);
											}
										}}
									>
										{isDeleting ? "Deleting..." : "Confirm Delete"}
									</button>
									<button
										type="button"
										className="ob-modal-btn is-ghost"
										disabled={isDeleting}
										onClick={() => setConfirmDelete(false)}
									>
										Keep
									</button>
								</div>
							) : (
								<button
									type="button"
									className="ob-modal-btn is-danger"
									onClick={() => setConfirmDelete(true)}
								>
									{deleteLabel}
								</button>
							))}
					</div>

					<div className="ob-modal-foot-right">
						<button type="button" className="ob-modal-btn is-ghost" onClick={onClose}>
							Cancel
						</button>
						{onSubmit && (
							<button
								type="submit"
								className="ob-modal-btn is-primary"
								disabled={submitDisabled}
							>
								{submitLabel}
							</button>
						)}
					</div>
				</footer>
			</ContainerTag>
		</div>
	);
}

/**
 * Портальная обёртка, пересоздающая форму по `dialogKey` при каждом открытии.
 */
function ModalDialog({ isOpen, dialogKey, ...props }) {
	if (!isOpen || typeof document === "undefined") return null;

	return createPortal(<ModalDialogInner key={dialogKey} {...props} />, document.body);
}

export default ModalDialog;
