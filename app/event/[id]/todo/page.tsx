"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function TodoPage() {
  const { id } = useParams();

  const [lists, setLists] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  const [showListForm, setShowListForm] = useState(false);
  const [listTitle, setListTitle] = useState("");
  const [category, setCategory] = useState("");

  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editListTitle, setEditListTitle] = useState("");
  const [editListCategory, setEditListCategory] = useState("");

  const [openTaskFormListId, setOpenTaskFormListId] = useState<string | null>(
    null
  );

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
    loadData();
  }, [id]);

  async function loadData() {
    const { data: listsData } = await supabase
      .from("todo_lists")
      .select("*")
      .eq("event_id", id)
      .order("created_at", { ascending: true });

    setLists(listsData || []);

    const { data: tasksData } = await supabase
      .from("todo_tasks")
      .select("*")
      .order("created_at", { ascending: true });

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

    if (error) {
      console.error("addList error:", error.message);
      return;
    }

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

    if (error) {
      console.error("updateList error:", error.message);
      return;
    }

    setEditingListId(null);
    setEditListTitle("");
    setEditListCategory("");
    await loadData();
  }

  async function deleteList(listId: string) {
    const { error } = await supabase
      .from("todo_lists")
      .delete()
      .eq("id", listId);

    if (error) {
      console.error("deleteList error:", error.message);
      return;
    }

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

    if (error) {
      console.error("addTask error:", error.message);
      return;
    }

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

    if (error) {
      console.error("updateTask error:", error.message);
      return;
    }

    setEditingTaskId(null);
    setEditTaskTitle("");
    setEditTaskDate("");
    setEditTaskTime("");
    setEditTaskLink("");
    setEditTaskComment("");

    await loadData();
  }

  async function toggleTask(task: any) {
    const { error } = await supabase
      .from("todo_tasks")
      .update({ done: !task.done })
      .eq("id", task.id);

    if (error) {
      console.error("toggleTask error:", error.message);
      return;
    }

    await loadData();
  }

  async function deleteTask(taskId: string) {
    const { error } = await supabase
      .from("todo_tasks")
      .delete()
      .eq("id", taskId);

    if (error) {
      console.error("deleteTask error:", error.message);
      return;
    }

    await loadData();
  }

  return (
    <div>

      <button
        onClick={() => setShowListForm(!showListForm)}
        style={btn}
      >
        Créer une liste
      </button>

      {showListForm && (
        <div style={formCard}>
          <h2>Nouvelle liste</h2>

          <input
            placeholder="Nom de la liste"
            value={listTitle}
            onChange={(e) => setListTitle(e.target.value)}
            style={input}
          />

          <input
            placeholder="Type / catégorie"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={input}
          />

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={addList} style={btn}>
              Créer
            </button>

            <button onClick={resetListForm} style={smallBtn}>
              Annuler
            </button>
          </div>
        </div>
      )}

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

                        {list.category && (
                          <span style={badge}>{list.category}</span>
                        )}
                      </>
                    ) : (
                      <div style={formBox}>
                        <input
                          value={editListTitle}
                          onChange={(e) =>
                            setEditListTitle(e.target.value)
                          }
                          style={input}
                        />

                        <input
                          value={editListCategory}
                          onChange={(e) =>
                            setEditListCategory(e.target.value)
                          }
                          placeholder="Type / catégorie"
                          style={input}
                        />

                        <button
                          onClick={() => updateList(list.id)}
                          style={btn}
                        >
                          Enregistrer
                        </button>

                        <button
                          onClick={() => setEditingListId(null)}
                          style={smallBtn}
                        >
                          Annuler
                        </button>
                      </div>
                    )}
                  </div>

                  {!isEditingList && (
                    <div style={actions}>
                      <button
                        onClick={() => startEditList(list)}
                        style={smallBtn}
                      >
                        Modifier
                      </button>

                      <button
                        onClick={() => deleteList(list.id)}
                        style={{
                          ...smallBtn,
                          background: "red",
                          color: "white",
                        }}
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>

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
                                    checked={task.done}
                                    onChange={() => toggleTask(task)}
                                  />

                                  <span
                                    style={{
                                      textDecoration: task.done
                                        ? "line-through"
                                        : "none",
                                      opacity: task.done ? 0.5 : 1,
                                      fontWeight: 600,
                                    }}
                                  >
                                    {task.title}
                                  </span>
                                </label>

                                <div style={taskMeta}>
                                  {task.date && <span>📅 {task.date}</span>}
                                  {task.time && <span>⏰ {task.time}</span>}

                                  {task.link && (
                                    <a
                                      href={task.link}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{ color: "black" }}
                                    >
                                      🔗 Lien
                                    </a>
                                  )}
                                </div>

                                {task.comment && (
                                  <p style={comment}>{task.comment}</p>
                                )}
                              </div>

                              <div style={actions}>
                                <button
                                  onClick={() => startEditTask(task)}
                                  style={smallBtn}
                                >
                                  Modifier
                                </button>

                                <button
                                  onClick={() => deleteTask(task.id)}
                                  style={smallBtn}
                                >
                                  Supprimer
                                </button>
                              </div>
                            </>
                          ) : (
                            <div style={{ flex: 1 }}>
                              <input
                                value={editTaskTitle}
                                onChange={(e) =>
                                  setEditTaskTitle(e.target.value)
                                }
                                style={input}
                              />

                              <input
                                type="date"
                                value={editTaskDate}
                                onChange={(e) =>
                                  setEditTaskDate(e.target.value)
                                }
                                style={input}
                              />

                              <input
                                type="time"
                                value={editTaskTime}
                                onChange={(e) =>
                                  setEditTaskTime(e.target.value)
                                }
                                style={input}
                              />

                              <input
                                placeholder="Lien"
                                value={editTaskLink}
                                onChange={(e) =>
                                  setEditTaskLink(e.target.value)
                                }
                                style={input}
                              />

                              <textarea
                                placeholder="Commentaire"
                                value={editTaskComment}
                                onChange={(e) =>
                                  setEditTaskComment(e.target.value)
                                }
                                style={textarea}
                              />

                              <button
                                onClick={() => updateTask(task.id)}
                                style={btn}
                              >
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

                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => addTask(list.id)} style={btn}>
                        Créer la tâche
                      </button>

                      <button onClick={resetTaskForm} style={smallBtn}>
                        Annuler
                      </button>
                    </div>
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
};

const actions = {
  display: "flex",
  gap: 8,
  alignItems: "center",
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

const taskMeta = {
  display: "flex",
  gap: 12,
  marginTop: 6,
  fontSize: 13,
  color: "#666",
};

const comment = {
  marginTop: 6,
  marginBottom: 0,
  color: "#555",
  fontSize: 14,
};