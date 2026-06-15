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

  const [boardItems, setBoardItems] = useState<any[]>([]);

  const [images, setImages] = useState<any[]>([]);
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const [selectedBoardItemId, setSelectedBoardItemId] = useState<string | null>(
    null
  );

  const [showTableForm, setShowTableForm] = useState(false);
  const [tableRows, setTableRows] = useState("3");
  const [tableCols, setTableCols] = useState("3");

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
    setBoardItems(data.content?.boardItems || []);
    setImages(data.content?.images || []);
  }

  async function savePage(updatedContent?: any, updatedType?: string) {
    const content = updatedContent || {
      listItems,
      boardItems,
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
    await savePage({ listItems: updated, boardItems, images });
  }

  async function toggleListItem(itemId: string) {
    const updated = listItems.map((item) =>
      item.id === itemId ? { ...item, done: !item.done } : item
    );

    setListItems(updated);
    await savePage({ listItems: updated, boardItems, images });
  }

  async function deleteListItem(itemId: string) {
    const updated = listItems.filter((item) => item.id !== itemId);

    setListItems(updated);
    await savePage({ listItems: updated, boardItems, images });
  }

  async function addBoardItem(kind: string, shapeType?: string) {
    const rows = Number(tableRows) || 3;
    const cols = Number(tableCols) || 3;

    const baseItem = {
      id: crypto.randomUUID(),
      kind,
      shapeType: shapeType || null,
      x: 40,
      y: 40,
      width: kind === "table" ? 360 : shapeType === "line" ? 220 : 180,
      height: kind === "table" ? 180 : shapeType === "line" ? 6 : 120,
      rotation: 0,
      color:
        kind === "postit"
          ? "#fff7cc"
          : kind === "shape"
          ? "#f1f1f1"
          : "#ffffff",
      borderColor: "#111111",
      text:
        kind === "text"
          ? "Zone de texte"
          : kind === "postit"
          ? "Post-it"
          : "",
      rows: kind === "table" ? rows : undefined,
      cols: kind === "table" ? cols : undefined,
      cells:
        kind === "table"
          ? Array.from({ length: rows }, () =>
              Array.from({ length: cols }, () => "")
            )
          : undefined,
    };

    const updated = [...boardItems, baseItem];

    setBoardItems(updated);
    setShowTableForm(false);
    await savePage({ listItems, boardItems: updated, images });
  }

  async function deleteBoardItem(itemId: string) {
    const updated = boardItems.filter((item) => item.id !== itemId);

    setBoardItems(updated);
    await savePage({ listItems, boardItems: updated, images });
  }

  async function updateBoardItem(itemId: string, updates: any) {
    const updated = boardItems.map((item) =>
      item.id === itemId ? { ...item, ...updates } : item
    );

    setBoardItems(updated);
    await savePage({ listItems, boardItems: updated, images });
  }

  async function moveImage(imageId: string, x: number, y: number) {
    const updated = images.map((image) =>
      image.id === imageId ? { ...image, x, y } : image
    );

    setImages(updated);
    await savePage({ listItems, boardItems, images: updated });
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
    await savePage({ listItems, boardItems, images: updated });
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
    await savePage({ listItems, boardItems, images: updated });
  }

  async function uploadBoardImage(file: File) {
    const safeFileName = file.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .toLowerCase();

    const filePath = `${pageId}/board-${Date.now()}-${safeFileName}`;

    const { error } = await supabase.storage
      .from("custom-page-files")
      .upload(filePath, file);

    if (error) {
      console.error(error.message);
      return null;
    }

    const { data } = supabase.storage
      .from("custom-page-files")
      .getPublicUrl(filePath);

    return {
      url: data.publicUrl,
    };
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
    await savePage({ listItems, boardItems, images: updated });
  }

  const selectedBoardItem = boardItems.find(
    (item) => item.id === selectedBoardItemId
  );

  if (!page) return <p>Chargement...</p>;

  return (
    <div>
{type === "blank" && (
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
                  x
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {type === "board" && (
        <div style={workspace}>
          <div style={boardToolbar}>
            <button onClick={() => addBoardItem("text")} style={smallBtn}>
              Texte
            </button>

            <button onClick={() => addBoardItem("postit")} style={smallBtn}>
              Post-it
            </button>

            <select
              onChange={(e) => {
                if (!e.target.value) return;
                addBoardItem("shape", e.target.value);
                e.target.value = "";
              }}
              style={smallBtn}
            >
              <option value="">Forme</option>
              <option value="rectangle">Rectangle</option>
              <option value="circle">Cercle</option>
              <option value="triangle">Triangle</option>
              <option value="line">Ligne</option>
            </select>

            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowTableForm(!showTableForm)}
                style={smallBtn}
              >
                Tableau
              </button>

              {showTableForm && (
                <div style={tableFormMenu}>
                  <input
                    type="number"
                    min="1"
                    placeholder="Lignes"
                    value={tableRows}
                    onChange={(e) => setTableRows(e.target.value)}
                    style={smallInput}
                  />

                  <input
                    type="number"
                    min="1"
                    placeholder="Colonnes"
                    value={tableCols}
                    onChange={(e) => setTableCols(e.target.value)}
                    style={smallInput}
                  />

                  <button onClick={() => addBoardItem("table")} style={btn}>
                    Créer
                  </button>
                </div>
              )}
            </div>

            <label style={smallBtn}>
              Image
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  const uploaded = await uploadBoardImage(file);
                  if (!uploaded) return;

                  const updated = [
                    ...boardItems,
                    {
                      id: crypto.randomUUID(),
                      kind: "image",
                      url: uploaded.url,
                      x: 40,
                      y: 40,
                      width: 220,
                      height: 160,
                      rotation: 0,
                      color: "#ffffff",
                      borderColor: "#111111",
                    },
                  ];

                  setBoardItems(updated);
                  await savePage({ listItems, boardItems: updated, images });
                }}
              />
            </label>
          </div>

          {selectedBoardItem && (
            <div style={propertyBar}>
              <strong>Objet sélectionné</strong>

              <label>
                Couleur{" "}
                <input
                  type="color"
                  value={selectedBoardItem.color || "#ffffff"}
                  onChange={(e) =>
                    updateBoardItem(selectedBoardItem.id, {
                      color: e.target.value,
                    })
                  }
                />
              </label>

              <label>
                Bordure{" "}
                <input
                  type="color"
                  value={selectedBoardItem.borderColor || "#111111"}
                  onChange={(e) =>
                    updateBoardItem(selectedBoardItem.id, {
                      borderColor: e.target.value,
                    })
                  }
                />
              </label>

              <label>
                Largeur{" "}
                <input
                  type="number"
                  value={selectedBoardItem.width}
                  onChange={(e) =>
                    updateBoardItem(selectedBoardItem.id, {
                      width: Math.max(40, Number(e.target.value)),
                    })
                  }
                  style={miniInput}
                />
              </label>

              <label>
                Hauteur{" "}
                <input
                  type="number"
                  value={selectedBoardItem.height}
                  onChange={(e) =>
                    updateBoardItem(selectedBoardItem.id, {
                      height: Math.max(20, Number(e.target.value)),
                    })
                  }
                  style={miniInput}
                />
              </label>

              <label>
                Rotation{" "}
                <input
                  type="number"
                  value={selectedBoardItem.rotation || 0}
                  onChange={(e) =>
                    updateBoardItem(selectedBoardItem.id, {
                      rotation: Number(e.target.value),
                    })
                  }
                  style={miniInput}
                />
              </label>

              <button
                onClick={() => {
                  deleteBoardItem(selectedBoardItem.id);
                  setSelectedBoardItemId(null);
                }}
                style={{ ...smallBtn, color: "red" }}
              >
                Supprimer
              </button>
            </div>
          )}

          <div
            style={boardCanvas}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedBoardItemId(null);
              }
            }}
          >
            {boardItems.map((item) => {
              const isSelected = selectedBoardItemId === item.id;

              return (
                <div
                  key={item.id}
                  style={{
                    position: "absolute",
                    left: item.x,
                    top: item.y,
                    width: item.width,
                    height: item.height,
                    padding:
                      item.kind === "shape" || item.kind === "image" ? 0 : 10,
                    outline: isSelected
                      ? `2px solid ${item.borderColor || "#4F8EF7"}`
                      : "none",
                    outlineOffset: 2,
                    border: "none",
                    borderRadius:
                      item.kind === "shape" && item.shapeType === "circle"
                        ? "50%"
                        : 10,
                    background:
                      item.kind === "text"
                        ? "transparent"
                        : item.kind === "shape"
                        ? item.color || "#f1f1f1"
                        : item.color || "white",
                    boxShadow: isSelected
                      ? "0 8px 20px rgba(0,0,0,0.12)"
                      : "none",
                    transform: `rotate(${item.rotation || 0}deg)`,
                    overflow: "hidden",
                    resize: "none",
                    cursor: "move",
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setSelectedBoardItemId(item.id);
                  }}
                  draggable
                  onDragEnd={(e) => {
                    const canvas = e.currentTarget.parentElement;
                    if (!canvas) return;

                    const rect = canvas.getBoundingClientRect();

                    updateBoardItem(item.id, {
                      x: e.clientX - rect.left - item.width / 2,
                      y: e.clientY - rect.top - item.height / 2,
                    });
                  }}
                >
                  {item.kind === "text" && (
                    <textarea
                      value={item.text}
                      onMouseDown={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        updateBoardItem(item.id, { text: e.target.value })
                      }
                      style={{
                        ...boardTextarea,
                        scrollbarWidth: "none",
                        msOverflowStyle: "none",
                      }}
                    />
                  )}

                  {item.kind === "postit" && (
                    <textarea
                      value={item.text}
                      onMouseDown={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        updateBoardItem(item.id, { text: e.target.value })
                      }
                      style={{
                        ...boardTextarea,
                        scrollbarWidth: "none",
                        msOverflowStyle: "none",
                      }}
                    />
                  )}

                  {item.kind === "shape" && item.shapeType === "triangle" && (
                    <div
                      style={{
                        width: 0,
                        height: 0,
                        borderLeft: `${item.width / 2}px solid transparent`,
                        borderRight: `${item.width / 2}px solid transparent`,
                        borderBottom: `${item.height}px solid ${
                          item.color || "#111111"
                        }`,
                      }}
                    />
                  )}

                  {item.kind === "shape" && item.shapeType === "line" && (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        background: item.color || "#111111",
                      }}
                    />
                  )}

                  {item.kind === "shape" &&
                    item.shapeType !== "triangle" &&
                    item.shapeType !== "line" && (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                        }}
                      />
                    )}

                  {item.kind === "table" && (
                    <table style={tableStyle}>
                      <tbody>
                        {Array.from({ length: item.rows || 3 }).map(
                          (_, rowIndex) => (
                            <tr key={rowIndex}>
                              {Array.from({ length: item.cols || 3 }).map(
                                (_, colIndex) => (
                                  <td key={colIndex} style={tdStyle}>
                                    <input
                                      value={
                                        item.cells?.[rowIndex]?.[colIndex] ||
                                        ""
                                      }
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onChange={(e) => {
                                        const cells = item.cells || [];

                                        const updatedCells = Array.from(
                                          { length: item.rows || 3 },
                                          (_, r) =>
                                            Array.from(
                                              { length: item.cols || 3 },
                                              (_, c) => cells?.[r]?.[c] || ""
                                            )
                                        );

                                        updatedCells[rowIndex][colIndex] =
                                          e.target.value;

                                        updateBoardItem(item.id, {
                                          cells: updatedCells,
                                        });
                                      }}
                                      style={cellInput}
                                    />
                                  </td>
                                )
                              )}
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  )}

                  {item.kind === "image" && (
                    <img
                      src={item.url}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        pointerEvents: "none",
                      }}
                    />
                  )}

                  {isSelected && (
                    <div
                      style={boardResizeHandle}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        const startX = e.clientX;
                        const startY = e.clientY;
                        const startWidth = item.width;
                        const startHeight = item.height;

                        function onMouseMove(moveEvent: MouseEvent) {
                          updateBoardItem(item.id, {
                            width: Math.max(
                              40,
                              startWidth + moveEvent.clientX - startX
                            ),
                            height: Math.max(
                              20,
                              startHeight + moveEvent.clientY - startY
                            ),
                          });
                        }

                        function onMouseUp() {
                          window.removeEventListener("mousemove", onMouseMove);
                          window.removeEventListener("mouseup", onMouseUp);
                        }

                        window.addEventListener("mousemove", onMouseMove);
                        window.addEventListener("mouseup", onMouseUp);
                      }}
                    />
                  )}
                </div>
              );
            })}
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

