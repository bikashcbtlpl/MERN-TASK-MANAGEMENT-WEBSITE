import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import { Button, Input } from "../../../components/common";

function DocumentEditorModal({
  showModal,
  editDoc,
  isViewOnlyModal,
  name,
  setName,
  description,
  setDescription,
  editorContent,
  setEditorContent,
  content,
  autoSaveEnabled,
  setAutoSaveEnabled,
  lastAutoSavedAt,
  hasUnsavedEditorChanges,
  saveEditorContent,
  setContent,
  setLastAutoSavedAt,
  setLastManualSavedAt,
  setHasUnsavedEditorChanges,
  editorDraftKey,
  showFeedback,
  fileInputKey,
  setFile,
  selectedUsers,
  toggleAccessUser,
  users,
  accessList,
  handleCreate,
  cancelModal,
  normalizeHtmlValue,
}) {
  if (!showModal) return null;

  return (
    <div
      className="document-editor-modal"
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        background: "var(--ui-overlay)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 2000,
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          color: "var(--text)",
          border: "1px solid var(--ui-border)",
          padding: 20,
          width: "100%",
          maxWidth: 680,
          borderRadius: 12,
          boxShadow: "var(--ui-shadow-lg)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 14 }}>
          {isViewOnlyModal ? "View Document" : editDoc ? "Edit Document" : "Create Document"}
        </h3>
        <form
          onSubmit={(e) => {
            if (isViewOnlyModal) {
              e.preventDefault();
              return;
            }
            handleCreate(e);
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <Input
              label="Name"
              fullWidth
              value={name}
              disabled={isViewOnlyModal}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <Input
              as="textarea"
              label="Description"
              fullWidth
              value={description}
              disabled={isViewOnlyModal}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: "block",
                marginBottom: 6,
                fontWeight: 600,
                color: "var(--text-soft)",
              }}
            >
              Editor Content
            </label>
            <div
              style={{
                border: "1px solid var(--ui-border)",
                borderRadius: 10,
                padding: 8,
                background: "var(--surface)",
              }}
            >
              <CKEditor
                editor={ClassicEditor}
                disabled={isViewOnlyModal}
                data={editorContent || ""}
                onChange={(_, editor) => {
                  if (isViewOnlyModal) return;
                  const nextValue = editor.getData();
                  setEditorContent(nextValue);
                  setHasUnsavedEditorChanges(
                    normalizeHtmlValue(nextValue) !== normalizeHtmlValue(content),
                  );
                }}
              />
            </div>
            {!isViewOnlyModal && (
              <>
                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                      color: "var(--text-soft)",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={autoSaveEnabled}
                      onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                    />
                    Auto Save editor text
                  </label>
                  {autoSaveEnabled && lastAutoSavedAt && (
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>
                      Last saved at {lastAutoSavedAt}
                    </span>
                  )}
                  {!autoSaveEnabled && hasUnsavedEditorChanges && (
                    <span
                      style={{
                        fontSize: 12,
                        color: "#b45309",
                        fontWeight: 600,
                      }}
                    >
                      Unsaved editor changes
                    </span>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {!autoSaveEnabled && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => saveEditorContent(true)}
                    >
                      Save Content
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      setEditorContent("");
                      setContent("");
                      setLastAutoSavedAt("");
                      setLastManualSavedAt("");
                      setHasUnsavedEditorChanges(false);
                      try {
                        localStorage.removeItem(editorDraftKey);
                      } catch {
                        // Ignore draft clearing errors.
                      }
                      showFeedback("info", "Editor content cleared");
                    }}
                  >
                    Clear Content
                  </Button>
                </div>
                <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--muted)" }}>
                  You can upload a file, write content in the editor, or use both. If
                  Auto Save is off, click Save Content before submitting.
                </p>
              </>
            )}
          </div>
          {!isViewOnlyModal && (
            <>
              <div style={{ marginBottom: 12 }}>
                <Input
                  key={fileInputKey}
                  type="file"
                  label="Attach File"
                  fullWidth
                  onChange={(e) => setFile(e.target.files[0])}
                />
              </div>
              <div style={{ marginBottom: 8 }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: 6,
                    fontWeight: 600,
                    color: "var(--text-soft)",
                  }}
                >
                  Give Access
                </label>

                <div
                  style={{
                    minHeight: 52,
                    border: "1px solid var(--ui-border)",
                    borderRadius: 10,
                    padding: 8,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    background: "var(--ui-surface-soft)",
                    marginBottom: 10,
                  }}
                >
                  {selectedUsers.length === 0 && (
                    <span style={{ color: "var(--muted)", fontSize: 13 }}>
                      No users selected
                    </span>
                  )}
                  {selectedUsers.map((u) => (
                    <span
                      key={u._id}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        background: "#e0e7ff",
                        color: "#1e3a8a",
                        borderRadius: 999,
                        padding: "4px 10px",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {u.name}
                      <button
                        type="button"
                        onClick={() => toggleAccessUser(u._id)}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "#1e3a8a",
                          cursor: "pointer",
                          fontWeight: 700,
                          lineHeight: 1,
                          padding: 0,
                        }}
                        aria-label={`Remove ${u.name}`}
                      >
                        x
                      </button>
                    </span>
                  ))}
                </div>

                <div
                  style={{
                    border: "1px solid var(--ui-border)",
                    borderRadius: 10,
                    maxHeight: 170,
                    overflowY: "auto",
                    background: "var(--surface)",
                    padding: 6,
                  }}
                >
                  {users.map((u) => {
                    const checked = accessList.includes(String(u._id));
                    return (
                      <button
                        key={u._id}
                        type="button"
                        onClick={() => toggleAccessUser(u._id)}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                          border: "none",
                          borderRadius: 8,
                          padding: "8px 10px",
                          cursor: "pointer",
                          background: checked
                            ? "color-mix(in srgb, var(--primary) 16%, var(--surface) 84%)"
                            : "transparent",
                          textAlign: "left",
                        }}
                      >
                        <span style={{ fontSize: 13, color: "var(--text)" }}>
                          {u.name} ({u.email})
                        </span>
                        <span
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 4,
                            border: checked
                              ? "1px solid var(--primary)"
                              : "1px solid var(--ui-border-strong)",
                            background: checked ? "var(--primary)" : "var(--surface)",
                            color: "var(--text-inverse)",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {checked ? "✓" : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
              marginTop: 16,
            }}
          >
            <Button variant="secondary" type="button" onClick={cancelModal}>
              {isViewOnlyModal ? "Close" : "Cancel"}
            </Button>
            {!isViewOnlyModal && (
              <Button variant="primary" type="submit">
                {editDoc ? "Save" : "Create"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default DocumentEditorModal;
