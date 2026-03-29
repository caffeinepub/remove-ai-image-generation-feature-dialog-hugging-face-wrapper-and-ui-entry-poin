import { useCallback, useRef, useState } from "react";
import type { TabState } from "../../engine/TabManager";

interface TabBarProps {
  tabs: TabState[];
  activeIndex: number;
  onTabChange: (index: number) => void;
  onRename: (index: number, name: string) => void;
  onAdd: () => void;
  onClose?: (index: number) => void;
  canAdd?: boolean;
  dirtyFlags?: boolean[];
}

export default function TabBar({
  tabs,
  activeIndex,
  onTabChange,
  onRename,
  onAdd,
  onClose,
  canAdd = true,
  dirtyFlags,
}: TabBarProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = useCallback(
    (index: number) => {
      setEditingIndex(index);
      setEditValue(tabs[index].name);
      setTimeout(() => inputRef.current?.select(), 0);
    },
    [tabs],
  );

  const commitEdit = useCallback(
    (index: number) => {
      if (editValue.trim()) {
        onRename(index, editValue.trim());
      }
      setEditingIndex(null);
    },
    [editValue, onRename],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      if (e.key === "Enter") commitEdit(index);
      if (e.key === "Escape") setEditingIndex(null);
    },
    [commitEdit],
  );

  return (
    <div
      data-ocid="tabbar.panel"
      style={{
        display: "flex",
        alignItems: "flex-end",
        height: "32px",
        padding: "0 8px",
        gap: "2px",
        flexShrink: 0,
        userSelect: "none",
      }}
      className="tabbar-root"
    >
      {tabs.map((tab, index) => {
        const isActive = index === activeIndex;
        const isEditing = editingIndex === index;
        const isDirty = dirtyFlags ? dirtyFlags[index] : false;

        return (
          <div
            key={tab.id}
            data-ocid={`tabbar.tab.${index + 1}`}
            onClick={() => !isEditing && onTabChange(index)}
            onKeyDown={(e) =>
              e.key === "Enter" && !isEditing && onTabChange(index)
            }
            onDoubleClick={() => startEdit(index)}
            role="tab"
            tabIndex={0}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "0 8px 0 12px",
              height: isActive ? "28px" : "25px",
              minWidth: "80px",
              maxWidth: "180px",
              cursor: isEditing ? "text" : "pointer",
              fontSize: "12px",
              borderRadius: "4px 4px 0 0",
              transition: "height 0.1s ease",
            }}
            className={`tabbar-tab${isActive ? " tabbar-tab-active" : ""}`}
          >
            {isEditing ? (
              <input
                ref={inputRef}
                data-ocid="tabbar.input"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => commitEdit(index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: "12px",
                  padding: 0,
                }}
                className="tabbar-input"
              />
            ) : (
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                  pointerEvents: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "2px",
                }}
              >
                {tab.name}
                <span
                  style={{
                    fontSize: "10px",
                    marginLeft: "4px",
                    opacity: 0.45,
                    flexShrink: 0,
                  }}
                >
                  {index + 1}/{tabs.length}
                </span>
                {isDirty && (
                  <span
                    className="tabbar-dirty"
                    title="Unsaved changes"
                    style={{
                      fontSize: "8px",
                      marginLeft: "2px",
                      opacity: 0.7,
                      flexShrink: 0,
                    }}
                  >
                    &#x25CF;
                  </span>
                )}
              </span>
            )}
            {/* Close button — only show when there are multiple tabs */}
            {tabs.length > 1 && !isEditing && onClose && (
              <button
                type="button"
                data-ocid={`tabbar.close.${index + 1}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(index);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "14px",
                  height: "14px",
                  borderRadius: "50%",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: "10px",
                  lineHeight: 1,
                  padding: 0,
                  flexShrink: 0,
                }}
                className="tabbar-close"
                title="Close tab"
              >
                ×
              </button>
            )}
          </div>
        );
      })}

      {/* Add tab button */}
      {canAdd && tabs.length < 2 && (
        <button
          type="button"
          data-ocid="tabbar.add"
          onClick={onAdd}
          title="New canvas tab"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "24px",
            height: "24px",
            borderRadius: "4px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontSize: "16px",
            alignSelf: "center",
            marginBottom: "2px",
          }}
          className="tabbar-add"
        >
          +
        </button>
      )}
    </div>
  );
}
