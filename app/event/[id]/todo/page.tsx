"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2, Calendar, Clock, Link as LinkIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function TodoPage() {
  const params = useParams();
  const id = params.id as string;

  const [event, setEvent] = useState<any>(null);
  const [lists, setLists] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  const [showListForm, setShowListForm] = useState(false);
  const [listTitle, setListTitle] = useState("");
  const [category, setCategory] = useState("");

  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editListTitle, setEditListTitle] = useState("");
  const [editListCategory, setEditListCategory] = useState("");

  const [openListMenuId, setOpenListMenuId] = useState<string | null>(null);
  const [openTaskMenuId, setOpenTaskMenuId] = useState<string | null>(null);

  const [openTaskFormListId, setOpenTaskFormListId] = useState<string | null>(null);

  const [taskTitle, setTaskTitle] = useState("");
  const [taskDate, setTaskDate] = useState("");
  const [taskTime, setTaskTime] = useState("");
  const [taskLink, setTaskLink] = useState("");
  const [taskComment, setTaskComment] = useState("");

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskDate, setEditTaskDate] = useState("");
  const [editTaskTime, setEditTaskTime] = useState("");
  const [editTaskLink, setEditTaskLink] = useState("");
  const [editTaskComment, setEditTaskComment] = useState("");

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  async function loadData() {
    // Événement (adapte le nom de la table si besoin)
    const { data: eventData } = await supabase
      .from("events")
      .select("title")
      .eq("id", id)
      .maybeSingle();

    setEvent(eventData);

    // Listes de cet événement
    const { data: listsData, error: listsError } = await supabase
      .from("todo_lists")
      .select("*")
      .eq("event_id", id)
      .order("created_at", { ascending: true });

    if (listsError) return console.error("loadLists error:", listsError.message);

    setLists(listsData || []);

    // Tâches uniquement des listes de cet événement
    const listIds = (listsData || []).map((l) => l.id);

    if (listIds.length === 0) {
      setTasks([]);
      return;
    }

    const { data: tasksData, error: tasksError } = await supabase
      .from("todo_tasks")
      .select("*")
      .in("list_id", listIds)
      .order("created_at", { ascending: true });

    if (tasksError) return console.error("loadTasks error:", tasksError.message);

    setTasks(tasksData || []);
  }

  function resetListForm() {
    setListTitle("");
    setCategory("");
    setShowListForm(false);
  }

  function resetTaskForm() {
    setTaskTitle("");
    setTaskDate("");
    setTaskTime("");
    setTaskLink("");
    setTaskComment("");
    setOpenTaskFormListId(null);
  }

  async function addList() {
    if (!listTitle.trim()) return;

    const { error } = await supabase.from("todo_lists").insert([
      {
        event_id: id,
        title: listTitle,
        category: category || null,
      },
    ]);

    if (error) return console.error("addList error:", error.message);

    resetListForm();
    await loadData();
  }

  function startEditList(list: any) {
    setEditingListId(list.id);
    setEditListTitle(list.title || "");
    setEditListCategory(list.category || "");
  }

  async function updateList(listId: string) {
    if (!editListTitle.trim()) return;

    const { error } = await supabase
      .from("todo_lists")
      .update({
        title: editListTitle,
        category: editListCategory || null,
      })
      .eq("id", listId);

    if (error) return console.error("updateList error:", error.message);

    setEditingListId(null);
    setEditListTitle("");
    setEditListCategory("");
    await loadData();
  }

  async function deleteList(listId: string) {
    if (!window.confirm("Supprimer cette liste et toutes ses tâches ?")) return;

    // Supprime d'abord les tâches (utile si pas de ON DELETE CASCADE en base)
    await supabase.from("todo_tasks").delete().eq("list_id", listId);

    const { error } = await supabase
      .from("todo_lists")
      .delete()
      .eq("id", listId);

    if (error) return console.error("deleteList error:", error.message);

    setOpenListMenuId(null);
    await loadData();
  }

  async function addTask(listId: string) {
    if (!taskTitle.trim()) return;

    const { error } = await supabase.from("todo_tasks").insert([
      {
        list_id: listId,
        title: taskTitle,
        date: taskDate || null,
        time: taskTime || null,
        link: taskLink || null,
        comment: taskComment || null,
      },
    ]);

    if (error) return console.error("addTask error:", error.message);

    resetTaskForm();
    await loadData();
  }

  function startEditTask(task: any) {
    setEditingTaskId(task.id);
    setEditTaskTitle(task.title || "");
    setEditTaskDate(task.date || "");
    setEditTaskTime(task.time || "");
    setEditTaskLink(task.link || "");
    setEditTaskComment(task.comment || "");
  }

  async function updateTask(taskId: string) {
    if (!editTaskTitle.trim()) return;

    const { error } = await supabase
      .from("todo_tasks")
      .update({
        title: editTaskTitle,
        date: editTaskDate || null,
        time: editTaskTime || null,
        link: editTaskLink || null,
        comment: editTaskComment || null,
      })
      .eq("id", taskId);

    if (error) return console.error("updateTask error:", error.message);

    setEditingTaskId(null);
    await loadData();
  }

  async function toggleTask(task: any) {
    const { error } = await supabase
      .from("todo_tasks")
      .update({ done: !task.done })
      .eq("id", task.id);

    if (error) return console.error("toggleTask error:", error.message);

    await loadData();
  }

  async function deleteTask(taskId: string) {
    const { error } = await supabase
      .from("todo_tasks")
      .delete()
      .eq("id", taskId);

    if (error) return console.error("deleteTask error:", error.message);

    setOpenTaskMenuId(null);
    await loadData();
  }

  return (
    <div style={{ padding: 20, background: "#F4F1EC" }}>
      {/* HEADER */}
      <div style={todoHeader}>
        <h1 style={todoTitle}>{event?.title || "To-do"}</h1>

        <button onClick={() => setShowListForm(!showListForm)} style={btn}>
          Créer une liste
        </button>
      </div>

      {showListForm && (
        <div style={formCard}>
          <input
            placeholder="Nom de la liste"
            value={listTitle}
            onChange={(e) => setListTitle(e.target.value)}
            style={input}
          />

          <button onClick={addList} style={btn}>
            Créer
          </button>

          <button onClick={resetListForm} style={smallBtn}>
            Annuler
          </button>
        </div>
      )}

      {/* LISTES */}
      <div style={{ marginTop: 25 }}>
        {lists.length === 0 ? (
          <p>Aucune liste pour le moment.</p>
        ) : (
          lists.map((list) => {
            const listTasks = tasks.filter((task) => task.list_id === list.id);
            const isEditingList = editingListId === list.id;

            return (
              <div key={list.id} style={listCard}>
                <div style={listHeader}>
                  <div style={{ flex: 1 }}>
                    {!isEditingList ? (
                      <>
                        <h3 style={{ margin: 0 }}>{list.title}</h3>
                        {list.category && <span style={badge}>{list.category}</span>}
                      </>
                    ) : (
                      <div style={formBox}>
                        <input
                          value={editListTitle}
                          onChange={(e) => setEditListTitle(e.target.value)}
                          style={input}
                        />

                        <input
                          value={editListCategory}
                          onChange={(e) => setEditListCategory(e.target.value)}
                          placeholder="Type / catégorie"
                          style={input}
                        />

                        <button onClick={() => updateList(list.id)} style={btn}>
                          Enregistrer
                        </button>

                        <button onClick={() => setEditingListId(null)} style={smallBtn}>
                          Annuler
                        </button>
                      </div>
                    )}
                  </div>

                  {!isEditingList && (
                    <div style={{ position: "relative" }}>
                      <button
  onClick={() =>
    setOpenListMenuId(openListMenuId === list.id ? null : list.id)
  }
  style={iconBtn}
>
  <Pencil size={16} />
</button>

                      {openListMenuId === list.id && (
                        <div style={miniMenu}>
                          <button
                            style={menuItem}
                            onClick={() => {
                              startEditList(list);
                              setOpenListMenuId(null);
                            }}
                          >
                            Modifier
                          </button>

                          <button
                            style={{ ...menuItem, color: "red" }}
                            onClick={() => deleteList(list.id)}
                          >
                            Supprimer
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* TÂCHES */}
                <div style={{ marginTop: 15 }}>
                  {listTasks.length === 0 ? (
                    <p style={{ opacity: 0.6 }}>Aucune tâche</p>
                  ) : (
                    listTasks.map((task) => {
                      const isEditingTask = editingTaskId === task.id;

                      return (
                        <div key={task.id} style={taskRow}>
                          {!isEditingTask ? (
                            <>
                              <div style={{ flex: 1 }}>
                                <label style={taskLabel}>
                                  <input
                                    type="checkbox"
                                    checked={!!task.done}
                                    onChange={() => toggleTask(task)}
                                  />

                                  <span
                                    style={{
                                      textDecoration: task.done ? "line-through" : "none",
                                      opacity: task.done ? 0.5 : 1,
                                      fontWeight: 600,
                                    }}
                                  >
                                    {task.title}
                                  </span>
                                </label>

<div style={taskMeta}>
  {task.date && (
    <span style={metaItem}>
      <Calendar size={14} /> {task.date}
    </span>
  )}
  {task.time && (
    <span style={metaItem}>
      <Clock size={14} /> {task.time}
    </span>
  )}
  {task.link && (
    <a href={task.link} target="_blank" rel="noreferrer" style={metaItem}>
      <LinkIcon size={14} /> Lien
    </a>
  )}
</div>

                                {task.comment && <p style={comment}>{task.comment}</p>}
                              </div>

                              <div style={{ position: "relative" }}>
<button
  onClick={() =>
    setOpenListMenuId(openListMenuId === list.id ? null : list.id)
  }
  style={iconBtn}
>
  <Pencil size={16} />
</button>

                                {openTaskMenuId === task.id && (
                                  <div style={miniMenu}>
                                    <button
                                      style={menuItem}
                                      onClick={() => {
                                        startEditTask(task);
                                        setOpenTaskMenuId(null);
                                      }}
                                    >
                                      Modifier
                                    </button>

                                    <button
                                      style={{ ...menuItem, color: "red" }}
                                      onClick={() => deleteTask(task.id)}
                                    >
                                      Supprimer
                                    </button>
                                  </div>
                                )}
                              </div>
                            </>
                          ) : (
                            <div style={{ flex: 1 }}>
                              <input
                                value={editTaskTitle}
                                onChange={(e) => setEditTaskTitle(e.target.value)}
                                style={input}
                              />

                              <input
                                type="date"
                                value={editTaskDate}
                                onChange={(e) => setEditTaskDate(e.target.value)}
                                style={input}
                              />

                              <input
                                type="time"
                                value={editTaskTime}
                                onChange={(e) => setEditTaskTime(e.target.value)}
                                style={input}
                              />

                              <input
                                placeholder="Lien"
                                value={editTaskLink}
                                onChange={(e) => setEditTaskLink(e.target.value)}
                                style={input}
                              />

                              <textarea
                                placeholder="Commentaire"
                                value={editTaskComment}
                                onChange={(e) => setEditTaskComment(e.target.value)}
                                style={textarea}
                              />

                              <button onClick={() => updateTask(task.id)} style={btn}>
                                Enregistrer
                              </button>

                              <button
                                onClick={() => setEditingTaskId(null)}
                                style={smallBtn}
                              >
                                Annuler
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <button
                  onClick={() =>
                    setOpenTaskFormListId(
                      openTaskFormListId === list.id ? null : list.id
                    )
                  }
                  style={btn}
                >
                  Ajouter une tâche
                </button>

                {openTaskFormListId === list.id && (
                  <div style={formBox}>
                    <input
                      placeholder="Tâche"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      style={input}
                    />

                    <input
                      type="date"
                      value={taskDate}
                      onChange={(e) => setTaskDate(e.target.value)}
                      style={input}
                    />

                    <input
                      type="time"
                      value={taskTime}
                      onChange={(e) => setTaskTime(e.target.value)}
                      style={input}
                    />

                    <input
                      placeholder="Lien optionnel"
                      value={taskLink}
                      onChange={(e) => setTaskLink(e.target.value)}
                      style={input}
                    />

                    <textarea
                      placeholder="Commentaire optionnel"
                      value={taskComment}
                      onChange={(e) => setTaskComment(e.target.value)}
                      style={textarea}
                    />

                    <button onClick={() => addTask(list.id)} style={btn}>
                      Créer la tâche
                    </button>

                    <button onClick={resetTaskForm} style={smallBtn}>
                      Annuler
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}


const formCard = {
  padding: 20,
  border: "1px solid #ddd",
  borderRadius: 12,
  background: "white",
  maxWidth: 440,
  marginTop: 15,
};

const formBox = {
  marginTop: 12,
  padding: 12,
  background: "#fafafa",
  borderRadius: 10,
};

const listCard = {
  padding: 18,
  border: "1px solid #ddd",
  borderRadius: 12,
  background: "white",
  marginTop: 15,
};

const listHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
};

const input = {
  display: "block",
  padding: 10,
  marginTop: 10,
  width: "100%",
  maxWidth: 380,
  border: "1px solid #ddd",
  borderRadius: 8,
};

const textarea = {
  display: "block",
  padding: 10,
  marginTop: 10,
  width: "100%",
  maxWidth: 380,
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
  marginTop: 10,
  cursor: "pointer",
};

const smallBtn = {
  padding: "6px 10px",
  border: "1px solid #ddd",
  borderRadius: 6,
  cursor: "pointer",
  background: "white",
  marginTop: 10,
};

const badge = {
  display: "inline-block",
  marginTop: 8,
  padding: "4px 10px",
  borderRadius: 999,
  background: "#f1f1f1",
  fontSize: 12,
};

const taskRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  padding: "12px 0",
  borderBottom: "1px solid #eee",
};

const taskLabel = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const comment = {
  marginTop: 6,
  marginBottom: 0,
  color: "#555",
  fontSize: 14,
};

const miniMenu = {
  position: "absolute" as const,
  right: 0,
  top: 38,
  width: 130,
  background: "white",
  border: "1px solid #ddd",
  borderRadius: 10,
  boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
  overflow: "hidden",
  zIndex: 20,
};

const iconBtn = {
  width: 34,
  height: 34,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid #ddd",
  borderRadius: 8,
  background: "white",
  cursor: "pointer",
};

const menuItem = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  padding: "9px 12px",
  border: "none",
  background: "white",
  textAlign: "left" as const,
  cursor: "pointer",
};

const todoTitle = {
  margin: 0,
  fontSize: 34,
  fontWeight: 800,
  color: "#222222",
};

const todoHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 20,
  marginBottom: 24,
};

const taskMeta = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginTop: 6,
  fontSize: 13,
  color: "#666",
};

const metaItem = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
};