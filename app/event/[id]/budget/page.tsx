"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function BudgetPage() {
  const { id } = useParams();

  const [event, setEvent] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("autre");
  const [amount, setAmount] = useState("");
  const [paid, setPaid] = useState(false);
  const [notes, setNotes] = useState("");
  const [link, setLink] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("autre");
  const [editAmount, setEditAmount] = useState("");
  const [editPaid, setEditPaid] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editDocumentFile, setEditDocumentFile] = useState<File | null>(null);
const [openItemMenuId, setOpenItemMenuId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    const { data: eventData } = await supabase
      .from("events")
      .select("budget_total")
      .eq("id", id)
      .single();

    setEvent(eventData);

    const { data: itemsData, error } = await supabase
      .from("budget_items")
      .select("*")
      .eq("event_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error.message);
      return;
    }

    setItems(itemsData || []);
  }

async function uploadBudgetDocument(file: File) {
  const safeFileName = file.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .toLowerCase();

  const filePath = `${id}/${Date.now()}-${safeFileName}`;

  const { error } = await supabase.storage
    .from("budget-documents")
    .upload(filePath, file);

  if (error) {
    console.error("upload document error:", error.message);
    return null;
  }

  const { data } = supabase.storage
    .from("budget-documents")
    .getPublicUrl(filePath);

  return {
    url: data.publicUrl,
    name: file.name,
  };
}

  async function addItem() {
    if (!title.trim()) return;

    let uploadedDocument = null;

    if (documentFile) {
      uploadedDocument = await uploadBudgetDocument(documentFile);
    }

    const { error } = await supabase.from("budget_items").insert([
      {
        event_id: id,
        title,
        category,
        amount: amount ? Number(amount) : 0,
        paid,
        notes: notes || null,
        link: link || null,
        document_url: uploadedDocument?.url || null,
        document_name: uploadedDocument?.name || null,
      },
    ]);

    if (error) {
      console.error(error.message);
      return;
    }

    setTitle("");
    setCategory("autre");
    setAmount("");
    setPaid(false);
    setNotes("");
    setLink("");
    setDocumentFile(null);
    setShowForm(false);

    await loadData();
  }

  function startEdit(item: any) {
    setEditingId(item.id);
    setEditTitle(item.title || "");
    setEditCategory(item.category || "autre");
    setEditAmount(item.amount?.toString() || "");
    setEditPaid(!!item.paid);
    setEditNotes(item.notes || "");
    setEditLink(item.link || "");
    setEditDocumentFile(null);
  }

async function updateItem(itemId: string) {
  if (!editTitle.trim()) return;

  let uploadedDocument = null;

  if (editDocumentFile) {
    uploadedDocument = await uploadBudgetDocument(editDocumentFile);
  }

  const newAmount = editAmount ? Number(editAmount) : 0;

  // 1. On récupère la dépense pour connaître son activity_id
  const { data: currentItem, error: currentItemError } = await supabase
    .from("budget_items")
    .select("activity_id")
    .eq("id", itemId)
    .single();

  if (currentItemError) {
    console.error(
      "Erreur récupération dépense :",
      currentItemError.message
    );
    return;
  }

  // 2. Mise à jour de la dépense
  const { error } = await supabase
    .from("budget_items")
    .update({
      title: editTitle.trim(),
      category: editCategory,
      amount: newAmount,
      paid: editPaid,
      notes: editNotes || null,
      link: editLink || null,
      ...(uploadedDocument
        ? {
            document_url: uploadedDocument.url,
            document_name: uploadedDocument.name,
          }
        : {}),
    })
    .eq("id", itemId);

  if (error) {
    console.error("Erreur mise à jour dépense :", error.message);
    return;
  }

  // 3. Si cette dépense vient d'une activité,
  // on synchronise l'activité
if (currentItem?.activity_id) {
  const { error: activityError } = await supabase
    .from("activities")
    .update({
      title: editTitle.trim(),
      price: newAmount > 0 ? newAmount : null,
      type: editCategory,
    })
    .eq("id", currentItem.activity_id);

  if (activityError) {
    console.error(
      "Erreur synchronisation activité :",
      activityError.message
    );
  }
}

  // 4. Fermeture du formulaire + rechargement
  setEditingId(null);
  setEditDocumentFile(null);

  await loadData();
}

  async function togglePaid(item: any) {
    await supabase
      .from("budget_items")
      .update({ paid: !item.paid })
      .eq("id", item.id);

    await loadData();
  }

  async function deleteItem(itemId: string) {
    const { error } = await supabase
      .from("budget_items")
      .delete()
      .eq("id", itemId);

    if (error) {
      console.error(error.message);
      return;
    }

    await loadData();
  }

  const totalBudget = Number(event?.budget_total || 0);
  const totalSpent = items.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );
  const totalPaid = items
    .filter((item) => item.paid)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const remaining = totalBudget - totalSpent;
