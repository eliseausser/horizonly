"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function CustomPage() {
  const { pageId } = useParams();

  const [page, setPage] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("blank");

  const [listItems, setListItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState("");

  const [boardTexts, setBoardTexts] = useState<any[]>([]);
  const [newText, setNewText] = useState("");

  const [images, setImages] = useState<any[]>([]);
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  useEffect(() => {
    loadPage();
  }, [pageId]);

  async function loadPage() {
    const { data, error } = await supabase
      .from("custom_pages")
      .select("*")
      .eq("id", pageId)
      .single();

    if (error) {
      console.error(error.message);
      return;
    }

    setPage(data);
    setTitle(data.title);
    setType(data.type || "blank");

    setListItems(data.content?.listItems || []);
    setBoardTexts(data.content?.boardTexts || []);
    setImages(data.content?.images || []);
  }

  async function savePage(updatedContent?: any, updatedType?: string) {
    const content = updatedContent || {
      listItems,
      boardTexts,
      images,
    };

    const { error } = await supabase
      .from("custom_pages")
      .update({
        title,
        type: updatedType || type,
        content,
      })
      .eq("id", pageId);

    if (error) {
      console.error(error.message);
      return;
    }

    await loadPage();
  }

  async function chooseType(newType: string) {
    setType(newType);
    await savePage(undefined, newType);
  }

  async function handleDroppedFiles(files: FileList) {
    const imageFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/")
    );

    for (const file of imageFiles) {
      await handleImageUpload(file);
    }

    setIsDraggingOver(false);
  }

  async function addListItem() {
    if (!newItem.trim()) return;

    const updated = [
      ...listItems,
      {
        id: crypto.randomUUID(),
        title: newItem,
        done: false,
      },
    ];

    setListItems(updated);
    setNewItem("");
    await savePage({ listItems: updated, boardTexts, images });
  }

  async function toggleListItem(itemId: string) {
    const updated = listItems.map((item) =>
      item.id === itemId ? { ...item, done: !item.done } : item
    );

    setListItems(updated);
    await savePage({ listItems: updated, boardTexts, images });
  }

  async function deleteListItem(itemId: string) {
    const updated = listItems.filter((item) => item.id !== itemId);

    setListItems(updated);
    await savePage({ listItems: updated, boardTexts, images });
  }

  async function addBoardText() {
    if (!newText.trim()) return;

    const updated = [
      ...boardTexts,
      {
        id: crypto.randomUUID(),
        text: newText,
      },
    ];

    setBoardTexts(updated);
    setNewText("");
    await savePage({ listItems, boardTexts: updated, images });
  }

  async function deleteBoardText(textId: string) {
    const updated = boardTexts.filter((item) => item.id !== textId);

    setBoardTexts(updated);
    await savePage({ listItems, boardTexts: updated, images });
  }

  async function deleteImage(imageId: string) {
    const updated = images.filter((image) => image.id !== imageId);

    setImages(updated);
    await savePage({ listItems, boardTexts, images: updated });
  }

  async function moveImage(imageId: string, x: number, y: number) {
    const updated = images.map((image) =>
      image.id === imageId ? { ...image, x, y } : image
    );

    setImages(updated);
    await savePage({ listItems, boardTexts, images: updated });
  }

  async function resizeImage(imageId: string, width: number, height: number) {
    const updated = images.map((image) =>
      image.id === imageId
        ? {
            ...image,
            width: Math.max(80, width),
            height: Math.max(60, height),
          }
        : image
    );

    setImages(updated);
    await savePage({ listItems, boardTexts, images: updated });
  }

  async function bringImageToFront(imageId: string) {
    const maxZ = images.reduce(
      (max, image) => Math.max(max, image.zIndex || 1),
      1
    );

    const updated = images.map((image) =>
      image.id === imageId ? { ...image, zIndex: maxZ + 1 } : image
    );

    setImages(updated);
    await savePage({ listItems, boardTexts, images: updated });
  }

  async function handleImageUpload(file: File) {
    const safeFileName = file.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .toLowerCase();

    const filePath = `${pageId}/${Date.now()}-${safeFileName}`;

    const { error } = await supabase.storage
      .from("custom-page-files")
      .upload(filePath, file);

    if (error) {
      console.error(error.message);
      return;
    }

    const { data } = supabase.storage
      .from("custom-page-files")
      .getPublicUrl(filePath);

    const updated = [
      ...images,
      {
        id: crypto.randomUUID(),
        url: data.publicUrl,
        x: 40,
        y: 40,
        width: 180,
        height: 140,
        zIndex: 1,
      },
    ];

    setImages(updated);
    await savePage({ listItems, boardTexts, images: updated });
  }

  if (!page) return <p>Chargement...</p>;

  return (
    <div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => savePage()}
        style={titleInput}
      />

      {type === "blank" ? (
        <div style={typeSelector}>
          <button onClick={() => chooseType("list")} style={typeBtn}>
            ✅ Liste
          </button>

          <button onClick={() => chooseType("board")} style={typeBtn}>
            ✏️ Board
          </button>

          <button onClick={() => chooseType("binder")} style={typeBtn}>
            🖼️ Classeur
          </button>
        </div>
      ) : (
        <div style={formatBadge}>
          Format :{" "}
          {type === "list"
            ? "✅ Liste"
            : type === "board"
            ? "✏️ Board"
            : "🖼️ Classeur"}
        </div>
      )}

      {type === "list" && (
        <div style={workspace}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              placeholder="Nouvel élément"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              style={input}
            />

            <button onClick={addListItem} style={btn}>
              Ajouter
            </button>
          </div>

          <div style={{ marginTop: 20 }}>
            {listItems.map((item) => (
              <div key={item.id} style={row}>
                <label style={{ display: "flex", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => toggleListItem(item.id)}
                  />

                  <span
                    style={{
                      textDecoration: item.done ? "line-through" : "none",
                      opacity: item.done ? 0.5 : 1,
                    }}
                  >
                    {item.title}
                  </span>
                </label>

                <button
                  onClick={() => deleteListItem(item.id)}
                  style={smallBtn}
                >
                  Supprimer
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {type === "board" && (
        <div style={workspace}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              placeholder="Ajouter du texte"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              style={input}
            />

            <button onClick={addBoardText} style={btn}>
              Ajouter
            </button>
          </div>

          <div style={board}>
            {boardTexts.map((item) => (
              <div key={item.id} style={stickyNote}>
                <p>{item.text}</p>

                <button
                  onClick={() => deleteBoardText(item.id)}
                  style={smallBtn}
                >
                  Supprimer
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {type === "binder" && (
        <div style={workspace}>
          <div
            style={{
              ...dropZone,
              borderColor: isDraggingOver ? "black" : "#ccc",
              background: isDraggingOver ? "#f1f1f1" : "#fafafa",
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingOver(true);
            }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              handleDroppedFiles(e.dataTransfer.files);
            }}
          >
            <p style={{ margin: 0 }}>
              Glisse tes images ici ou importe-les avec le bouton ci-dessous
            </p>

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = e.target.files;
                if (files) handleDroppedFiles(files);
              }}
              style={input}
            />
          </div>

          <div style={freeBoard}>
            {images.map((image) => (
              <div
                key={image.id}
                style={{
                  position: "absolute",
                  left: image.x,
                  top: image.y,
                  width: image.width,
                  height: image.height,
                  zIndex: image.zIndex || 1,
                  border: "1px solid #ddd",
                  borderRadius: 10,
                  background: "white",
                  overflow: "hidden",
                  cursor: "move",
                  boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
                }}
                onMouseDown={() => bringImageToFront(image.id)}
                draggable
                onDragStart={() => setDraggedImageId(image.id)}
                onDragEnd={(e) => {
                  if (!draggedImageId) return;

                  const boardElement = e.currentTarget.parentElement;
                  if (!boardElement) return;

                  const rect = boardElement.getBoundingClientRect();

                  moveImage(
                    draggedImageId,
                    e.clientX - rect.left - image.width / 2,
                    e.clientY - rect.top - image.height / 2
                  );

                  setDraggedImageId(null);
                }}
              >
                <img
                  src={image.url}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    pointerEvents: "none",
                  }}
                />

                <div
                  style={resizeHandle}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const startX = e.clientX;
                    const startY = e.clientY;
                    const startWidth = image.width;
                    const startHeight = image.height;

                    function onMouseMove(moveEvent: MouseEvent) {
                      resizeImage(
                        image.id,
                        startWidth + moveEvent.clientX - startX,
                        startHeight + moveEvent.clientY - startY
                      );
                    }

                    function onMouseUp() {
                      window.removeEventListener("mousemove", onMouseMove);
                      window.removeEventListener("mouseup", onMouseUp);
                    }

                    window.addEventListener("mousemove", onMouseMove);
                    window.addEventListener("mouseup", onMouseUp);
                  }}
                />

                <button
                  onClick={() => deleteImage(image.id)}
                  style={deleteImageBtn}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const titleInput = {
  fontSize: 28,
  fontWeight: "bold",
  padding: 10,
  border: "1px solid #ddd",
  borderRadius: 10,
  width: "100%",
  maxWidth: 500,
};

const typeSelector = {
  display: "flex",
  gap: 10,
  marginTop: 20,
};

const typeBtn = {
  padding: "10px 14px",
  border: "1px solid #ddd",
  borderRadius: 10,
  background: "white",
  cursor: "pointer",
};

const formatBadge = {
  display: "inline-block",
  marginTop: 20,
  padding: "8px 12px",
  borderRadius: 999,
  background: "#f1f1f1",
  fontSize: 14,
  fontWeight: 600,
};

const workspace = {
  marginTop: 25,
  padding: 20,
  border: "1px solid #ddd",
  borderRadius: 12,
  background: "white",
  minHeight: 350,
};

const input = {
  padding: 10,
  border: "1px solid #ddd",
  borderRadius: 8,
};

const btn = {
  padding: "10px 14px",
  border: "none",
  borderRadius: 8,
  background: "black",
  color: "white",
  cursor: "pointer",
};

const smallBtn = {
  padding: "6px 10px",
  border: "1px solid #ddd",
  borderRadius: 8,
  background: "white",
  cursor: "pointer",
};

const row = {
  display: "flex",
  justifyContent: "space-between",
  padding: "10px 0",
  borderBottom: "1px solid #eee",
};

const board = {
  marginTop: 20,
  minHeight: 300,
  border: "1px dashed #ccc",
  borderRadius: 12,
  padding: 20,
  display: "flex",
  gap: 15,
  flexWrap: "wrap" as const,
};

const stickyNote = {
  width: 180,
  minHeight: 120,
  padding: 12,
  borderRadius: 12,
  background: "#fff7cc",
  border: "1px solid #f3e38b",
};

const freeBoard = {
  position: "relative" as const,
  marginTop: 20,
  minHeight: 600,
  border: "1px dashed #ccc",
  borderRadius: 12,
  background: "#fafafa",
  overflow: "hidden",
};

const deleteImageBtn = {
  position: "absolute" as const,
  top: 6,
  right: 6,
  width: 24,
  height: 24,
  borderRadius: 999,
  border: "none",
  background: "rgba(0,0,0,0.7)",
  color: "white",
  cursor: "pointer",
};

const dropZone = {
  marginTop: 15,
  padding: 20,
  borderWidth: 2,
  borderStyle: "dashed",
  borderColor: "#ccc",
  borderRadius: 12,
  background: "#fafafa",
  textAlign: "center" as const,
};

const resizeHandle = {
  position: "absolute" as const,
  right: -6,
  bottom: -6,
  width: 30,
  height: 30,
  cursor: "nwse-resize",
  background: "transparent",
};