const boardToolbar = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap" as const,
  padding: 12,
  border: "1px solid #ddd",
  borderRadius: 12,
  background: "#fafafa",
};

const boardCanvas = {
  position: "relative" as const,
  marginTop: 20,
  minHeight: 650,
  border: "1px dashed #ccc",
  borderRadius: 12,
  background: "white",
  overflow: "hidden",
};

const boardTextarea = {
  width: "100%",
  height: "100%",
  border: "none",
  outline: "none",
  resize: "none" as const,
  fontSize: 15,
  background: "transparent",
  overflow: "hidden",
  overflowY: "hidden" as const,
  overflowX: "hidden" as const,
};

const tableStyle = {
  width: "100%",
  height: "100%",
  borderCollapse: "collapse" as const,
  background: "white",
};

const tdStyle = {
  border: "1px solid #ccc",
  minWidth: 80,
  height: 45,
  padding: 0,
};

const tableFormMenu = {
  position: "absolute" as const,
  top: 40,
  left: 0,
  width: 180,
  padding: 12,
  background: "white",
  border: "1px solid #ddd",
  borderRadius: 12,
  boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
  zIndex: 50,
};

const smallInput = {
  width: "100%",
  padding: 8,
  marginTop: 8,
  border: "1px solid #ddd",
  borderRadius: 8,
};

const cellInput = {
  width: "100%",
  height: "100%",
  border: "none",
  outline: "none",
  padding: 6,
  boxSizing: "border-box" as const,
};

const propertyBar = {
  marginTop: 12,
  padding: 12,
  border: "1px solid #ddd",
  borderRadius: 12,
  background: "#fafafa",
  display: "flex",
  alignItems: "center",
  gap: 14,
  flexWrap: "wrap" as const,
};

const miniInput = {
  width: 70,
  padding: 6,
  border: "1px solid #ddd",
  borderRadius: 6,
};

const boardResizeHandle = {
  position: "absolute" as const,
  right: -8,
  bottom: -8,
  width: 18,
  height: 18,
  borderRadius: 999,
  background: "transparent",
  cursor: "nwse-resize",
  zIndex: 20,
};