const budgetStatusData = [
  {
    category: "paye",
    label: "Payé",
    value: totalPaid,
  },
  {
    category: "a payer",
    label: "À payer",
    value: Math.max(totalSpent - totalPaid, 0),
  },
  {
    category: "restant",
    label: "Restant",
    value: Math.max(totalBudget - totalSpent, 0),
  },
];

  const categoryTotals = items.reduce((acc: any, item) => {
    const cat = item.category || "autre";
    acc[cat] = (acc[cat] || 0) + Number(item.amount || 0);
    return acc;
  }, {});

  const pieData = Object.entries(categoryTotals).map(([category, value]) => ({
    category,
    value: Number(value),
  }));

  return (
    <div>
      <h1>💰 Budget</h1>

      <div
        style={{
          display: "flex",
          gap: 15,
          marginTop: 20,
          flexWrap: "wrap",
        }}
      >
        <div style={summaryCard}>
          <h3>Budget total</h3>
          <p>{totalBudget} €</p>
        </div>

        <div style={summaryCard}>
          <h3>À payer</h3>
          <p>{totalSpent} €</p>
        </div>

        <div style={summaryCard}>
          <h3>Payé</h3>
          <p>{totalPaid} €</p>
        </div>

        <div style={summaryCard}>
          <h3>Restant</h3>
          <p style={{ color: remaining < 0 ? "red" : "green" }}>
            {remaining} €
          </p>
        </div>
      </div>

<div style={chartsGrid}>
  {/* BUDGET TOTAL */}
  <div style={chartCard}>
    <h2>Budget total</h2>

    <div
      style={{
        height: 280,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          fontSize: 48,
          fontWeight: "bold",
        }}
      >
        {totalBudget} €
      </div>

      <div
        style={{
          marginTop: 10,
          color: "#666",
        }}
      >
        Budget prévu
      </div>
    </div>
  </div>

  {/* BUDGET UTILISÉ */}
  <div style={chartCard}>
    <h2>Budget utilisé</h2>

    <div
      style={{
        minHeight: 280,
        display: "flex",
        alignItems: "center",
      }}
    >
      {totalBudget <= 0 ? (
        <p>Aucun budget défini.</p>
      ) : (
        <PieChart
  data={budgetStatusData}
  total={totalBudget}
  colorMode="budget"
/>
      )}
    </div>
  </div>

  {/* RÉPARTITION */}
  <div style={chartCard}>
    <h2>Répartition par catégorie</h2>

    <div
      style={{
        minHeight: 280,
        display: "flex",
        alignItems: "center",
      }}
    >
      {pieData.length === 0 ? (
        <p>Aucune dépense à afficher.</p>
      ) : (
        <PieChart
          data={pieData}
          total={totalSpent}
        />
      )}
    </div>
  </div>
</div>
      <button onClick={() => setShowForm(!showForm)} style={btn}>
        Ajouter une dépense
      </button>

      {showForm && (
        <div style={formCard}>
          <h2>Nouvelle dépense</h2>

          <input
            placeholder="Titre"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={input}
          />

          <CategorySelect value={category} onChange={setCategory} />

          <input
            type="number"
            placeholder="Montant"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={input}
          />

          <input
            placeholder="Lien optionnel"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            style={input}
          />

          <input
            type="file"
            onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
            style={input}
          />

          <textarea
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={textarea}
          />

          <label style={{ display: "block", marginTop: 10 }}>
            <input
              type="checkbox"
              checked={paid}
              onChange={(e) => setPaid(e.target.checked)}
            />{" "}
            Payé
          </label>

          <button onClick={addItem} style={btn}>
            Créer
          </button>
        </div>
      )}

      <div style={{ marginTop: 25 }}>
        {items.length === 0 ? (
          <p>Aucune dépense pour le moment.</p>
        ) : (
          items.map((item) => (
            <div
  key={item.id}
  style={{
    ...card,
    borderLeft: `6px solid ${getActivityColor(item.category)}`,
  }}
>
              {editingId === item.id ? (
                <div style={{ flex: 1 }}>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    style={input}
                  />

                  <CategorySelect
                    value={editCategory}
                    onChange={setEditCategory}
                  />

                  <input
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    style={input}
                  />

                  <input
                    placeholder="Lien optionnel"
                    value={editLink}
                    onChange={(e) => setEditLink(e.target.value)}
                    style={input}
                  />

                  <input
                    type="file"
                    onChange={(e) =>
                      setEditDocumentFile(e.target.files?.[0] || null)
                    }
                    style={input}
                  />

                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    style={textarea}
                  />

                  <label style={{ display: "block", marginTop: 10 }}>
                    <input
                      type="checkbox"
                      checked={editPaid}
                      onChange={(e) => setEditPaid(e.target.checked)}
                    />{" "}
                    Payé
                  </label>

                  <button onClick={() => updateItem(item.id)} style={btn}>
                    Enregistrer
                  </button>

                  <button onClick={() => setEditingId(null)} style={smallBtn}>
                    Annuler
                  </button>
                </div>
              ) : (
                <>
      <div style={{ flex: 1 }}>
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <h3 style={{ margin: 0 }}>{item.title}</h3>

    {item.paid && (
      <span style={paidBadge}>
        Payé
      </span>
    )}
  </div>

  <span
  style={{
    ...badge,
    background: getActivityColor(item.category),
    color: "white",
  }}
>
  {getCategoryLabel(item.category)}
</span>

  <p>Montant : {item.amount} €</p>

  {item.notes && <p>Notes : {item.notes}</p>}

  {item.link && (
    <p>
      🔗{" "}
      <a href={item.link} target="_blank" rel="noreferrer">
        Voir le lien
      </a>
    </p>
  )}

  {item.document_url && (
    <p>
      📄{" "}
      <a
        href={item.document_url}
        target="_blank"
        rel="noreferrer"
      >
        {item.document_name || "Voir le document"}
      </a>
    </p>
  )}
</div>

<div style={{ position: "relative" }}>
  <button
    onClick={() =>
      setOpenItemMenuId(openItemMenuId === item.id ? null : item.id)
    }
    style={iconBtn}
  >
    ✏️
  </button>

  {openItemMenuId === item.id && (
    <div style={miniMenu}>
      <button
        style={menuItem}
        onClick={() => {
          startEdit(item);
          setOpenItemMenuId(null);
        }}
      >
        Modifier
      </button>

      <button
        style={menuItem}
        onClick={() => {
          togglePaid(item);
          setOpenItemMenuId(null);
        }}
      >
        {item.paid ? "Marquer non payé" : "Marquer payé"}
      </button>

      <button
        style={{ ...menuItem, color: "red" }}
        onClick={() => deleteItem(item.id)}
      >
        Supprimer
      </button>
    </div>
  )}
</div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function getCategoryLabel(type?: string | null) {
  switch (type?.toLowerCase()) {
    case "activite":
      return "Activité";
    case "rdv":
      return "Rendez-vous";
    case "evenement":
      return "Événement";
    case "transport":
      return "Transport";
    case "repas":
      return "Repas";
    case "hebergement":
      return "Hébergement";
    default:
      return "Autre";
  }
}

function getActivityColor(type?: string | null) {
  switch (type?.toLowerCase()) {
    case "activite":
      return "#A8BFA5";

    case "rdv":
      return "#7F9A82";

    case "evenement":
      return "#C9A66B";

    case "transport":
      return "#8FAFB9";

    case "repas":
      return "#D7B4A5";

    case "hebergement":
      return "#B7A98D";

    default:
      return "#B8B0A5";
  }
}

function CategorySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
<select
  value={value}
  onChange={(e) => onChange(e.target.value)}
  style={input}
>
  <option value="activite">Activité</option>
  <option value="rdv">Rendez-vous</option>
  <option value="evenement">Événement</option>
  <option value="transport">Transport</option>
  <option value="repas">Repas</option>
  <option value="hebergement">Hébergement</option>
  <option value="autre">Autre</option>
</select>
  );
}

function getBudgetStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case "paye":
      return "#7F9A82";

    case "a payer":
      return "#C9B99A";

    case "restant":
      return "#EEF1EB";

    default:
      return "#D9DDD5";
  }
}

function PieChart({
  data,
  total,
  colorMode = "category",
}: {
  data: any[];
  total: number;
  colorMode?: "category" | "budget";
}) {
  let cumulative = 0;

  function getCoordinates(percent: number) {
    const angle = percent * 2 * Math.PI - Math.PI / 2;

    return {
      x: 100 + 80 * Math.cos(angle),
      y: 100 + 80 * Math.sin(angle),
    };
  }

  function getSliceColor(category: string) {
    return colorMode === "budget"
      ? getBudgetStatusColor(category)
      : getActivityColor(category);
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 25,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <svg width="220" height="220" viewBox="0 0 200 200">
        {data.map((slice) => {
          const value = slice.value;

          const startPercent = cumulative / total;
          cumulative += value;
          const endPercent = cumulative / total;

          const start = getCoordinates(startPercent);
          const end = getCoordinates(endPercent);

          const largeArcFlag =
            endPercent - startPercent > 0.5 ? 1 : 0;

          const pathData = `
            M 100 100
            L ${start.x} ${start.y}
            A 80 80 0 ${largeArcFlag} 1 ${end.x} ${end.y}
            Z
          `;

          return (
            <path
              key={slice.category}
              d={pathData}
              fill={getSliceColor(slice.category)}
            />
          );
        })}
      </svg>

      <div>
        {data.map((slice) => (
          <div key={slice.category} style={legendRow}>
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 999,
                background: getSliceColor(slice.category),
                display: "inline-block",
              }}
            />

            <span>
              {slice.label || getCategoryLabel(slice.category)} —{" "}
              {slice.value} € (
              {Math.round((slice.value / total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
const summaryCard = {
  border: "1px solid #ddd",
  borderRadius: 12,
  padding: 15,
  width: 160,
  background: "white",
};

const chartCard = {
  marginTop: 20,
  padding: 20,
  border: "1px solid #ddd",
  borderRadius: 12,
  background: "white",
};

const formCard = {
  marginTop: 15,
  padding: 20,
  border: "1px solid #ddd",
  borderRadius: 12,
  background: "white",
  maxWidth: 420,
};

const card = {
  marginTop: 15,
  padding: 18,
  border: "1px solid #ddd",
  borderRadius: 12,
  background: "white",
  display: "flex",
  justifyContent: "space-between",
  gap: 20,
};

const input = {
  display: "block",
  padding: 10,
  marginTop: 10,
  border: "1px solid #ddd",
  borderRadius: 8,
};

const textarea = {
  display: "block",
  padding: 10,
  marginTop: 10,
  width: 300,
  minHeight: 80,
  border: "1px solid #ddd",
  borderRadius: 8,
};

const btn = {
  padding: "10px 15px",
  background: "black",
  color: "white",
  border: "none",
  borderRadius: 8,
  marginTop: 15,
  cursor: "pointer",
};

const smallBtn = {
  padding: "7px 12px",
  border: "1px solid #ddd",
  borderRadius: 8,
  background: "white",
  cursor: "pointer",
  marginTop: 8,
};

const actions = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 8,
};

const badge = {
  display: "inline-block",
  padding: "5px 10px",
  borderRadius: 999,
  background: "#f1f1f1",
  fontSize: 12,
};

const legendRow = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 8,
};

const chartsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 20,
  marginTop: 20,
};
const paidBadge = {
  display: "inline-block",
  padding: "4px 8px",
  borderRadius: 999,
  background: "#22c55e",
  color: "white",
  fontSize: 12,
  fontWeight: "bold",
};

const iconBtn = {
  width: 34,
  height: 34,
  border: "1px solid #ddd",
  borderRadius: 8,
  background: "white",
  cursor: "pointer",
};

const miniMenu = {
  position: "absolute" as const,
  right: 0,
  top: 38,
  width: 160,
  background: "white",
  border: "1px solid #ddd",
  borderRadius: 10,
  boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
  overflow: "hidden",
  zIndex: 20,
};

const menuItem = {
  display: "block",
  width: "100%",
  padding: "9px 12px",
  border: "none",
  background: "white",
  textAlign: "left" as const,
  cursor: "pointer",
};